import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  categories,
  notifications,
  opportunities,
  partnerCategories,
  partners,
  partnerServices,
  serviceRequests,
  services,
} from "@/lib/db/schema";
import { applyTransition, recordActivity, timelineOf } from "@/lib/domain/activity";
import {
  opportunityContactUnlocked,
  opportunityStates,
  partnerDrivableOpportunityStatuses,
  type OpportunityStatus,
  type Tone,
} from "@/lib/domain/states";

export const residentStatus: Record<string, { title: string; hint: string }> = {
  nova: { title: "Solicitação recebida", hint: "Recebemos seu pedido e vamos entender os detalhes." },
  em_triagem: { title: "Estamos entendendo seu pedido", hint: "A equipe está procurando o melhor caminho para ajudar." },
  pronta: { title: "Procurando profissionais", hint: "Estamos verificando quem pode atender esta necessidade." },
  encaminhada: { title: "Profissionais foram avisados", hint: "Agora aguardamos quem consegue atender você." },
  em_atendimento: { title: "Contato em andamento", hint: "Um profissional já está seguindo com o atendimento." },
  resolvida: { title: "Concluída", hint: "Que bom que você conseguiu resolver." },
  sem_parceiro: { title: "Ainda não encontramos alguém", hint: "A equipe não encontrou um profissional disponível neste momento." },
  cancelada: { title: "Encerrada", hint: "Esta solicitação foi encerrada." },
  invalida: { title: "Encerrada", hint: "Esta solicitação não pode seguir." },
  duplicada: { title: "Encerrada", hint: "Este pedido já estava registrado." },
};

export function residentState(status: string) {
  return residentStatus[status] ?? { title: "Atualização disponível", hint: "Há uma atualização na sua solicitação." };
}

/**
 * O selo de disponibilidade que o próprio parceiro vê na Home.
 *
 * Um binário "ativo ou não" diria "Oportunidades pausadas" para um parceiro
 * que nunca foi pausado — só está `aguardando_lancamento`, porque a operação
 * ainda não abriu para moradores. São situações diferentes e a tela precisa
 * dizer qual das duas é a verdadeira, não a mais parecida.
 */
export function partnerAvailabilityBadge(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "ativo":
      return { label: "Recebendo oportunidades", tone: "positive" };
    case "pausado":
      return { label: "Você pausou as oportunidades", tone: "neutral" };
    case "aguardando_lancamento":
      return { label: "Aguardando o lançamento da operação", tone: "progress" };
    case "suspenso":
      return { label: "Fora da distribuição no momento", tone: "negative" };
    case "encerrado":
      return { label: "Fora da rede", tone: "negative" };
    default:
      return { label: "Status indisponível", tone: "neutral" };
  }
}

export async function residentRequests(whatsapp: string) {
  return db
    .select({
      id: serviceRequests.id,
      code: serviceRequests.code,
      description: serviceRequests.description,
      neighborhood: serviceRequests.neighborhood,
      urgency: serviceRequests.urgency,
      status: serviceRequests.status,
      categoryName: categories.name,
      createdAt: serviceRequests.createdAt,
      updatedAt: serviceRequests.updatedAt,
    })
    .from(serviceRequests)
    .leftJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .where(eq(serviceRequests.whatsapp, whatsapp))
    .orderBy(desc(serviceRequests.createdAt));
}

export async function residentRequest(whatsapp: string, id: string) {
  const [request] = await db
    .select({
      id: serviceRequests.id,
      code: serviceRequests.code,
      description: serviceRequests.description,
      neighborhood: serviceRequests.neighborhood,
      urgency: serviceRequests.urgency,
      status: serviceRequests.status,
      categoryName: categories.name,
      createdAt: serviceRequests.createdAt,
    })
    .from(serviceRequests)
    .leftJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .where(and(eq(serviceRequests.id, id), eq(serviceRequests.whatsapp, whatsapp)))
    .limit(1);
  if (!request) return null;

  const related = await db
    .select({
      id: opportunities.id,
      status: opportunities.status,
      partnerId: partners.id,
      name: partners.name,
      description: partners.description,
      whatsapp: partners.whatsapp,
      servesWholeCity: partners.servesWholeCity,
      neighborhoods: partners.neighborhoods,
    })
    .from(opportunities)
    .innerJoin(partners, eq(partners.id, opportunities.partnerId))
    .where(eq(opportunities.requestId, request.id));

  return {
    request,
    related: related.map((item) => ({
      ...item,
      // Contato só entra na DTO depois de aceitação/retorno real do parceiro.
      contactAllowed: opportunityContactUnlocked.includes(item.status as OpportunityStatus),
    })),
    timeline: await timelineOf("request", request.id, 30),
  };
}

