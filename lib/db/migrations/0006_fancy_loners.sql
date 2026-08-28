CREATE TABLE "commercial_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_key" text NOT NULL,
	"provider" text NOT NULL,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"kind" text NOT NULL,
	"partner_id" uuid,
	"amount_cents" integer,
	"currency" text,
	"offer_code" text,
	"offer_version" integer,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"effect" text,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "commercial_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"period_days" integer,
	"recurrence" text DEFAULT 'unica' NOT NULL,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"market" text DEFAULT 'BR' NOT NULL,
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "founder_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"status" text DEFAULT 'em_analise' NOT NULL,
	"offer_code" text,
	"offer_version" integer,
	"category_id" text,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"beta_started_at" timestamp with time zone,
	"beta_ends_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"provider" text DEFAULT 'administrativo' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"status" text DEFAULT 'criado' NOT NULL,
	"offer_code" text NOT NULL,
	"offer_version" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"provider" text NOT NULL,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"provider_ref" text,
	"idempotency_key" text NOT NULL,
	"receipt_url" text,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_code" text NOT NULL,
	"offer_version" integer NOT NULL,
	"provider" text NOT NULL,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"product_id" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"offer_code" text NOT NULL,
	"offer_version" integer NOT NULL,
	"provider" text NOT NULL,
	"environment" text DEFAULT 'sandbox' NOT NULL,
	"provider_ref" text,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"renews" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commercial_events" ADD CONSTRAINT "commercial_events_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "founder_enrollments" ADD CONSTRAINT "founder_enrollments_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_events_key" ON "commercial_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "commercial_events_partner_idx" ON "commercial_events" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "commercial_events_occurred_idx" ON "commercial_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_offers_code_version_key" ON "commercial_offers" USING btree ("code","version");--> statement-breakpoint
CREATE INDEX "commercial_offers_status_idx" ON "commercial_offers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "founder_enrollments_partner_key" ON "founder_enrollments" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "founder_enrollments_status_idx" ON "founder_enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "founder_enrollments_category_idx" ON "founder_enrollments" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_transactions_idempotency_key" ON "payment_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payment_transactions_partner_idx" ON "payment_transactions" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "product_mappings_key" ON "product_mappings" USING btree ("provider","environment","product_id");--> statement-breakpoint
CREATE INDEX "product_mappings_offer_idx" ON "product_mappings" USING btree ("offer_code","offer_version");--> statement-breakpoint
CREATE INDEX "subscriptions_partner_idx" ON "subscriptions" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_ref_key" ON "subscriptions" USING btree ("provider","environment","provider_ref") WHERE provider_ref is not null;
--> statement-breakpoint
/*
 * ---------------------------------------------------------------------------
 *  A semente do catálogo
 * ---------------------------------------------------------------------------
 *
 * A única oferta oficialmente definida hoje: Parceiro Fundador, R$79 pelos
 * primeiros 90 dias. Ela entra como LINHA, e a partir daqui quem manda é a
 * linha — mudar o preço passa a ser um `update`, e não uma publicação nova do
 * aplicativo.
 *
 * Nenhum plano pós-Beta é semeado. Os valores de R$129 e R$199 são hipóteses a
 * validar durante o Beta, e uma hipótese semeada no banco vira oferta que
 * alguém pode ativar sem que ninguém tenha decidido nada.
 *
 * `on conflict do nothing`: a migração pode rodar num banco onde a oferta já
 * foi ajustada à mão, e reescrevê-la aqui apagaria o ajuste.
 */
INSERT INTO "commercial_offers" (
  "code", "version", "name", "summary", "description",
  "price_cents", "currency", "period_days", "recurrence",
  "platforms", "market", "benefits",
  "status", "requires_approval", "notes"
) VALUES (
  'beta-fundador', 1, 'Parceiro Fundador',
  'R$79 pelos primeiros 90 dias de operação.',
  'Participação na rede do Canaã Resolve como Parceiro Fundador, com a possibilidade de receber oportunidades compatíveis com os seus serviços. Os 90 dias começam quando o Canaã Resolve for oficialmente aberto aos moradores — e não na data do pagamento. Não há renovação automática e não há fidelidade: ao fim do período, você decide se quer continuar.',
  7900, 'BRL', 90, 'unica',
  '["administrativa"]'::jsonb, 'BR',
  '["Participação na rede durante os 90 dias do Beta","Possibilidade de receber oportunidades compatíveis","Perfil profissional visível para os moradores","Condição de Parceiro Fundador registrada no seu histórico"]'::jsonb,
  'ativa', true,
  'Venda e qualificação pelo canal oficial; ativação registrada pela administração.'
)
ON CONFLICT ("code", "version") DO NOTHING;
--> statement-breakpoint
/*
 * ---------------------------------------------------------------------------
 *  A migração dos parceiros adquiridos na operação manual
 * ---------------------------------------------------------------------------
 *
 * Este bloco é o §72 inteiro: ninguém pode perder direito porque o billing
 * mobile apareceu depois. Os parceiros vendidos por WhatsApp estão em
 * `partners.founder` e `partners.beta_paid_at`, e é de lá que a adesão nasce.
 *
 * O estado é derivado do que existe, e nunca inventado:
 *
 *   beta_started_at preenchido e ainda dentro dos 90 dias  -> ativo
 *   beta_started_at preenchido e fora dos 90 dias          -> encerrado
 *   pagou e a operação ainda não começou                   -> reservado
 *   marcado como fundador e ainda não pagou                -> aprovado
 *
 * `approved_at` fica nulo de propósito: essa data não existe em lugar nenhum
 * do banco atual, e preenchê-la com `now()` inventaria um fato.
 */
