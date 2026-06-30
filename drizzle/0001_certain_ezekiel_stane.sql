CREATE TABLE "products" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(48) NOT NULL,
	"name" varchar(120) NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'SGD' NOT NULL,
	"image" text NOT NULL,
	"back" text DEFAULT 'linear-gradient(140deg,#BFE3FB,#E9D4F0 55%,#FBD3E4)' NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gift_cards" ALTER COLUMN "design_id" SET DATA TYPE varchar(48);--> statement-breakpoint
ALTER TABLE "gift_cards" ADD COLUMN "product_name" varchar(120);--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_uq" ON "products" USING btree ("slug");