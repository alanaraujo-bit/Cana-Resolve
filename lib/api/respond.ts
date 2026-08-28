import { NextResponse } from "next/server";

import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * O formato das respostas da API do app.
 *
 * É o mesmo vocabulário que `app/api/publico/` já fala — `{ ok, erro }`, com
 * `erro` sendo um código estável em português, nunca a mensagem de tela. Quem
 * escreve a frase que a pessoa lê é o app, porque só ele sabe em que contexto
 * o erro apareceu. Manter um vocabulário só evita que o cliente precise de
 * dois tratadores de erro para o mesmo servidor.
 */
export type ErroApi =
  | "corpo_invalido"
  | "validacao"
  | "nao_autenticado"
  | "nao_encontrado"
  | "nao_permitido"
  | "muitas_tentativas"
  | "indisponivel"
  | "falha";

export function ok<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function erro(codigo: ErroApi, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, erro: codigo, ...extra }, { status });
}

export const naoAutenticado = () => erro("nao_autenticado", 401);
export const naoEncontrado = () => erro("nao_encontrado", 404);

/**
 * O freio, já no formato de resposta. Devolve `null` quando pode seguir.
 *
 * Fica aqui e não em cada rota porque toda rota do app precisa dele: um token
 * roubado ou um app com laço quebrado não pode virar carga no Postgres.
 */
export function freio(request: Request, escopo: string, limite: number, janelaMs = 60_000) {
  const limit = rateLimit(callerKey(request.headers, escopo), limite, janelaMs);
  if (limit.ok) return null;
  return erro("muitas_tentativas", 429, { esperarSegundos: limit.retryAfter });
}

/**
 * Envelope de erro para tudo que escapar. O detalhe vai para o log do
 * servidor; o cliente recebe só o código — mensagem de exceção de banco não é
 * coisa que se manda para um aparelho na rua.
 */
export async function protegido(escopo: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[api/app/${escopo}]`, error instanceof Error ? error.message : error);
    return erro("falha", 500);
  }
}

/** Corpo JSON, ou `null` se não for JSON válido. */
export async function corpo(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
