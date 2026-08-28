import { z } from "zod";

import { partnerFromRequest } from "@/lib/auth/bearer";
import { corpo, erro, freio, naoAutenticado, naoEncontrado, ok, protegido } from "@/lib/api/respond";
import { partnerOpportunity, setPartnerOpportunityStatus } from "@/lib/domain/audience";
import { opportunityStates, partnerDrivableOpportunityStatuses, type OpportunityStatus } from "@/lib/domain/states";

/**
 * A oportunidade em detalhe.
 *
 * Nome e WhatsApp do morador só existem no objeto depois de "Tenho interesse":
 * quem decide isso é `partnerOpportunity`, no domínio, e não esta rota. Vale
 * repetir por quê — numa página web, esconder o campo na tela não bastaria,
 * porque o payload do componente de servidor é legível no navegador. Aqui é
 * ainda mais direto: o JSON é a tela. O dado não pode chegar.
 */
export async function GET(request: Request, context: RouteContext<"/api/app/parceiro/oportunidades/[id]">) {
  return protegido("parceiro/oportunidades/[id]", async () => {
    const travado = freio(request, "app-parceiro", 60);
    if (travado) return travado;

    const viewer = await partnerFromRequest(request);
    if (!viewer) return naoAutenticado();

    const { id } = await context.params;
    const item = await partnerOpportunity(viewer.id, id);
    // `partnerOpportunity` já filtra por `partnerId`: a oportunidade de outro
    // parceiro não é "proibida", ela simplesmente não existe para este token.
    return item ? ok({ item }) : naoEncontrado();
  });
}

const atualizacao = z.object({
  status: z.string().trim().min(1),
  motivo: z.string().trim().max(240).optional().nullable(),
});

/** O parceiro declara o que aconteceu: tenho interesse, fechei, não fechei… */
export async function POST(request: Request, context: RouteContext<"/api/app/parceiro/oportunidades/[id]">) {
  return protegido("parceiro/oportunidades/[id]", async () => {
    const travado = freio(request, "app-parceiro-escrita", 30);
    if (travado) return travado;

    const viewer = await partnerFromRequest(request);
    if (!viewer) return naoAutenticado();

    const parsed = atualizacao.safeParse(await corpo(request));
    if (!parsed.success || !opportunityStates.is(parsed.data.status)) {
      return erro("validacao", 422);
    }
    // A conferência é repetida aqui só para o cliente receber 403 em vez de
    // 500: `setPartnerOpportunityStatus` lança quando o estado não é dirigível
    // pelo parceiro, e uma exceção não é uma resposta de API. A trava que vale
    // continua sendo a do domínio.
    const alvo = parsed.data.status as OpportunityStatus;
    if (!partnerDrivableOpportunityStatuses.includes(alvo)) return erro("nao_permitido", 403);

    const { id } = await context.params;
    try {
      await setPartnerOpportunityStatus({
        partnerId: viewer.id,
        opportunityId: id,
        to: alvo,
        reason: parsed.data.motivo ?? undefined,
      });
    } catch {
      // Oportunidade de outro parceiro, inexistente, ou transição que a máquina
      // de estados recusa. Nenhum dos três merece detalhe na resposta.
      return erro("nao_permitido", 403);
    }

    return ok({ item: await partnerOpportunity(viewer.id, id) });
  });
}
