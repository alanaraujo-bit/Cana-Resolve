/**
 * Quem pode avaliar, e quando.
 *
 * Este arquivo é o §5, o §50, o §52, o §53 e o §54 escritos como código —
 * lógica pura, sem tela e sem rede, para que a regra possa ser conferida por
 * asserção e não por inspeção visual.
 *
 * **Ele não roda no aplicativo do profissional.** O profissional não avalia
 * ninguém; quem avalia é o morador, cuja área ainda não existe. Então por que
 * escrever isto agora? Porque a regra é a definição da entidade, e uma entidade
 * definida depois da interface nasce torta: sem ela, a primeira tela de morador
 * a ser escrita inventaria o próprio critério, e o critério inventado seria
 * "qualquer um pode avaliar" — que é exatamente o que o §6 proíbe.
 *
 * O servidor é quem decide de verdade (§130). Isto é o contrato que ele terá de
 * cumprir, e a referência para o dia em que a área do morador for construída.
 */

// Caminho relativo, e não o alias `@/`: este é um dos arquivos que o `tsc` do
// **repositório do site** alcança, porque `tests/reputacao.test.ts` o importa
// para conferir a elegibilidade por asserção. Lá o `@/` aponta para a raiz do
// site, e o alias do aplicativo não existe — o import quebraria o typecheck de
// lá sem quebrar o daqui, que é o pior jeito de descobrir o problema.
import type { Estado, Resultado } from '../oportunidades/tipos';

/**
 * O que se sabe sobre a relação, no momento em que alguém tenta avaliar.
 *
 * Nenhum campo aqui é opinião. Todos existem no domínio da Fase 03 ou são
 * conhecidos pelo servidor no instante da chamada.
 */
export type ContextoDeAvaliacao = {
  /** A oportunidade que originou (ou não) o serviço. */
  oportunidade: {
    id: string;
    estado: Estado;
    resultado: Resultado | null;
    /** Quem recebeu a oportunidade. */
    profissionalId: string;
    /** Quem pediu. É o único que pode avaliar (§5, §6). */
    moradorId: string;
    /** Quando encerrou. `null` enquanto não encerrou. */
    encerradaEm: Date | null;
  };
  /** Quem está tentando avaliar. */
  autorId: string;
  /** Já existe avaliação desta pessoa para esta oportunidade? (§50) */
  jaAvaliou: boolean;
  /** Quando aquela avaliação foi feita — a janela de edição sai daqui (§51). */
  avaliadaEm: Date | null;
  agora?: Date;
};

export type Impedimento =
  /** Não é o morador daquela oportunidade. Fecha a avaliação pública irrestrita. */
  | 'nao-participou'
  /** É o próprio profissional tentando se avaliar (§53). */
  | 'autoavaliacao'
  /** A oportunidade ainda não terminou (§54). */
  | 'ainda-nao-encerrou'
  /** Encerrou sem que serviço nenhum tenha existido (§63). */
  | 'sem-servico'
  /** Já avaliou, e a janela de correção passou (§50, §51). */
  | 'ja-avaliou'
  /** Passou tempo demais desde o encerramento. */
  | 'tarde-demais';

export type Elegibilidade =
  | { pode: true; modo: 'criar' | 'editar' }
  | { pode: false; motivo: Impedimento };

/**
 * Quanto tempo depois do encerramento ainda faz sentido avaliar.
 *
 * Noventa dias não é um número mágico: é o ponto além do qual a memória do
 * atendimento já não descreve o atendimento. Uma janela aberta para sempre é
 * também uma janela aberta para retaliação meses depois.
 */
export const JANELA_PARA_AVALIAR_DIAS = 90;

/**
 * Quanto tempo o morador tem para corrigir a própria avaliação (§51).
 *
 * Curto de propósito, e a razão é a mesma que faz a resposta ser uma só: uma
 * avaliação editável indefinidamente vira moeda de troca — "tiro a nota se
 * você voltar aqui". Sete dias cobrem o arrependimento honesto.
 */
export const JANELA_PARA_EDITAR_DIAS = 7;

const DIA = 86_400_000;

/**
 * **Os resultados que autorizam uma avaliação (§55, §56, §63).**
 *
 * Um só, e a escolha é o coração desta fase. "Serviço realizado" é o único
 * resultado em que houve, de fato, um serviço para avaliar. "Cliente ainda
 * decidindo", "não fechamos" e "não consegui atender" descrevem oportunidades
 * que **não** viraram serviço — e o §63 é explícito: oportunidade encerrada não
 * é sucesso, e oportunidade recebida não é contratação.
 *
 * E o §56 é a outra metade: o profissional dizer "realizado" **não** produz uma
 * avaliação positiva, nem produz avaliação nenhuma. Produz apenas o direito de
 * o morador ser perguntado. Ele continua inteiramente livre para dar uma
 * estrela.
 */
export const RESULTADOS_QUE_HABILITAM: readonly Resultado[] = ['servico-realizado'];

