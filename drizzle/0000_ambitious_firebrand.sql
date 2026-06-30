CREATE TABLE "gift_cards" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"mer_order_id" varchar(32) NOT NULL,
	"ap_trans_id" varchar(40),
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"design_id" varchar(32) NOT NULL,
	"recipient_name" varchar(120),
	"recipient_email" varchar(200),
	"sender_name" varchar(120),
	"buyer_email" varchar(200),
	"message" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"redeemed_by" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"redeemed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "gift_cards_code_uq" ON "gift_cards" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_cards_mer_order_id_uq" ON "gift_cards" USING btree ("mer_order_id");