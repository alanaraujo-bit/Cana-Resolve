/**
 * A fonte única da situação comercial.
 *
 * A capa da participação, o histórico de cobrança, a linha das Configurações e
 * o aviso contextual da Home leem **daqui**. Não há duas cópias, e não há
 * nenhuma tela recalculando dias ou decidindo acesso por conta própria.
 *
 * Ele vive acima da área do profissional inteira (`app/(app)/_layout.tsx`),
 * junto da carteira e das preferências, e pelo mesmo motivo delas: o estado
 * comercial precisa aparecer na Home e nas Configurações ao mesmo tempo, e um
 * provedor por tela produziria duas verdades.
 *
 * ## O cache, e por que ele não é perigoso aqui
 *
 * A situação fica em memória entre as telas — abrir a capa duas vezes não pede
 * duas vezes ao servidor. Isso é conforto, não autoridade: quem decide acesso é
 * a resposta do servidor, e o §108 pede revalidação. Ela acontece em dois
 * momentos, e nenhum deles é um relógio: **ao voltar ao primeiro plano** e **ao
 * puxar para atualizar**. Um `setInterval` batendo no servidor a cada minuto
 * gastaria bateria de gente que trabalha na rua para descobrir, quase sempre,
 * que nada mudou.
 *
 * E o cache **nunca sobrevive à conta**: sair limpa tudo, como no perfil e na
 * reputação. A memória, e não só o disco — foi assim que a Fase 05 sangrou.
 */

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
import { AppState } from 'react-native';

import { useSession } from '@/session/SessionProvider';
import { registrarComercial } from './analytics';
import type { Cenario } from './exemplos';
import {
  ErroComercial,
  lerCobrancasDoParceiro,
  lerSituacaoComercial,
  situacaoDesconhecida,
} from './repositorio';
import type { Cobranca, SituacaoComercial } from './tipos';

export type Situacao = 'carregando' | 'pronto' | 'erro';

type Valor = {
  situacao: Situacao;
  comercial: SituacaoComercial;
  erro: ErroComercial | null;
  atualizando: boolean;

  cobrancas: Cobranca[];
  cobrancasCarregando: boolean;
  cobrancasErro: ErroComercial | null;

  atualizar: () => Promise<void>;
  carregarCobrancas: () => Promise<void>;

  /** Só em desenvolvimento: troca o cenário de exemplo. */
  cenario: Cenario | null;
  trocarCenario: (c: Cenario | null) => void;
};

const Contexto = createContext<Valor | null>(null);

