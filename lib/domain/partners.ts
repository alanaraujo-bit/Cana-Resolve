import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";

import { db, type Db } from "@/lib/db/client";
import {
  categories,
  partnerApplications,
  partnerCategories,
  partnerServices,
  partners,
  payments,
  prospects,
} from "@/lib/db/schema";
import { applyTransition, recordActivity, type Actor } from "./activity";
import { BETA_PRICE_CENTS, readyForLaunch } from "./beta";
import { nextCode } from "./codes";
import { normalizePhone } from "./phone";
import { SETTING_LAUNCHED_AT, writeSetting } from "./settings";
import type { ApplicationStatus, PartnerStatus } from "./states";

/**
 * A rede.
 *
 * Um parceiro só existe depois de alguém olhar e decidir — não há aprovação
 * automática, e é isso que separa "rede local confiável" de "diretório onde
 * qualquer um paga e entra".
 *
 * O que este arquivo protege com mais cuidado é o relógio do Beta. Pagar não
 * inicia os 90 dias; concluir o onboarding também não. Só `registerLaunch()`
 * escreve `betaStartedAt`, porque só o lançamento da operação cria o que o
 * parceiro comprou: pedidos chegando.
 */

export type PartnerFilters = {
  estado?: string;
  categoria?: string;
  busca?: string;
  filtro?: string;
};

function whereFrom(filters: PartnerFilters) {
  const clauses: SQL[] = [];

  if (filters.estado && filters.estado !== "todos") {
    clauses.push(eq(partners.status, filters.estado as PartnerStatus));
  }
  if (filters.filtro === "fundadores") clauses.push(eq(partners.founder, true));
  if (filters.filtro === "sem_pagamento") {
    clauses.push(and(eq(partners.founder, true), isNull(partners.betaPaidAt))!);
  }
  if (filters.categoria) {
    clauses.push(
      sql`exists (
        select 1 from partner_categories pc
        where pc.partner_id = partners.id and pc.category_id = ${filters.categoria}
      )`,
    );
  }
  if (filters.busca?.trim()) {
    const termo = `%${filters.busca.trim()}%`;
    clauses.push(
      or(
        ilike(partners.code, termo),
        ilike(partners.name, termo),
        ilike(partners.ownerName, termo),
        ilike(partners.whatsapp, `%${filters.busca.replace(/\D/g, "")}%`),
      )!,
    );
  }

  return clauses.length > 0 ? and(...clauses) : undefined;
}

export async function listPartners(filters: PartnerFilters) {
  const where = whereFrom(filters);

  const [linhas, [total]] = await Promise.all([
    db
      .select({
        id: partners.id,
        code: partners.code,
        name: partners.name,
        ownerName: partners.ownerName,
        whatsapp: partners.whatsapp,
        status: partners.status,
        founder: partners.founder,
        betaPaidAt: partners.betaPaidAt,
        onboardingDoneAt: partners.onboardingDoneAt,
        betaStartedAt: partners.betaStartedAt,
        servesWholeCity: partners.servesWholeCity,
        createdAt: partners.createdAt,
        categorias: sql<string>`coalesce((
          select string_agg(c.name, ', ' order by pc.is_primary desc, c.name)
          from partner_categories pc
          join categories c on c.id = pc.category_id
          where pc.partner_id = partners.id
        ), '')`,
        recebidos: sql<number>`(
          select count(*)::int from opportunities o where o.partner_id = partners.id
        )`,
      })
      .from(partners)
      .where(where)
      .orderBy(desc(partners.founder), asc(partners.name)),
    db.select({ n: count() }).from(partners).where(where),
  ]);

  return { linhas, total: total?.n ?? 0 };
}

export async function getPartner(id: string) {
  const [linha] = await db
    .select()
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1);

  if (!linha) return null;

  const [cats, servs, pagamentos, origem] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        isPrimary: partnerCategories.isPrimary,
      })
      .from(partnerCategories)
      .innerJoin(categories, eq(categories.id, partnerCategories.categoryId))
      .where(eq(partnerCategories.partnerId, id))
      .orderBy(desc(partnerCategories.isPrimary), asc(categories.name)),
    db
      .select({ serviceId: partnerServices.serviceId })
      .from(partnerServices)
      .where(eq(partnerServices.partnerId, id)),
    db
      .select()
      .from(payments)
      .where(eq(payments.partnerId, id))
      .orderBy(desc(payments.paidAt)),
    db
      .select({ id: prospects.id, code: prospects.code })
      .from(prospects)
      .where(eq(prospects.partnerId, id))
      .limit(1),
  ]);

  return {
    partner: linha,
    categorias: cats,
    servicos: servs.map((s) => s.serviceId),
    pagamentos,
    prospect: origem[0] ?? null,
  };
}

