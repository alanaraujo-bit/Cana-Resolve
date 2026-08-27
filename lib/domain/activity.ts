import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db, type Db } from "@/lib/db/client";
import {
  activities,
  interactions,
  notifications,
  opportunities,
  operators,
  type SubjectType,
} from "@/lib/db/schema";
import { interactionLabel, type InteractionKind } from "./interaction-kinds";
import { canTransition, stateLabel, type MachineName } from "./states";

/**
 * A memória da operação.
 *
 * Duas ideias, propositalmente separadas:
 *
 * - **Atividade** é o que o sistema observou: "mudou de Em análise para
 *   Aprovado". Ninguém digita, ninguém esquece, e é assim que se responde
 *   *como* um registro chegou ao estado em que está.
 * - **Interação** é o que uma pessoa registrou: "liguei, pediu para retornar
 *   segunda". Isso o sistema não tem como saber sozinho.
 *
 * Toda mudança de estado passa por `applyTransition`, que grava o registro e a
 * atividade na mesma transação. Se a atividade não puder ser gravada, o estado
 * também não muda — a história nunca fica devendo um capítulo.
 */

export type Actor = { id: string } | null;

export type ActivityInput = {
  subjectType: SubjectType;
  subjectId: string;
  type: string;
  summary: string;
  fromState?: string | null;
  toState?: string | null;
  meta?: Record<string, unknown>;
  actor?: Actor;
};

export async function recordActivity(tx: Db, input: ActivityInput) {
  await tx.insert(activities).values({
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    type: input.type,
    summary: input.summary,
    fromState: input.fromState ?? null,
    toState: input.toState ?? null,
    meta: input.meta ?? {},
    operatorId: input.actor?.id ?? null,
  });
}

