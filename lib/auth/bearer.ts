import "server-only";

import {
  resolvePartnerByToken,
  verifyResidentToken,
  type PartnerViewer,
  type ResidentViewer,
} from "@/lib/auth/audience";

/**
 * A credencial do app nativo, lida do cabeçalho em vez do cookie.
 *
 * O app não tem cookie jar: ele guarda o token no chaveiro do aparelho e o
 * manda em `Authorization: Bearer …`. Este arquivo é só a tradução desse
 * transporte para os mesmos verificadores que a web já usa — nenhuma regra de
 * autorização nova mora aqui, de propósito. Se um dia a resposta a "quem é
 * este parceiro?" mudar, ela muda num lugar só, em `lib/auth/audience.ts`.
 *
 * Cookie não é aceito nestas rotas. Um endpoint que autentica por cookie e
 * aceita JSON de qualquer origem é a receita de CSRF; exigir um cabeçalho que
 * o navegador nunca manda sozinho fecha essa porta sem token de CSRF nenhum.
 */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, ...resto] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer") return null;
  const token = resto.join("");
  return token.length ? token : null;
}

export function residentFromRequest(request: Request): ResidentViewer | null {
  const token = bearerToken(request);
  return token ? verifyResidentToken(token) : null;
}

export async function partnerFromRequest(request: Request): Promise<PartnerViewer | null> {
  const token = bearerToken(request);
  return token ? resolvePartnerByToken(token) : null;
}
