/**
 * A fonte única de estado das oportunidades.
 *
 * A Home, a Central, o selo da aba e o detalhe leem **daqui**. Não há duas
 * listas, duas contagens nem duas leituras: se uma oportunidade deixa de ser
 * nova no detalhe, a Home sabe disso na mesma hora, sem ninguém avisar
 * ninguém. Quando a API chegar, é o `repositorio` que muda — este arquivo não.
 *
 * Ele vive acima das abas (`app/(app)/_layout.tsx`), que é o menor lugar que
 * cobre todas as telas do profissional.
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

import { registrar } from './analytics';
import type { Cenario } from './exemplos';
import {
  comoErroDeDados,
  encerrar as encerrarNoRepositorio,
  esquecerMemoria,
  lerCarteira,
  lerOportunidade,
  marcarComoVista,
  registrarContato as contatoNoRepositorio,
  registrarInteresse as interesseNoRepositorio,
  registrarRecusa as recusaNoRepositorio,
  type ErroDeDados,
} from './repositorio';
import type {
  Carteira,
  MotivoRecusa,
  Oportunidade,
  Pendencia,
  Resultado,
  ResumoProfissional,
} from './tipos';
import { contarEsperando, ordemDeLeitura } from './tipos';

export type Situacao = 'carregando' | 'pronto' | 'erro';

type Valor = {
  situacao: Situacao;
  /** Ordenadas: o que espera resposta primeiro. */
  oportunidades: Oportunidade[];
  profissional: ResumoProfissional | null;
  pendencia: Pendencia | null;
  contaNova: boolean;
  erro: ErroDeDados | null;
  atualizando: boolean;
  /** Quantas ainda esperam uma decisão — o número do selo da aba. */
  esperando: number;
  /** Recalculado a cada atualização, para os "há 8 min" não congelarem. */
  agora: Date;

  atualizar: () => Promise<void>;
  buscar: (id: string) => Oportunidade | undefined;
  /** Vai ao repositório quando a carteira não tem o id (link, notificação). */
  carregarUma: (id: string) => Promise<Oportunidade>;
  abrir: (o: Oportunidade) => void;
  demonstrarInteresse: (id: string) => Promise<Oportunidade>;
  naoConsigoAtender: (id: string, motivo: MotivoRecusa | null) => Promise<Oportunidade>;
  iniciarContato: (id: string, canal: 'whatsapp' | 'telefone') => Promise<Oportunidade>;
  encerrar: (id: string, resultado: Resultado) => Promise<Oportunidade>;

  /** Só em desenvolvimento: troca o conjunto de exemplos. */
  cenario: Cenario;
  trocarCenario: (c: Cenario) => void;
};

const Contexto = createContext<Valor | null>(null);

