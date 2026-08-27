import { NextResponse } from "next/server";

import { residentCookieOptions, RESIDENT_COOKIE, verifyResidentToken } from "@/lib/auth/audience";
import { callerKey, rateLimit } from "@/lib/rate-limit";

/**
 * A porta de entrada do link que o morador recebe depois de pedir ajuda.
 *
 * Fica fora de `/acompanhar` de propósito: aqui é o único lugar que grava o
 * cookie a partir de um token da URL, então é o único lugar que precisa saber
 * que a URL existe. Todo o resto do Portal do Morador só lê o cookie.
 *
 * O cookie é gravado diretamente na resposta de redirecionamento — não via
 * `cookies().set()` seguido de `redirect()` de `next/navigation`. Esse
 * segundo caminho lança uma exceção (`NEXT_REDIRECT`) para o framework
 * converter em resposta, e não há garantia documentada de que uma mutação de
 * cookie feita antes sobrevive até lá dentro de um Route Handler. Montar o
 * `NextResponse.redirect` como retorno normal, com o cookie escrito nele,
 * elimina a dúvida.
 */
export async function GET(request: Request) {
  const limit = rateLimit(callerKey(request.headers, "acesso-morador"), 30, 60_000);
  if (limit.ok === false) {
    return NextResponse.json({ erro: "muitas_tentativas" }, { status: 429 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("t");
  const destino = url.searchParams.get("r");

  const viewer = token ? verifyResidentToken(token) : null;
  if (!viewer || !token) {
    return NextResponse.redirect(new URL("/acompanhar?erro=link", url.origin));
  }

  const response = NextResponse.redirect(
    new URL(destino ? `/acompanhar/${destino}` : "/acompanhar", url.origin),
  );
  response.cookies.set(RESIDENT_COOKIE, token, residentCookieOptions());
  return response;
}
