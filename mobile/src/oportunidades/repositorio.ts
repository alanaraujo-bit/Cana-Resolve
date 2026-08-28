/**
 * De onde as oportunidades vêm, e para onde as decisões vão.
 *
 * Esta é a única fronteira do módulo com "o mundo". As telas não sabem se o
 * que leem veio de rede, de cache ou de exemplo — elas recebem `Carteira` e
 * chamam ações que devolvem a oportunidade já atualizada.
 *
 * Duas regras vivem aqui, e não nas telas:
 *
 * 1. **Privacidade.** O telefone da pessoa só existe no objeto depois que o
 *    profissional se coloca à disposição. Não é um `if` de render: é o
 *    repositório que não entrega o dado antes da hora, para que nenhuma tela
 *    possa vazá-lo por descuido.
 * 2. **Honestidade.** Sem API configurada, em desenvolvimento a interface é
 *    alimentada por exemplos declarados; em produção nada conclui, e a falha é
 *    dita com todas as letras. É a mesma regra da autenticação na Fase 01.
 *
 * A leitura já nasce paginada (`Pagina`), não porque hoje existam muitas, mas
 * porque o histórico cresce e a camada de dados não deve supor dez itens.
 */
import { authConfig } from '@/auth/config';
import { carteiraDeExemplo, type Cenario } from './exemplos';
import type {
  Carteira,
  Contato,
  Evento,
  MotivoRecusa,
  Oportunidade,
  Resultado,
} from './tipos';

const MENSAGEM_LISTA = 'Não foi possível carregar suas oportunidades agora.';
const MENSAGEM_ACAO = 'Não foi possível registrar isso agora.';
const ATRASO = 520;
const ATRASO_ACAO = 260;

/** Erro com frase de produto. O detalhe técnico só aparece em desenvolvimento. */
export class ErroDeDados extends Error {
  readonly detalhe?: string;
  /** `true` quando a oportunidade existe mas não está mais disponível. */
  readonly indisponivel: boolean;

  constructor(mensagem: string, detalhe?: string, indisponivel = false) {
    super(mensagem);
    this.name = 'ErroDeDados';
    this.detalhe = detalhe;
    this.indisponivel = indisponivel;
  }
}

export function comoErroDeDados(e: unknown, padrao = MENSAGEM_LISTA): ErroDeDados {
  if (e instanceof ErroDeDados) return e;
  return new ErroDeDados(padrao, e instanceof Error ? e.message : String(e));
}

/** Uma página de leitura. `cursor` nulo significa que acabou. */
export type Pagina = {
  carteira: Carteira;
  cursor: string | null;
};

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * O estado de desenvolvimento vive aqui dentro, e não nas telas: assim a Home,
 * a Central e o detalhe leem sempre o mesmo, e a coerência entre elas não
 * depende de ninguém lembrar de sincronizar nada.
 */
let memoria: { cenario: Cenario; carteira: Carteira } | null = null;

function carteiraViva(cenario: Cenario): Carteira {
  if (!memoria || memoria.cenario !== cenario) {
    memoria = { cenario, carteira: carteiraDeExemplo(cenario) };
  }
  return memoria.carteira;
}

/** Recomeça do zero — o seletor de cenário e o "puxar para atualizar" usam. */
export function esquecerMemoria() {
  memoria = null;
}

/**
 * O que a interface pode ver de uma oportunidade, dado o estágio dela.
 *
 * Antes de o profissional se colocar à disposição, o contato simplesmente não
 * existe no objeto que sai daqui.
 */
function comPrivacidade(o: Oportunidade): Oportunidade {
  const liberado = o.estado === 'interessado' || o.estado === 'em-contato' || o.estado === 'encerrada';
  return { ...o, contato: liberado ? o.contato : null };
}

/**
 * A porta é a API de **dados**, não a de autenticação: desde 28/08/2026 a
 * entrada é real e a leitura de oportunidades ainda não existe. Olhar para a
 * autenticação aqui apagaria os exemplos no dia em que o login ficou pronto.
 */
function semApi(): boolean {
  return !authConfig.dataApiBaseUrl;
}

function exigirDesenvolvimento(mensagem: string) {
  if (!__DEV__) {
    throw new ErroDeDados(
      mensagem,
      'EXPO_PUBLIC_AUTH_API_URL não configurada — veja BLOCKERS.md.',
    );
  }
}

/** Lê a carteira inteira. O cursor já existe para o dia em que ela crescer. */
export async function lerCarteira(cenario: Cenario): Promise<Pagina> {
  if (semApi()) {
    exigirDesenvolvimento(MENSAGEM_LISTA);
    await espera(ATRASO);
    if (cenario === 'erro') {
      throw new ErroDeDados(
        MENSAGEM_LISTA,
        'Cenário de exemplo "erro", para conferir o estado de falha.',
      );
    }
    const carteira = carteiraViva(cenario);
    return {
      carteira: {
        ...carteira,
        oportunidades: carteira.oportunidades.map(comPrivacidade),
      },
      cursor: null,
    };
  }

  // O dia em que a API existir, é aqui que ela entra — e nenhuma tela muda.
  throw new ErroDeDados(MENSAGEM_LISTA, 'A leitura de oportunidades ainda não foi implementada.');
}