export function CarteiraProvider({ children }: { children: ReactNode }) {
  const [cenario, setCenario] = useState<Cenario>('movimentada');
  const [situacao, setSituacao] = useState<Situacao>('carregando');
  const [carteira, setCarteira] = useState<Carteira | null>(null);
  const [erro, setErro] = useState<ErroDeDados | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [agora, setAgora] = useState(() => new Date());

  const cenarioRef = useRef(cenario);
  cenarioRef.current = cenario;

  const carregar = useCallback(async (alvo: Cenario, ehAtualizacao: boolean) => {
    try {
      const { carteira: nova } = await lerCarteira(alvo);
      if (cenarioRef.current !== alvo) return;
      setCarteira(nova);
      setErro(null);
      setSituacao('pronto');
      setAgora(new Date());
    } catch (e) {
      if (cenarioRef.current !== alvo) return;
      setErro(comoErroDeDados(e));
      // Uma falha ao atualizar não apaga o que já está na tela: melhor um
      // conteúdo de um minuto atrás do que uma tela vazia.
      if (!ehAtualizacao) {
        setCarteira(null);
        setSituacao('erro');
      }
    }
  }, []);

  useEffect(() => {
    setSituacao('carregando');
    setCarteira(null);
    setErro(null);
    void carregar(cenario, false);
  }, [cenario, carregar]);

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    try {
      await carregar(cenarioRef.current, true);
    } finally {
      setAtualizando(false);
    }
  }, [carregar]);

  /** Substitui uma oportunidade no lugar, sem recarregar a lista inteira. */
  const substituir = useCallback((atualizada: Oportunidade) => {
    setCarteira((atual) =>
      atual
        ? {
            ...atual,
            oportunidades: atual.oportunidades.map((o) =>
              o.id === atualizada.id ? atualizada : o,
            ),
          }
        : atual,
    );
  }, []);

  const oportunidades = useMemo(
    () => [...(carteira?.oportunidades ?? [])].sort(ordemDeLeitura),
    [carteira],
  );

  const buscar = useCallback(
    (id: string) => carteira?.oportunidades.find((o) => o.id === id),
    [carteira],
  );

  const carregarUma = useCallback(
    async (id: string) => {
      const achada = await lerOportunidade(cenarioRef.current, id);
      substituir(achada);
      return achada;
    },
    [substituir],
  );

  /**
   * Abrir é a única transição que o sistema faz sozinho, porque abrir é um
   * comportamento que ele realmente observa. Vale uma vez: reabrir não conta
   * de novo, nem no estado nem na medição.
   */
  const abrir = useCallback(
    (o: Oportunidade) => {
      if (o.estado !== 'nova') return;
      registrar({
        nome: 'oportunidade_vista',
        id: o.id,
        categoria: o.categoria,
        urgencia: o.urgencia,
      });
      void marcarComoVista(cenarioRef.current, o.id)
        .then((atualizada) => {
          if (atualizada) substituir(atualizada);
        })
        .catch(() => {
          // Marcar como vista é conveniência, não decisão: se falhar, a
          // oportunidade continua nova e ninguém precisa saber disso.
        });
    },
    [substituir],
  );

  const demonstrarInteresse = useCallback(
    async (id: string) => {
      const atualizada = await interesseNoRepositorio(cenarioRef.current, id);
      substituir(atualizada);
      registrar({
        nome: 'interesse_demonstrado',
        id,
        categoria: atualizada.categoria,
      });
      return atualizada;
    },
    [substituir],
  );

  const naoConsigoAtender = useCallback(
    async (id: string, motivo: MotivoRecusa | null) => {
      const atualizada = await recusaNoRepositorio(cenarioRef.current, id, motivo);
      substituir(atualizada);
      registrar({ nome: 'nao_consigo_atender', id, motivo });
      return atualizada;
    },
    [substituir],
  );

  const iniciarContato = useCallback(
    async (id: string, canal: 'whatsapp' | 'telefone') => {
      const atualizada = await contatoNoRepositorio(cenarioRef.current, id, canal);
      substituir(atualizada);
      registrar({ nome: 'contato_iniciado', id, canal });
      return atualizada;
    },
    [substituir],
  );

  const encerrar = useCallback(
    async (id: string, resultado: Resultado) => {
      const atualizada = await encerrarNoRepositorio(cenarioRef.current, id, resultado);
      substituir(atualizada);
      registrar({ nome: 'oportunidade_encerrada', id, resultado });
      return atualizada;
    },
    [substituir],
  );

  const trocarCenario = useCallback((proximo: Cenario) => {
    esquecerMemoria();
    setCenario(proximo);
  }, []);

  const valor = useMemo<Valor>(
    () => ({
      situacao,
      oportunidades,
      profissional: carteira?.profissional ?? null,
      pendencia: carteira?.pendencia ?? null,
      contaNova: carteira?.contaNova ?? false,
      erro,
      atualizando,
      esperando: contarEsperando(oportunidades),
      agora,
      atualizar,
      buscar,
      carregarUma,
      abrir,
      demonstrarInteresse,
      naoConsigoAtender,
      iniciarContato,
      encerrar,
      cenario,
      trocarCenario,
    }),
    [
      situacao,
      oportunidades,
      carteira,
      erro,
      atualizando,
      agora,
      atualizar,
      buscar,
      carregarUma,
      abrir,
      demonstrarInteresse,
      naoConsigoAtender,
      iniciarContato,
      encerrar,
      cenario,
      trocarCenario,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarteira(): Valor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useCarteira precisa estar dentro de <CarteiraProvider>.');
  return valor;
}