export function podeAvaliar(ctx: ContextoDeAvaliacao): Elegibilidade {
  const agora = ctx.agora ?? new Date();
  const o = ctx.oportunidade;

  // §53 — e vem antes de tudo, porque é o único impedimento que descreve má-fé
  // em vez de uma etapa que ainda não chegou.
  if (ctx.autorId === o.profissionalId) {
    return { pode: false, motivo: 'autoavaliacao' };
  }

  // §5, §6 — a avaliação pertence a uma interação real, e a quem participou
  // dela. Conhecer o id de uma oportunidade não faz de ninguém participante.
  if (ctx.autorId !== o.moradorId) {
    return { pode: false, motivo: 'nao-participou' };
  }

  // §54 — não se pede avaliação de um serviço que ainda não aconteceu.
  if (o.estado !== 'encerrada' || !o.encerradaEm) {
    return { pode: false, motivo: 'ainda-nao-encerrou' };
  }

  // §63 — encerrada não quer dizer atendida.
  if (!o.resultado || !RESULTADOS_QUE_HABILITAM.includes(o.resultado)) {
    return { pode: false, motivo: 'sem-servico' };
  }

  // §50 — uma avaliação por relação. Editar atualiza a mesma, não cria outra.
  if (ctx.jaAvaliou) {
    const desde = ctx.avaliadaEm ? agora.getTime() - ctx.avaliadaEm.getTime() : Infinity;
    if (desde <= JANELA_PARA_EDITAR_DIAS * DIA) return { pode: true, modo: 'editar' };
    return { pode: false, motivo: 'ja-avaliou' };
  }

  if (agora.getTime() - o.encerradaEm.getTime() > JANELA_PARA_AVALIAR_DIAS * DIA) {
    return { pode: false, motivo: 'tarde-demais' };
  }

  return { pode: true, modo: 'criar' };
}

/**
 * A frase de cada impedimento, para o dia em que a área do morador existir.
 *
 * Nenhuma acusa. "Não participou" não vira "você não tem permissão": a pessoa
 * que caiu num link errado não fez nada de errado.
 */
export const explicacaoImpedimento: Record<Impedimento, string> = {
  'nao-participou': 'Só quem foi atendido pelo Canaã Resolve pode avaliar este atendimento.',
  autoavaliacao: 'Um profissional não avalia o próprio atendimento.',
  'ainda-nao-encerrou': 'Este atendimento ainda está em andamento.',
  'sem-servico': 'Este pedido não chegou a virar um serviço realizado.',
  'ja-avaliou': 'Você já avaliou este atendimento.',
  'tarde-demais': 'O prazo para avaliar este atendimento já passou.',
};

/* -------------------------------------------------------------------------- */
/*  O convite                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * O estado que liga o encerramento à futura pergunta ao morador (§57).
 *
 * Não há push para morador nesta fase, porque não há morador nesta fase — e
 * mandar um aviso para uma área que não existe seria construir a metade que
 * ninguém consegue ver. O que existe é o **fato**: uma oportunidade encerrada
 * como serviço realizado passa a ter uma avaliação pendente de convite.
 *
 * Quem implementar a área do morador consome isto e decide a UX. O nome é o do
 * §57 (`review_requested`), traduzido.
 */
export type ConviteDeAvaliacao = {
  oportunidadeId: string;
  moradorId: string;
  profissionalId: string;
  /** Quando o encerramento tornou a avaliação possível. */
  habilitadoEm: Date;
  situacao: 'a-convidar' | 'convidado' | 'respondido' | 'expirado';
};

/**
 * O convite que um encerramento gera — ou `null`, quando não gera nenhum.
 *
 * A função existe para que a resposta a "este encerramento vira convite?" seja
 * a mesma no servidor e em qualquer futura tela, e não duas leituras
 * parecidas do mesmo parágrafo.
 */
export function conviteDoEncerramento(o: ContextoDeAvaliacao['oportunidade']): ConviteDeAvaliacao | null {
  if (o.estado !== 'encerrada' || !o.encerradaEm) return null;
  if (!o.resultado || !RESULTADOS_QUE_HABILITAM.includes(o.resultado)) return null;

  return {
    oportunidadeId: o.id,
    moradorId: o.moradorId,
    profissionalId: o.profissionalId,
    habilitadoEm: o.encerradaEm,
    situacao: 'a-convidar',
  };
}

/* -------------------------------------------------------------------------- */
/*  Fraude                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * O que este modelo já impede, e o que ele ainda não impede (§52).
 *
 * Escrito como texto, e não como código, porque a honestidade sobre o que
 * **não** está protegido vale mais do que um antifraude de mentira. As três
 * primeiras linhas são garantidas pelas funções acima; as três últimas
 * dependem do servidor e estão em `REPUTACAO.md` como pendência declarada.
 *
 * Impedido aqui:
 * - autoavaliação (`autoavaliacao`);
 * - avaliação por quem não participou (`nao-participou`);
 * - avaliação repetida na mesma relação (`ja-avaliou`).
 *
 * Não impedido aqui, e por isso declarado:
 * - contas relacionadas (mesma pessoa com dois cadastros);
 * - oportunidades criadas só para gerar avaliação;
 * - repetição massiva vinda de um mesmo endereço ou aparelho.
 *
 * Os três dependem de sinais que só o servidor tem — e nenhum deles se resolve
 * com um `if` na interface. Fingir que sim seria pior do que dizer que falta.
 */
export const LIMITES_CONHECIDOS = [
  'contas-relacionadas',
  'oportunidades-fabricadas',
  'repeticao-massiva',
] as const;
