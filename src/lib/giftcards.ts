import crypto from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
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
    const row: NewGiftCard = { ...input, code, status: "active", paidAt: new Date() };
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

export async function getByCode(code: string): Promise<GiftCard | null> {
  const db = getDb();
  const [row] = await db.select().from(giftCards).where(eq(giftCards.code, code)).limit(1);
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
export async function redeemByCode(code: string, redeemedBy?: string): Promise<RedeemResult> {
  const db = getDb();
  const [burned] = await db
    .update(giftCards)
    .set({ status: "redeemed", redeemedAt: new Date(), ...(redeemedBy ? { redeemedBy } : {}) })
    .where(and(eq(giftCards.code, code), eq(giftCards.status, "active")))
    .returning();

  if (burned) return { ok: true, card: burned };

  // Determine why it failed.
  const existing = await getByCode(code);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.status === "pending") return { ok: false, reason: "NOT_PAID" };
  if (existing.status === "redeemed") return { ok: false, reason: "ALREADY_REDEEMED", card: existing };
  return { ok: false, reason: "NOT_REDEEMABLE", card: existing };
}
