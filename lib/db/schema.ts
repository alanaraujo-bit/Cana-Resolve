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
  EstadoDaOferta,
  Plataforma,
  Recorrencia,
} from "@/lib/domain/comercial/catalogo";
import type {
  EstadoDaAdesao,
  EstadoDaAssinatura,
  EstadoDoPagamento,
} from "@/lib/domain/comercial/estados";
import type { Ambiente, Provedor, TipoDeEvento } from "@/lib/domain/comercial/eventos";
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

    /**
     * Credencial do aplicativo. `null` enquanto o parceiro nunca definiu senha
     * — e a maioria nunca definiu: o cadastro entra pelo formulário público,
     * que não pede senha nenhuma. Quem não tem hash simplesmente não entra,
     * e a rota de login não distingue isso de senha errada.
     *
     * Formato em `lib/auth/senha.ts`: `scrypt$N$r$p$salt$hash`.
     */
    passwordHash: text("password_hash"),
    passwordSetAt: timestamp("password_set_at", { withTimezone: true }),

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
    /**
     * O e-mail é a identidade de login no aplicativo, então precisa ser único —
     * mas só entre quem tem e-mail. O cadastro público não pede e-mail, e a
     * maioria dos parceiros está sem: um índice único simples trataria todos
     * esses vazios como o mesmo valor e barraria o segundo cadastro.
     */
    uniqueIndex("partners_email_key")
      .on(sql`lower(${t.email})`)
      .where(sql`${t.email} is not null and ${t.email} <> ''`),
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

/* ---------------------------------------------------------------
   Entrega de notificações
   --------------------------------------------------------------- */

/** Onde um push pode ser entregue. */
export type DevicePlatform = "ios" | "android" | "web";

/**
 * Por que um endereço de entrega deixou de valer. `null` significa que vale.
 *
 * `desinstalado` vem do provedor (`DeviceNotRegistered`), e é definitivo:
 * não se tenta de novo. `saiu` é decisão nossa, no logout. `substituido` é o
 * mesmo aparelho reaparecendo com token novo.
 */
export type DeviceRevocation = "desinstalado" | "saiu" | "substituido";

/**
 * Um endereço de entrega de push. **Não** é uma sessão, e **não** é uma
 * identidade.
 *
 * Três decisões que o resto da fase depende:
 *
 * 1. **A chave é a instalação, não o usuário.** `installationId` é sorteado
 *    pelo aplicativo uma vez e guardado no aparelho. Um parceiro com iPhone e
 *    Android tem duas linhas; o mesmo aparelho registrando dez vezes continua
 *    tendo uma (§53, §60, §99). O token *muda* — a instalação não —, então
 *    chavear pelo token faria lixo acumular a cada renovação.
 *
 * 2. **O vínculo com a conta é revogável e datado.** Sair não apaga a linha:
 *    marca `revokedAt`/`revokedReason`. Uma linha apagada não conta história,
 *    e a história aqui é a garantia do §57 — este aparelho **parou** de
 *    receber o que era daquela conta, e dá para provar quando.
 *
 * 3. **O token é um endereço, nunca uma credencial.** Nada autentica por ele
 *    (§55). Ele não sai desta tabela para lugar nenhum: nem para a interface,
 *    nem para log (§96) — só para o provedor, na hora do envio.
 */