/* ---------------------------------------------------------------
   Qualificação
   --------------------------------------------------------------- */

export type ApplicationFilters = { estado?: string; busca?: string };

export async function listApplications(filters: ApplicationFilters) {
  const clauses: SQL[] = [];

  if (filters.estado === "pendentes" || !filters.estado) {
    clauses.push(inArray(partnerApplications.status, ["recebido", "em_analise"]));
  } else if (filters.estado !== "todos") {
    clauses.push(eq(partnerApplications.status, filters.estado as ApplicationStatus));
  }
  if (filters.busca?.trim()) {
    const termo = `%${filters.busca.trim()}%`;
    clauses.push(
      or(
        ilike(partnerApplications.company, termo),
        ilike(partnerApplications.name, termo),
        ilike(partnerApplications.whatsapp, `%${filters.busca.replace(/\D/g, "")}%`),
      )!,
    );
  }

  return db
    .select({
      application: partnerApplications,
      categoryName: categories.name,
      prospectCode: prospects.code,
      prospectStatus: prospects.status,
    })
    .from(partnerApplications)
    .leftJoin(categories, eq(categories.id, partnerApplications.categoryId))
    .leftJoin(prospects, eq(prospects.id, partnerApplications.prospectId))
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(partnerApplications.createdAt));
}

export async function setApplicationStatus(input: {
  id: string;
  to: ApplicationStatus;
  actor: Actor;
  reviewNotes?: string | null;
}) {
  return applyTransition({
    machine: "application",
    subjectType: "application",
    table: partnerApplications,
    id: input.id,
    to: input.to,
    actor: input.actor,
    patch: {
      reviewedAt: new Date(),
      ...(input.reviewNotes !== undefined ? { reviewNotes: input.reviewNotes } : {}),
    },
  });
}

/**
 * Aprova um cadastro e traz a empresa para a rede.
 *
 * Tudo acontece numa transação: o parceiro nasce, o cadastro é marcado como
 * aprovado, o prospect chega ao fim do funil e as três coisas passam a apontar
 * umas para as outras. Se qualquer passo falhar, nada acontece — meia aprovação
 * seria pior do que nenhuma.
 */