export async function residentNotifications(whatsapp: string) {
  const requestIds = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(eq(serviceRequests.whatsapp, whatsapp));
  const ids = requestIds.map((row) => row.id);
  if (!ids.length) return [];
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.recipientType, "resident"), inArray(notifications.recipientId, ids)))
    .orderBy(desc(notifications.createdAt));
}

export async function partnerHome(partnerId: string) {
  const [partner] = await db
    .select({ id: partners.id, code: partners.code, name: partners.name, status: partners.status, founder: partners.founder, betaPaidAt: partners.betaPaidAt, betaStartedAt: partners.betaStartedAt, onboardingDoneAt: partners.onboardingDoneAt })
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);
  if (!partner) return null;
  const items = await partnerOpportunities(partnerId);
  const profile = await partnerProfile(partnerId);
  return { partner, items, profile };
}

export async function partnerOpportunities(partnerId: string) {
  return db
    .select({
      id: opportunities.id,
      status: opportunities.status,
      createdAt: opportunities.createdAt,
      sentAt: opportunities.sentAt,
      requestId: serviceRequests.id,
      requestCode: serviceRequests.code,
      description: serviceRequests.description,
      neighborhood: serviceRequests.neighborhood,
      urgency: serviceRequests.urgency,
      categoryName: categories.name,
    })
    .from(opportunities)
    .innerJoin(serviceRequests, eq(serviceRequests.id, opportunities.requestId))
    .leftJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .where(eq(opportunities.partnerId, partnerId))
    .orderBy(desc(opportunities.createdAt));
}

export async function partnerOpportunity(partnerId: string, opportunityId: string) {
  const [item] = await db
    .select({
      id: opportunities.id,
      status: opportunities.status,
      createdAt: opportunities.createdAt,
      sentAt: opportunities.sentAt,
      outcomeReason: opportunities.outcomeReason,
      requestId: serviceRequests.id,
      requestCode: serviceRequests.code,
      description: serviceRequests.description,
      neighborhood: serviceRequests.neighborhood,
      urgency: serviceRequests.urgency,
      categoryName: categories.name,
      // Nome e WhatsApp do morador vêm da consulta, mas só atravessam para a
      // tela mais abaixo, depois de conferir `contactAllowed` — nunca antes.
      residentName: serviceRequests.residentName,
      residentWhatsapp: serviceRequests.whatsapp,
    })
    .from(opportunities)
    .innerJoin(serviceRequests, eq(serviceRequests.id, opportunities.requestId))
    .leftJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .where(and(eq(opportunities.id, opportunityId), eq(opportunities.partnerId, partnerId)))
    .limit(1);
  if (!item) return null;

  const contactAllowed = opportunityContactUnlocked.includes(item.status as OpportunityStatus);
  const { residentName, residentWhatsapp, ...rest } = item;

  return {
    ...rest,
    // Sem interesse confirmado, o dado pessoal do morador nem entra no objeto
    // que a página recebe — não é uma questão de escondê-lo na tela, porque
    // qualquer coisa que chegue ao componente de servidor vai para o payload
    // que o navegador consegue ler.
    residentName: contactAllowed ? residentName : null,
    residentWhatsapp: contactAllowed ? residentWhatsapp : null,
    contactAllowed,
    timeline: await timelineOf("opportunity", item.id, 30),
  };
}

export async function partnerProfile(partnerId: string) {
  const [partner] = await db
    .select({
      id: partners.id,
      code: partners.code,
      name: partners.name,
      ownerName: partners.ownerName,
      whatsapp: partners.whatsapp,
      email: partners.email,
      description: partners.description,
      servesWholeCity: partners.servesWholeCity,
      neighborhoods: partners.neighborhoods,
      availability: partners.availability,
      status: partners.status,
      founder: partners.founder,
      betaPaidAt: partners.betaPaidAt,
      betaStartedAt: partners.betaStartedAt,
      onboardingDoneAt: partners.onboardingDoneAt,
      createdAt: partners.createdAt,
      // De propósito fora da seleção: `notes` (anotação interna do operador) e
      // `prospectId` (referência ao funil comercial). Nenhum dos dois é dado
      // que o parceiro deveria ler sobre a própria análise.
    })
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);
  if (!partner) return null;
  const [categoryRows, serviceRows] = await Promise.all([
    db.select({ id: categories.id, name: categories.name, primary: partnerCategories.isPrimary })
      .from(partnerCategories).innerJoin(categories, eq(categories.id, partnerCategories.categoryId))
      .where(eq(partnerCategories.partnerId, partnerId)),
    db.select({ id: services.id, name: services.name, categoryName: categories.name })
      .from(partnerServices).innerJoin(services, eq(services.id, partnerServices.serviceId))
      .innerJoin(categories, eq(categories.id, services.categoryId))
      .where(eq(partnerServices.partnerId, partnerId)),
  ]);
  return { partner, categories: categoryRows, services: serviceRows };
}

