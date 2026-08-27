"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { falha, type ActionResult } from "@/lib/action-result";
import { operatorOrNull } from "@/lib/auth/guard";
import { addInteraction } from "@/lib/domain/activity";
import { isInteractionKind } from "@/lib/domain/interaction-kinds";
import { createOpportunities } from "@/lib/domain/opportunities";
import { setRequestStatus, updateRequestTriage } from "@/lib/domain/requests";
import { requestStates, type RequestStatus } from "@/lib/domain/states";

/**
 * Ações da tela de solicitação.
 *
 * Todas começam por `operatorOrNull()`. O porteiro da borda e o layout não
 * bastam: uma Server Action é um endpoint como qualquer outro, e quem souber o
 * identificador dela pode chamá-la direto.
 */

const SEM_SESSAO: ActionResult = {
  ok: false,
  erro: "Sua sessão expirou. Entre de novo para continuar.",
};

const idSchema = z.uuid();

export async function mudarEstado(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const id = idSchema.safeParse(formData.get("id"));
  const destino = String(formData.get("destino") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!id.success) return { ok: false, erro: "Solicitação inválida." };
  if (!requestStates.is(destino)) return { ok: false, erro: "Estado desconhecido." };

  try {
    const resultado = await setRequestStatus({
      id: id.data,
      to: destino as RequestStatus,
      actor,
      reason: motivo || null,
    });
    revalidatePath(`/ops/solicitacoes/${id.data}`);
    revalidatePath("/ops/solicitacoes");
    revalidatePath("/ops");
    return resultado.changed
      ? { ok: true, mensagem: `Agora está em "${requestStates.label(destino)}".` }
      : { ok: true, mensagem: "Nada mudou: já estava nesse estado." };
  } catch (error) {
    return falha(error, "Não deu para mudar o estado.");
  }
}

export async function registrarInteracao(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const id = idSchema.safeParse(formData.get("id"));
  const corpo = String(formData.get("corpo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "nota");

  if (!id.success) return { ok: false, erro: "Solicitação inválida." };
  if (corpo.length < 2) return { ok: false, erro: "Escreva o que aconteceu." };
  if (!isInteractionKind(tipo)) return { ok: false, erro: "Tipo desconhecido." };

  try {
    await addInteraction({
      subjectType: "request",
      subjectId: id.data,
      kind: tipo,
      body: corpo.slice(0, 4000),
      actor,
    });
    revalidatePath(`/ops/solicitacoes/${id.data}`);
    return { ok: true };
  } catch (error) {
    return falha(error, "Não deu para registrar.");
  }
}

const triagemSchema = z.object({
  id: z.uuid(),
  categoria: z.string().trim().max(60).optional(),
  servico: z.string().trim().max(60).optional(),
  bairro: z.string().trim().max(120).optional(),
  urgencia: z.string().trim().max(40).optional(),
  observacoes: z.string().trim().max(4000).optional(),
});

export async function salvarTriagem(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const parsed = triagemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, erro: "Confira os campos." };

  try {
    await updateRequestTriage({
      id: parsed.data.id,
      categoryId: parsed.data.categoria || null,
      serviceId: parsed.data.servico || null,
      neighborhood: parsed.data.bairro || null,
      urgency: parsed.data.urgencia || null,
      internalNotes: parsed.data.observacoes || null,
    });
    revalidatePath(`/ops/solicitacoes/${parsed.data.id}`);
    return { ok: true, mensagem: "Triagem salva." };
  } catch (error) {
    return falha(error, "Não deu para salvar a triagem.");
  }
}

export async function encaminhar(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, erro: "Solicitação inválida." };

  const parceiros = formData
    .getAll("parceiro")
    .map(String)
    .filter((valor) => z.uuid().safeParse(valor).success);

  if (parceiros.length === 0) {
    return { ok: false, erro: "Escolha pelo menos um parceiro." };
  }

  try {
    const { criados } = await createOpportunities({
      requestId: id.data,
      partnerIds: parceiros,
      actor,
      jaEnviado: formData.get("jaEnviado") === "sim",
    });

    revalidatePath(`/ops/solicitacoes/${id.data}`);
    revalidatePath("/ops/oportunidades");
    revalidatePath("/ops");

    if (criados === 0) {
      return { ok: true, mensagem: "Esses parceiros já tinham recebido este pedido." };
    }
    return {
      ok: true,
      mensagem:
        criados === 1
          ? "Encaminhado para 1 parceiro."
          : `Encaminhado para ${criados} parceiros.`,
    };
  } catch (error) {
    return falha(error, "Não deu para encaminhar.");
  }
}