export async function approveApplication(input: {
  applicationId: string;
  actor: Actor;
  founder: boolean;
  categoryIds: string[];
  notes?: string | null;
}) {
  return db.transaction(async (tx) => {
    const [cadastro] = await tx
      .select()
      .from(partnerApplications)
      .where(eq(partnerApplications.id, input.applicationId))
      .limit(1);

    if (!cadastro) throw new Error("Cadastro não encontrado.");
    if (cadastro.partnerId) throw new Error("Este cadastro já virou parceiro.");

    const whatsapp = normalizePhone(cadastro.whatsapp);
    if (!whatsapp) throw new Error("O WhatsApp do cadastro é inválido.");

    // Se a empresa já está na rede, o cadastro se junta a ela.
    const [existente] = await tx
      .select({ id: partners.id, code: partners.code, name: partners.name })
      .from(partners)
      .where(eq(partners.whatsapp, whatsapp))
      .limit(1);

    let partnerId: string;
    let code: string;

    if (existente) {
      partnerId = existente.id;
      code = existente.code;
    } else {
      code = await nextCode(tx, "partner");
      const [novo] = await tx
        .insert(partners)
        .values({
          code,
          name: cadastro.company,
          ownerName: cadastro.name,
          whatsapp,
          founder: input.founder,
          status: "aguardando_lancamento",
          servesWholeCity: cadastro.servesCanaa,
          notes: input.notes?.trim() || null,
          prospectId: cadastro.prospectId,
        })
        .returning({ id: partners.id });

      partnerId = novo.id;

      await recordActivity(tx, {
        subjectType: "partner",
        subjectId: partnerId,
        type: "entrada",
        toState: "aguardando_lancamento",
        summary: `${cadastro.company} entrou na rede (${code}).`,
        actor: input.actor,
      });
    }

    const categoriasEscolhidas = input.categoryIds.length
      ? input.categoryIds
      : cadastro.categoryId
        ? [cadastro.categoryId]
        : [];

    if (categoriasEscolhidas.length > 0) {
      await tx
        .insert(partnerCategories)
        .values(
          categoriasEscolhidas.map((categoryId, indice) => ({
            partnerId,
            categoryId,
            isPrimary: indice === 0,
          })),
        )
        .onConflictDoNothing({
          target: [partnerCategories.partnerId, partnerCategories.categoryId],
        });
    }

    await tx
      .update(partnerApplications)
      .set({
        status: "aprovado",
        partnerId,
        reviewedAt: new Date(),
        reviewNotes: input.notes?.trim() || cadastro.reviewNotes,
        updatedAt: new Date(),
      })
      .where(eq(partnerApplications.id, input.applicationId));

    await recordActivity(tx, {
      subjectType: "application",
      subjectId: input.applicationId,
      type: "estado",
      fromState: cadastro.status,
      toState: "aprovado",
      summary: existente
        ? `Aprovado e associado ao parceiro ${existente.name}.`
        : "Aprovado. A empresa entrou na rede.",
      actor: input.actor,
    });

    if (cadastro.prospectId) {
      await tx
        .update(prospects)
        .set({ partnerId, status: "parceiro_fundador", updatedAt: new Date() })
        .where(eq(prospects.id, cadastro.prospectId));

      await recordActivity(tx, {
        subjectType: "prospect",
        subjectId: cadastro.prospectId,
        type: "estado",
        toState: "parceiro_fundador",
        summary: "Virou parceiro. O acompanhamento continua no perfil dele.",
        actor: input.actor,
      });
    }

    return { partnerId, code };
  });
}

/* ---------------------------------------------------------------
   Perfil e estado
   --------------------------------------------------------------- */

