/**
 * A regra dos 90 dias do Beta Fundador.
 *
 * Este arquivo existiu antes, foi embora com o Operations, e volta ao mesmo
 * caminho porque `lib/db/schema.ts` já o cita pelo nome: a coluna
 * `partners.betaStartedAt` tem, no comentário, a frase "Só é preenchido no
 * lançamento da operação. Ver lib/domain/beta.ts".
 *
 * Uma regra, e ela é contra-intuitiva o bastante para ser o motivo de o
 * arquivo existir:
 *
 * # OS 90 DIAS NÃO COMEÇAM NO PAGAMENTO.
 *
 * Começam no **início oficial da operação para moradores**. Um profissional
 * que paga em 10 de setembro, numa operação que abre em 1º de outubro, tem
 * Beta de 1º de outubro a 30 de dezembro — e não de 10 de setembro. Nenhum dia
 * é consumido enquanto não há morador do outro lado, porque o que ele comprou
 * foi a possibilidade de receber oportunidades, e ela não existe antes disso.
 *
 * Três decisões técnicas que sustentam isso:
 *
 * 1. **A data oficial é uma só** (`settings["operacao.inicio"]`), e não um
 *    campo por parceiro. Cada parceiro calculando a partir de um evento
 *    diferente produziria noventa Betas diferentes, e nenhum auditável.
 *
 * 2. **Não existe padrão.** Se a data não estiver definida, esta camada
 *    devolve `aguardando-lancamento` e ninguém inventa `new Date()`. Um
 *    `?? new Date()` aqui seria uma data de lançamento fictícia, que é
 *    exatamente o que o produto proíbe.
 *
 * 3. **O cálculo é em instantes, nunca em datas locais.** Somar 90 dias em
 *    milissegundos sobre um `timestamptz` não tem fuso, não tem horário de
 *    verão e não muda conforme o relógio de quem pergunta. O que o aparelho
 *    recebe é o resultado — ver `lib/domain/comercial/situacao.ts`.
 */

/** Quantos dias dura o período do Beta Fundador. */
export const DIAS_DO_BETA = 90;

const DIA_EM_MS = 86_400_000;

/**
 * Quando a operação foi oficialmente aberta aos moradores.
 *
 * `null` é uma resposta legítima e frequente: hoje a data não existe. Quem
 * recebe `null` diz "avisaremos quando a operação começar", e não uma data.
 */
export type InicioDaOperacao = Date | null;

export type FaseDoBeta = "aguardando-lancamento" | "ativo" | "encerrado";

export type JanelaDoBeta = {
  fase: FaseDoBeta;
  /** `null` enquanto a operação não começou. */
  inicio: Date | null;
  /** `null` enquanto a operação não começou. Sempre `inicio + 90 dias`. */
  fim: Date | null;
  /**
   * Quantos dias ainda restam, já arredondados para cima e nunca negativos.
   *
   * `null` antes do começo — e é de propósito que não seja `90`: "faltam 90
   * dias" e "ainda não começou" são estados diferentes, e mostrar o primeiro
   * no lugar do segundo é o countdown falso que o produto proíbe.
   */
  diasRestantes: number | null;
  /** Quantos dias já correram. `null` antes do começo. */
  diasDecorridos: number | null;
};

/**
 * Quando o Beta **deste** parceiro começa.
 *
 * A regra oficial é o início da operação. A exceção — explícita, como o
 * produto exige que qualquer exceção seja — é quem paga **depois** do
 * lançamento: esse recebe 90 dias a partir do próprio pagamento, e não os
 * restos do período de quem já estava lá. Vender "90 dias" e entregar 62 seria
 * a mesma desonestidade que consumir o prazo antes de abrir.
 *
 * `null` quando a operação ainda não começou, ou quando não houve pagamento.
 */
export function inicioDoBeta(
  pagoEm: Date | null,
  inicioDaOperacao: InicioDaOperacao,
): Date | null {
  if (!pagoEm || !inicioDaOperacao) return null;
  return pagoEm.getTime() > inicioDaOperacao.getTime() ? pagoEm : inicioDaOperacao;
}

/** O fim, a partir do início. Exato, em instantes. */
export function fimDoBeta(inicio: Date): Date {
  return new Date(inicio.getTime() + DIAS_DO_BETA * DIA_EM_MS);
}

/**
 * A janela inteira, do jeito que a interface precisa dela.
 *
 * `inicio` é o que está gravado em `partners.betaStartedAt` — um valor que só
 * o lançamento escreve. Passar `null` aqui é o caso normal antes da abertura.
 */
export function janelaDoBeta(inicio: Date | null, agora: Date): JanelaDoBeta {
  if (!inicio) {
    return {
      fase: "aguardando-lancamento",
      inicio: null,
      fim: null,
      diasRestantes: null,
      diasDecorridos: null,
    };
  }

  const fim = fimDoBeta(inicio);
  const faltam = fim.getTime() - agora.getTime();
  const correram = agora.getTime() - inicio.getTime();

  return {
    fase: faltam > 0 ? "ativo" : "encerrado",
    inicio,
    fim,
    // Arredondar para cima: no instante em que a operação abre, restam 90 —
    // não 89 e fração. E no último dia ainda resta 1, não 0.
    diasRestantes: Math.max(0, Math.ceil(faltam / DIA_EM_MS)),
    diasDecorridos: Math.max(0, Math.min(DIAS_DO_BETA, Math.floor(correram / DIA_EM_MS))),
  };
}

/**
 * A partir de quando vale avisar que o Beta está terminando.
 *
 * Sete dias, e nem um a mais: um aviso que aparece com trinta dias de
 * antecedência não é informação, é pressão diária. Ver §32 — a linguagem é
 * "seu período Beta termina em 7 dias", nunca "CORRA".
 */
export const DIAS_DE_AVISO_DO_FIM = 7;

export function estaTerminando(janela: JanelaDoBeta): boolean {
  return (
    janela.fase === "ativo" &&
    janela.diasRestantes !== null &&
    janela.diasRestantes <= DIAS_DE_AVISO_DO_FIM
  );
}
