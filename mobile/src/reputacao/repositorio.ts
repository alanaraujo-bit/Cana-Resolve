/**
 * De onde as avaliações vêm, e para onde as ações vão.
 *
 * A única fronteira do módulo com "o mundo", como no Perfil e nas
 * Oportunidades. As telas recebem `Avaliacao` e chamam ações; elas não sabem —
 * e não devem saber — se aquilo veio de rede, de disco ou de exemplo.
 *
 * Três regras vivem aqui, e não nas telas:
 *
 * 1. **Honestidade.** Sem API de dados, em desenvolvimento a interface é
 *    alimentada por exemplos declarados; em produção nada carrega e a falha é
 *    dita com todas as letras. Nunca uma avaliação inventada em produção
 *    (§4, §38 dos critérios).
 * 2. **Privacidade na origem (§40).** O que sai daqui já vem anonimizado: o
 *    objeto `Avaliacao` não tem telefone, e-mail nem id de morador para
 *    vazar. Uma tela não pode expor um dado que nunca recebeu — a mesma
 *    disciplina com que o repositório de oportunidades só entrega o contato
 *    depois do interesse.
 * 3. **O que o profissional não pode fazer não existe como função.** Não há
 *    `removerAvaliacao`, não há `alterarNota`, não há `editarComentario`
 *    (§17, §128). Não é uma permissão negada em tempo de execução: é uma
 *    operação ausente do módulo inteiro.
 *
 * A leitura já nasce paginada (§99), não porque hoje existam muitas, mas porque
 * o histórico cresce e a camada de dados não deve supor trinta itens.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { authConfig } from '@/auth/config';
import { chaves } from '@/session/chaves';
import { avaliacoesDeExemplo, type Cenario } from './exemplos';
import {
  MAXIMO_DA_DENUNCIA,
  MAXIMO_DA_RESPOSTA,
  ordemDeLeitura,
  textoSeguro,
  type Avaliacao,
  type MotivoDeDenuncia,
} from './tipos';

const MENSAGEM_LEITURA = 'Não foi possível carregar as avaliações agora.';
const MENSAGEM_ACAO = 'Não foi possível registrar isso agora.';
const ATRASO = 480;
const ATRASO_ACAO = 300;

/** Quantas por página. Pequeno o bastante para a primeira tela chegar rápido. */
export const POR_PAGINA = 10;

/** Erro com frase de produto. O detalhe técnico só aparece em desenvolvimento. */
export class ErroDeReputacao extends Error {
  readonly detalhe?: string;
  /** `true` quando a avaliação existe mas não está mais disponível. */
  readonly indisponivel: boolean;

  constructor(mensagem: string, detalhe?: string, indisponivel = false) {
    super(mensagem);
    this.name = 'ErroDeReputacao';
    this.detalhe = detalhe;
    this.indisponivel = indisponivel;
  }
}