export function ComercialProvider({ children }: { children: ReactNode }) {
  const { token, account } = useSession();

  const [cenario, setCenario] = useState<Cenario | null>(null);
  const [situacao, setSituacao] = useState<Situacao>('carregando');
  /*
   * O estado inicial é **desconhecido**, e não "sem participação".
   *
   * Parece detalhe e não é: entre a abertura do aplicativo e a primeira
   * resposta existem alguns segundos, e uma tela que leia "sem participação"
   * nesse intervalo diz a um Fundador pagante que ele não tem nada.
   */
  const [comercial, setComercial] = useState<SituacaoComercial>(situacaoDesconhecida);
  const [erro, setErro] = useState<ErroComercial | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [cobrancasCarregando, setCobrancasCarregando] = useState(false);
  const [cobrancasErro, setCobrancasErro] = useState<ErroComercial | null>(null);

  /**
   * Qual oferta já foi contada como vista (§115).
   *
   * Declarada aqui, junto das outras referências, e não perto do efeito que a
   * consome: o efeito de logout também a zera, e `const` em bloco posterior
   * daria erro de inicialização — em tempo de execução, no logout.
   */
  const ofertaVista = useRef<string | null>(null);

  // Uma resposta de um cenário antigo não pode sobrescrever o atual.
  const cenarioRef = useRef(cenario);
  cenarioRef.current = cenario;
  const contaRef = useRef(account?.id ?? null);
  contaRef.current = account?.id ?? null;

  const carregar = useCallback(
    async (ehAtualizacao: boolean) => {
      const alvo = cenarioRef.current;
      const conta = contaRef.current;
      if (ehAtualizacao) setAtualizando(true);
      else setSituacao('carregando');

      try {
        const lida = await lerSituacaoComercial(token, alvo);
        if (cenarioRef.current !== alvo || contaRef.current !== conta) return;
        setComercial(lida);
        setErro(null);
        setSituacao('pronto');
      } catch (e) {
        if (cenarioRef.current !== alvo || contaRef.current !== conta) return;
        const falha = e instanceof ErroComercial ? e : new ErroComercial('Não foi possível conferir sua situação agora.');
        /*
         * A situação volta a **desconhecida** — e não fica com a última lida.
         *
         * Manter a anterior seria mostrar "72 dias restantes" para alguém cujo
         * período pode ter terminado ontem. Desconhecida é honesta, e a tela
         * sabe dizer isso sem acusar ninguém de não ter pago.
         */
        setComercial(situacaoDesconhecida());
        setErro(falha);
        setSituacao('erro');
      } finally {
        setAtualizando(false);
      }
    },
    [token],
  );

  const carregarCobrancas = useCallback(async () => {
    const alvo = cenarioRef.current;
    setCobrancasCarregando(true);
    try {
      const lidas = await lerCobrancasDoParceiro(token, alvo);
      if (cenarioRef.current !== alvo) return;
      setCobrancas(lidas);
      setCobrancasErro(null);
    } catch (e) {
      if (cenarioRef.current !== alvo) return;
      setCobrancas([]);
      setCobrancasErro(
        e instanceof ErroComercial ? e : new ErroComercial('Não foi possível carregar o histórico.'),
      );
    } finally {
      setCobrancasCarregando(false);
    }
  }, [token]);

  /**
   * A carga inicial, a troca de conta e a troca de cenário — um efeito só.
   *
   * Eram dois, e os dois chamavam `carregar`. Isso produzia **duas requisições
   * simultâneas** sempre que o token mudava (login, restauração de sessão), com
   * as respostas competindo para gravar o estado. Aqui a dependência é o par
   * `[carregar, cenario]`, e `carregar` só muda quando o token muda: um efeito,
   * uma requisição.
   */
  useEffect(() => {
    void carregar(false);
  }, [carregar, cenario]);

  /**
   * Sair da conta esvazia o cache — memória, e não só disco.
   *
   * É o defeito que a Fase 05 pagou caro e a Fase 06 repetiu: um `memoria` de
   * módulo que sobrevive à troca de conta. Aqui o dado é a situação comercial
   * de um parceiro, e sem esta limpeza o parceiro seguinte a entrar no mesmo
   * aparelho veria, pelo tempo de uma requisição, "Beta ativo · 72 dias" de
   * outra pessoa — e a linha das Configurações leria isso como a participação
   * **dele**.
   *
   * Volta para desconhecida, e não para vazia: vazia afirmaria algo sobre a
   * conta nova antes de qualquer resposta.
   */
  useEffect(() => {
    if (token) return;
    setComercial(situacaoDesconhecida());
    setCobrancas([]);
    setCobrancasErro(null);
    setErro(null);
    setSituacao('carregando');
    ofertaVista.current = null;
  }, [token]);

  /**
   * Revalidação ao voltar ao primeiro plano.
   *
   * É o §108 sem `setInterval`: o momento em que o estado pode ter mudado sem o
   * aplicativo saber é justamente aquele em que ele esteve fora. Um período que
   * terminou durante a noite aparece terminado na primeira abertura da manhã.
   */
  useEffect(() => {
    const inscricao = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void carregar(true);
    });
    return () => inscricao.remove();
  }, [carregar]);

  const trocarCenario = useCallback((c: Cenario | null) => {
    if (!__DEV__) return;
    setCenario(c);
    setCobrancas([]);
    setCobrancasErro(null);
  }, []);

  /**
   * O disparo de "oferta vista" (§115), uma vez por oferta.
   *
   * Aqui, e não na tela, porque a tela pode montar e desmontar várias vezes na
   * mesma sessão — e três montagens não são três visualizações.
   */
  useEffect(() => {
    const oferta = comercial.ofertaDisponivel;
    if (!oferta) return;
    const chave = `${oferta.codigo}:${oferta.versao}`;
    if (ofertaVista.current === chave) return;
    ofertaVista.current = chave;
    registrarComercial('offer_viewed', { oferta: oferta.codigo, versao: oferta.versao });
  }, [comercial.ofertaDisponivel]);

  const valor = useMemo<Valor>(
    () => ({
      situacao,
      comercial,
      erro,
      atualizando,
      cobrancas,
      cobrancasCarregando,
      cobrancasErro,
      atualizar: () => carregar(true),
      carregarCobrancas,
      cenario,
      trocarCenario,
    }),
    [
      situacao,
      comercial,
      erro,
      atualizando,
      cobrancas,
      cobrancasCarregando,
      cobrancasErro,
      carregar,
      carregarCobrancas,
      cenario,
      trocarCenario,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useComercial(): Valor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useComercial precisa estar dentro de <ComercialProvider>.');
  return valor;
}
