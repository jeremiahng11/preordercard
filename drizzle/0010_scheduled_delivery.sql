ALTER TABLE "gift_cards" ADD COLUMN "deliver_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD COLUMN "recipient_notified_at" timestamp with time zone;