import { z } from "zod";

import { partnerFromRequest } from "@/lib/auth/bearer";
import { corpo, erro, freio, naoAutenticado, naoEncontrado, ok, protegido } from "@/lib/api/respond";
import { partnerAvailabilityBadge, partnerProfile, setPartnerAvailability } from "@/lib/domain/audience";

const entrada = z.object({ disponivel: z.boolean() });

/**
 * O parceiro liga e desliga o recebimento de oportunidades.
 *
 * Suspensão, encerramento e entrada na rede continuam sendo decisão da
 * operação — `setPartnerAvailability` recusa quem não está `ativo` nem
 * `pausado`. Isso vira 403, não 500.
 */
export async function POST(request: Request) {
  return protegido("parceiro/disponibilidade", async () => {
    const travado = freio(request, "app-parceiro-escrita", 30);
    if (travado) return travado;

    const viewer = await partnerFromRequest(request);
    if (!viewer) return naoAutenticado();

    const parsed = entrada.safeParse(await corpo(request));
    if (!parsed.success) return erro("validacao", 422);

    try {
      await setPartnerAvailability(viewer.id, parsed.data.disponivel);
    } catch {
      return erro("nao_permitido", 403);
    }

    const profile = await partnerProfile(viewer.id);
    if (!profile) return naoEncontrado();
    return ok({ profile, selo: partnerAvailabilityBadge(profile.partner.status) });
  });
}
