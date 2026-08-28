/**
 * O que uma notificação do Canaã Resolve carrega — o lado do aplicativo.
 *
 * O outro lado deste contrato é `lib/push/mensagens.ts`, no repositório do
 * site. Os dois precisam concordar, e a forma de garantir isso não é confiar:
 * é `lerCarga` recusar tudo que não bater, e o aplicativo tratar uma carga
 * desconhecida como "não consegui abrir isto" em vez de estourar (§71).
 *
 * **A regra mais importante desta fase mora aqui**, e é a única que o resto do
 * módulo não pode violar: *a carga não é fonte de verdade* (§22). Ela diz que
 * algo aconteceu e para onde ir. O estado real vem do repositório, quando a
 * tela abrir. Um push que diz "Nova" pode chegar depois de a oportunidade ter
 * sido encerrada, e quem acredita nele mostra o passado.
 */

/** As três famílias de aviso. Poucas de propósito (§7). */
export type TipoDeAviso =
  | 'oportunidade.nova'
  | 'oportunidade.atualizada'
  | 'conta.seguranca'
  | 'canaa.comunicado';

const TIPOS: readonly TipoDeAviso[] = [
  'oportunidade.nova',
  'oportunidade.atualizada',
  'conta.seguranca',
  'canaa.comunicado',
];

/** O que veio dentro do push. Espelha `CargaDoAviso` do servidor. */
export type Carga = {
  tipo: TipoDeAviso;
  /** Ex.: `oportunidade/o1`. Sem barra inicial — ver `destino.ts`. */
  destino: string;
  oportunidadeId?: string;
  /** Quando o fato aconteceu no servidor. ISO. */
  em: string;
  /** A identidade do fato — dois avisos com a mesma chave são o mesmo (§48). */
  evento: string;
  /** De quem é este aviso. Conferido contra a conta aberta antes de navegar. */
  para: string;
};

/**
 * Lê o que veio no push, sem confiar em nada.
 *
 * Um payload malformado — de uma versão antiga, de um teste manual, de um
 * envio com erro — não pode derrubar o aplicativo nem levar a lugar nenhum.
 * Devolve `null`, e quem chamou trata como link inválido.
 */
export function lerCarga(bruto: unknown): Carga | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const d = bruto as Record<string, unknown>;

  const tipo = d.tipo;
  if (typeof tipo !== 'string' || !TIPOS.includes(tipo as TipoDeAviso)) return null;

  const destino = typeof d.destino === 'string' ? d.destino.trim() : '';
  if (!destino) return null;

  const para = typeof d.para === 'string' ? d.para : '';
  if (!para) return null;

  return {
    tipo: tipo as TipoDeAviso,
    destino,
    oportunidadeId: typeof d.oportunidadeId === 'string' ? d.oportunidadeId : undefined,
    em: typeof d.em === 'string' ? d.em : new Date().toISOString(),
    evento: typeof d.evento === 'string' ? d.evento : `${tipo}:${destino}`,
    para,
  };
}

/**
 * As categorias que o profissional controla (§36).
 *
 * Três, e nenhuma delas é marketing — que não existe nesta fase e, quando
 * existir, precisa da própria (§38). Segurança não está aqui de propósito:
 * ela não responde a um interruptor de comunicação comum (§37).
 */
export type CategoriaDePreferencia = 'oportunidades' | 'atualizacoes' | 'comunicados';

export const categoriasDePreferencia: CategoriaDePreferencia[] = [
  'oportunidades',
  'atualizacoes',
  'comunicados',
];

export const rotuloCategoria: Record<CategoriaDePreferencia, string> = {
  oportunidades: 'Novas oportunidades',
  atualizacoes: 'Atualizações importantes',
  comunicados: 'Comunicados do Canaã Resolve',
};

export const explicacaoCategoria: Record<CategoriaDePreferencia, string> = {
  oportunidades: 'Quando um pedido compatível com o que você faz chega até você.',
  atualizacoes: 'Quando algo muda em uma oportunidade sua de um jeito que você precisa saber.',
  comunicados: 'Avisos do Canaã Resolve sobre o serviço. São raros.',
};

/** A que preferência cada tipo responde. `null` = não desligável. */
export const preferenciaDoTipo: Record<TipoDeAviso, CategoriaDePreferencia | null> = {
  'oportunidade.nova': 'oportunidades',
  'oportunidade.atualizada': 'atualizacoes',
  'conta.seguranca': null,
  'canaa.comunicado': 'comunicados',
};

/**
 * O estado da permissão do sistema — que **não** é a mesma coisa que a
 * preferência do usuário dentro do aplicativo (§88).
 *
 * Confundir as duas é o erro que o §35 proíbe: um interruptor ligado dentro do
 * aplicativo enquanto o iOS bloqueia a entrega mente sobre o que vai acontecer.
 */
export type EstadoDaPermissao =
  /** Ainda estamos consultando o sistema. */
  | 'lendo'
  /** O sistema entrega. */
  | 'concedida'
  /** Nunca perguntamos. É onde todo mundo começa (§30). */
  | 'a-perguntar'
  /** Perguntamos e a pessoa disse não. Dá para perguntar de novo. */
  | 'negada'
  /** Negada de vez: só pelas configurações do aparelho (§34). */
  | 'bloqueada'
  /** Aqui não existe push remoto: navegador, ou Expo Go no Android/iOS. */
  | 'indisponivel';

export const frasePermissao: Record<EstadoDaPermissao, string> = {
  lendo: 'Conferindo…',
  concedida: 'Ativadas',
  'a-perguntar': 'Ainda não ativadas',
  negada: 'Desativadas',
  bloqueada: 'Bloqueadas no aparelho',
  indisponivel: 'Não disponível neste ambiente',
};
