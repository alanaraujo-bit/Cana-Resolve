/**
 * A infraestrutura de notificações, em um lugar só.
 *
 * Ela vive dentro da área do profissional (`app/(app)/_layout.tsx`), acima da
 * carteira e das preferências, porque precisa das três coisas ao mesmo tempo:
 * a sessão (para registrar o aparelho), a carteira (para o selo e para
 * atualizar quando algo chega) e as preferências (para saber o que a pessoa
 * quer receber).
 *
 * O que ela **não** faz, e cada "não" é um parágrafo da especificação:
 *
 * - **Não pede permissão sozinha** (§30). Nem na abertura, nem depois. Ela
 *   apenas diz se vale a pena convidar; quem convida é uma tela, e quem aceita
 *   é a pessoa.
 * - **Não navega porque chegou um aviso** (§24, §45 dos critérios). Chegar
 *   atualiza dados e mostra uma faixa discreta. Só o **toque** leva alguém a
 *   algum lugar.
 * - **Não trata o payload como estado** (§22). Um aviso chegou? A carteira é
 *   relida da fonte. O que o push disse é ignorado como dado.
 * - **Não é requisito de nada** (§74, §76). Se o push nunca chegar, a Home e a
 *   Central continuam inteiras: elas leem o repositório, e voltar ao primeiro
 *   plano já reconcilia (§78).
 */
import { usePathname, useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useCarteira } from '@/oportunidades/Carteira';
import { usePreferencias } from '@/preferencias/PreferenciasProvider';
import { useSession } from '@/session/SessionProvider';
import { registrar as medir } from './analytics';
import { responderConvite, type RespostaDoConvite } from './convite';
import { anotar, assinar, comoRota, consumir, restaurar } from './destino';
import { esperasDeRetentativa, registrar as registrarNoServidor } from './registro';
import {
  aoReceber,
  aoTocar,
  definirSelo,
  disponibilidade,
  esquecerToqueInicial,
  lerPermissao,
  obterToken,
  pedirPermissao,
  prepararCanais,
  tocouParaAbrir,
  type Disponibilidade,
} from './sistema';
import type { Carga, EstadoDaPermissao } from './tipos';
import { preferenciaDoTipo } from './tipos';

/** O que chegou enquanto a pessoa estava com o aplicativo aberto. */
export type AvisoRecebido = {
  carga: Carga;
  /** A rota para onde ele leva, quando levar a alguma. */
  rota: string | null;
  em: number;
};

export type EstadoDoRegistro =
  | 'ocioso'
  | 'registrando'
  | 'registrado'
  | 'sem-permissao'
  | 'indisponivel'
  | 'falhou';

type Valor = {
  /** O estado **do sistema operacional**. Nunca confundido com preferência. */
  permissao: EstadoDaPermissao;
  /** Onde estamos: build de verdade, Expo Go, emulador, navegador. */
  onde: Disponibilidade;
  registro: EstadoDoRegistro;
  /** `true` quando vale a pena convidar a ativar — e ninguém convidou ainda. */
  podeConvidar: boolean;
  /** O que a pessoa já respondeu ao convite, se respondeu. */
  respostaAoConvite: RespostaDoConvite;

  /**
   * Pede a permissão de verdade. Só deve ser chamado a partir de um toque
   * explícito em "Ativar notificações" (§31).
   */
  ativar: () => Promise<EstadoDaPermissao>;
  /** "Agora não". Respeitado: não perguntamos de novo sozinhos (§33). */
  adiar: () => Promise<void>;
  /** Reconsulta o sistema — a permissão pode ter mudado fora daqui (§91). */
  conferir: () => Promise<void>;

  /** O último aviso chegado com o aplicativo aberto, para a faixa discreta. */
  recebido: AvisoRecebido | null;
  dispensarRecebido: () => void;
};

const Contexto = createContext<Valor | null>(null);

