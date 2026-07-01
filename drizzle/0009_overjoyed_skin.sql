CREATE TABLE "api_keys" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"environment" varchar(12) NOT NULL,
	"key" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_cards" ADD COLUMN "environment" varchar(12) DEFAULT 'production' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_uq" ON "api_keys" USING btree ("key");