/**
 * Esquema do Operational Core.
 *
 * Três decisões que valem ser lidas antes do código:
 *
 * 1. **Solicitação não é Oportunidade.** `serviceRequests` guarda a necessidade
 *    do morador; `opportunities` guarda cada encaminhamento dessa necessidade
 *    para um parceiro, com estado próprio. Não existe tabela genérica de
 *    "leads" misturando as duas coisas.
 *
 * 2. **Estados são texto validado no domínio**, não enums do Postgres. A fase é
 *    de validação: os estados ainda vão mudar, e migrar enum a cada ajuste sai
 *    caro sem trazer segurança que `lib/domain/states.ts` já não dê.
 *
 * 3. **Nada derivado do Beta é persistido.** O prazo de 90 dias começa no
 *    lançamento da operação, não no pagamento — então `betaStartedAt` só é
 *    preenchido quando o lançamento acontece e o fim é sempre calculado.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  ApplicationStatus,
  OpportunityStatus,
  PartnerStatus,
  ProspectStatus,
  RequestStatus,
} from "@/lib/domain/states";

const pk = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ---------------------------------------------------------------
   Acesso
   --------------------------------------------------------------- */

export const operators = pgTable(
  "operators",
  {
    id: pk(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    /** scrypt, no formato `scrypt$N$r$p$salt$hash` — tudo em base64url. */
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<"owner" | "operator">().notNull().default("operator"),
    active: boolean("active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("operators_email_key").on(sql`lower(${t.email})`)],
);

/**
 * Sessões ficam no banco para que a expiração e o "sair de todos os aparelhos"
 * sejam reais, e não apenas uma data assinada dentro do cookie.
 */
export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 do token. O token cru só existe no cookie do operador. */
    tokenHash: text("token_hash").primaryKey(),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => operators.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Só o suficiente para o operador reconhecer a sessão. Sem IP. */
    device: text("device"),
  },
  (t) => [index("sessions_operator_idx").on(t.operatorId)],
);

/* ---------------------------------------------------------------
   Acesso de Morador e Parceiro
   --------------------------------------------------------------- */

/**
 * Um morador não cria conta. O acesso é um link assinado (HMAC, verificado em
 * `lib/auth/audience.ts`), enviado depois do pedido — não uma linha aqui.
 * Existiu uma tabela `resident_sessions` (código + WhatsApp, sem freio de
 * tentativas); foi removida por ser exatamente a superfície de força bruta
 * descrita em HANDOFF.md §3.1, e um link assinado não precisa de estado no
 * banco para ser verificado.
 */

/** Sessões do Partner App: uma empresa só pode ver o próprio perfil e oportunidades. */
export const partnerSessions = pgTable(
  "partner_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("partner_sessions_partner_idx").on(t.partnerId)],
);

/**
 * Central in-app compartilhada. O destinatário é sempre uma entidade já
 * conhecida, nunca um telefone ou dado pessoal duplicado.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: pk(),
    recipientType: text("recipient_type").$type<"resident" | "partner">().notNull(),
    recipientId: text("recipient_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientType, t.recipientId),
    index("notifications_created_idx").on(t.createdAt),
  ],
);

/* ---------------------------------------------------------------
   Catálogo
   --------------------------------------------------------------- */

export const categories = pgTable("categories", {
  /** Slug estável — o mesmo já usado nas rotas públicas. */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  short: text("short").notNull(),
  blurb: text("blurb").notNull().default(""),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const services = pgTable(
  "services",
  {
    id: pk(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("services_category_slug_key").on(t.categoryId, t.slug)],
);

/* ---------------------------------------------------------------
   Parceiros
   --------------------------------------------------------------- */

export const partners = pgTable(
  "partners",
  {
    id: pk(),
    /** PA-0001. Curto o suficiente para caber numa conversa. */
    code: text("code").notNull(),

    name: text("name").notNull(),
    ownerName: text("owner_name"),
    /** Somente dígitos, com DDI. É a chave natural de deduplicação. */
    whatsapp: text("whatsapp").notNull(),
    email: text("email"),
    description: text("description"),
    document: text("document"),

    servesWholeCity: boolean("serves_whole_city").notNull().default(true),
    neighborhoods: jsonb("neighborhoods").$type<string[]>().notNull().default([]),
    availability: text("availability"),

    status: text("status")
      .$type<PartnerStatus>()
      .notNull()
      .default("aguardando_lancamento"),
    founder: boolean("founder").notNull().default(false),

    /** Quando o parceiro pagou. Nunca define, sozinho, o início do Beta. */
    betaPaidAt: timestamp("beta_paid_at", { withTimezone: true }),
    onboardingDoneAt: timestamp("onboarding_done_at", { withTimezone: true }),
    /** Só é preenchido no lançamento da operação. Ver lib/domain/beta.ts. */
    betaStartedAt: timestamp("beta_started_at", { withTimezone: true }),

    notes: text("notes"),
    prospectId: uuid("prospect_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("partners_code_key").on(t.code),
    uniqueIndex("partners_whatsapp_key").on(t.whatsapp),
    index("partners_status_idx").on(t.status),
  ],
);

export const partnerCategories = pgTable(
  "partner_categories",
  {
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [
    uniqueIndex("partner_categories_key").on(t.partnerId, t.categoryId),
    index("partner_categories_category_idx").on(t.categoryId),
  ],
);

export const partnerServices = pgTable(
  "partner_services",
  {
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("partner_services_key").on(t.partnerId, t.serviceId)],
);

/** Registro comercial. Hoje só o Beta Fundador; o formato já comporta o resto. */
export const payments = pgTable(
  "payments",
  {
    id: pk(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    kind: text("kind")
      .$type<"beta_fundador" | "outro">()
      .notNull()
      .default("beta_fundador"),
    amountCents: integer("amount_cents").notNull(),
    method: text("method"),
    reference: text("reference"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("payments_partner_idx").on(t.partnerId)],
);

/* ---------------------------------------------------------------
   Comercial
   --------------------------------------------------------------- */

export const prospects = pgTable(
  "prospects",
  {
    id: pk(),
    /** PR-0001. */
    code: text("code").notNull(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    whatsapp: text("whatsapp").notNull(),
    email: text("email"),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    /** Como a empresa chegou até nós: mapeamento, indicação, formulário… */
    source: text("source"),
    website: text("website"),
    instagram: text("instagram"),
    address: text("address"),

    status: text("status").$type<ProspectStatus>().notNull().default("mapeado"),
    lostReason: text("lost_reason"),

    nextAction: text("next_action"),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),

    notes: text("notes"),
    partnerId: uuid("partner_id").references(() => partners.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("prospects_code_key").on(t.code),
    uniqueIndex("prospects_whatsapp_key").on(t.whatsapp),
    index("prospects_status_idx").on(t.status),
    index("prospects_next_action_idx").on(t.nextActionAt),
  ],
);

/**
 * O que a empresa enviou em `/parceiros`. Fica separado do Prospect de
 * propósito: é a declaração de quem se cadastrou, preservada como veio, e não
 * o que a operação apurou depois.
 */
export const partnerApplications = pgTable(
  "partner_applications",
  {
    id: pk(),
    prospectId: uuid("prospect_id").references(() => prospects.id, {
      onDelete: "set null",
    }),
    partnerId: uuid("partner_id").references(() => partners.id, {
      onDelete: "set null",
    }),

    name: text("name").notNull(),
    company: text("company").notNull(),
    whatsapp: text("whatsapp").notNull(),
    categoryId: text("category_id"),
    servesCanaa: boolean("serves_canaa").notNull().default(true),
    howFound: text("how_found"),

    status: text("status").$type<ApplicationStatus>().notNull().default("recebido"),
    reviewNotes: text("review_notes"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

    /** Origem/UTM de onde o cadastro veio. Nenhum dado pessoal aqui. */
    attribution: jsonb("attribution")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("partner_applications_status_idx").on(t.status),
    index("partner_applications_whatsapp_idx").on(t.whatsapp),
  ],
);

/* ---------------------------------------------------------------
   Demanda
   --------------------------------------------------------------- */

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: pk(),
    /** CR-00021. É como o morador e a equipe se referem ao pedido. */
    code: text("code").notNull(),

    description: text("description").notNull(),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),

    residentName: text("resident_name").notNull(),
    whatsapp: text("whatsapp").notNull(),
    neighborhood: text("neighborhood"),
    urgency: text("urgency"),

    source: text("source"),
    attribution: jsonb("attribution")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),

    /** O morador autorizou o compartilhamento com parceiros compatíveis. */
    consent: boolean("consent").notNull().default(false),
    consentAt: timestamp("consent_at", { withTimezone: true }),

    status: text("status").$type<RequestStatus>().notNull().default("nova"),
    closeReason: text("close_reason"),
    duplicateOfId: uuid("duplicate_of_id"),

    internalNotes: text("internal_notes"),

    triagedAt: timestamp("triaged_at", { withTimezone: true }),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("service_requests_code_key").on(t.code),
    index("service_requests_status_idx").on(t.status),
    index("service_requests_created_idx").on(t.createdAt),
    index("service_requests_category_idx").on(t.categoryId),
  ],
);

/**
 * Um encaminhamento: esta solicitação, para este parceiro. Tem ciclo próprio
 * porque o desfecho é individual — dois parceiros podem receber o mesmo pedido
 * e terminar em lugares completamente diferentes.
 */
export const opportunities = pgTable(
  "opportunities",
  {
    id: pk(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),

    status: text("status").$type<OpportunityStatus>().notNull().default("selecionado"),

    sentAt: timestamp("sent_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    quotedAt: timestamp("quoted_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),

    quoteAmountCents: integer("quote_amount_cents"),
    outcomeReason: text("outcome_reason"),
    notes: text("notes"),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("opportunities_request_partner_key").on(t.requestId, t.partnerId),
    index("opportunities_partner_idx").on(t.partnerId),
    index("opportunities_status_idx").on(t.status),
  ],
);

/* ---------------------------------------------------------------
   Memória da operação
   --------------------------------------------------------------- */

export type SubjectType =
  | "prospect"
  | "partner"
  | "application"
  | "request"
  | "opportunity";

/** O que uma pessoa registrou: conversa, ligação, observação. */
export const interactions = pgTable(
  "interactions",
  {
    id: pk(),
    subjectType: text("subject_type").$type<SubjectType>().notNull(),
    subjectId: uuid("subject_id").notNull(),
    kind: text("kind")
      .$type<"nota" | "whatsapp" | "ligacao" | "reuniao" | "email" | "presencial">()
      .notNull()
      .default("nota"),
    body: text("body").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    operatorId: uuid("operator_id").references(() => operators.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [index("interactions_subject_idx").on(t.subjectType, t.subjectId)],
);

/**
 * O que o sistema registrou sozinho: mudanças de estado e eventos. Só cresce —
 * é como se reconstrói a história de qualquer registro sem pedir que o
 * operador escreva a mesma coisa duas vezes.
 */
export const activities = pgTable(
  "activities",
  {
    id: pk(),
    subjectType: text("subject_type").$type<SubjectType>().notNull(),
    subjectId: uuid("subject_id").notNull(),
    type: text("type").notNull(),
    fromState: text("from_state"),
    toState: text("to_state"),
    summary: text("summary").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    /** Nulo quando quem agiu foi o sistema (formulário público, rotina). */
    operatorId: uuid("operator_id").references(() => operators.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    index("activities_subject_idx").on(t.subjectType, t.subjectId),
    index("activities_created_idx").on(t.createdAt),
  ],
);

/** Configuração da operação. Hoje guarda, sobretudo, a data do lançamento. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
});

export type Operator = typeof operators.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type ServiceRow = typeof services.$inferSelect;
export type Partner = typeof partners.$inferSelect;
export type Prospect = typeof prospects.$inferSelect;
export type PartnerApplication = typeof partnerApplications.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Payment = typeof payments.$inferSelect;