export async function updatePartner(input: {
  id: string;
  name: string;
  ownerName: string | null;
  whatsapp: string;
  email: string | null;
  description: string | null;
  document: string | null;
  availability: string | null;
  servesWholeCity: boolean;
  neighborhoods: string[];
  categoryIds: string[];
  serviceIds: string[];
  notes: string | null;
}) {
  const whatsapp = normalizePhone(input.whatsapp);
  if (!whatsapp) throw new Error("Confira o WhatsApp: precisa ter DDD.");

  await db.transaction(async (tx) => {
    await tx
      .update(partners)
      .set({
        name: input.name.trim(),
        ownerName: input.ownerName?.trim() || null,
        whatsapp,
        email: input.email?.trim() || null,
        description: input.description?.trim() || null,
        document: input.document?.trim() || null,
        availability: input.availability?.trim() || null,
        servesWholeCity: input.servesWholeCity,
        neighborhoods: input.neighborhoods,
        notes: input.notes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(partners.id, input.id));

    await replaceLinks(tx, input.id, input.categoryIds, input.serviceIds);
  });
}

async function replaceLinks(
  tx: Db,
  partnerId: string,
  categoryIds: string[],
  serviceIds: string[],
) {
  await tx.delete(partnerCategories).where(eq(partnerCategories.partnerId, partnerId));
  if (categoryIds.length > 0) {
    await tx.insert(partnerCategories).values(
      categoryIds.map((categoryId, indice) => ({
        partnerId,
        categoryId,
        // A primeira da lista é a principal — é o que o matching prioriza.
        isPrimary: indice === 0,
      })),
    );
  }

  await tx.delete(partnerServices).where(eq(partnerServices.partnerId, partnerId));
  if (serviceIds.length > 0) {
    await tx
      .insert(partnerServices)
      .values(serviceIds.map((serviceId) => ({ partnerId, serviceId })));
  }
}

export async function setPartnerStatus(input: {
  id: string;
  to: PartnerStatus;
  actor: Actor;
  reason?: string | null;
}) {
  return applyTransition({
    machine: "partner",
    subjectType: "partner",
    table: partners,
    id: input.id,
    to: input.to,
    actor: input.actor,
    summary: input.reason ? `${input.reason}` : undefined,
  });
}

/* ---------------------------------------------------------------
   Beta Fundador
   --------------------------------------------------------------- */

export async function registerPayment(input: {
  partnerId: string;
  amountCents?: number;
  method: string | null;
  reference: string | null;
  paidAt: Date;
  notes: string | null;
  actor: Actor;
}) {
  await db.transaction(async (tx) => {
    await tx.insert(payments).values({
      partnerId: input.partnerId,
      kind: "beta_fundador",
      amountCents: input.amountCents ?? BETA_PRICE_CENTS,
      method: input.method,
      reference: input.reference,
      paidAt: input.paidAt,
      notes: input.notes,
    });

    // O pagamento marca a reserva da participação. Não inicia o prazo:
    // `betaStartedAt` continua nulo até o lançamento acontecer.
    await tx
      .update(partners)
      .set({ betaPaidAt: input.paidAt, founder: true, updatedAt: new Date() })
      .where(eq(partners.id, input.partnerId));

    await recordActivity(tx, {
      subjectType: "partner",
      subjectId: input.partnerId,
      type: "pagamento",
      summary: "Pagamento do Beta Fundador registrado. A participação está reservada.",
      meta: { amountCents: input.amountCents ?? BETA_PRICE_CENTS },
      actor: input.actor,
    });
  });
}

export async function completeOnboarding(input: { partnerId: string; actor: Actor }) {
  await db.transaction(async (tx) => {
    await tx
      .update(partners)
      .set({ onboardingDoneAt: new Date(), updatedAt: new Date() })
      .where(eq(partners.id, input.partnerId));

    await recordActivity(tx, {
      subjectType: "partner",
      subjectId: input.partnerId,
      type: "onboarding",
      summary: "Onboarding concluído. Pronto para entrar na distribuição.",
      actor: input.actor,
    });
  });
}

/**
 * O lançamento da operação.
 *
 * Este é o momento em que o relógio dos 90 dias começa — para todos os
 * Fundadores que já pagaram e concluíram o onboarding, ao mesmo tempo. Quem
 * ainda não estiver pronto não tem o relógio disparado agora: entra depois,
 * com o próprio início, porque o prazo dele também precisa valer 90 dias de
 * operação de verdade.
 *
 * É irreversível de propósito. Uma data de lançamento que pode ser desfeita
 * não é uma data de lançamento.
 */
export async function registerLaunch(input: { at: Date; actor: Actor }) {
  return db.transaction(async (tx) => {
    await writeSetting(SETTING_LAUNCHED_AT, input.at.toISOString(), tx);

    const candidatos = await tx
      .select({
        id: partners.id,
        name: partners.name,
        status: partners.status,
        founder: partners.founder,
        betaPaidAt: partners.betaPaidAt,
        onboardingDoneAt: partners.onboardingDoneAt,
        betaStartedAt: partners.betaStartedAt,
      })
      .from(partners);

    let iniciados = 0;
    let ativados = 0;

    for (const p of candidatos) {
      const patch: Record<string, unknown> = {};

      if (readyForLaunch(p)) {
        patch.betaStartedAt = input.at;
        iniciados += 1;
      }

      if (p.status === "aguardando_lancamento") {
        patch.status = "ativo";
        ativados += 1;
      }

      if (Object.keys(patch).length === 0) continue;

      await tx
        .update(partners)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(partners.id, p.id));

      await recordActivity(tx, {
        subjectType: "partner",
        subjectId: p.id,
        type: "lancamento",
        fromState: p.status,
        toState: patch.status ? "ativo" : null,
        summary: patch.betaStartedAt
          ? "A operação foi aberta: os 90 dias do Beta Fundador começaram hoje."
          : "A operação foi aberta e o parceiro entrou na distribuição.",
        actor: input.actor,
      });
    }

    return { iniciados, ativados };
  });
}

/** Fundadores que ainda não tiveram o prazo iniciado, e por quê. */
export async function foundersPendingStart() {
  return db
    .select({
      id: partners.id,
      code: partners.code,
      name: partners.name,
      betaPaidAt: partners.betaPaidAt,
      onboardingDoneAt: partners.onboardingDoneAt,
      betaStartedAt: partners.betaStartedAt,
      founder: partners.founder,
      status: partners.status,
    })
    .from(partners)
    .where(and(eq(partners.founder, true), isNull(partners.betaStartedAt)))
    .orderBy(asc(partners.name));
}
