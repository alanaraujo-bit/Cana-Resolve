import { NextResponse, type NextRequest } from "next/server";

/**
 * Porteiro otimista do Operations.
 *
 * Aqui só se olha se **existe** um cookie de sessão. Não é autorização: o
 * cookie pode estar vencido, revogado ou pertencer a um operador desativado, e
 * nada disso se descobre sem ir ao banco. A conferência de verdade acontece em
 * `requireOperator()`, do lado do servidor, em toda página e toda ação.
 *
 * O que este arquivo evita é o desperdício: quem claramente não está logado é
 * mandado para a tela de entrada antes de qualquer consulta.
 */

const SESSION_COOKIE = "cr_ops_sessao";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/ops/entrar") {
    if (hasCookie) {
      return NextResponse.redirect(new URL("/ops", request.url));
    }
    return NextResponse.next();
  }

  if (!hasCookie) {
    const url = new URL("/ops/entrar", request.url);
    // Depois de entrar, a pessoa volta para onde estava tentando ir.
    if (pathname !== "/ops") url.searchParams.set("proximo", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ops", "/ops/:path*"],
};