export const partnerDevices = pgTable(
  "partner_devices",
  {
    id: pk(),
    /** Sorteado pelo aplicativo, estável enquanto o app estiver instalado. */
    installationId: text("installation_id").notNull(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    /** O endereço de entrega do provedor. Guardado, nunca exibido. */
    pushToken: text("push_token").notNull(),
    platform: text("platform").$type<DevicePlatform>().notNull(),
    /**
     * `development` ou `production`. Um token de build de desenvolvimento não
     * é entregável pela credencial de produção, e confundir os dois faz o
     * envio falhar em silêncio (§118).
     */
    environment: text("environment").notNull().default("development"),
    /** Modelo e versão do sistema, para diagnóstico. Nada identificável. */
    descricao: text("descricao"),
    /** Versão do aplicativo que registrou. */
    appVersion: text("app_version"),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
    /** Último registro/renovação vindo do aparelho. */
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason").$type<DeviceRevocation>(),
  },
  (t) => [
    /**
     * Uma instalação, um endereço. É esta restrição — e não um `if` na rota —
     * que torna o registro idempotente (§99): registrar de novo é um
     * `onConflictDoUpdate`, não uma linha nova.
     */
    uniqueIndex("partner_devices_installation_key").on(t.installationId),
    index("partner_devices_partner_idx").on(t.partnerId),
    index("partner_devices_token_idx").on(t.pushToken),
  ],
);

/* ---------------------------------------------------------------
   Camada comercial
   --------------------------------------------------------------- */

/**
 * O que segue é a Fase 08, e ela convive com o que já existia — não o
 * substitui e não o apaga.
 *
 * `partners.founder`, `partners.betaPaidAt`, `partners.betaStartedAt` e a
 * tabela `payments` foram escritos pela operação manual e **têm dados reais
 * dentro**. Eles continuam de pé e continuam legíveis. O que muda é quem manda:
 *
 * - **A autoridade passa a ser `founder_enrollments`.** A migração `0006`
 *   carrega para lá tudo que estava nas colunas antigas, de modo que nenhum
 *   parceiro adquirido por WhatsApp perca direito por o billing ter chegado
 *   depois (§72).
 * - **As colunas antigas viram espelho.** Continuam sendo escritas para que
 *   consultas e ferramentas existentes não quebrem, mas nada as consulta para
 *   decidir acesso.
 * - **`payments` continua sendo o registro histórico** do que a operação
 *   manual recebeu; `payment_transactions` é o registro do que o sistema
 *   processa a partir daqui, com estado, provedor e idempotência.
 *
 * Valores em **centavos inteiros**, em todas as tabelas, como já era em
 * `payments.amountCents`. Nunca ponto flutuante (§91).
 */

/**
 * O catálogo comercial.
 *
 * É uma **tabela**, e não uma constante, porque preço e disponibilidade
 * precisam mudar sem que ninguém publique uma versão nova do aplicativo
 * (§13, §96). Uma linha por versão de oferta: mudar a condição cria a versão
 * seguinte e encerra a anterior, nunca reescreve (§15) — é o que preserva o
 * significado histórico de uma compra antiga.
 */
export const commercialOffers = pgTable(
  "commercial_offers",
  {
    id: pk(),
    /** Estável entre versões. Ex.: `beta-fundador`. */
    code: text("code").notNull(),
    version: integer("version").notNull().default(1),

    name: text("name").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),

    /** Centavos inteiros. */
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("BRL"),
    /** Quantos dias a compra cobre. `null` em recorrente sem prazo fixo. */
    periodDays: integer("period_days"),
    recurrence: text("recurrence").$type<Recorrencia>().notNull().default("unica"),

    platforms: jsonb("platforms").$type<Plataforma[]>().notNull().default([]),
    market: text("market").notNull().default("BR"),
    benefits: jsonb("benefits").$type<string[]>().notNull().default([]),

    status: text("status").$type<EstadoDaOferta>().notNull().default("rascunho"),
    /** A contratação exige aprovação prévia? `true` no Beta (§75). */
    requiresApproval: boolean("requires_approval").notNull().default(true),
    /** Nota da administração. Nunca sai para o aplicativo. */
    notes: text("notes"),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("commercial_offers_code_version_key").on(t.code, t.version),
    index("commercial_offers_status_idx").on(t.status),
  ],
);

/**
 * O mapeamento entre uma oferta nossa e o produto de cada loja.
 *
 * Existe separado da oferta porque o mesmo `beta-fundador` pode ter um SKU na
 * App Store, outro no Google Play, e outros dois em sandbox — e misturar SKU de
 * teste com o de produção libera acesso pago por dinheiro que não existe
 * (§148, §149). Por isso `environment` faz parte da chave.
 */