INSERT INTO "founder_enrollments" (
  "partner_id", "status", "offer_code", "offer_version",
  "paid_at", "beta_started_at", "beta_ends_at", "provider", "notes"
)
SELECT
  p."id",
  CASE
    WHEN p."beta_started_at" IS NOT NULL
      AND p."beta_started_at" + interval '90 days' > now() THEN 'ativo'
    WHEN p."beta_started_at" IS NOT NULL THEN 'encerrado'
    WHEN p."beta_paid_at" IS NOT NULL THEN 'reservado'
    ELSE 'aprovado'
  END,
  'beta-fundador', 1,
  p."beta_paid_at",
  p."beta_started_at",
  CASE WHEN p."beta_started_at" IS NOT NULL
       THEN p."beta_started_at" + interval '90 days' END,
  'administrativo',
  'Migrado de partners.founder / beta_paid_at pela migração 0006.'
FROM "partners" p
WHERE p."founder" = true OR p."beta_paid_at" IS NOT NULL
ON CONFLICT ("partner_id") DO NOTHING;
--> statement-breakpoint
/*
 * ---------------------------------------------------------------------------
 *  O histórico de cobrança que já existia
 * ---------------------------------------------------------------------------
 *
 * `payments` continua sendo o registro do que a operação manual recebeu. O que
 * este bloco faz é dar a essas cobranças um lugar no sistema novo, para que o
 * profissional veja no aplicativo o que ele realmente pagou — e não uma tela
 * vazia dizendo que nunca houve cobrança.
 *
 * A chave de idempotência deriva do id do pagamento migrado, e não da chave de
 * tentativa: um parceiro pode ter mais de um pagamento no histórico, e a chave
 * de tentativa é uma só por oferta.
 */
INSERT INTO "payment_transactions" (
  "partner_id", "status", "offer_code", "offer_version",
  "amount_cents", "currency", "provider", "environment",
  "idempotency_key", "description", "created_at", "settled_at"
)
SELECT
  pay."partner_id", 'aprovado', 'beta-fundador', 1,
  pay."amount_cents", 'BRL', 'administrativo', 'producao',
  translate(
    encode(sha256(convert_to('migrado:payment:' || pay."id"::text, 'UTF8')), 'base64'),
    '+/=', '-_'
  ),
  CASE WHEN pay."kind" = 'beta_fundador'
       THEN 'Parceiro Fundador — Beta de 90 dias'
       ELSE 'Cobrança registrada pela administração' END,
  pay."created_at",
  pay."paid_at"
FROM "payments" pay
ON CONFLICT ("idempotency_key") DO NOTHING;
--> statement-breakpoint
/*
 * ---------------------------------------------------------------------------
 *  O livro dos acontecimentos
 * ---------------------------------------------------------------------------
 *
 * Cada pagamento migrado vira um evento, para que a pergunta "por que este
 * parceiro está ativo?" tenha resposta desde o primeiro dia do sistema novo —
 * inclusive para quem entrou antes de ele existir.
 *
 * `event_key` é o mesmo sha256 em base64url que `chaveDoEvento` produz em
 * TypeScript, com o identificador `payment:<id>`. Calculá-lo aqui, e não numa
 * rotina, é o que garante que reaplicar a migração não duplique o evento.
 */
INSERT INTO "commercial_events" (
  "event_key", "provider", "environment", "kind", "partner_id",
  "amount_cents", "currency", "offer_code", "offer_version",
  "occurred_at", "effect", "payload"
)
SELECT
  translate(
    encode(
      sha256(convert_to('administrativo:producao:payment:' || pay."id"::text, 'UTF8')),
      'base64'
    ),
    '+/=', '-_'
  ),
  'administrativo', 'producao', 'ativacao_administrativa', pay."partner_id",
  pay."amount_cents", 'BRL', 'beta-fundador', 1,
  pay."paid_at",
  'Pagamento registrado pela administração antes da camada comercial existir; migrado pela 0006.',
  jsonb_build_object('origem', 'migracao-0006', 'pagamentoId', pay."id"::text)
FROM "payments" pay
ON CONFLICT ("event_key") DO NOTHING;
--> statement-breakpoint
/*
 * ---------------------------------------------------------------------------
 *  A data de início da operação
 * ---------------------------------------------------------------------------
 *
 * Ela NÃO é inserida aqui, e a ausência é a funcionalidade.
 *
 * `settings['operacao.inicio']` só passa a existir quando a operação for
 * realmente aberta aos moradores. Enquanto a chave não existir, o sistema
 * inteiro responde "ainda não começou" e a interface diz "avisaremos quando a
 * operação começar" — que é a verdade. Semear uma data aqui, mesmo distante,
 * seria a data fictícia que o produto proíbe.
 *
 * Quem a escreve é `npm run comercial -- abrir`, e essa é a única porta.
 */
SELECT 1;
