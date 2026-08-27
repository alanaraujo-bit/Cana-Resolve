"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { falha, type ActionResult } from "@/lib/action-result";
import { operatorOrNull } from "@/lib/auth/guard";
import {
  approveApplication,
  setApplicationStatus,
} from "@/lib/domain/partners";
import { applicationStates, type ApplicationStatus } from "@/lib/domain/states";

const SEM_SESSAO: ActionResult = {
  ok: false,
  erro: "Sua sessão expirou. Entre de novo para continuar.",
};

/**
 * A qualificação.
 *
 * Cadastro enviado não é parceiro aprovado. Aqui alguém olha, confere e decide
 * — e a decisão fica registrada com o motivo, para que a régua da rede seja
 * a mesma daqui a seis meses.
 */
export async function analisarCadastro(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const id = z.uuid().safeParse(formData.get("id"));
  const destino = String(formData.get("destino") ?? "");
  const observacoes = String(formData.get("observacoes") ?? "").trim();

  if (!id.success) return { ok: false, erro: "Cadastro inválido." };
  if (!applicationStates.is(destino)) return { ok: false, erro: "Estado desconhecido." };

  if (destino === "recusado" && observacoes.length < 3) {
    return {
      ok: false,
      erro: "Escreva o motivo da recusa. Sem isso, ninguém entende a decisão depois.",
    };
  }

  try {
    await setApplicationStatus({
      id: id.data,
      to: destino as ApplicationStatus,
      actor,
      reviewNotes: observacoes || null,
    });
    revalidatePath("/ops/cadastros");
    revalidatePath("/ops");
    return { ok: true, mensagem: `Marcado como "${applicationStates.label(destino)}".` };
  } catch (error) {
    return falha(error, "Não deu para registrar a análise.");
  }
}

export async function aprovarCadastro(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, erro: "Cadastro inválido." };

  const categorias = formData
    .getAll("categoria")
    .map(String)
    .filter(Boolean);

  if (categorias.length === 0) {
    return { ok: false, erro: "Escolha ao menos uma categoria de atuação." };
  }

  let destino: string;
  try {
    const { partnerId } = await approveApplication({
      applicationId: id.data,
      actor,
      founder: formData.get("fundador") === "sim",
      categoryIds: categorias,
      notes: String(formData.get("observacoes") ?? "").trim() || null,
    });
    destino = `/ops/parceiros/${partnerId}?novo=1`;
  } catch (error) {
    return falha(error, "Não deu para aprovar o cadastro.");
  }

  revalidatePath("/ops/cadastros");
  revalidatePath("/ops/parceiros");
  revalidatePath("/ops");
  redirect(destino);
}
