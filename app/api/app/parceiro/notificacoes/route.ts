import { partnerFromRequest } from "@/lib/auth/bearer";
import { freio, naoAutenticado, ok, protegido } from "@/lib/api/respond";
import { partnerNotifications } from "@/lib/domain/audience";

export async function GET(request: Request) {
  return protegido("parceiro/notificacoes", async () => {
    const travado = freio(request, "app-parceiro", 60);
    if (travado) return travado;

    const viewer = await partnerFromRequest(request);
    if (!viewer) return naoAutenticado();

    return ok({ itens: await partnerNotifications(viewer.id) });
  });
}
