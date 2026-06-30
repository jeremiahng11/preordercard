import { sql } from "drizzle-orm";
import { integer, pgTable, timestamp, uniqueIndex, varchar, text } from "drizzle-orm/pg-core";

/**
 * One row per purchased gift card. The lifecycle:
 *   pending  → created at checkout, payment not yet confirmed (NOT redeemable)
 *   active   → Aleta confirmed payment SUCCESS (redeemable exactly once)
 *   redeemed → burned by the Aleta Adventure app via /api/redeem
 *   cancelled/expired → reserved for future use
 */
export const giftCards = pgTable(
  "gift_cards",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`), // PG13+ built-in, no extension needed
    code: varchar("code", { length: 32 }).notNull(),
    merOrderId: varchar("mer_order_id", { length: 32 }).notNull(),
    apTransId: varchar("ap_trans_id", { length: 40 }),

    amountMinor: integer("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    designId: varchar("design_id", { length: 32 }).notNull(),

    recipientName: varchar("recipient_name", { length: 120 }),
    recipientEmail: varchar("recipient_email", { length: 200 }),
    senderName: varchar("sender_name", { length: 120 }),
    buyerEmail: varchar("buyer_email", { length: 200 }),
    message: text("message"),

    status: varchar("status", { length: 16 }).notNull().default("pending"),
    redeemedBy: varchar("redeemed_by", { length: 200 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  },
  (t) => ({
    codeUq: uniqueIndex("gift_cards_code_uq").on(t.code),
    merOrderUq: uniqueIndex("gift_cards_mer_order_id_uq").on(t.merOrderId),
  }),
);

export type GiftCard = typeof giftCards.$inferSelect;
export type NewGiftCard = typeof giftCards.$inferInsert;

export type GiftCardStatus =
  | "pending"
  | "active"
  | "redeemed"
  | "revoked"
  | "refunded"
  | "cancelled"
  | "expired";
