import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, isNotNull, lte, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  categories,
  partnerApplications,
  prospects,
} from "@/lib/db/schema";
import { applyTransition, recordActivity, type Actor } from "./activity";
import { nextCode } from "./codes";
import { normalizePhone } from "./phone";
import { prospectFunnel, type ProspectStatus } from "./states";

/**
 * O funil comercial.
 *
 * A prospecção B2B é o motor desta fase: sem parceiro na rede, não existe
 * ninguém para receber os pedidos dos moradores. Por isso o prospect é uma
 * entidade de primeira classe, com estado, histórico e — o campo que mais
 * evita empresa esquecida — uma próxima ação com data.
 */

export type ProspectFilters = {
  estado?: string;
  categoria?: string;
  busca?: string;
  filtro?: string;
  pagina?: number;
};

const PAGINA = 40;

function whereFrom(filters: ProspectFilters) {
  const clauses: SQL[] = [];

  if (filters.estado === "ativos") {
    clauses.push(
      sql`${prospects.status} not in ('parceiro_fundador', 'nao_avancou')`,
    );
  } else if (filters.estado && filters.estado !== "todos") {
    clauses.push(eq(prospects.status, filters.estado as ProspectStatus));
  }

  if (filters.categoria) clauses.push(eq(prospects.categoryId, filters.categoria));

  if (filters.filtro === "atrasados") {
    clauses.push(
      and(
        isNotNull(prospects.nextActionAt),
        lte(prospects.nextActionAt, new Date()),
        sql`${prospects.status} not in ('parceiro_fundador', 'nao_avancou')`,
      )!,
    );
  }

  if (filters.busca?.trim()) {
    const termo = `%${filters.busca.trim()}%`;
    clauses.push(
      or(
        ilike(prospects.code, termo),
        ilike(prospects.name, termo),
        ilike(prospects.contactName, termo),
        ilike(prospects.whatsapp, `%${filters.busca.replace(/\D/g, "")}%`),
      )!,
    );
  }

  return clauses.length > 0 ? and(...clauses) : undefined;
}

export async function listProspects(filters: ProspectFilters) {
  const where = whereFrom(filters);
  const pagina = Math.max(1, filters.pagina ?? 1);

  const [linhas, [total]] = await Promise.all([
    db
      .select({
        id: prospects.id,
        code: prospects.code,
        name: prospects.name,
        contactName: prospects.contactName,
        whatsapp: prospects.whatsapp,
        categoryId: prospects.categoryId,
        categoryName: categories.name,
        status: prospects.status,
        source: prospects.source,
        nextAction: prospects.nextAction,
        nextActionAt: prospects.nextActionAt,
        lastInteractionAt: prospects.lastInteractionAt,
        partnerId: prospects.partnerId,
        createdAt: prospects.createdAt,
      })
      .from(prospects)
      .leftJoin(categories, eq(categories.id, prospects.categoryId))
      .where(where)
      // Quem tem retorno marcado sobe; depois, o que mexeu por último.
      .orderBy(
        sql`case when ${prospects.nextActionAt} is null then 1 else 0 end`,
        asc(prospects.nextActionAt),
        desc(prospects.updatedAt),
      )
      .limit(PAGINA)
      .offset((pagina - 1) * PAGINA),
    db.select({ n: count() }).from(prospects).where(where),
  ]);

  return {
    linhas,
    total: total?.n ?? 0,
    pagina,
    paginas: Math.max(1, Math.ceil((total?.n ?? 0) / PAGINA)),
    // O instante da consulta vem junto: quem desenha a tela não precisa (nem
    // deve) perguntar as horas no meio da renderização.
    agora: new Date(),
  };
}

/** O funil em colunas, para a visão de pipeline. */
export async function funnelBoard() {
  const linhas = await db
    .select({
      id: prospects.id,
      code: prospects.code,
      name: prospects.name,
      status: prospects.status,
      categoryName: categories.name,
      nextAction: prospects.nextAction,
      nextActionAt: prospects.nextActionAt,
      updatedAt: prospects.updatedAt,
    })
    .from(prospects)
    .leftJoin(categories, eq(categories.id, prospects.categoryId))
    .where(sql`${prospects.status} <> 'nao_avancou'`)
    .orderBy(desc(prospects.updatedAt));

  return prospectFunnel.map((estado) => ({
    estado,
    itens: linhas.filter((l) => l.status === estado),
  }));
}

export async function getProspect(id: string) {
  const agora = new Date();
  const [linha] = await db
    .select({
      prospect: prospects,
      categoryName: categories.name,
    })
    .from(prospects)
    .leftJoin(categories, eq(categories.id, prospects.categoryId))
    .where(eq(prospects.id, id))
    .limit(1);

  return linha ? { ...linha, agora } : null;
}

