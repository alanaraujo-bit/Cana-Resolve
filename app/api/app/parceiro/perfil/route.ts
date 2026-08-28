import { partnerFromRequest } from "@/lib/auth/bearer";
import { freio, naoAutenticado, naoEncontrado, ok, protegido } from "@/lib/api/respond";
import { partnerAvailabilityBadge, partnerProfile } from "@/lib/domain/audience";

/**
 * O perfil que o parceiro vê de si mesmo.
 *
 * `partnerProfile` deixa `notes` e `prospectId` de fora da seleção — anotação
 * interna do operador e a referência ao funil comercial não são coisas que o
 * parceiro deveria ler sobre a própria análise. A rota não recupera isso.
 */
export async function GET(request: Request) {
  return protegido("parceiro/perfil", async () => {
    const travado = freio(request, "app-parceiro", 60);
    if (travado) return travado;

    const viewer = await partnerFromRequest(request);
    if (!viewer) return naoAutenticado();

    const profile = await partnerProfile(viewer.id);
    if (!profile) return naoEncontrado();
    return ok({ profile, selo: partnerAvailabilityBadge(profile.partner.status) });
  });
}
