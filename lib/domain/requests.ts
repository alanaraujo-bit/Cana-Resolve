import "server-only";

import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  categories,
  opportunities,
  partners,
  serviceRequests,
  services,
} from "@/lib/db/schema";
import { applyTransition, type Actor } from "./activity";
import { requestOpen, type RequestStatus } from "./states";

/**
 * Consultas e mudanças de estado das solicitações.
 *
 * O que este arquivo protege: os carimbos de data. `triagedAt`,
 * `dispatchedAt` e `closedAt` não são preenchidos pela interface — eles saem
 * daqui, derivados do estado para o qual o pedido está indo. Uma tela que
 * pudesse gravar "encaminhada em" sem encaminhar nada tornaria o analytics
 * ficção.
 */

export type RequestFilters = {
  estado?: string;
  categoria?: string;
  urgencia?: string;
  busca?: string;
  pagina?: number;
};

const PAGINA = 30;

function whereFrom(filters: RequestFilters) {
  const clauses: SQL[] = [];

  if (filters.estado === "abertas") {
    clauses.push(inArray(serviceRequests.status, requestOpen));
  } else if (filters.estado && filters.estado !== "todas") {
    clauses.push(eq(serviceRequests.status, filters.estado as RequestStatus));
  }

  if (filters.categoria) clauses.push(eq(serviceRequests.categoryId, filters.categoria));
  if (filters.urgencia) clauses.push(eq(serviceRequests.urgency, filters.urgencia));

  if (filters.busca?.trim()) {
    const termo = `%${filters.busca.trim()}%`;
    clauses.push(
      or(
        ilike(serviceRequests.code, termo),
        ilike(serviceRequests.description, termo),
        ilike(serviceRequests.residentName, termo),
        ilike(serviceRequests.whatsapp, `%${filters.busca.replace(/\D/g, "")}%`),
        ilike(serviceRequests.neighborhood, termo),
      )!,
    );
  }

  return clauses.length > 0 ? and(...clauses) : undefined;
}

export async function listRequests(filters: RequestFilters) {
  const where = whereFrom(filters);
  const pagina = Math.max(1, filters.pagina ?? 1);

  const [linhas, [total]] = await Promise.all([
    db
      .select({
        id: serviceRequests.id,
        code: serviceRequests.code,
        description: serviceRequests.description,
        categoryId: serviceRequests.categoryId,
        categoryName: categories.name,
        status: serviceRequests.status,
        urgency: serviceRequests.urgency,
        neighborhood: serviceRequests.neighborhood,
        residentName: serviceRequests.residentName,
        createdAt: serviceRequests.createdAt,
        // Quantos parceiros já receberam este pedido.
        encaminhados: sql<number>`(
          select count(*)::int from opportunities o
          where o.request_id = service_requests.id
        )`,
      })
      .from(serviceRequests)
      .leftJoin(categories, eq(categories.id, serviceRequests.categoryId))
      .where(where)
      .orderBy(desc(serviceRequests.createdAt))
      .limit(PAGINA)
      .offset((pagina - 1) * PAGINA),
    db.select({ n: count() }).from(serviceRequests).where(where),
  ]);

  return {
    linhas,
    total: total?.n ?? 0,
    pagina,
    paginas: Math.max(1, Math.ceil((total?.n ?? 0) / PAGINA)),
  };
}

export async function getRequest(id: string) {
  const [linha] = await db
    .select({
      request: serviceRequests,
      categoryName: categories.name,
      serviceName: services.name,
    })
    .from(serviceRequests)
    .leftJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .leftJoin(services, eq(services.id, serviceRequests.serviceId))
    .where(eq(serviceRequests.id, id))
    .limit(1);

  return linha ?? null;
}

/** Os encaminhamentos deste pedido, com o parceiro que recebeu cada um. */
export async function requestOpportunities(requestId: string) {
  return db
    .select({
      id: opportunities.id,
      status: opportunities.status,
      sentAt: opportunities.sentAt,
      respondedAt: opportunities.respondedAt,
      contactedAt: opportunities.contactedAt,
      quoteAmountCents: opportunities.quoteAmountCents,
      outcomeReason: opportunities.outcomeReason,
      notes: opportunities.notes,
      createdAt: opportunities.createdAt,
      partnerId: partners.id,
      partnerName: partners.name,
      partnerCode: partners.code,
      partnerWhatsapp: partners.whatsapp,
      partnerFounder: partners.founder,
    })
    .from(opportunities)
    .innerJoin(partners, eq(partners.id, opportunities.partnerId))
    .where(eq(opportunities.requestId, requestId))
    .orderBy(desc(opportunities.createdAt));
}

/**
 * Muda o estado de uma solicitação.
 *
 * Os carimbos são consequência do destino, nunca entrada do formulário — é o
 * que mantém "tempo até o encaminhamento" sendo um número real.
 */
export async function setRequestStatus(input: {
  id: string;
  to: RequestStatus;
  actor: Actor;
  reason?: string | null;
}) {
  const agora = new Date();
  const patch: Record<string, unknown> = {};

  if (input.to === "em_triagem") patch.triagedAt = agora;
  if (input.to === "encaminhada") patch.dispatchedAt = agora;
  if (["resolvida", "cancelada", "invalida", "duplicada", "sem_parceiro"].includes(input.to)) {
    patch.closedAt = agora;
    if (input.reason) patch.closeReason = input.reason;
  } else {
    patch.closedAt = null;
    patch.closeReason = null;
  }

  return applyTransition({
    machine: "request",
    subjectType: "request",
    table: serviceRequests,
    id: input.id,
    to: input.to,
    actor: input.actor,
    patch,
  });
}

/** Ajustes de triagem: categoria, serviço, bairro, urgência e observações. */
export async function updateRequestTriage(input: {
  id: string;
  categoryId: string | null;
  serviceId: string | null;
  neighborhood: string | null;
  urgency: string | null;
  internalNotes: string | null;
}) {
  await db
    .update(serviceRequests)
    .set({
      categoryId: input.categoryId,
      serviceId: input.serviceId,
      neighborhood: input.neighborhood,
      urgency: input.urgency,
      internalNotes: input.internalNotes,
      updatedAt: new Date(),
    })
    .where(eq(serviceRequests.id, input.id));
}
