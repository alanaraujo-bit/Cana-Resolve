/**
 * A fonte única de estado da reputação.
 *
 * A capa do Perfil, a prévia pública, a lista completa e o detalhe de uma
 * avaliação leem **daqui**. Não há duas cópias e — mais importante — não há
 * duas contas: a média e a contagem saem de `resumir`, sobre a lista inteira,
 * uma vez (§47, §107). Quando a API chegar, é o `repositorio` que muda; este
 * arquivo não.
 *
 * Ele vive na pilha do Perfil (`perfil/_layout.tsx`), ao lado do
 * `PerfilProvider`. **É por isso que a tela de uma avaliação mora dentro dessa
 * pilha** (`/perfil/avaliacoes/:id`) e não em uma rota de topo: um deep link
 * que abrisse a tela fora do provedor estouraria — e um push tocado com o
 * aplicativo frio é exatamente o caso em que isso aconteceria.
 *
 * **O carregamento é isolado de propósito (§104, §105).** As avaliações não
 * bloqueiam o Perfil: elas têm situação própria, e o Perfil continua inteiro
 * quando elas falham. Uma reputação que não carrega não pode derrubar a tela
 * onde o parceiro edita o telefone.
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
  apenasLocal,
  comoErroDeReputacao,
  denunciar as denunciarNoRepo,
  editarResposta as editarNoRepo,
  esquecer,
  lerAvaliacoes,
  marcarVista as marcarVistaNoRepo,
  removerResposta as removerNoRepo,
  responder as responderNoRepo,
  type ErroDeReputacao,
} from './repositorio';
import {
  contarNaoVistas,
  ordemDeLeitura,
  resumir,
  type Avaliacao,
  type MotivoDeDenuncia,
  type ResumoDeReputacao,
} from './tipos';

export type Situacao = 'carregando' | 'pronto' | 'erro';

type Valor = {
  situacao: Situacao;
  /** Tudo que já foi carregado, na ordem de leitura. */
  avaliacoes: Avaliacao[];
  /** A fonte única de média e contagem. Nunca recalculada em outro lugar. */
  resumo: ResumoDeReputacao;
  /** Quantas o profissional ainda não abriu. **Não** é o selo da aba (§76). */
  naoVistas: number;
  erro: ErroDeReputacao | null;
  atualizando: boolean;
  /** `true` enquanto há mais páginas para buscar (§99). */
  temMais: boolean;
  carregandoMais: boolean;
  /** `true` enquanto as ações não alcançam o servidor. A tela informa. */
  somenteLocal: boolean;

  atualizar: () => Promise<void>;
  carregarMais: () => Promise<void>;
  porId: (id: string) => Avaliacao | null;
  marcarVista: (id: string) => void;
  responder: (id: string, texto: string) => Promise<void>;
  editarResposta: (id: string, texto: string) => Promise<void>;
  removerResposta: (id: string) => Promise<void>;
  denunciar: (id: string, motivo: MotivoDeDenuncia, comentario?: string) => Promise<void>;

  /** Só em desenvolvimento: troca o conjunto de exemplos. */
  cenario: Cenario;
  trocarCenario: (c: Cenario) => Promise<void>;
};

const Contexto = createContext<Valor | null>(null);

/** Nada carregado ainda: sem média, e **não** com média zero. */
const RESUMO_VAZIO: ResumoDeReputacao = {
  media: null,
  total: 0,
  distribuicao: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  foraDaConta: 0,
  ultimaEm: null,
  volume: 'nenhuma',
};