export const productMappings = pgTable(
  "product_mappings",
  {
    id: pk(),
    offerCode: text("offer_code").notNull(),
    offerVersion: integer("offer_version").notNull(),
    provider: text("provider").$type<Provedor>().notNull(),
    environment: text("environment").$type<Ambiente>().notNull().default("sandbox"),
    /** O identificador do produto na loja. */
    productId: text("product_id").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("product_mappings_key").on(t.provider, t.environment, t.productId),
    index("product_mappings_offer_idx").on(t.offerCode, t.offerVersion),
  ],
);

/**
 * A adesão de um parceiro ao Beta Fundador — a autoridade sobre o §142.
 *
 * Uma linha por parceiro. Guarda o estado do processo, o pagamento, a condição
 * comprada e as duas datas que o produto inteiro depende de não confundir:
 * `paidAt`, que é quando o dinheiro entrou, e `betaStartedAt`, que é quando os
 * 90 dias começaram — e que **só o lançamento da operação escreve**.
 *
 * `betaEndsAt` é gravado junto com `betaStartedAt`, e não recalculado a cada
 * leitura, por uma razão de auditoria: o dia em que a regra dos 90 dias mudar,
 * quem já estava dentro precisa continuar com o fim que foi prometido.
 */
export const founderEnrollments = pgTable(
  "founder_enrollments",
  {
    id: pk(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),

    status: text("status").$type<EstadoDaAdesao>().notNull().default("em_analise"),

    /** A condição comprada, no par que o versionamento exige (§15). */
    offerCode: text("offer_code"),
    offerVersion: integer("offer_version"),

    /** Em que categoria a vaga foi reservada — a entrada é limitada por ela (§74). */
    categoryId: text("category_id"),

    approvedAt: timestamp("approved_at", { withTimezone: true }),
    /** Quando o pagamento foi confirmado. Nunca define, sozinho, o Beta. */
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Só o lançamento escreve. Ver `lib/domain/beta.ts`. */
    betaStartedAt: timestamp("beta_started_at", { withTimezone: true }),
    betaEndsAt: timestamp("beta_ends_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),

    /**
     * De onde veio a confirmação. `administrativo` é o caso de hoje — venda
     * por conversa, ativação registrada pela administração (§70).
     */
    provider: text("provider").$type<Provedor>().notNull().default("administrativo"),

    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    /** Uma adesão por parceiro. Duas seriam dois Betas para a mesma pessoa. */
    uniqueIndex("founder_enrollments_partner_key").on(t.partnerId),
    index("founder_enrollments_status_idx").on(t.status),
    index("founder_enrollments_category_idx").on(t.categoryId),
  ],
);

/**
 * Assinaturas recorrentes.
 *
 * **Hoje não existe nenhuma linha aqui, e isso é o correto.** O Beta é compra
 * única (§8). A tabela nasce agora para que a primeira assinatura não precise
 * de uma migração feita com pressa — e para que o cancelamento, quando existir,
 * já tenha onde guardar a diferença entre "não renova mais" e "acabou o
 * acesso" (§87).
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: pk(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),

    status: text("status").$type<EstadoDaAssinatura>().notNull().default("pendente"),
    offerCode: text("offer_code").notNull(),
    offerVersion: integer("offer_version").notNull(),

    provider: text("provider").$type<Provedor>().notNull(),
    environment: text("environment").$type<Ambiente>().notNull().default("sandbox"),
    /**
     * O identificador da assinatura no provedor. É por ele que um evento de
     * renovação ou cancelamento encontra esta linha.
     */
    providerRef: text("provider_ref"),

    periodStart: timestamp("period_start", { withTimezone: true }),
    /** Fim do período já pago. Cancelar **não** encurta isto. */
    periodEnd: timestamp("period_end", { withTimezone: true }),
    /** `false` quando a renovação já foi desligada. */
    renews: boolean("renews").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("subscriptions_partner_idx").on(t.partnerId),
    /**
     * Uma assinatura por referência de provedor. É esta restrição que impede
     * a mesma compra de virar duas assinaturas quando o evento chega duas
     * vezes (§51).
     */
    uniqueIndex("subscriptions_provider_ref_key")
      .on(t.provider, t.environment, t.providerRef)
      .where(sql`provider_ref is not null`),
  ],
);