export function comoErroDeReputacao(e: unknown, padrao = MENSAGEM_LEITURA): ErroDeReputacao {
  if (e instanceof ErroDeReputacao) return e;
  return new ErroDeReputacao(padrao, e instanceof Error ? e.message : String(e));
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A porta é a API de **dados**, não a de autenticação.
 *
 * A separação existe desde 28/08/2026, quando juntar as duas numa variável só
 * apagou os exemplos do aplicativo inteiro no dia em que o login ficou pronto.
 * Ver `auth/config.ts` e `PROGRESSO.md`.
 */
function semApi(): boolean {
  return !authConfig.dataApiBaseUrl;
}

function exigirDesenvolvimento(mensagem: string) {
  if (!__DEV__) {
    throw new ErroDeReputacao(
      mensagem,
      'EXPO_PUBLIC_DATA_API_URL não configurada — ver REPUTACAO.md e BLOCKERS.md.',
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  Estado local — só desenvolvimento                                         */
/* -------------------------------------------------------------------------- */

/**
 * **Este bloco é onde a Fase 05 e a Fase 06 sangraram, e por isso ele tem
 * comentário maior do que código.**
 *
 * Duas vezes o mesmo defeito passou por tipo, lint e suíte de navegador: um
 * `memoria` de módulo consultado **antes** do disco, e um `esquecer()` que só
 * limpava o disco. O parceiro seguinte a entrar no mesmo aparelho, sem fechar o
 * aplicativo, encontrava os dados do anterior.
 *
 * Aqui o dado é pior: são **comentários de clientes** sobre atendimentos de
 * outra pessoa. Então a limpeza é tripla e nenhuma parte é opcional:
 *
 * 1. `memoria = null` — a cópia viva desta execução;
 * 2. `AsyncStorage.removeItem` — o rascunho gravado;
 * 3. `chaves.avaliacoesRascunho` está em `chavesDaConta`, e `esquecer()` é
 *    chamado por `session/limpeza.ts`.
 *
 * Tirar qualquer uma das três reintroduz o vazamento.
 */
const CHAVE = chaves.avaliacoesRascunho;

let memoria: { cenario: Cenario; lista: Avaliacao[] } | null = null;

/** `Date` não sobrevive a JSON. Estas duas funções cuidam disso e nada mais. */
function paraTexto(lista: Avaliacao[]): string {
  return JSON.stringify(lista, (_c, v) => (v instanceof Date ? { __data: v.toISOString() } : v));
}

function deTexto(texto: string): Avaliacao[] {
  return JSON.parse(texto, (_c, v) => {
    if (v && typeof v === 'object' && typeof v.__data === 'string') return new Date(v.__data);
    return v;
  }) as Avaliacao[];
}

async function lerRascunho(cenario: Cenario): Promise<Avaliacao[] | null> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE);
    if (!bruto) return null;
    const guardado = JSON.parse(bruto) as { cenario?: string; lista?: string };
    // Um rascunho de outro cenário não vale: ele descreve outro conjunto.
    if (guardado.cenario !== cenario || typeof guardado.lista !== 'string') return null;
    return deTexto(guardado.lista);
  } catch {
    // Rascunho ilegível não pode impedir a tela de abrir: cai no exemplo.
    return null;
  }
}

async function gravarRascunho(cenario: Cenario, lista: Avaliacao[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE, JSON.stringify({ cenario, lista: paraTexto(lista) }));
  } catch {
    /* conveniência de desenvolvimento, não dado crítico */
  }
}

/**
 * Apaga tudo que é da conta. Memória **e** disco — ver o bloco acima.
 *
 * Chamado por `session/limpeza.ts` no logout, e pelo seletor de cenário.
 */
export async function esquecer(): Promise<void> {
  memoria = null;
  try {
    await AsyncStorage.removeItem(CHAVE);
  } catch {
    /* a chave também está em `chavesDaConta`, como rede de segurança */
  }
}

async function listaViva(cenario: Cenario): Promise<Avaliacao[]> {
  if (memoria && memoria.cenario === cenario) return memoria.lista;
  const rascunho = await lerRascunho(cenario);
  const lista = (rascunho ?? avaliacoesDeExemplo(cenario)).slice().sort(ordemDeLeitura);
  memoria = { cenario, lista };
  return lista;
}

async function guardar(cenario: Cenario, lista: Avaliacao[]): Promise<void> {
  memoria = { cenario, lista };
  await gravarRascunho(cenario, lista);
}

/* -------------------------------------------------------------------------- */
/*  Leitura                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Uma página de avaliações.
 *
 * `resumoDe` não vem daqui: quem calcula média e contagem é `resumir`, no
 * domínio, sobre a lista inteira (§47, §107). Uma média por página seria a
 * média de dez itens apresentada como a média do parceiro.
 */
