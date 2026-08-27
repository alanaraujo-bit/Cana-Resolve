"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { falha, type ActionResult } from "@/lib/action-result";
import { operatorOrNull } from "@/lib/auth/guard";
import { setOpportunityStatus } from "@/lib/domain/opportunities";
import { opportunityStates, type OpportunityStatus } from "@/lib/domain/states";

/**
 * O desfecho de um encaminhamento.
 *
 * A ação vive aqui e é usada em dois lugares: na tela da solicitação, onde se
 * acompanha o que cada parceiro fez com aquele pedido, e na lista geral de
 * oportunidades. Duplicá-la seria abrir espaço para as duas telas divergirem.
 */
export async function mudarEstadoOportunidade(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) {
    return { ok: false, erro: "Sua sessão expirou. Entre de novo para continuar." };
  }

  const id = z.uuid().safeParse(formData.get("id"));
  const destino = String(formData.get("destino") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  const valorBruto = String(formData.get("valor") ?? "").trim();

  if (!id.success) return { ok: false, erro: "Encaminhamento inválido." };
  if (!opportunityStates.is(destino)) return { ok: false, erro: "Estado desconhecido." };

  // "1.250,00" e "1250" chegam ao mesmo número; qualquer outra coisa é ignorada
  // em silêncio, porque um valor errado é pior do que valor nenhum.
  let valorCentavos: number | null = null;
  if (valorBruto) {
    const normalizado = valorBruto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const numero = Number(normalizado);
    if (Number.isFinite(numero) && numero > 0) valorCentavos = Math.round(numero * 100);
  }

  try {
    const resultado = await setOpportunityStatus({
      id: id.data,
      to: destino as OpportunityStatus,
      actor,
      reason: motivo || null,
      quoteAmountCents: valorCentavos,
    });

    revalidatePath("/ops/oportunidades");
    revalidatePath("/ops/solicitacoes", "layout");
    revalidatePath("/ops/parceiros", "layout");
    revalidatePath("/ops");

    return resultado.changed
      ? { ok: true, mensagem: `Marcado como "${opportunityStates.label(destino)}".` }
      : { ok: true, mensagem: "Já estava nesse estado." };
  } catch (error) {
    return falha(error, "Não deu para registrar o desfecho.");
  }
}
