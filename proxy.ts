import { NextResponse, type NextRequest } from "next/server";

/**
 * Porteiro otimista do Operations e do Portal do Parceiro.
 *
 * Aqui só se olha se **existe** um cookie de sessão. Não é autorização: o
 * cookie pode estar vencido, revogado ou pertencer a alguém desativado, e nada
 * disso se descobre sem ir ao banco. A conferência de verdade acontece em
 * `requireOperator()` / `getPartnerViewer()`, do lado do servidor, em toda
 * página e toda ação.
 *
 * O que este arquivo evita é o desperdício: quem claramente não está logado é
 * mandado para a tela de entrada antes de qualquer consulta. O morador não
 * tem entrada equivalente aqui — não existe cookie de sessão para conferir,
 * porque o acesso é um link assinado, não um login (ver `lib/auth/audience.ts`).
 */

const OPS_COOKIE = "cr_ops_sessao";
const PARTNER_COOKIE = "cr_parceiro_sessao";

type Area = { prefix: string; entryPath: string; cookie: string };

const areas: Area[] = [
  { prefix: "/ops", entryPath: "/ops/entrar", cookie: OPS_COOKIE },
  { prefix: "/parceiro", entryPath: "/parceiro/entrar", cookie: PARTNER_COOKIE },
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const area = areas.find((a) => pathname === a.prefix || pathname.startsWith(a.prefix + "/"));
  if (!area) return NextResponse.next();

  const hasCookie = Boolean(request.cookies.get(area.cookie)?.value);

  if (pathname === area.entryPath) {
    if (hasCookie) {
      return NextResponse.redirect(new URL(area.prefix, request.url));
    }
    return NextResponse.next();
  }

  if (!hasCookie) {
    const url = new URL(area.entryPath, request.url);
    // Depois de entrar, a pessoa volta para onde estava tentando ir.
    if (pathname !== area.prefix) url.searchParams.set("proximo", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ops", "/ops/:path*", "/parceiro", "/parceiro/:path*"],
};
