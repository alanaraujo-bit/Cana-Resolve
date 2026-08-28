CREATE TABLE "partner_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" text NOT NULL,
	"partner_id" uuid NOT NULL,
	"push_token" text NOT NULL,
	"platform" text NOT NULL,
	"environment" text DEFAULT 'development' NOT NULL,
	"descricao" text,
	"app_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text
);
--> statement-breakpoint
ALTER TABLE "partner_devices" ADD CONSTRAINT "partner_devices_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "partner_devices_installation_key" ON "partner_devices" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "partner_devices_partner_idx" ON "partner_devices" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "partner_devices_token_idx" ON "partner_devices" USING btree ("push_token");