import { z } from "zod";

import { residentFromRequest } from "@/lib/auth/bearer";
import { corpo, erro, freio, naoAutenticado, naoEncontrado, ok, protegido } from "@/lib/api/respond";
import { isDatabaseConfigured } from "@/lib/db/client";
import { residentRequest, residentResolution, residentState } from "@/lib/domain/audience";

export async function GET(request: Request, context: RouteContext<"/api/app/morador/solicitacoes/[id]">) {
  return protegido("morador/solicitacoes/[id]", async () => {
    const travado = freio(request, "app-morador", 60);
    if (travado) return travado;

    const viewer = residentFromRequest(request);
    if (!viewer) return naoAutenticado();
    if (!isDatabaseConfigured()) return erro("indisponivel", 503);

    const { id } = await context.params;
    // A consulta casa `id` **e** `whatsapp`: o pedido de outro morador não é
    // proibido, ele não existe para este token.
    const detalhe = await residentRequest(viewer.whatsapp, id);
    if (!detalhe) return naoEncontrado();

    return ok({ ...detalhe, estado: residentState(detalhe.request.status) });
  });
}

const retorno = z.object({ resposta: z.enum(["sim", "ainda_nao", "nao_precisei", "outro"]) });

/**
 * "Você conseguiu resolver?" — a resposta do morador.
 *
 * Nem toda resposta vira transição de estado: `residentResolution` decide, e
 * quando não dá para transicionar ela grava a resposta na linha do tempo em
 * vez de forçar um estado que a máquina recusaria.
 */
export async function POST(request: Request, context: RouteContext<"/api/app/morador/solicitacoes/[id]">) {
  return protegido("morador/solicitacoes/[id]", async () => {
    const travado = freio(request, "app-morador-escrita", 20);
    if (travado) return travado;

    const viewer = residentFromRequest(request);
    if (!viewer) return naoAutenticado();
    if (!isDatabaseConfigured()) return erro("indisponivel", 503);

    const parsed = retorno.safeParse(await corpo(request));
    if (!parsed.success) return erro("validacao", 422);

    const { id } = await context.params;
    try {
      await residentResolution({ whatsapp: viewer.whatsapp, requestId: id, answer: parsed.data.resposta });
    } catch {
      return naoEncontrado();
    }

    const detalhe = await residentRequest(viewer.whatsapp, id);
    if (!detalhe) return naoEncontrado();
    return ok({ ...detalhe, estado: residentState(detalhe.request.status) });
  });
}