export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const { account, token, stage } = useSession();
  const { esperando, atualizar } = useCarteira();
  const { preferencias } = usePreferencias();
  const router = useRouter();
  // Onde a pessoa está agora — o §79 depende disso.
  const caminho = usePathname();

  const [permissao, setPermissao] = useState<EstadoDaPermissao>('lendo');
  const [registro, setRegistro] = useState<EstadoDoRegistro>('ocioso');
  const [respostaAoConvite, setRespostaAoConvite] = useState<RespostaDoConvite>('nao-perguntamos');
  const [recebido, setRecebido] = useState<AvisoRecebido | null>(null);

  const onde = useMemo(() => disponibilidade(), []);

  const contaRef = useRef<string | null>(null);
  contaRef.current = account?.id ?? null;
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  /* ---------------------------------------------------------------------- */
  /*  Permissão                                                             */
  /* ---------------------------------------------------------------------- */

  const conferir = useCallback(async () => {
    setPermissao(await lerPermissao());
  }, []);

  useEffect(() => {
    void conferir();
    void responderConvite.ler().then(setRespostaAoConvite);
    void prepararCanais();
    void restaurar();
  }, [conferir]);

  /* ---------------------------------------------------------------------- */
  /*  Registro do aparelho                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * O que já foi registrado nesta execução: conta + token de push.
   *
   * Serve para não repetir a chamada a cada foreground. Não é bookkeeping de
   * verdade — o servidor é idempotente (§99), e este cache existe só para não
   * gastar rede à toa. Trocar de conta muda a chave, e o registro refaz.
   */
  const jaRegistrado = useRef<string | null>(null);
  const registrando = useRef(false);

  const registrarAparelho = useCallback(async () => {
    if (registrando.current) return;

    const sessao = tokenRef.current;
    const conta = contaRef.current;
    if (!sessao || !conta) return;

    if (onde !== 'pronta') {
      setRegistro('indisponivel');
      return;
    }

    registrando.current = true;
    try {
      const push = await obterToken();
      if (!push.ok) {
        setRegistro(push.falha === 'sem-permissao' ? 'sem-permissao' : 'indisponivel');
        return;
      }

      const chave = `${conta}:${push.token}`;
      if (jaRegistrado.current === chave) {
        setRegistro('registrado');
        return;
      }

      setRegistro('registrando');

      // Três tentativas com espera crescente, e para (§98). Sem laço infinito:
      // se a rede está fora, tentar de novo agora não vai resolver — a próxima
      // volta ao primeiro plano tenta.
      for (let tentativa = 0; ; tentativa += 1) {
        const feito = await registrarNoServidor({ sessao, pushToken: push.token });

        if (feito.ok) {
          jaRegistrado.current = chave;
          setRegistro('registrado');
          medir({ nome: 'device_registered', plataforma: onde });
          return;
        }

        // Sessão recusada e API ausente não melhoram com repetição.
        if (feito.falha !== 'rede' || tentativa >= esperasDeRetentativa.length - 1) {
          setRegistro(feito.falha === 'sem-api' ? 'indisponivel' : 'falhou');
          medir({ nome: 'device_registration_failed', falha: feito.falha });
          return;
        }

        await new Promise((r) => setTimeout(r, esperasDeRetentativa[tentativa]));
        // A sessão pode ter caído no meio da espera.
        if (tokenRef.current !== sessao || contaRef.current !== conta) return;
      }
    } finally {
      registrando.current = false;
    }
  }, [onde]);

  // Registrar quando há sessão e permissão. Trocar de conta refaz o registro —
  // e é o servidor que, na mesma escrita, tira o aparelho da conta anterior.
  useEffect(() => {
    if (stage !== 'autenticado' || permissao !== 'concedida') return;
    void registrarAparelho();
  }, [stage, permissao, account?.id, registrarAparelho]);

  const ativar = useCallback(async () => {
    medir({ nome: 'notification_permission_prompted' });
    const resultado = await pedirPermissao();
    setPermissao(resultado);

    if (resultado === 'concedida') {
      medir({ nome: 'notification_permission_granted' });
      await responderConvite.gravar('aceitou');
      setRespostaAoConvite('aceitou');
      void registrarAparelho();
    } else if (resultado === 'negada' || resultado === 'bloqueada') {
      medir({ nome: 'notification_permission_denied', definitiva: resultado === 'bloqueada' });
      await responderConvite.gravar('negou');
      setRespostaAoConvite('negou');
    }

    return resultado;
  }, [registrarAparelho]);

  const adiar = useCallback(async () => {
    medir({ nome: 'notification_permission_adiada' });
    await responderConvite.gravar('adiou');
    setRespostaAoConvite('adiou');
  }, []);

  /* ---------------------------------------------------------------------- */
  /*  Selo                                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * O número do ícone é **o mesmo** do selo da aba (§44).
   *
   * `esperando` sai de `contarEsperando`, no domínio das oportunidades: quantas
   * ainda pedem uma decisão. Abrir uma não zera as outras (§45), e zero apaga
   * o selo em vez de desenhar um "0" (§46).
   */
  useEffect(() => {
    if (stage !== 'autenticado') {
      void definirSelo(0);
      return;
    }
    void definirSelo(esperando);
  }, [esperando, stage]);

  /* ---------------------------------------------------------------------- */
  /*  Chegada e toque                                                       */
  /* ---------------------------------------------------------------------- */

  /**
   * Um aviso chegou com o aplicativo aberto.
   *
   * Três coisas acontecem, e navegar não é uma delas: a carteira é relida da
   * fonte (§72 — sem exigir puxar para atualizar), o selo se ajusta sozinho por
   * consequência, e uma faixa discreta aparece (§25).
   *
   * O que **não** acontece: se o aviso é de um tipo que a pessoa desligou, ele
   * não vira faixa. E se ela já está olhando exatamente essa oportunidade, o
   * aplicativo não a avisa de que ela existe (§79).
   */
  const aoChegar = useCallback(
    (carga: Carga) => {
      medir({ nome: 'notification_received', tipo: carga.tipo });

      // Um aviso da conta anterior, entregue com atraso, não mexe em nada.
      if (contaRef.current && carga.para !== contaRef.current) return;

      // O payload não é fonte de verdade: o que ele provoca é uma leitura.
      void atualizar();

      const categoria = preferenciaDoTipo[carga.tipo];
      if (categoria && !preferencias.avisos[categoria]) return;

      /**
       * O destino da faixa sai de `comoRota`, e não de um `if` por tipo de
       * aviso.
       *
       * Antes da Fase 07 ele era montado à mão a partir de `oportunidadeId` —
       * o que funcionava porque só havia um destino possível. Com a avaliação,
       * essa linha silenciosamente deixaria a faixa sem destino: ela apareceria
       * e o "Ver" não levaria a lugar nenhum. Perguntar ao mesmo validador que
       * o toque usa mantém as duas portas com uma regra só, e a próxima
       * entidade não precisa lembrar de mexer aqui.
       */
      const rota = comoRota(carga.destino);

      // §79: se a pessoa já está olhando exatamente o que o aviso anuncia,
      // avisar que aquilo existe é ruído. Os dados acima já foram relidos —
      // que é o que realmente importava —, e a tela reflete a mudança sozinha.
      if (rota && rota === caminho) return;

      setRecebido({ carga, rota, em: Date.now() });
    },
    [atualizar, preferencias.avisos, caminho],
  );

  /**
   * A pessoa tocou em um aviso. **Este é o único caminho que navega.**
   *
   * Ele não navega direto: anota o destino e deixa o consumo acontecer onde a
   * sessão já foi conferida. Assim, o mesmo código serve para o aplicativo
   * aberto, em segundo plano, encerrado, com sessão expirada e deslogado — que
   * são cinco estados diferentes que o §15 manda não confundir.
   */
  const aoTocarEm = useCallback((carga: Carga, estado: 'aberto' | 'fundo' | 'encerrado') => {
    medir({ nome: 'notification_opened', tipo: carga.tipo, estado });
    const anotou = anotar(carga.destino, 'push', carga.para);
    if (!anotou) medir({ nome: 'notification_deeplink_recusado', motivo: 'rota' });
  }, []);

  useEffect(() => {
    const chegada = aoReceber(aoChegar);
    const toque = aoTocar((carga) => aoTocarEm(carga, 'aberto'));

    // O toque que **abriu** o aplicativo — o cold start do §16. Sem isto, o
    // destino se perde no boot, que é o caso que a especificação chama de mais
    // importante.
    const inicial = tocouParaAbrir();
    if (inicial) {
      aoTocarEm(inicial, 'encerrado');
      esquecerToqueInicial();
    }

    return () => {
      chegada.remove();
      toque.remove();
    };
  }, [aoChegar, aoTocarEm]);

  /* ---------------------------------------------------------------------- */
  /*  Navegação para o destino pendente                                     */
  /* ---------------------------------------------------------------------- */

  const irParaPendente = useCallback(() => {
    if (stage !== 'autenticado') return;

    const rota = consumir(contaRef.current);
    if (!rota) return;

    medir({ nome: 'notification_deeplink_resolved', tipo: 'link' });
    // `push`, e não `replace`: quem chegou por notificação precisa poder voltar
    // para onde estava — ou, em cold start, para a Central.
    router.push(rota);
  }, [router, stage]);

  useEffect(() => {
    // Assim que a área do profissional monta, o que ficou pendente é honrado.
    irParaPendente();
    return assinar(irParaPendente);
  }, [irParaPendente]);

  /* ---------------------------------------------------------------------- */
  /*  Reconciliação ao voltar                                               */
  /* ---------------------------------------------------------------------- */

  /**
   * Voltar ao primeiro plano relê os dados e a permissão.
   *
   * É o que torna o produto correto mesmo quando nenhum push chega (§78): a
   * entrega não é garantida, e a Central não pode depender dela. Também é onde
   * uma permissão desligada nas Configurações do aparelho é percebida (§91).
   */
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (proximo: AppStateStatus) => {
      if (proximo !== 'active') return;
      void conferir();
      if (stage === 'autenticado') void atualizar();
    });
    return () => assinatura.remove();
  }, [conferir, atualizar, stage]);

  /* ---------------------------------------------------------------------- */

  const dispensarRecebido = useCallback(() => setRecebido(null), []);

  /**
   * Vale convidar?
   *
   * Só quando: dá para receber neste ambiente, o sistema ainda não decidiu,
   * ninguém foi perguntado antes, e há oportunidade na tela — é isso que faz o
   * convite chegar **depois** de a pessoa entender o que ela perde (§31), e
   * não no primeiro segundo do aplicativo (§30).
   */
  const podeConvidar =
    onde === 'pronta' &&
    permissao === 'a-perguntar' &&
    respostaAoConvite === 'nao-perguntamos' &&
    stage === 'autenticado';

  const valor = useMemo<Valor>(
    () => ({
      permissao,
      onde,
      registro,
      podeConvidar,
      respostaAoConvite,
      ativar,
      adiar,
      conferir,
      recebido,
      dispensarRecebido,
    }),
    [
      permissao,
      onde,
      registro,
      podeConvidar,
      respostaAoConvite,
      ativar,
      adiar,
      conferir,
      recebido,
      dispensarRecebido,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useNotificacoes(): Valor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useNotificacoes precisa estar dentro de <NotificacoesProvider>.');
  return valor;
}
