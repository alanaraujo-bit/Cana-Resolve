ALTER TABLE "partners" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "password_set_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "partners_email_key" ON "partners" USING btree (lower("email")) WHERE "partners"."email" is not null and "partners"."email" <> '';