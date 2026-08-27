CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"type" text NOT NULL,
	"from_state" text,
	"to_state" text,
	"summary" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"operator_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short" text NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"kind" text DEFAULT 'nota' NOT NULL,
	"body" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"operator_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'operator' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"status" text DEFAULT 'selecionado' NOT NULL,
	"sent_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"contacted_at" timestamp with time zone,
	"quoted_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"quote_amount_cents" integer,
	"outcome_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_id" uuid,
	"partner_id" uuid,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"whatsapp" text NOT NULL,
	"category_id" text,
	"serves_canaa" boolean DEFAULT true NOT NULL,
	"how_found" text,
	"status" text DEFAULT 'recebido' NOT NULL,
	"review_notes" text,
	"reviewed_at" timestamp with time zone,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_categories" (
	"partner_id" uuid NOT NULL,
	"category_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_services" (
	"partner_id" uuid NOT NULL,
	"service_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"owner_name" text,
	"whatsapp" text NOT NULL,
	"email" text,
	"description" text,
	"document" text,
	"serves_whole_city" boolean DEFAULT true NOT NULL,
	"neighborhoods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"availability" text,
	"status" text DEFAULT 'aguardando_lancamento' NOT NULL,
	"founder" boolean DEFAULT false NOT NULL,
	"beta_paid_at" timestamp with time zone,
	"onboarding_done_at" timestamp with time zone,
	"beta_started_at" timestamp with time zone,
	"notes" text,
	"prospect_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"kind" text DEFAULT 'beta_fundador' NOT NULL,
	"amount_cents" integer NOT NULL,
	"method" text,
	"reference" text,
	"paid_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"whatsapp" text NOT NULL,
	"email" text,
	"category_id" text,
	"source" text,
	"website" text,
	"instagram" text,
	"address" text,
	"status" text DEFAULT 'mapeado' NOT NULL,
	"lost_reason" text,
	"next_action" text,
	"next_action_at" timestamp with time zone,
	"last_interaction_at" timestamp with time zone,
	"notes" text,
	"partner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"category_id" text,
	"service_id" uuid,
	"resident_name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"neighborhood" text,
	"urgency" text,
	"source" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone,
	"status" text DEFAULT 'nova' NOT NULL,
	"close_reason" text,
	"duplicate_of_id" uuid,
	"internal_notes" text,
	"triaged_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"operator_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"device" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_categories" ADD CONSTRAINT "partner_categories_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_categories" ADD CONSTRAINT "partner_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_services" ADD CONSTRAINT "partner_services_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_services" ADD CONSTRAINT "partner_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_subject_idx" ON "activities" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "activities_created_idx" ON "activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "interactions_subject_idx" ON "interactions" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "operators_email_key" ON "operators" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_request_partner_key" ON "opportunities" USING btree ("request_id","partner_id");--> statement-breakpoint
CREATE INDEX "opportunities_partner_idx" ON "opportunities" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "opportunities_status_idx" ON "opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "partner_applications_status_idx" ON "partner_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "partner_applications_whatsapp_idx" ON "partner_applications" USING btree ("whatsapp");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_categories_key" ON "partner_categories" USING btree ("partner_id","category_id");--> statement-breakpoint
CREATE INDEX "partner_categories_category_idx" ON "partner_categories" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_services_key" ON "partner_services" USING btree ("partner_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "partners_code_key" ON "partners" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "partners_whatsapp_key" ON "partners" USING btree ("whatsapp");--> statement-breakpoint
CREATE INDEX "partners_status_idx" ON "partners" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_partner_idx" ON "payments" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prospects_code_key" ON "prospects" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "prospects_whatsapp_key" ON "prospects" USING btree ("whatsapp");--> statement-breakpoint
CREATE INDEX "prospects_status_idx" ON "prospects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prospects_next_action_idx" ON "prospects" USING btree ("next_action_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_requests_code_key" ON "service_requests" USING btree ("code");--> statement-breakpoint
CREATE INDEX "service_requests_status_idx" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_requests_created_idx" ON "service_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "service_requests_category_idx" ON "service_requests" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_category_slug_key" ON "services" USING btree ("category_id","slug");--> statement-breakpoint
CREATE INDEX "sessions_operator_idx" ON "sessions" USING btree ("operator_id");