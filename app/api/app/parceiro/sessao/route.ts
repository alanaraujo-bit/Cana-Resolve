import { z } from "zod";

import { createPartnerSession, resolvePartnerByToken, revokePartnerToken } from "@/lib/auth/audience";
import { bearerToken } from "@/lib/auth/bearer";
import { corpo, erro, naoAutenticado, ok, protegido } from "@/lib/api/respond";

/**
 * A entrada do Parceiro no app.
 *
 * Os freios de tentativa não estão aqui: vivem dentro de `createPartnerSession`,
 * junto da conferência de código + WhatsApp, porque protegem a credencial e
 * não o cliente. Web e app compartilham os mesmos contadores — quem tenta
 * forçar um código não ganha o dobro de tentativas por atacar pelos dois lados.
 */
const entrada = z.object({
  codigo: z.string().trim().min(1).max(20),
  telefone: z.string().trim().min(8).max(24),
});

export async function POST(request: Request) {
  return protegido("parceiro/sessao", async () => {
    const payload = await corpo(request);
    const parsed = entrada.safeParse(payload);
    if (!parsed.success) return erro("validacao", 422);

    const session = await createPartnerSession(parsed.data.codigo, parsed.data.telefone, request.headers);
    if (!session.ok) {
      if (session.error === "muitas_tentativas") {
        return erro("muitas_tentativas", 429, { esperarSegundos: session.retryAfter });
      }
      // "dados" vira 401 e não 422 de propósito: a credencial foi bem formada,
      // ela só não confere. E a resposta não diz qual das duas metades errou.
      return session.error === "indisponivel" ? erro("indisponivel", 503) : naoAutenticado();
    }

    return ok(
      {
        token: session.token,
        expiraEm: session.expiresAt.toISOString(),
        parceiro: await resolvePartnerByToken(session.token),
      },
      201,
    );
  });
}

/** Sair. Revoga a sessão no banco — não basta o app esquecer o token. */
export async function DELETE(request: Request) {
  return protegido("parceiro/sessao", async () => {
    const token = bearerToken(request);
    if (!token) return naoAutenticado();
    await revokePartnerToken(token);
    return ok({});
  });
}
