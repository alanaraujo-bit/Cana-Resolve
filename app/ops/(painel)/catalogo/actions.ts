"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { falha, type ActionResult } from "@/lib/action-result";
import { operatorOrNull } from "@/lib/auth/guard";
import { db } from "@/lib/db/client";
import { categories, services } from "@/lib/db/schema";
import { slugify } from "@/lib/domain/catalog-seed";

const SEM_SESSAO: ActionResult = {
  ok: false,
  erro: "Sua sessão expirou. Entre de novo para continuar.",
};

/**
 * O catálogo é administrável, mas nada aqui apaga.
 *
 * Desativar um serviço tira ele dos seletores sem tocar nos pedidos antigos
 * que apontam para ele. Apagar quebraria o histórico — e o histórico é o que
 * vai dizer, daqui a seis meses, qual problema mais aparece em Canaã.
 */
export async function criarServico(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const categoria = String(formData.get("categoria") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();

  if (!categoria) return { ok: false, erro: "Categoria inválida." };
  if (nome.length < 2) return { ok: false, erro: "Dê um nome ao serviço." };

  try {
    const [existente] = await db
      .select({ n: services.id })
      .from(categories)
      .innerJoin(services, eq(services.categoryId, categories.id))
      .where(and(eq(categories.id, categoria), eq(services.slug, slugify(nome))))
      .limit(1);

    if (existente) return { ok: false, erro: "Já existe um serviço com esse nome aqui." };

    // Entra no fim da lista da categoria, sem reordenar o que já existe.
    const [{ ultima }] = await db
      .select({ ultima: sql<number>`coalesce(max(${services.position}), 0)` })
      .from(services)
      .where(eq(services.categoryId, categoria));

    await db.insert(services).values({
      categoryId: categoria,
      slug: slugify(nome),
      name: nome,
      position: Number(ultima) + 1,
    });

    revalidatePath("/ops/catalogo");
    return { ok: true, mensagem: `"${nome}" entrou no catálogo.` };
  } catch (error) {
    return falha(error, "Não deu para criar o serviço.");
  }
}

export async function alternarAtivo(
  _anterior: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await operatorOrNull();
  if (!actor) return SEM_SESSAO;

  const tipo = String(formData.get("tipo") ?? "");
  const id = String(formData.get("id") ?? "");
  const ativar = formData.get("ativar") === "sim";

  try {
    if (tipo === "categoria") {
      await db
        .update(categories)
        .set({ active: ativar, updatedAt: new Date() })
        .where(eq(categories.id, id));
    } else if (tipo === "servico") {
      if (!z.uuid().safeParse(id).success) {
        return { ok: false, erro: "Serviço inválido." };
      }
      await db
        .update(services)
        .set({ active: ativar, updatedAt: new Date() })
        .where(eq(services.id, id));
    } else {
      return { ok: false, erro: "Tipo desconhecido." };
    }

    revalidatePath("/ops/catalogo");
    return { ok: true };
  } catch (error) {
    return falha(error, "Não deu para mudar.");
  }
}
