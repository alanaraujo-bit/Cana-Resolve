import { partnerFromRequest } from "@/lib/auth/bearer";
import { freio, naoAutenticado, naoEncontrado, ok, protegido } from "@/lib/api/respond";
import { partnerAvailabilityBadge, partnerHome } from "@/lib/domain/audience";

/** A Home do Parceiro: quem ele é, o selo de disponibilidade e as oportunidades. */
export async function GET(request: Request) {
  return protegido("parceiro", async () => {
    const travado = freio(request, "app-parceiro", 60);
    if (travado) return travado;

    const viewer = await partnerFromRequest(request);
    if (!viewer) return naoAutenticado();

    const home = await partnerHome(viewer.id);
    if (!home) return naoEncontrado();

    // O selo é calculado no servidor por ser regra de produto, não de tela:
    // "pausado por você" e "aguardando o lançamento" são situações diferentes,
    // e a diferença não pode depender de o app lembrar disso.
    return ok({ ...home, selo: partnerAvailabilityBadge(home.partner.status) });
  });
}