/** Os cadastros que esta empresa enviou pelo site. */
export async function prospectApplications(prospectId: string) {
  return db
    .select()
    .from(partnerApplications)
    .where(eq(partnerApplications.prospectId, prospectId))
    .orderBy(desc(partnerApplications.createdAt));
}

export async function createProspect(input: {
  name: string;
  contactName: string | null;
  whatsapp: string;
  categoryId: string | null;
  source: string | null;
  website: string | null;
  instagram: string | null;
  address: string | null;
  notes: string | null;
  actor: Actor;
}) {
  const whatsapp = normalizePhone(input.whatsapp);
  if (!whatsapp) throw new Error("Confira o WhatsApp: precisa ter DDD.");

  return db.transaction(async (tx) => {
    // A mesma empresa não entra duas vezes. Se o número já existe, quem chamou
    // recebe o registro que já existia — e decide o que fazer com ele.
    const [existente] = await tx
      .select({ id: prospects.id, code: prospects.code, name: prospects.name })
      .from(prospects)
      .where(eq(prospects.whatsapp, whatsapp))
      .limit(1);

    if (existente) {
      return { ...existente, novo: false };
    }

    const code = await nextCode(tx, "prospect");
    const [linha] = await tx
      .insert(prospects)
      .values({
        code,
        name: input.name.trim(),
        contactName: input.contactName?.trim() || null,
        whatsapp,
        categoryId: input.categoryId,
        source: input.source || "mapeamento",
        website: input.website?.trim() || null,
        instagram: input.instagram?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        status: "mapeado",
      })
      .returning({ id: prospects.id });

    await recordActivity(tx, {
      subjectType: "prospect",
      subjectId: linha.id,
      type: "entrada",
      toState: "mapeado",
      summary: `${input.name.trim()} entrou no funil (${code}).`,
      actor: input.actor,
    });

    return { id: linha.id, code, name: input.name.trim(), novo: true };
  });
}

export async function setProspectStatus(input: {
  id: string;
  to: ProspectStatus;
  actor: Actor;
  lostReason?: string | null;
}) {
  const patch: Record<string, unknown> = { lastInteractionAt: new Date() };

  if (input.to === "nao_avancou") {
    patch.lostReason = input.lostReason ?? null;
    // Sai do funil: manter um retorno agendado só geraria alarme falso.
    patch.nextAction = null;
    patch.nextActionAt = null;
  } else {
    patch.lostReason = null;
  }

  return applyTransition({
    machine: "prospect",
    subjectType: "prospect",
    table: prospects,
    id: input.id,
    to: input.to,
    actor: input.actor,
    patch,
  });
}

export async function updateProspect(input: {
  id: string;
  name: string;
  contactName: string | null;
  whatsapp: string;
  email: string | null;
  categoryId: string | null;
  website: string | null;
  instagram: string | null;
  address: string | null;
  notes: string | null;
  nextAction: string | null;
  nextActionAt: Date | null;
}) {
  const whatsapp = normalizePhone(input.whatsapp);
  if (!whatsapp) throw new Error("Confira o WhatsApp: precisa ter DDD.");

  await db
    .update(prospects)
    .set({
      name: input.name.trim(),
      contactName: input.contactName?.trim() || null,
      whatsapp,
      email: input.email?.trim() || null,
      categoryId: input.categoryId,
      website: input.website?.trim() || null,
      instagram: input.instagram?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      nextAction: input.nextAction?.trim() || null,
      nextActionAt: input.nextActionAt,
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, input.id));
}

/**
 * Marca que houve conversa agora. Fica separado do registro da interação
 * porque "quando falamos pela última vez" é do prospect, e a interação é um
 * evento — misturar os dois faria a lista ordenar por coisa errada.
 */
export async function touchProspect(id: string) {
  await db
    .update(prospects)
    .set({ lastInteractionAt: new Date(), updatedAt: new Date() })
    .where(eq(prospects.id, id));
}

/** Contagem por estado, usada pelo funil e pelo analytics comercial. */
export async function prospectCounts(estados?: ProspectStatus[]) {
  const rows = await db
    .select({ status: prospects.status, n: count() })
    .from(prospects)
    .where(estados && estados.length ? inArray(prospects.status, estados) : undefined)
    .groupBy(prospects.status);

  const mapa: Record<string, number> = {};
  for (const row of rows) mapa[row.status] = row.n;
  return mapa;
}

/** Os motivos de perda, agrupados. Responde "por que não avançam". */
export async function lostReasons() {
  return db
    .select({ reason: prospects.lostReason, n: count() })
    .from(prospects)
    .where(eq(prospects.status, "nao_avancou"))
    .groupBy(prospects.lostReason)
    .orderBy(desc(count()));
}