/** Lê uma oportunidade só — o caminho de um link ou de uma notificação. */
export async function lerOportunidade(cenario: Cenario, id: string): Promise<Oportunidade> {
  if (semApi()) {
    exigirDesenvolvimento(MENSAGEM_LISTA);
    await espera(ATRASO);
    const achada = carteiraViva(cenario).oportunidades.find((o) => o.id === id);
    if (!achada) {
      throw new ErroDeDados(
        'Esta oportunidade não está mais disponível.',
        `Nenhuma oportunidade com o id "${id}" neste conjunto de exemplos.`,
        true,
      );
    }
    return comPrivacidade(achada);
  }

  throw new ErroDeDados(MENSAGEM_LISTA, 'A leitura de uma oportunidade ainda não foi implementada.');
}

type Mudanca = {
  estado?: Oportunidade['estado'];
  resultado?: Resultado | null;
  motivoRecusa?: MotivoRecusa | null;
  evento?: Evento;
  /** O contato que a decisão libera. */
  contato?: Contato | null;
};

/**
 * Aplica uma decisão. Devolve a oportunidade como ela ficou — a tela nunca
 * monta o novo estado por conta própria.
 */
async function decidir(cenario: Cenario, id: string, mudanca: Mudanca): Promise<Oportunidade> {
  if (!semApi()) {
    throw new ErroDeDados(MENSAGEM_ACAO, 'O registro de decisões ainda não foi implementado.');
  }

  exigirDesenvolvimento(MENSAGEM_ACAO);
  await espera(ATRASO_ACAO);

  const carteira = carteiraViva(cenario);
  const indice = carteira.oportunidades.findIndex((o) => o.id === id);
  if (indice < 0) {
    throw new ErroDeDados(
      'Esta oportunidade não está mais disponível.',
      `Nenhuma oportunidade com o id "${id}".`,
      true,
    );
  }

  const atual = carteira.oportunidades[indice];
  const proxima: Oportunidade = {
    ...atual,
    estado: mudanca.estado ?? atual.estado,
    resultado: mudanca.resultado !== undefined ? mudanca.resultado : atual.resultado,
    motivoRecusa: mudanca.motivoRecusa !== undefined ? mudanca.motivoRecusa : atual.motivoRecusa,
    contato: mudanca.contato !== undefined ? mudanca.contato : atual.contato,
    historico: mudanca.evento ? [...atual.historico, mudanca.evento] : atual.historico,
  };

  carteira.oportunidades = [
    ...carteira.oportunidades.slice(0, indice),
    proxima,
    ...carteira.oportunidades.slice(indice + 1),
  ];

  return comPrivacidade(proxima);
}

/**
 * Abrir uma oportunidade nova a marca como vista. Abrir de novo não faz nada —
 * a transição acontece uma vez, e é ela que autoriza o evento de analytics.
 */
export async function marcarComoVista(cenario: Cenario, id: string): Promise<Oportunidade | null> {
  const carteira = semApi() && __DEV__ ? carteiraViva(cenario) : null;
  const atual = carteira?.oportunidades.find((o) => o.id === id);
  if (atual && atual.estado !== 'nova') return null;

  return decidir(cenario, id, {
    estado: 'vista',
    evento: { tipo: 'vista', em: new Date() },
  });
}

/**
 * "Consigo atender". É esta decisão que libera o contato — e é por isso que o
 * telefone entra no objeto exatamente aqui, e não antes.
 */
export async function registrarInteresse(cenario: Cenario, id: string): Promise<Oportunidade> {
  const carteira = semApi() && __DEV__ ? carteiraViva(cenario) : null;
  const atual = carteira?.oportunidades.find((o) => o.id === id);

  return decidir(cenario, id, {
    estado: 'interessado',
    contato: atual?.contato ?? contatoDeExemplo(id),
    evento: { tipo: 'interesse', em: new Date() },
  });
}

export async function registrarContato(
  cenario: Cenario,
  id: string,
  canal: 'whatsapp' | 'telefone',
): Promise<Oportunidade> {
  return decidir(cenario, id, {
    estado: 'em-contato',
    evento: {
      tipo: 'contato',
      em: new Date(),
      detalhe: canal === 'whatsapp' ? 'Pelo WhatsApp' : 'Por telefone',
    },
  });
}

export async function registrarRecusa(
  cenario: Cenario,
  id: string,
  motivo: MotivoRecusa | null,
): Promise<Oportunidade> {
  return decidir(cenario, id, {
    estado: 'encerrada',
    resultado: 'nao-consegui-atender',
    motivoRecusa: motivo,
    evento: {
      tipo: 'encerrada',
      em: new Date(),
      detalhe: motivo ? undefined : 'Não consegui atender',
    },
  });
}

export async function encerrar(
  cenario: Cenario,
  id: string,
  resultado: Resultado,
): Promise<Oportunidade> {
  return decidir(cenario, id, {
    estado: 'encerrada',
    resultado,
    evento: { tipo: 'encerrada', em: new Date() },
  });
}

/**
 * Só existe porque os exemplos precisam de um telefone plausível quando o
 * profissional demonstra interesse em algo que ainda não tinha contato. Some
 * junto com `exemplos.ts` no dia em que a API entregar o dado de verdade.
 */
function contatoDeExemplo(id: string): Contato {
  const nomes = ['Rafaela', 'Domingos', 'Célia', 'Ivan', 'Marlene', 'Aldo'];
  const soma = [...id].reduce((t, c) => t + c.charCodeAt(0), 0);
  return {
    primeiroNome: nomes[soma % nomes.length],
    telefone: `+55999${String(80000000 + (soma * 7919) % 9999999).slice(0, 8)}`,
    whatsapp: true,
  };
}