export type Pagina = {
  avaliacoes: Avaliacao[];
  /** `null` quando acabou. */
  cursor: string | null;
  /** O total de avaliações existentes, para o resumo não depender da página. */
  todas: Avaliacao[];
};

/**
 * Lê uma página de avaliações do profissional autenticado.
 *
 * **Não recebe um id de profissional de propósito.** Quem decide de quem são as
 * avaliações é a sessão, no servidor — passar um id daqui abriria a porta que o
 * §130 manda fechar: "nenhuma manipulação via ID arbitrário".
 */
export async function lerAvaliacoes(cenario: Cenario, cursor?: string | null): Promise<Pagina> {
  if (semApi()) {
    exigirDesenvolvimento(MENSAGEM_LEITURA);
    await espera(cursor ? ATRASO / 2 : ATRASO);

    if (cenario === 'erro') {
      throw new ErroDeReputacao(
        MENSAGEM_LEITURA,
        'Cenário de exemplo "erro", para conferir o estado de falha.',
      );
    }

    const todas = await listaViva(cenario);
    const inicio = cursor ? Number(cursor) : 0;
    const fatia = todas.slice(inicio, inicio + POR_PAGINA);
    const proximo = inicio + POR_PAGINA;

    return {
      avaliacoes: fatia,
      cursor: proximo < todas.length ? String(proximo) : null,
      todas,
    };
  }

  throw new ErroDeReputacao(
    MENSAGEM_LEITURA,
    'Leitura de avaliações pela API ainda não implementada — ver REPUTACAO.md.',
  );
}

/** Uma avaliação, pelo id. É o destino de um deep link. */
export async function lerAvaliacao(cenario: Cenario, id: string): Promise<Avaliacao> {
  if (semApi()) {
    exigirDesenvolvimento(MENSAGEM_LEITURA);
    await espera(ATRASO / 2);

    const achada = (await listaViva(cenario)).find((a) => a.id === id);
    if (!achada) {
      throw new ErroDeReputacao(
        'Esta avaliação não está mais disponível.',
        `Nenhuma avaliação com id "${id}" no cenário "${cenario}".`,
        true,
      );
    }
    return achada;
  }

  throw new ErroDeReputacao(
    MENSAGEM_LEITURA,
    'Leitura de avaliação pela API ainda não implementada — ver REPUTACAO.md.',
  );
}

/* -------------------------------------------------------------------------- */
/*  Ações                                                                     */
/* -------------------------------------------------------------------------- */

async function aplicar(
  cenario: Cenario,
  id: string,
  mudar: (a: Avaliacao) => Avaliacao,
): Promise<Avaliacao> {
  const lista = await listaViva(cenario);
  const i = lista.findIndex((a) => a.id === id);
  if (i < 0) {
    throw new ErroDeReputacao('Esta avaliação não está mais disponível.', undefined, true);
  }
  const nova = mudar(lista[i]!);
  const proxima = lista.slice();
  proxima[i] = nova;
  await guardar(cenario, proxima);
  return nova;
}

/**
 * Marca que o profissional abriu esta avaliação (§77).
 *
 * Silenciosa: nunca falha para o usuário, porque "eu vi" não é uma ação que
 * mereça erro na tela. Se não gravar, o ponto continua lá e some da próxima vez.
 */
