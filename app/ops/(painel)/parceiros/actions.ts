"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { falha, type ActionResult } from "@/lib/action-result";
import { operatorOrNull } from "@/lib/auth/guard";
import { addInteraction } from "@/lib/domain/activity";
import { BETA_PRICE_CENTS } from "@/lib/domain/beta";
import { isInteractionKind } from "@/lib/domain/interaction-kinds";
import {
  completeOnboarding,
  registerPayment,
  setPartnerStatus,
  updatePartner,
} from "@/lib/domain/partners";
import { partnerStates, type PartnerStatus } from "@/lib/domain/states";

const SEM_SESSAO: ActionResult = {
  ok: false,
  erro: "Sua sessão expirou. Entre de novo para continuar.",
};

const texto = (max: number) => z.string().trim().max(max).optional();

export async function salvarParceiro(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const schema = z.object({
    id: z.uuid(),
    nome: z.string().trim().min(2, "Informe o nome comercial."),
    responsavel: texto(120),
    telefone: z.string().trim().min(8, "Informe o WhatsApp com DDD."),
    email: texto(160),
    documento: texto(40),
    descricao: texto(1000),
    disponibilidade: texto(200),
    bairros: texto(1000),
    observacoes: texto(4000),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Confira os campos." };
  }

  const categorias = formData.getAll("categoria").map(String).filter(Boolean);
  const servicos = formData
    .getAll("servico")
    .map(String)
    .filter((v) => z.uuid().safeParse(v).success);

  if (categorias.length === 0) {
    return { ok: false, erro: "Um parceiro sem categoria nunca recebe pedido nenhum." };
  }

  const atendeTudo = formData.get("atendeTudo") === "sim";
  const bairros = atendeTudo
    ? []
    : (parsed.data.bairros ?? "")
        .split(/[,;\n]/)
        .map((b) => b.trim())
        .filter(Boolean)
        .slice(0, 40);

  if (!atendeTudo && bairros.length === 0) {
    return {
      ok: false,
      erro: "Liste os bairros atendidos, ou marque que ele atende Canaã inteira.",
    };
  }

  try {
    await updatePartner({
      id: parsed.data.id,
      name: parsed.data.nome,
      ownerName: parsed.data.responsavel ?? null,
      whatsapp: parsed.data.telefone,
      email: parsed.data.email ?? null,
      description: parsed.data.descricao ?? null,
      document: parsed.data.documento ?? null,
      availability: parsed.data.disponibilidade ?? null,
      servesWholeCity: atendeTudo,
      neighborhoods: bairros,
      categoryIds: categorias,
      serviceIds: servicos,
      notes: parsed.data.observacoes ?? null,
    });
    revalidatePath(`/ops/parceiros/${parsed.data.id}`);
    revalidatePath("/ops/parceiros");
    return { ok: true, mensagem: "Perfil salvo." };
  } catch (error) {
    return falha(error, "Não deu para salvar o perfil.");
  }
}

export async function mudarEstadoParceiro(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const id = z.uuid().safeParse(formData.get("id"));
  const destino = String(formData.get("destino") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!id.success) return { ok: false, erro: "Parceiro inválido." };
  if (!partnerStates.is(destino)) return { ok: false, erro: "Estado desconhecido." };

  try {
    const resultado = await setPartnerStatus({
      id: id.data,
      to: destino as PartnerStatus,
      actor,
      reason: motivo || null,
    });
    revalidatePath(`/ops/parceiros/${id.data}`);
    revalidatePath("/ops/parceiros");
    revalidatePath("/ops");
    return resultado.changed
      ? { ok: true, mensagem: `Agora está em "${partnerStates.label(destino)}".` }
      : { ok: true, mensagem: "Já estava nesse estado." };
  } catch (error) {
    return falha(error, "Não deu para mudar o estado.");
  }
}

export async function registrarPagamento(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, erro: "Parceiro inválido." };

  const dataBruta = String(formData.get("data") ?? "").trim();
  const quando = dataBruta ? new Date(`${dataBruta}T12:00:00`) : new Date();
  if (Number.isNaN(quando.getTime())) {
    return { ok: false, erro: "A data do pagamento não parece válida." };
  }

  const valorBruto = String(formData.get("valor") ?? "").trim();
  let centavos = BETA_PRICE_CENTS;
  if (valorBruto) {
    const numero = Number(
      valorBruto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."),
    );
    if (!Number.isFinite(numero) || numero <= 0) {
      return { ok: false, erro: "Confira o valor." };
    }
    centavos = Math.round(numero * 100);
  }

  try {
    await registerPayment({
      partnerId: id.data,
      amountCents: centavos,
      method: String(formData.get("forma") ?? "").trim() || null,
      reference: String(formData.get("referencia") ?? "").trim() || null,
      paidAt: quando,
      notes: String(formData.get("observacoes") ?? "").trim() || null,
      actor,
    });
    revalidatePath(`/ops/parceiros/${id.data}`);
    revalidatePath("/ops/parceiros");
    revalidatePath("/ops");
    return {
      ok: true,
      mensagem:
        "Pagamento registrado. Os 90 dias continuam parados até o lançamento da operação.",
    };
  } catch (error) {
    return falha(error, "Não deu para registrar o pagamento.");
  }
}

export async function concluirOnboarding(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, erro: "Parceiro inválido." };

  try {
    await completeOnboarding({ partnerId: id.data, actor });
    revalidatePath(`/ops/parceiros/${id.data}`);
    revalidatePath("/ops");
    return { ok: true, mensagem: "Onboarding concluído." };
  } catch (error) {
    return falha(error, "Não deu para concluir o onboarding.");
  }
}

export async function registrarInteracaoParceiro(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const id = z.uuid().safeParse(formData.get("id"));
  const corpo = String(formData.get("corpo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "nota");

  if (!id.success) return { ok: false, erro: "Parceiro inválido." };
  if (corpo.length < 2) return { ok: false, erro: "Escreva o que aconteceu." };
  if (!isInteractionKind(tipo)) return { ok: false, erro: "Tipo desconhecido." };

  try {
    await addInteraction({
      subjectType: "partner",
      subjectId: id.data,
      kind: tipo,
      body: corpo.slice(0, 4000),
      actor,
    });
    revalidatePath(`/ops/parceiros/${id.data}`);
    return { ok: true };
  } catch (error) {
    return falha(error, "Não deu para registrar.");
  }
}
