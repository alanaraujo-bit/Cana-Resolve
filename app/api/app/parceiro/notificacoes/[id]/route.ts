import { partnerFromRequest } from "@/lib/auth/bearer";
import { freio, naoAutenticado, ok, protegido } from "@/lib/api/respond";
import { markNotificationRead } from "@/lib/domain/audience";

/**
 * Marcar como lida.
 *
 * A resposta é a mesma tenha a notificação sido marcada ou não. `markNotificationRead`
 * já restringe a atualização ao destinatário certo, então uma tentativa de
 * marcar a notificação de outro parceiro não escreve nada — e não vale a pena
 * responder de forma diferente, o que só confirmaria a existência do registro.
 */
export async function POST(request: Request, context: RouteContext<"/api/app/parceiro/notificacoes/[id]">) {
  return protegido("parceiro/notificacoes/[id]", async () => {
    const travado = freio(request, "app-parceiro-escrita", 60);
    if (travado) return travado;

    const viewer = await partnerFromRequest(request);
    if (!viewer) return naoAutenticado();

    const { id } = await context.params;
    await markNotificationRead(id, "partner", [viewer.id]);
    return ok({});
  });
}