export async function marcarVista(cenario: Cenario, id: string): Promise<Avaliacao | null> {
  if (semApi()) {
    if (!__DEV__) return null;
    try {
      return await aplicar(cenario, id, (a) => (a.vista ? a : { ...a, vista: true }));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Publica a resposta do profissional.
 *
 * **Uma só (§13, §14).** Responder de novo não empilha: quem já respondeu
 * chega aqui por `editarResposta`, e a diferença entre as duas funções é o que
 * impede a thread de nascer.
 */
export async function responder(cenario: Cenario, id: string, texto: string): Promise<Avaliacao> {
  const limpo = textoSeguro(texto, MAXIMO_DA_RESPOSTA);
  if (!limpo) throw new ErroDeReputacao('Escreva sua resposta antes de publicar.');

  if (semApi()) {
    exigirDesenvolvimento(MENSAGEM_ACAO);
    await espera(ATRASO_ACAO);
    return aplicar(cenario, id, (a) => {
      if (a.resposta) throw new ErroDeReputacao('Você já respondeu esta avaliação.');
      if (a.estado === 'removida') {
        throw new ErroDeReputacao('Esta avaliação foi removida e não aceita mais resposta.');
      }
      return { ...a, resposta: { texto: limpo, em: new Date(), editadaEm: null } };
    });
  }

  throw new ErroDeReputacao(
    MENSAGEM_ACAO,
    'Envio de resposta pela API ainda não implementado — ver REPUTACAO.md.',
  );
}

/** Corrige a própria resposta (§15). A avaliação do cliente não é tocada. */
export async function editarResposta(
  cenario: Cenario,
  id: string,
  texto: string,
): Promise<Avaliacao> {
  const limpo = textoSeguro(texto, MAXIMO_DA_RESPOSTA);
  if (!limpo) throw new ErroDeReputacao('Escreva sua resposta antes de publicar.');

  if (semApi()) {
    exigirDesenvolvimento(MENSAGEM_ACAO);
    await espera(ATRASO_ACAO);
    return aplicar(cenario, id, (a) => {
      if (!a.resposta) throw new ErroDeReputacao('Não há resposta para editar.');
      return { ...a, resposta: { ...a.resposta, texto: limpo, editadaEm: new Date() } };
    });
  }

  throw new ErroDeReputacao(MENSAGEM_ACAO, 'Edição de resposta pela API ainda não implementada.');
}

/**
 * Remove a própria resposta (§16).
 *
 * **A avaliação do cliente continua exatamente onde estava.** É o parágrafo
 * inteiro em uma linha de código: o que sai é `resposta`, e nada mais.
 */
export async function removerResposta(cenario: Cenario, id: string): Promise<Avaliacao> {
  if (semApi()) {
    exigirDesenvolvimento(MENSAGEM_ACAO);
    await espera(ATRASO_ACAO);
    return aplicar(cenario, id, (a) => ({ ...a, resposta: null }));
  }

  throw new ErroDeReputacao(MENSAGEM_ACAO, 'Remoção de resposta pela API ainda não implementada.');
}

/**
 * Contesta uma avaliação (§18, §19).
 *
 * **Denunciar não remove.** A avaliação passa a `em-analise` — sai da média
 * pública e continua existindo, visível para o profissional, com o estado
 * escrito. Uma pessoa decide depois. Se isto apagasse a avaliação, o §17 estaria
 * quebrado: o profissional teria controle direto sobre a própria reputação, e
 * bastaria denunciar tudo que incomodasse.
 */
export async function denunciar(
  cenario: Cenario,
  id: string,
  motivo: MotivoDeDenuncia,
  comentario?: string,
): Promise<Avaliacao> {
  const limpo = comentario ? textoSeguro(comentario, MAXIMO_DA_DENUNCIA) : '';

  if (semApi()) {
    exigirDesenvolvimento(MENSAGEM_ACAO);
    await espera(ATRASO_ACAO);
    return aplicar(cenario, id, (a) => {
      if (a.denuncia) throw new ErroDeReputacao('Você já contestou esta avaliação.');
      return {
        ...a,
        estado: 'em-analise',
        denuncia: {
          motivo,
          comentario: limpo || null,
          em: new Date(),
          situacao: 'em-analise',
        },
      };
    });
  }

  throw new ErroDeReputacao(MENSAGEM_ACAO, 'Envio de denúncia pela API ainda não implementado.');
}

/** O rascunho ainda não saiu do aparelho. A tela avisa isso uma vez. */
export function apenasLocal(): boolean {
  return semApi();
}
