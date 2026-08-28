import { residentFromRequest } from "@/lib/auth/bearer";
import { erro, freio, naoAutenticado, ok, protegido } from "@/lib/api/respond";
import { isDatabaseConfigured } from "@/lib/db/client";
import { residentNotifications } from "@/lib/domain/audience";

export async function GET(request: Request) {
  return protegido("morador/notificacoes", async () => {
    const travado = freio(request, "app-morador", 60);
    if (travado) return travado;

    const viewer = residentFromRequest(request);
    if (!viewer) return naoAutenticado();
    if (!isDatabaseConfigured()) return erro("indisponivel", 503);

    return ok({ itens: await residentNotifications(viewer.whatsapp) });
  });
}
