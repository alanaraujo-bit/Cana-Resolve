import "server-only";

import { and, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  categories,
  opportunities,
  partners,
  serviceRequests,
} from "@/lib/db/schema";
import { applyTransition, recordActivity, type Actor } from "./activity";
import { opportunityLive, type OpportunityStatus, type RequestStatus } from "./states";

/**
 * O ciclo do encaminhamento.
 *
 * Uma oportunidade é "esta solicitação, para este parceiro". Ela existe
 * separada da solicitação porque o desfecho é individual: dois parceiros podem
 * receber o mesmo pedido e terminar em lugares completamente diferentes, e
 * juntar isso numa tabela só apagaria justamente a informação que interessa.
 *
 * Os carimbos aqui registram **o que sabemos**, não o que gostaríamos de saber.
 * Não existe "visualizado": o WhatsApp não nos conta isso, e um dado inventado
 * é pior do que um dado ausente.
 */

export type OpportunityFilters = {
  estado?: string;
  parceiro?: string;
  pagina?: number;
};

const PAGINA = 40;

export async function createOpportunities(input: {
  requestId: string;
  partnerIds: string[];
  actor: Actor;
  /** `true` quando a mensagem já foi enviada ao parceiro neste mesmo momento. */
  jaEnviado: boolean;
}) {
  if (input.partnerIds.length === 0) return { criados: 0 };

  return db.transaction(async (tx) => {
    const [pedido] = await tx
      .select({ code: serviceRequests.code, status: serviceRequests.status })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, input.requestId))
      .limit(1);

    if (!pedido) throw new Error("Solicitação não encontrada.");

    const escolhidos = await tx
      .select({ id: partners.id, name: partners.name })
      .from(partners)
      .where(inArray(partners.id, input.partnerIds));

    const agora = new Date();

    const criados = await tx
      .insert(opportunities)
      .values(
        escolhidos.map((p) => ({
          requestId: input.requestId,
          partnerId: p.id,
          status: (input.jaEnviado ? "encaminhado" : "selecionado") as OpportunityStatus,
          sentAt: input.jaEnviado ? agora : null,
        })),
      )
      // Encaminhar duas vezes para o mesmo parceiro não é erro nem duplicata:
      // simplesmente não acontece nada.
      .onConflictDoNothing({
        target: [opportunities.requestId, opportunities.partnerId],
      })
      .returning({ id: opportunities.id, partnerId: opportunities.partnerId });

    const nomePorId = new Map(escolhidos.map((p) => [p.id, p.name]));

    for (const o of criados) {
      await recordActivity(tx, {
        subjectType: "opportunity",
        subjectId: o.id,
        type: "entrada",
        toState: input.jaEnviado ? "encaminhado" : "selecionado",
        summary: `${pedido.code} encaminhado para ${nomePorId.get(o.partnerId) ?? "parceiro"}.`,
        actor: input.actor,
      });

      await recordActivity(tx, {
        subjectType: "partner",
        subjectId: o.partnerId,
        type: "oportunidade",
        summary: `Recebeu a solicitação ${pedido.code}.`,
        actor: input.actor,
        meta: { requestId: input.requestId },
      });
    }

    if (criados.length > 0) {
      await recordActivity(tx, {
        subjectType: "request",
        subjectId: input.requestId,
        type: "encaminhamento",
        summary:
          criados.length === 1
            ? `Encaminhada para ${nomePorId.get(criados[0].partnerId) ?? "um parceiro"}.`
            : `Encaminhada para ${criados.length} parceiros.`,
        actor: input.actor,
      });

      // O pedido acompanha o encaminhamento. Como a máquina de estados não
      // deixa pular etapas, um pedido ainda "Nova" percorre o caminho inteiro
      // — e o histórico registra cada passo, que é exatamente o que aconteceu:
      // alguém leu, classificou e encaminhou de uma vez.
      const caminho: Record<string, RequestStatus[]> = {
        nova: ["pronta", "encaminhada"],
        em_triagem: ["pronta", "encaminhada"],
        pronta: ["encaminhada"],
        sem_parceiro: ["pronta", "encaminhada"],
      };

      for (const destino of caminho[pedido.status] ?? []) {
        await applyTransition({
          machine: "request",
          subjectType: "request",
          table: serviceRequests,
          id: input.requestId,
          to: destino,
          actor: input.actor,
          patch: destino === "encaminhada" ? { dispatchedAt: agora } : {},
          tx,
        });
      }
    }

    return { criados: criados.length };
  });
}