export class TransitionError extends Error {
  constructor(
    readonly from: string,
    readonly to: string,
    message: string,
  ) {
    super(message);
    this.name = "TransitionError";
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type StatusTable = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

type TransitionOptions = {
  machine: MachineName;
  subjectType: SubjectType;
  table: StatusTable;
  id: string;
  to: string;
  actor?: Actor;
  /** Campos gravados junto — carimbos de data, motivo, observações. */
  patch?: Record<string, unknown>;
  /** Substitui o texto padrão da atividade quando há algo melhor a dizer. */
  summary?: string;
  meta?: Record<string, unknown>;
  /** Deixa a transição acontecer dentro de uma transação já aberta. */
  tx?: Db;
};

/**
 * O único caminho para mudar o estado de qualquer coisa.
 *
 * A transição é conferida contra a máquina de estados antes de tocar no banco:
 * um pedido não pula de "Nova" para "Resolvida" sem passar pelo meio, nem por
 * um bug de interface nem por uma requisição forjada.
 */
export async function applyTransition(options: TransitionOptions) {
  const run = async (tx: Db) => {
    const [current] = await tx
      .select({ status: options.table.status })
      .from(options.table)
      .where(eq(options.table.id, options.id))
      .limit(1);

    if (!current) {
      throw new TransitionError("", options.to, "O registro não existe mais.");
    }

    const from = current.status as string;

    if (from === options.to) {
      // Nada mudou. Ainda assim aplicamos o patch, porque pode trazer
      // observação ou motivo — mas não inventamos uma atividade de mudança.
      if (options.patch && Object.keys(options.patch).length > 0) {
        await tx
          .update(options.table)
          .set({ ...options.patch, updatedAt: new Date() })
          .where(eq(options.table.id, options.id));
      }
      return { from, to: options.to, changed: false };
    }

    if (!canTransition(options.machine, from, options.to)) {
      throw new TransitionError(
        from,
        options.to,
        `Não dá para ir de "${stateLabel(options.machine, from)}" para ` +
          `"${stateLabel(options.machine, options.to)}".`,
      );
    }

    await tx
      .update(options.table)
      .set({ ...options.patch, status: options.to, updatedAt: new Date() })
      .where(eq(options.table.id, options.id));

    await recordActivity(tx, {
      subjectType: options.subjectType,
      subjectId: options.id,
      type: "estado",
      fromState: from,
      toState: options.to,
      summary:
        options.summary ??
        `${stateLabel(options.machine, from)} → ${stateLabel(options.machine, options.to)}`,
      meta: options.meta,
      actor: options.actor,
    });

    // A central de notificações nasce das mesmas transições que alimentam a
    // operação. Assim nenhum app mantém uma cópia frágil dos estados.
    if (options.subjectType === "request") {
      const copy = requestNotification(options.to);
      if (copy) {
        await tx.insert(notifications).values({
          recipientType: "resident",
          recipientId: options.id,
          title: copy.title,
          body: copy.body,
          href: `/minhas-solicitacoes/${options.id}`,
        });
      }
    }
    if (options.subjectType === "opportunity") {
      const [opportunity] = await tx
        .select({ partnerId: opportunities.partnerId, requestId: opportunities.requestId })
        .from(opportunities)
        .where(eq(opportunities.id, options.id))
        .limit(1);
      if (opportunity) {
        if (options.to === "encaminhado") {
          await tx.insert(notifications).values({ recipientType: "partner", recipientId: opportunity.partnerId, title: "Nova oportunidade", body: "Há um pedido compatível aguardando sua resposta.", href: `/parceiro/oportunidades/${options.id}` });
        }
        if (options.to === "respondeu" || options.to === "contato_realizado") {
          await tx.insert(notifications).values({ recipientType: "resident", recipientId: opportunity.requestId, title: options.to === "respondeu" ? "Profissional encontrado" : "Contato em andamento", body: options.to === "respondeu" ? "Um profissional demonstrou interesse em ajudar." : "Um profissional registrou que entrou em contato.", href: `/minhas-solicitacoes/${opportunity.requestId}` });
        }
      }
    }

    return { from, to: options.to, changed: true };
  };

  return options.tx ? run(options.tx) : db.transaction(run);
}

function requestNotification(to: string) {
  const copy: Record<string, { title: string; body: string }> = {
    em_triagem: { title: "Estamos entendendo seu pedido", body: "A equipe começou a analisar sua solicitação." },
    pronta: { title: "Procurando profissionais", body: "Estamos verificando quem pode ajudar você." },
    encaminhada: { title: "Profissionais foram avisados", body: "Agora aguardamos quem consegue atender." },
    em_atendimento: { title: "Contato em andamento", body: "Um profissional já está seguindo com seu atendimento." },
    resolvida: { title: "Solicitação concluída", body: "Registramos que esta solicitação foi resolvida." },
  };
  return copy[to] ?? null;
}

/* ---------------------------------------------------------------
   Leitura
   --------------------------------------------------------------- */

export type TimelineEntry = {
  id: string;
  at: Date;
  kind: "atividade" | "interacao";
  type: string;
  summary: string;
  body: string | null;
  fromState: string | null;
  toState: string | null;
  operatorName: string | null;
  meta: Record<string, unknown>;
};

/**
 * A linha do tempo de um registro: atividades e interações juntas, do mais
 * recente para o mais antigo. É a resposta para "como isso chegou até aqui".
 */
export async function timelineOf(
  subjectType: SubjectType,
  subjectId: string,
  limit = 60,
): Promise<TimelineEntry[]> {
  const [acts, notes] = await Promise.all([
    db
      .select({
        id: activities.id,
        at: activities.createdAt,
        type: activities.type,
        summary: activities.summary,
        fromState: activities.fromState,
        toState: activities.toState,
        meta: activities.meta,
        operatorName: operators.name,
      })
      .from(activities)
      .leftJoin(operators, eq(operators.id, activities.operatorId))
      .where(
        and(
          eq(activities.subjectType, subjectType),
          eq(activities.subjectId, subjectId),
        ),
      )
      .orderBy(desc(activities.createdAt))
      .limit(limit),
    db
      .select({
        id: interactions.id,
        at: interactions.occurredAt,
        type: interactions.kind,
        body: interactions.body,
        operatorName: operators.name,
      })
      .from(interactions)
      .leftJoin(operators, eq(operators.id, interactions.operatorId))
      .where(
        and(
          eq(interactions.subjectType, subjectType),
          eq(interactions.subjectId, subjectId),
        ),
      )
      .orderBy(desc(interactions.occurredAt))
      .limit(limit),
  ]);

  const merged: TimelineEntry[] = [
    ...acts.map((a) => ({
      id: a.id,
      at: a.at,
      kind: "atividade" as const,
      type: a.type,
      summary: a.summary,
      body: null,
      fromState: a.fromState,
      toState: a.toState,
      operatorName: a.operatorName,
      meta: a.meta,
    })),
    ...notes.map((n) => ({
      id: n.id,
      at: n.at,
      kind: "interacao" as const,
      type: n.type,
      summary: interactionLabel(n.type),
      body: n.body,
      fromState: null,
      toState: null,
      operatorName: n.operatorName,
      meta: {} as Record<string, unknown>,
    })),
  ];

  return merged.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}


export async function addInteraction(input: {
  subjectType: SubjectType;
  subjectId: string;
  kind: InteractionKind;
  body: string;
  occurredAt?: Date;
  actor?: Actor;
  tx?: Db;
}) {
  const target = input.tx ?? db;
  await target.insert(interactions).values({
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    kind: input.kind,
    body: input.body,
    occurredAt: input.occurredAt ?? new Date(),
    operatorId: input.actor?.id ?? null,
  });
}

/** Os últimos acontecimentos do sistema inteiro — alimenta a Visão Geral. */
export async function recentActivity(limit = 12) {
  return db
    .select({
      id: activities.id,
      at: activities.createdAt,
      subjectType: activities.subjectType,
      subjectId: activities.subjectId,
      type: activities.type,
      summary: activities.summary,
      fromState: activities.fromState,
      toState: activities.toState,
      meta: activities.meta,
      operatorName: operators.name,
    })
    .from(activities)
    .leftJoin(operators, eq(operators.id, activities.operatorId))
    .orderBy(desc(activities.createdAt))
    .limit(limit);
}

/** Quantos registros de cada estado existem numa tabela. */
export async function countByStatus(table: StatusTable, states?: string[]) {
  const rows = await db
    .select({ status: table.status, n: sql<number>`count(*)::int` })
    .from(table)
    .where(states && states.length > 0 ? inArray(table.status, states) : undefined)
    .groupBy(table.status);

  const counts: Record<string, number> = {};
  for (const row of rows as { status: string; n: number }[]) counts[row.status] = row.n;
  return counts;
}

export { interactionKinds, interactionLabel } from "./interaction-kinds";
export type { InteractionKind } from "./interaction-kinds";
