/**
 * O formato de resposta de toda ação do Operations.
 *
 * Uma forma só para tudo: a interface sabe exibir sucesso e erro sem que cada
 * tela invente o próprio contrato. `erro` é sempre uma frase que o operador
 * pode ler — nunca um código, nunca a mensagem crua do banco.
 */
export type ActionResult = {
  ok?: boolean;
  erro?: string;
  mensagem?: string;
};

export type ServerAction = (
  estadoAnterior: ActionResult,
  formData: FormData,
) => Promise<ActionResult>;

/** Traduz uma exceção em algo que faça sentido para quem está operando. */
export function falha(error: unknown, padrao = "Não deu para concluir."): ActionResult {
  if (error instanceof Error && error.name === "TransitionError") {
    return { ok: false, erro: error.message };
  }
  console.error("[ops] ação falhou", error);
  return { ok: false, erro: padrao };
}