/** Muda o estado de uma oportunidade, carimbando a data que aquele estado implica. */
export async function setOpportunityStatus(input: {
  id: string;
  to: OpportunityStatus;
  actor: Actor;
  reason?: string | null;
  quoteAmountCents?: number | null;
  notes?: string | null;
}) {
  const agora = new Date();
  const patch: Record<string, unknown> = {};

  if (input.to === "encaminhado") patch.sentAt = agora;
  if (input.to === "respondeu") patch.respondedAt = agora;
  if (input.to === "contato_realizado") patch.contactedAt = agora;
  if (input.to === "orcamento") {
    patch.quotedAt = agora;
    if (input.quoteAmountCents != null) patch.quoteAmountCents = input.quoteAmountCents;
  }
  if (
    ["contratado", "recusou", "indisponivel", "sem_resposta", "cliente_nao_respondeu", "nao_fechou"].includes(
      input.to,
    )
  ) {
    patch.closedAt = agora;
  }
  if (input.reason !== undefined) patch.outcomeReason = input.reason;
  if (input.notes !== undefined) patch.notes = input.notes;

  const resultado = await applyTransition({
    machine: "opportunity",
    subjectType: "opportunity",
    table: opportunities,
    id: input.id,
    to: input.to,
    actor: input.actor,
    patch,
  });

  // Um parceiro que fez contato coloca o pedido em atendimento; um serviço
  // fechado dá o pedido por resolvido. É a única ponte entre os dois ciclos.
  const reflexo: Partial<Record<OpportunityStatus, "em_atendimento" | "resolvida">> = {
    contato_realizado: "em_atendimento",
    orcamento: "em_atendimento",
    contratado: "resolvida",
  };

  const destinoPedido = reflexo[input.to];
  if (resultado.changed && destinoPedido) {
    const [linha] = await db
      .select({ requestId: opportunities.requestId })
      .from(opportunities)
      .where(eq(opportunities.id, input.id))
      .limit(1);

    if (linha) {
      const [pedido] = await db
        .select({ status: serviceRequests.status })
        .from(serviceRequests)
        .where(eq(serviceRequests.id, linha.requestId))
        .limit(1);

      // Silencioso quando a máquina não permite: o desfecho da oportunidade é
      // o que importa, e forçar o pedido seria mentir sobre o ciclo dele.
      if (pedido && pedido.status !== destinoPedido) {
        try {
          await applyTransition({
            machine: "request",
            subjectType: "request",
            table: serviceRequests,
            id: linha.requestId,
            to: destinoPedido,
            actor: input.actor,
            patch: destinoPedido === "resolvida" ? { closedAt: agora } : {},
            summary:
              destinoPedido === "resolvida"
                ? "Um parceiro registrou a contratação."
                : "Um parceiro entrou em contato com o morador.",
          });
        } catch {
          /* transição não permitida a partir do estado atual */
        }
      }
    }
  }

  return resultado;
}

export async function listOpportunities(filters: OpportunityFilters) {
  const clauses: SQL[] = [];

  if (filters.estado === "vivas") {
    clauses.push(inArray(opportunities.status, opportunityLive));
  } else if (filters.estado && filters.estado !== "todas") {
    clauses.push(eq(opportunities.status, filters.estado as OpportunityStatus));
  }
  if (filters.parceiro) clauses.push(eq(opportunities.partnerId, filters.parceiro));

  const where = clauses.length > 0 ? and(...clauses) : undefined;
  const pagina = Math.max(1, filters.pagina ?? 1);

  const [linhas, [total]] = await Promise.all([
    db
      .select({
        id: opportunities.id,
        status: opportunities.status,
        createdAt: opportunities.createdAt,
        sentAt: opportunities.sentAt,
        respondedAt: opportunities.respondedAt,
        quoteAmountCents: opportunities.quoteAmountCents,
        outcomeReason: opportunities.outcomeReason,
        requestId: serviceRequests.id,
        requestCode: serviceRequests.code,
        requestDescription: serviceRequests.description,
        requestNeighborhood: serviceRequests.neighborhood,
        categoryName: categories.name,
        partnerId: partners.id,
        partnerName: partners.name,
        partnerFounder: partners.founder,
      })
      .from(opportunities)
      .innerJoin(serviceRequests, eq(serviceRequests.id, opportunities.requestId))
      .innerJoin(partners, eq(partners.id, opportunities.partnerId))
      .leftJoin(categories, eq(categories.id, serviceRequests.categoryId))
      .where(where)
      .orderBy(desc(opportunities.createdAt))
      .limit(PAGINA)
      .offset((pagina - 1) * PAGINA),
    db.select({ n: count() }).from(opportunities).where(where),
  ]);

  return {
    linhas,
    total: total?.n ?? 0,
    pagina,
    paginas: Math.max(1, Math.ceil((total?.n ?? 0) / PAGINA)),
  };
}

/** O histórico de encaminhamentos de um parceiro, para o perfil dele. */
export async function partnerOpportunities(partnerId: string, limit = 25) {
  return db
    .select({
      id: opportunities.id,
      status: opportunities.status,
      createdAt: opportunities.createdAt,
      requestId: serviceRequests.id,
      requestCode: serviceRequests.code,
      requestDescription: serviceRequests.description,
      categoryName: categories.name,
    })
    .from(opportunities)
    .innerJoin(serviceRequests, eq(serviceRequests.id, opportunities.requestId))
    .leftJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .where(eq(opportunities.partnerId, partnerId))
    .orderBy(desc(opportunities.createdAt))
    .limit(limit);
}

/** Resumo do desempenho conhecido de um parceiro. Sem métrica inventada. */
export async function partnerScorecard(partnerId: string) {
  const rows = await db
    .select({ status: opportunities.status, n: sql<number>`count(*)::int` })
    .from(opportunities)
    .where(eq(opportunities.partnerId, partnerId))
    .groupBy(opportunities.status);

  const porEstado: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    porEstado[row.status] = row.n;
    total += row.n;
  }

  return {
    total,
    porEstado,
    contratados: porEstado.contratado ?? 0,
    semResposta: porEstado.sem_resposta ?? 0,
    vivos: opportunityLive.reduce((soma, estado) => soma + (porEstado[estado] ?? 0), 0),
  };
}