/**
 * Cada cobrança, com estado próprio.
 *
 * Separada da assinatura porque são coisas diferentes (§39): uma assinatura
 * ativa pode ter uma cobrança falhada no meio, e uma cobrança aprovada pode
 * pertencer a uma assinatura já cancelada.
 *
 * **Nunca guarda dado de cartão** (§66). Número, CVV e nome do portador não
 * têm coluna aqui — não por disciplina de quem escreve, mas porque não existe
 * onde colocá-los.
 */
export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: pk(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),

    status: text("status").$type<EstadoDoPagamento>().notNull().default("criado"),
    offerCode: text("offer_code").notNull(),
    offerVersion: integer("offer_version").notNull(),

    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("BRL"),

    provider: text("provider").$type<Provedor>().notNull(),
    environment: text("environment").$type<Ambiente>().notNull().default("sandbox"),
    providerRef: text("provider_ref"),

    /**
     * A chave que impede o toque duplo de virar duas transações (§83).
     *
     * Deriva do parceiro e da oferta — ver `chaveDaTentativa`. É um índice
     * único, e não um `if` na rota: um `if` tem janela entre a consulta e a
     * escrita, e é exatamente nessa janela que o segundo toque cabe.
     */
    idempotencyKey: text("idempotency_key").notNull(),

    /** Comprovante do provedor, quando ele oferecer um. Nunca gerado por nós. */
    receiptUrl: text("receipt_url"),
    description: text("description").notNull(),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("payment_transactions_idempotency_key").on(t.idempotencyKey),
    index("payment_transactions_partner_idx").on(t.partnerId),
    index("payment_transactions_status_idx").on(t.status),
  ],
);

/**
 * O livro dos acontecimentos financeiros. Só cresce.
 *
 * Responde ao §113 e ao §114 de uma vez: "por que este parceiro está ativo?" é
 * uma pergunta que se responde lendo esta tabela de cima a baixo — pagamento
 * em tal dia, operação aberta em tal outro, Beta válido até tal data. Um
 * estado sobrescrito não conta essa história; uma fila de eventos conta.
 *
 * `eventKey` é a defesa contra reentrega (§51). Ela é um `sha256` de
 * provedor + ambiente + identificador do evento, e o índice único sobre ela é
 * o que garante que processar duas vezes produza uma linha.
 */
export const commercialEvents = pgTable(
  "commercial_events",
  {
    id: pk(),
    /** `sha256(provedor:ambiente:idNoProvedor)`, em base64url. */
    eventKey: text("event_key").notNull(),
    provider: text("provider").$type<Provedor>().notNull(),
    environment: text("environment").$type<Ambiente>().notNull().default("sandbox"),
    kind: text("kind").$type<TipoDeEvento>().notNull(),

    /** `null` só enquanto o vínculo com a conta não foi resolvido. */
    partnerId: uuid("partner_id").references(() => partners.id, { onDelete: "set null" }),

    amountCents: integer("amount_cents"),
    currency: text("currency"),
    offerCode: text("offer_code"),
    offerVersion: integer("offer_version"),

    /** Quando o provedor diz que aconteceu. */
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    /** Quando nós processamos. A diferença entre os dois importa em auditoria. */
    createdAt: createdAt(),

    /**
     * O que o evento produziu aqui — em português, para ser lido por gente.
     * Ex.: "Beta Fundador reservado; aguardando o início da operação".
     */
    effect: text("effect"),

    /**
     * Carga adicional do provedor, **saneada**.
     *
     * Nunca recibo cru, nunca token, nunca dado de cartão (§112). O que entra
     * aqui é o que `paraOLog` deixa passar.
     */
    payload: jsonb("payload").$type<Record<string, unknown>>(),
  },
  (t) => [
    uniqueIndex("commercial_events_key").on(t.eventKey),
    index("commercial_events_partner_idx").on(t.partnerId),
    index("commercial_events_occurred_idx").on(t.occurredAt),
  ],
);

export type CommercialOffer = typeof commercialOffers.$inferSelect;
export type FounderEnrollment = typeof founderEnrollments.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type CommercialEvent = typeof commercialEvents.$inferSelect;
export type ProductMapping = typeof productMappings.$inferSelect;
