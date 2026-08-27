"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { falha, type ActionResult } from "@/lib/action-result";
import { operatorOrNull } from "@/lib/auth/guard";
import { addInteraction } from "@/lib/domain/activity";
import { isInteractionKind } from "@/lib/domain/interaction-kinds";
import {
  createProspect,
  setProspectStatus,
  touchProspect,
  updateProspect,
} from "@/lib/domain/prospects";
import { prospectStates, type ProspectStatus } from "@/lib/domain/states";

const SEM_SESSAO: ActionResult = {
  ok: false,
  erro: "Sua sessão expirou. Entre de novo para continuar.",
};

const texto = (max: number) => z.string().trim().max(max).optional();

export async function criarProspect(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const schema = z.object({
    nome: z.string().trim().min(2, "Informe o nome da empresa."),
    contato: texto(120),
    telefone: z.string().trim().min(8, "Informe o WhatsApp com DDD."),
    categoria: texto(60),
    origem: texto(60),
    site: texto(200),
    instagram: texto(120),
    endereco: texto(200),
    observacoes: texto(4000),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Confira os campos." };
  }

  let destino: string;
  try {
    const resultado = await createProspect({
      name: parsed.data.nome,
      contactName: parsed.data.contato ?? null,
      whatsapp: parsed.data.telefone,
      categoryId: parsed.data.categoria || null,
      source: parsed.data.origem || null,
      website: parsed.data.site ?? null,
      instagram: parsed.data.instagram ?? null,
      address: parsed.data.endereco ?? null,
      notes: parsed.data.observacoes ?? null,
      actor,
    });

    // Quando o número já existia, a pessoa vai parar no registro que já havia —
    // é a resposta certa para "essa empresa já está no funil?".
    destino = `/ops/comercial/${resultado.id}${resultado.novo ? "" : "?ja=1"}`;
  } catch (error) {
    return falha(error, "Não deu para criar o prospect.");
  }

  revalidatePath("/ops/comercial");
  revalidatePath("/ops");
  redirect(destino);
}

export async function mudarEstadoProspect(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const id = z.uuid().safeParse(formData.get("id"));
  const destino = String(formData.get("destino") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!id.success) return { ok: false, erro: "Prospect inválido." };
  if (!prospectStates.is(destino)) return { ok: false, erro: "Estado desconhecido." };

  try {
    const resultado = await setProspectStatus({
      id: id.data,
      to: destino as ProspectStatus,
      actor,
      lostReason: motivo || null,
    });
    revalidatePath(`/ops/comercial/${id.data}`);
    revalidatePath("/ops/comercial");
    revalidatePath("/ops");
    return resultado.changed
      ? { ok: true, mensagem: `Agora está em "${prospectStates.label(destino)}".` }
      : { ok: true, mensagem: "Já estava nesse estado." };
  } catch (error) {
    return falha(error, "Não deu para mudar o estado.");
  }
}

export async function salvarProspect(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const schema = z.object({
    id: z.uuid(),
    nome: z.string().trim().min(2, "Informe o nome da empresa."),
    contato: texto(120),
    telefone: z.string().trim().min(8, "Informe o WhatsApp com DDD."),
    email: texto(160),
    categoria: texto(60),
    site: texto(200),
    instagram: texto(120),
    endereco: texto(200),
    observacoes: texto(4000),
    proximaAcao: texto(200),
    proximaAcaoEm: texto(30),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Confira os campos." };
  }

  const quando = parsed.data.proximaAcaoEm
    ? new Date(`${parsed.data.proximaAcaoEm}T12:00:00`)
    : null;

  if (quando && Number.isNaN(quando.getTime())) {
    return { ok: false, erro: "A data do retorno não parece válida." };
  }

  try {
    await updateProspect({
      id: parsed.data.id,
      name: parsed.data.nome,
      contactName: parsed.data.contato ?? null,
      whatsapp: parsed.data.telefone,
      email: parsed.data.email ?? null,
      categoryId: parsed.data.categoria || null,
      website: parsed.data.site ?? null,
      instagram: parsed.data.instagram ?? null,
      address: parsed.data.endereco ?? null,
      notes: parsed.data.observacoes ?? null,
      nextAction: parsed.data.proximaAcao ?? null,
      nextActionAt: quando,
    });
    revalidatePath(`/ops/comercial/${parsed.data.id}`);
    revalidatePath("/ops/comercial");
    return { ok: true, mensagem: "Salvo." };
  } catch (error) {
    return falha(error, "Não deu para salvar.");
  }
}

export async function registrarInteracaoProspect(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const id = z.uuid().safeParse(formData.get("id"));
  const corpo = String(formData.get("corpo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "nota");

  if (!id.success) return { ok: false, erro: "Prospect inválido." };
  if (corpo.length < 2) return { ok: false, erro: "Escreva o que aconteceu." };
  if (!isInteractionKind(tipo)) return { ok: false, erro: "Tipo desconhecido." };

  try {
    await addInteraction({
      subjectType: "prospect",
      subjectId: id.data,
      kind: tipo,
      body: corpo.slice(0, 4000),
      actor,
    });
    await touchProspect(id.data);
    revalidatePath(`/ops/comercial/${id.data}`);
    return { ok: true };
  } catch (error) {
    return falha(error, "Não deu para registrar.");
  }
}
