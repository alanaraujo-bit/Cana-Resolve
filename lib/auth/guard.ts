import "server-only";

import { redirect } from "next/navigation";

import { getSessionUser, type SessionUser } from "./session";

/**
 * A conferência que vale.
 *
 * O `proxy.ts` só olha se existe um cookie. É aqui que se descobre se a sessão
 * ainda é válida e se o operador continua ativo — e é por isso que toda página
 * e toda ação do Operations começam por esta função, mesmo já estando "atrás"
 * do porteiro. Autorização que só existe na borda não é autorização.
 */
export async function requireOperator(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/ops/entrar");
  return user;
}

/** Para ações: devolve o erro em vez de redirecionar no meio de um formulário. */
export async function operatorOrNull() {
  return getSessionUser();
}

export class NotAuthenticated extends Error {
  constructor() {
    super("Sua sessão expirou. Entre de novo para continuar.");
    this.name = "NotAuthenticated";
  }
}
