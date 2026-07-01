import crypto from "node:crypto";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { giftCards, type GiftCard, type NewGiftCard } from "@/lib/db/schema";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I

/** Generate a CNR-XXXX-XXXX redemption code (unambiguous alphabet). */
export function generateGiftCode(): string {
  const block = () =>
    Array.from({ length: 4 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
  return `CNR-${block()}-${block()}`;
}

export interface CreateActiveInput {
  merOrderId: string;
  amountMinor: number;
  currency: string;
  designId: string;
  productName?: string | null;
  environment?: string; // production | sandbox (default production)
  recipientName?: string | null;
  recipientEmail?: string | null;
  senderName?: string | null;
  buyerEmail?: string | null;
  message?: string | null;
  apTransId?: string | null;
}

/**
 * Create an ACTIVE (paid, redeemable) gift card with a freshly generated code.
 * Idempotent on merOrderId: if a card already exists for the order it's returned
 * with `created=false` (so callers don't re-send emails). Retries on the rare
 * code collision.
 */
export async function createActiveCard(
  input: CreateActiveInput,
): Promise<{ card: GiftCard; created: boolean }> {
  const db = getDb();

  const existing = await getByMerOrderId(input.merOrderId);
  if (existing) return { card: existing, created: false };

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateGiftCode();
    const row: NewGiftCard = {
      ...input,
      environment: input.environment ?? "production",
      code,
      status: "active",
      paidAt: new Date(),
    };
    try {
      const inserted = await db
        .insert(giftCards)
        .values(row)
        .onConflictDoNothing({ target: giftCards.merOrderId })
        .returning();
      if (inserted.length) return { card: inserted[0], created: true };
      // merOrderId conflict → created concurrently; return the existing row.
      const concurrent = await getByMerOrderId(input.merOrderId);
      if (concurrent) return { card: concurrent, created: false };
    } catch (e) {
      const msg = (e as Error).message || "";
      if (msg.includes("gift_cards_code_uq") && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("Could not generate a unique gift code");
}

export async function getByMerOrderId(merOrderId: string): Promise<GiftCard | null> {
  const db = getDb();
  const [row] = await db.select().from(giftCards).where(eq(giftCards.merOrderId, merOrderId)).limit(1);
  return row ?? null;
}

export async function getByCode(code: string, environment?: string): Promise<GiftCard | null> {
  const db = getDb();
  const where = environment
    ? and(eq(giftCards.code, code), eq(giftCards.environment, environment))
    : eq(giftCards.code, code);
  const [row] = await db.select().from(giftCards).where(where).limit(1);
  return row ?? null;
}

export async function getById(id: string): Promise<GiftCard | null> {
  const db = getDb();
  const [row] = await db.select().from(giftCards).where(eq(giftCards.id, id)).limit(1);
  return row ?? null;
}

/** List gift cards for the admin dashboard, newest first. */
export async function listCards(limit = 200): Promise<GiftCard[]> {
  const db = getDb();
  return db.select().from(giftCards).orderBy(desc(giftCards.createdAt)).limit(limit);
}

export interface CardFilter {
  q?: string;
  status?: string; // "all" or a specific status
  limit: number;
  offset: number;
}

/** Paged + filtered list for the dashboard, with a total count for pagination. */
export async function listCardsPaged(f: CardFilter): Promise<{ rows: GiftCard[]; total: number }> {
  const db = getDb();
  const conds = [];
  if (f.status && f.status !== "all") conds.push(eq(giftCards.status, f.status));
  if (f.q && f.q.trim()) {
    const like = `%${f.q.trim()}%`;
    conds.push(
      or(
        ilike(giftCards.code, like),
        ilike(giftCards.recipientEmail, like),
        ilike(giftCards.buyerEmail, like),
        ilike(giftCards.recipientName, like),
        ilike(giftCards.senderName, like),
        ilike(giftCards.merOrderId, like),
      ),
    );
  }
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db
    .select()
    .from(giftCards)
    .where(where)
    .orderBy(desc(giftCards.createdAt))
    .limit(f.limit)
    .offset(f.offset);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(giftCards).where(where);
  return { rows, total: n };
}

/** Count of cards grouped by status. */
export async function countByStatus(): Promise<Record<string, number>> {
  const db = getDb();
  const rows = await db
    .select({ status: giftCards.status, n: sql<number>`count(*)::int` })
    .from(giftCards)
    .groupBy(giftCards.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export interface SalesSummary {
  collectedMinor: number; // gross paid (active + redeemed + refunded)
  redeemedMinor: number;
  outstandingMinor: number; // active, not yet redeemed (liability)
  refundedMinor: number;
  currency: string;
}

/** Money totals across all cards (assumes a single currency). */
export async function salesSummary(): Promise<SalesSummary> {
  const db = getDb();
  const [r] = await db
    .select({
      collected: sql<number>`coalesce(sum(case when ${giftCards.status} in ('active','redeemed','refunded') then ${giftCards.amountMinor} else 0 end),0)::int`,
      redeemed: sql<number>`coalesce(sum(case when ${giftCards.status} = 'redeemed' then ${giftCards.amountMinor} else 0 end),0)::int`,
      outstanding: sql<number>`coalesce(sum(case when ${giftCards.status} = 'active' then ${giftCards.amountMinor} else 0 end),0)::int`,
      refunded: sql<number>`coalesce(sum(case when ${giftCards.status} = 'refunded' then ${giftCards.amountMinor} else 0 end),0)::int`,
      currency: sql<string>`coalesce(max(${giftCards.currency}),'SGD')`,
    })
    .from(giftCards);
  return {
    collectedMinor: r?.collected ?? 0,
    redeemedMinor: r?.redeemed ?? 0,
    outstandingMinor: r?.outstanding ?? 0,
    refundedMinor: r?.refunded ?? 0,
    currency: r?.currency ?? "SGD",
  };
}

export interface ProductSales {
  name: string;
  count: number;
  grossMinor: number;
  currency: string;
}

/** Sales grouped by product (paid cards only), best sellers first. */
export async function salesByProduct(): Promise<ProductSales[]> {
  const db = getDb();
  const rows = await db
    .select({
      name: sql<string>`coalesce(${giftCards.productName}, ${giftCards.designId})`,
      count: sql<number>`count(*)::int`,
      gross: sql<number>`coalesce(sum(${giftCards.amountMinor}),0)::int`,
      currency: sql<string>`coalesce(max(${giftCards.currency}),'SGD')`,
    })
    .from(giftCards)
    .where(inArray(giftCards.status, ["active", "redeemed", "refunded"]))
    .groupBy(sql`coalesce(${giftCards.productName}, ${giftCards.designId})`)
    .orderBy(sql`count(*) desc`);
  return rows.map((r) => ({ name: r.name, count: r.count, grossMinor: r.gross, currency: r.currency }));
}

/** Admin: revoke a card so it can no longer be redeemed (no money movement). */
export async function revokeCard(id: string): Promise<GiftCard | null> {
  const db = getDb();
  const [row] = await db
    .update(giftCards)
    .set({ status: "revoked" })
    .where(and(eq(giftCards.id, id), inArray(giftCards.status, ["pending", "active"])))
    .returning();
  return row ?? null;
}

/** Admin: mark a card refunded (called after a successful Aleta refund). */
export async function markRefunded(id: string): Promise<GiftCard | null> {
  const db = getDb();
  const [row] = await db
    .update(giftCards)
    .set({ status: "refunded" })
    .where(eq(giftCards.id, id))
    .returning();
  return row ?? null;
}

export type RedeemReason = "NOT_FOUND" | "NOT_PAID" | "ALREADY_REDEEMED" | "NOT_REDEEMABLE";

export interface RedeemResult {
  ok: boolean;
  card?: GiftCard;
  reason?: RedeemReason;
}

/**
 * Atomically redeem a code — the single conditional UPDATE guarantees exactly
 * one successful redemption even under concurrent requests.
 */
export async function redeemByCode(code: string, redeemedBy?: string, environment?: string): Promise<RedeemResult> {
  const db = getDb();
  const conds = [eq(giftCards.code, code), eq(giftCards.status, "active")];
  if (environment) conds.push(eq(giftCards.environment, environment));
  const [burned] = await db
    .update(giftCards)
    .set({ status: "redeemed", redeemedAt: new Date(), ...(redeemedBy ? { redeemedBy } : {}) })
    .where(and(...conds))
    .returning();

  if (burned) return { ok: true, card: burned };

  // Determine why it failed.
  const existing = await getByCode(code, environment);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.status === "pending") return { ok: false, reason: "NOT_PAID" };
  if (existing.status === "redeemed") return { ok: false, reason: "ALREADY_REDEEMED", card: existing };
  return { ok: false, reason: "NOT_REDEEMABLE", card: existing };
}
