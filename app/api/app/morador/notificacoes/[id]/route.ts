import { residentFromRequest } from "@/lib/auth/bearer";
import { erro, freio, naoAutenticado, ok, protegido } from "@/lib/api/respond";
import { isDatabaseConfigured } from "@/lib/db/client";
import { markNotificationRead, residentRequests } from "@/lib/domain/audience";

/**
 * Marcar como lida.
 *
 * A notificação do morador é endereçada à **solicitação**, não a uma conta —
 * ele não tem uma. Por isso o destinatário permitido é o conjunto de pedidos
 * deste WhatsApp, e é esse conjunto que entra na cláusula da atualização.
 */
export async function POST(request: Request, context: RouteContext<"/api/app/morador/notificacoes/[id]">) {
  return protegido("morador/notificacoes/[id]", async () => {
    const travado = freio(request, "app-morador-escrita", 60);
    if (travado) return travado;

    const viewer = residentFromRequest(request);
    if (!viewer) return naoAutenticado();
    if (!isDatabaseConfigured()) return erro("indisponivel", 503);

    const { id } = await context.params;
    const pedidos = await residentRequests(viewer.whatsapp);
    await markNotificationRead(id, "resident", pedidos.map((pedido) => pedido.id));
    return ok({});
  });
}
