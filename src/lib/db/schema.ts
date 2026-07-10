import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, timestamp, uniqueIndex, varchar, text } from "drizzle-orm/pg-core";

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
    environment: varchar("environment", { length: 12 }).notNull().default("production"), // production | sandbox

    recipientName: varchar("recipient_name", { length: 120 }),
    recipientEmail: varchar("recipient_email", { length: 200 }),
    senderName: varchar("sender_name", { length: 120 }),
    buyerEmail: varchar("buyer_email", { length: 200 }),
    message: text("message"),

    status: varchar("status", { length: 16 }).notNull().default("pending"),
    redeemedBy: varchar("redeemed_by", { length: 200 }),

    // Scheduled delivery: when to email the recipient (null = immediately).
    // recipientNotifiedAt is set once the recipient gift email has been sent,
    // which also drives the scheduler (send when due, exactly once).
    deliverAt: timestamp("deliver_at", { withTimezone: true }),
    recipientNotifiedAt: timestamp("recipient_notified_at", { withTimezone: true }),

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
    comingSoon: boolean("coming_soon").notNull().default(false),
    comingSoonDate: varchar("coming_soon_date", { length: 40 }),
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
    backImage: text("back_image"), // optional data URL; replaces the default back face

    status: varchar("status", { length: 16 }).notNull().default("active"),
    comingSoon: boolean("coming_soon").notNull().default(false),
    comingSoonDate: varchar("coming_soon_date", { length: 40 }),
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

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 32 }).notNull(),
    discountPercent: integer("discount_percent").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ promoCodeUq: uniqueIndex("promo_codes_code_uq").on(t.code) }),
);

export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;

export const customerInterests = pgTable(
  "customer_interests",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    mobile: varchar("mobile", { length: 40 }).notNull(),
    productName: varchar("product_name", { length: 120 }).notNull(),
    productCode: varchar("product_code", { length: 48 }).notNull(),
    priceMinor: integer("price_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SGD"),
    promoCode: varchar("promo_code", { length: 32 }),
    promoDiscountPercent: integer("promo_discount_percent"),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    lastEmailedAt: timestamp("last_emailed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type CustomerInterest = typeof customerInterests.$inferSelect;
export type NewCustomerInterest = typeof customerInterests.$inferInsert;

/** Admin users who can log into the dashboard. */
export const adminUsers = pgTable(
  "admin_users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    username: varchar("username", { length: 64 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 16 }).notNull().default("user"), // admin | user
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ usernameUq: uniqueIndex("admin_users_username_uq").on(t.username) }),
);

export type AdminUser = typeof adminUsers.$inferSelect;

/** Per-developer API keys (sandbox + production) for the redemption API. */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 }).notNull(),
    environment: varchar("environment", { length: 12 }).notNull(), // sandbox | production
    key: varchar("key", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ keyUq: uniqueIndex("api_keys_key_uq").on(t.key) }),
);

export type ApiKey = typeof apiKeys.$inferSelect;

/** Audit trail of admin actions. */
export const adminAudit = pgTable("admin_audit", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  actor: varchar("actor", { length: 64 }),
  action: varchar("action", { length: 48 }).notNull(),
  target: varchar("target", { length: 200 }),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminAudit = typeof adminAudit.$inferSelect;

/** Simple key/value store for app settings (e.g. enabled payment methods). */
export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GiftCardStatus =
  | "pending"
  | "active"
  | "redeemed"
  | "revoked"
  | "refunded"
  | "cancelled"
  | "expired";
