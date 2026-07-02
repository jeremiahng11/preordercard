import { storeLinks } from "@/lib/config";
import { createActiveCard, getByMerOrderId, markRecipientNotified } from "@/lib/giftcards";
import { getProductBySlug } from "@/lib/products";
import { sendGiftEmails } from "@/lib/email";
import type { GiftCard } from "@/lib/db/schema";

export interface GiftInput {
  recipient?: unknown;
  recipientEmail?: unknown;
  sender?: unknown;
  buyerEmail?: unknown;
  message?: unknown;
  design?: unknown;
  deliverAt?: unknown; // ISO string for scheduled recipient delivery
}

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Parse a scheduled-delivery ISO string; only accept a valid date within ~1 year. */
function parseDeliverAt(v: unknown): Date | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() > Date.now() + YEAR_MS) return null; // cap absurd future dates
  return d;
}

/**
 * Create the gift card + code for a confirmed payment and email both parties.
 * Idempotent on merOrderId (emails only on first creation). Shared by the card
 * (/api/confirm) and PayNow (/api/paynow/confirm) flows.
 */
export async function finalizeOrder(params: {
  merOrderId: string;
  gift: GiftInput;
  paidAmount?: number;
  paidCurrency?: string;
  apTransId?: string | null;
}): Promise<{ card: GiftCard; created: boolean }> {
  const existing = await getByMerOrderId(params.merOrderId);
  if (existing) return { card: existing, created: false };

  const gift = params.gift ?? {};
  const design = typeof gift.design === "string" && gift.design ? gift.design : "";
  const product = design ? await getProductBySlug(design) : null;

  const deliverAt = parseDeliverAt(gift.deliverAt);
  // "Future" = scheduled more than a minute out; anything sooner delivers now.
  const future = Boolean(deliverAt && deliverAt.getTime() > Date.now() + 60_000);

  const { card, created } = await createActiveCard({
    merOrderId: params.merOrderId,
    amountMinor: params.paidAmount ?? product?.priceMinor ?? 0,
    currency: params.paidCurrency ?? product?.currency ?? "SGD",
    designId: product?.slug ?? design ?? "card",
    productName: product?.name ?? null,
    recipientName: str(gift.recipient, 120),
    recipientEmail: str(gift.recipientEmail, 200),
    senderName: str(gift.sender, 120),
    buyerEmail: str(gift.buyerEmail, 200),
    message: str(gift.message, 280),
    apTransId: params.apTransId ?? null,
    deliverAt,
  });

  if (created) {
    // Always send the buyer receipt now. Send the recipient's gift now unless it
    // is scheduled for the future — the background scheduler delivers those.
    await sendGiftEmails(
      {
        code: card.code,
        designId: card.designId,
        productName: card.productName,
        amountMinor: card.amountMinor,
        currency: card.currency,
        recipientName: card.recipientName,
        recipientEmail: card.recipientEmail,
        senderName: card.senderName,
        buyerEmail: card.buyerEmail,
        message: card.message,
        deliverAt: card.deliverAt,
      },
      { recipient: !future, buyer: true },
    ).catch(() => {});
    // If it was due now but had an explicit deliverAt, mark so the scheduler skips it.
    if (!future && deliverAt) await markRecipientNotified(card.id).catch(() => {});
  }

  return { card, created };
}

/** Response shape for the result page (shared by both confirm endpoints). */
export async function cardView(card: GiftCard) {
  const paid = card.status === "active" || card.status === "redeemed";
  const product = await getProductBySlug(card.designId);
  const { appStore, playStore } = storeLinks();
  return {
    merOrderId: card.merOrderId,
    status: card.status,
    paid,
    code: paid ? card.code : null,
    design: card.designId,
    image: product?.image ?? null,
    productName: card.productName ?? null,
    recipientName: card.recipientName ?? null,
    amount: card.amountMinor,
    currency: card.currency,
    deliverAt: card.deliverAt ? card.deliverAt.toISOString() : null,
    appStore,
    playStore,
  };
}
