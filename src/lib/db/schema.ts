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
    designId: varchar("design_id", { length: 48 }).notNull(),
    productName: varchar("product_name", { length: 120 }),

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

/**
 * A collection groups cards under a brand/theme (e.g. Cinnamoroll, Hello Kitty)
 * and carries the editable storefront marketing copy (eyebrow/title/description).
 * status: active | hidden.
 */
export const collections = pgTable(
  "collections",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 48 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    eyebrow: varchar("eyebrow", { length: 160 }),
    title: varchar("title", { length: 160 }),
    description: text("description"),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ slugUq: uniqueIndex("collections_slug_uq").on(t.slug) }),
);

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type CollectionStatus = "active" | "hidden";

/**
 * Sellable card products managed by admin. `slug` is the stable id stored on
 * gift cards as designId. `image` is a data URL (front art); `back` is the CSS
 * gradient for the personalized back face. status: active | soldout | delisted.
 * `collectionId` links the card to its collection.
 */
export const products = pgTable(
  "products",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    collectionId: varchar("collection_id", { length: 36 }),
    slug: varchar("slug", { length: 48 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    priceMinor: integer("price_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SGD"),
    image: text("image").notNull(), // data URL of the front artwork
    back: text("back").notNull().default("linear-gradient(140deg,#BFE3FB,#E9D4F0 55%,#FBD3E4)"),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUq: uniqueIndex("products_slug_uq").on(t.slug),
  }),
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductStatus = "active" | "soldout" | "delisted";

export type GiftCardStatus =
  | "pending"
  | "active"
  | "redeemed"
  | "revoked"
  | "refunded"
  | "cancelled"
  | "expired";