export async function partnerNotifications(partnerId: string) {
  return db.select().from(notifications)
    .where(and(eq(notifications.recipientType, "partner"), eq(notifications.recipientId, partnerId)))
    .orderBy(desc(notifications.createdAt));
}

export async function setPartnerOpportunityStatus(input: { partnerId: string; opportunityId: string; to: OpportunityStatus; reason?: string }) {
  // `opportunityStates.is()` já garante que `to` é um estado da máquina — mas a
  // máquina descreve para onde uma oportunidade *pode* ir, não o que o próprio
  // parceiro tem autoridade para declarar. "Sem resposta" é a operação
  // registrando silêncio; "Selecionado" é o começo do ciclo. Sem esta conferência,
  // a Server Action aceitaria qualquer um dos dois vindo do parceiro.
  if (!partnerDrivableOpportunityStatuses.includes(input.to)) {
    throw new Error("Esta atualização não pode ser feita por aqui.");
  }
  const [row] = await db.select({ id: opportunities.id, status: opportunities.status })
    .from(opportunities).where(and(eq(opportunities.id, input.opportunityId), eq(opportunities.partnerId, input.partnerId))).limit(1);
  if (!row) throw new Error("Oportunidade não encontrada.");
  const patch: Record<string, unknown> = { outcomeReason: input.reason?.slice(0, 240) || null };
  if (input.to === "respondeu") patch.respondedAt = new Date();
  if (input.to === "contato_realizado") patch.contactedAt = new Date();
  if (input.to === "orcamento") patch.quotedAt = new Date();
  if (["contratado", "recusou", "indisponivel", "sem_resposta", "cliente_nao_respondeu", "nao_fechou"].includes(input.to)) patch.closedAt = new Date();
  await applyTransition({ machine: "opportunity", subjectType: "opportunity", table: opportunities, id: row.id, to: input.to, patch, summary: `Parceiro atualizou: ${opportunityStates.label(input.to)}.` });
}

export async function setPartnerAvailability(partnerId: string, available: boolean) {
  const [partner] = await db.select({ status: partners.status }).from(partners).where(eq(partners.id, partnerId)).limit(1);
  if (!partner) throw new Error("Parceiro não encontrado.");
  // Suspensão, encerramento e entrada na rede são decisões da operação. O
  // parceiro só pode alternar a própria disponibilidade quando já está ativo
  // ou quando ele mesmo pausou os recebimentos.
  if (partner.status !== "ativo" && partner.status !== "pausado") {
    throw new Error("Sua disponibilidade é definida pela equipe nesta etapa.");
  }
  const to = available ? "ativo" : "pausado";
  await applyTransition({ machine: "partner", subjectType: "partner", table: partners, id: partnerId, to, summary: available ? "Parceiro voltou a receber oportunidades." : "Parceiro pausou novas oportunidades." });
}

export async function residentResolution(input: { whatsapp: string; requestId: string; answer: "sim" | "ainda_nao" | "nao_precisei" | "outro" }) {
  const [request] = await db.select({ id: serviceRequests.id, status: serviceRequests.status })
    .from(serviceRequests).where(and(eq(serviceRequests.id, input.requestId), eq(serviceRequests.whatsapp, input.whatsapp))).limit(1);
  if (!request) throw new Error("Solicitação não encontrada.");
  if (input.answer === "sim" && ["encaminhada", "em_atendimento"].includes(request.status)) {
    await applyTransition({ machine: "request", subjectType: "request", table: serviceRequests, id: request.id, to: "resolvida", summary: "Morador informou que conseguiu resolver." });
  } else if (input.answer === "nao_precisei" && ["nova", "em_triagem", "pronta"].includes(request.status)) {
    await applyTransition({ machine: "request", subjectType: "request", table: serviceRequests, id: request.id, to: "cancelada", patch: { closeReason: "não precisou mais" }, summary: "Morador informou que não precisa mais deste atendimento." });
  } else {
    await recordActivity(db, { subjectType: "request", subjectId: request.id, type: "retorno_morador", summary: `Morador respondeu: ${input.answer === "ainda_nao" ? "Ainda não" : "Outro"}.`, meta: { answer: input.answer } });
  }
}

export async function markNotificationRead(id: string, recipientType: "resident" | "partner", recipientIds: string[]) {
  if (!recipientIds.length) return;
  await db.update(notifications).set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipientType, recipientType), inArray(notifications.recipientId, recipientIds), isNull(notifications.readAt)));
}