export function ReputacaoProvider({ children }: { children: ReactNode }) {
  const [cenario, setCenario] = useState<Cenario>('consistente');
  const [situacao, setSituacao] = useState<Situacao>('carregando');
  /**
   * `todas` é a lista completa que o repositório conhece; `avaliacoes` é o que
   * já foi paginado para a tela. O resumo lê `todas` — porque a média de um
   * parceiro não pode depender de quanto o dedo já rolou (§99).
   */
  const [todas, setTodas] = useState<Avaliacao[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [erro, setErro] = useState<ErroDeReputacao | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);

  // Uma resposta de um cenário antigo não pode sobrescrever o atual.
  const cenarioRef = useRef(cenario);
  cenarioRef.current = cenario;

  const carregar = useCallback(async (alvo: Cenario, ehAtualizacao: boolean) => {
    if (ehAtualizacao) setAtualizando(true);
    try {
      const pagina = await lerAvaliacoes(alvo, null);
      if (cenarioRef.current !== alvo) return;
      setTodas(pagina.todas);
      setAvaliacoes(pagina.avaliacoes);
      setCursor(pagina.cursor);
      setErro(null);
      setSituacao('pronto');
    } catch (e) {
      if (cenarioRef.current !== alvo) return;
      setErro(comoErroDeReputacao(e));
      // Numa atualização que falhou, o que já estava na tela continua lá —
      // §103: avaliação já carregada continua visível quando a rede cai.
      setSituacao((s) => (s === 'pronto' && ehAtualizacao ? 'pronto' : 'erro'));
    } finally {
      if (cenarioRef.current === alvo) setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    void carregar(cenario, false);
  }, [carregar, cenario]);

  const atualizar = useCallback(async () => {
    await carregar(cenarioRef.current, true);
  }, [carregar]);

  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  const carregarMais = useCallback(async () => {
    const alvo = cenarioRef.current;
    const proximo = cursorRef.current;
    if (!proximo || carregandoMais) return;

    setCarregandoMais(true);
    try {
      const pagina = await lerAvaliacoes(alvo, proximo);
      if (cenarioRef.current !== alvo) return;
      setTodas(pagina.todas);
      setAvaliacoes((atuais) => {
        // Uma página repetida — dedo rápido, duas chamadas — não pode duplicar
        // um cartão na lista.
        const vistos = new Set(atuais.map((a) => a.id));
        return [...atuais, ...pagina.avaliacoes.filter((a) => !vistos.has(a.id))];
      });
      setCursor(pagina.cursor);
    } catch {
      // Falhar em buscar mais não desmonta o que já está na tela: o rodapé
      // volta a oferecer "carregar mais" e a pessoa decide.
    } finally {
      if (cenarioRef.current === alvo) setCarregandoMais(false);
    }
  }, [carregandoMais]);

  /** Aplica o resultado de uma ação nas duas listas, sem reler tudo. */
  const trocar = useCallback((nova: Avaliacao) => {
    const troca = (lista: Avaliacao[]) =>
      lista.map((a) => (a.id === nova.id ? nova : a)).sort(ordemDeLeitura);
    setTodas(troca);
    setAvaliacoes(troca);
  }, []);

  const todasRef = useRef(todas);
  todasRef.current = todas;

  /**
   * **`porId` depende de `todas`, e a dependência é a funcionalidade.**
   *
   * A versão anterior lia o `ref` com lista de dependências vazia, o que a
   * tornava estável entre renders. Parecia melhor — menos recriação — e
   * quebrava a tela de detalhe inteira: ela guarda a avaliação num `useMemo`
   * com `[id, porId]`, e com `porId` imutável **o memo nunca recalculava**.
   * Publicar uma resposta gravava tudo certo no repositório, atualizava a
   * lista, e a tela continuava mostrando o objeto de antes — sem resposta,
   * ainda oferecendo "Responder". O mesmo valia para a contestação: o estado
   * virava `em-analise` e a tela não dizia nada.
   *
   * Encontrado olhando o produto, não o código: tipo, lint e as 44 asserções
   * do domínio passavam todos.
   */
  const porId = useCallback(
    (id: string) => todas.find((a) => a.id === id) ?? null,
    [todas],
  );

  const marcarVista = useCallback(
    (id: string) => {
      const atual = todasRef.current.find((a) => a.id === id);
      if (!atual || atual.vista) return;
      registrar({ nome: 'avaliacao_vista', avaliacaoId: id });
      // Otimista: o ponto some no toque. Se o disco recusar, ele volta na
      // próxima leitura — e ninguém perde nada por isso.
      trocar({ ...atual, vista: true });
      void marcarVistaNoRepo(cenarioRef.current, id);
    },
    [trocar],
  );

  const responder = useCallback(
    async (id: string, texto: string) => {
      const nova = await responderNoRepo(cenarioRef.current, id, texto);
      trocar(nova);
      registrar({
        nome: 'resposta_publicada',
        avaliacaoId: id,
        tamanho: nova.resposta?.texto.length ?? 0,
        edicao: false,
      });
    },
    [trocar],
  );

  const editarResposta = useCallback(
    async (id: string, texto: string) => {
      const nova = await editarNoRepo(cenarioRef.current, id, texto);
      trocar(nova);
      registrar({
        nome: 'resposta_publicada',
        avaliacaoId: id,
        tamanho: nova.resposta?.texto.length ?? 0,
        edicao: true,
      });
    },
    [trocar],
  );

  const removerResposta = useCallback(
    async (id: string) => {
      const nova = await removerNoRepo(cenarioRef.current, id);
      trocar(nova);
      registrar({ nome: 'resposta_removida', avaliacaoId: id });
    },
    [trocar],
  );

  const denunciar = useCallback(
    async (id: string, motivo: MotivoDeDenuncia, comentario?: string) => {
      const nova = await denunciarNoRepo(cenarioRef.current, id, motivo, comentario);
      trocar(nova);
      // Sem id: cruzar denúncia com avaliação específica é moderação, não
      // métrica de produto (§79).
      registrar({ nome: 'avaliacao_denunciada', motivo });
    },
    [trocar],
  );

  const trocarCenario = useCallback(async (c: Cenario) => {
    await esquecer();
    setSituacao('carregando');
    setTodas([]);
    setAvaliacoes([]);
    setCursor(null);
    setCenario(c);
  }, []);

  const resumo = useMemo(() => (todas.length ? resumir(todas) : RESUMO_VAZIO), [todas]);
  const naoVistas = useMemo(() => contarNaoVistas(todas), [todas]);

  const valor = useMemo<Valor>(
    () => ({
      situacao,
      avaliacoes,
      resumo,
      naoVistas,
      erro,
      atualizando,
      temMais: cursor !== null,
      carregandoMais,
      somenteLocal: apenasLocal(),
      atualizar,
      carregarMais,
      porId,
      marcarVista,
      responder,
      editarResposta,
      removerResposta,
      denunciar,
      cenario,
      trocarCenario,
    }),
    [
      situacao,
      avaliacoes,
      resumo,
      naoVistas,
      erro,
      atualizando,
      cursor,
      carregandoMais,
      atualizar,
      carregarMais,
      porId,
      marcarVista,
      responder,
      editarResposta,
      removerResposta,
      denunciar,
      cenario,
      trocarCenario,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useReputacao(): Valor {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error('useReputacao precisa estar dentro de <ReputacaoProvider>.');
  }
  return valor;
}
