import { NextRequest, NextResponse } from "next/server";
import { getAletaConfig, inquiry } from "@/lib/aleta";
import { storeLinks } from "@/lib/config";
import { isDbConfigured } from "@/lib/db";
import { createActiveCard, getByMerOrderId } from "@/lib/giftcards";
import { getProductBySlug } from "@/lib/products";
import { sendGiftEmails } from "@/lib/email";
import type { GiftCard } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

function view(card: GiftCard, image: string | null) {
  const paid = card.status === "active" || card.status === "redeemed";
  const { appStore, playStore } = storeLinks();
  return {
    merOrderId: card.merOrderId,
    status: card.status,
    paid,
    code: paid ? card.code : null,
    design: card.designId,
    image,
    productName: card.productName ?? null,
    recipientName: card.recipientName ?? null,
    amount: card.amountMinor,
    currency: card.currency,
    appStore,
    playStore,
  };
}

/**
 * Finalize a purchase after the payment redirect. Confirms SUCCESS via Aleta
 * inquiry, then creates the gift card + code (only on confirmation) and emails
 * the recipient and buyer. Idempotent: safe to call multiple times; emails are
 * sent only on first creation.
 *
 *   POST /api/confirm  { merOrderId, gift: { recipient, recipientEmail, sender, buyerEmail, message, design } }
 */
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 500 });
  }

  let body: { merOrderId?: unknown; gift?: Record<string, unknown> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const merOrderId = typeof body.merOrderId === "string" ? body.merOrderId : "";
  if (!merOrderId) {
    return NextResponse.json({ error: "merOrderId is required" }, { status: 400 });
  }

  // Already finalized? Return it without re-creating or re-emailing.
  const existing = await getByMerOrderId(merOrderId);
  if (existing) {
    const p = await getProductBySlug(existing.designId);
    return NextResponse.json(view(existing, p?.image ?? null));
  }

  // Verify payment with the gateway before persisting anything.
  let cfg;
  try {
    cfg = getAletaConfig();
  } catch (e) {
    return NextResponse.json(
      { error: "Payment gateway is not configured", detail: (e as Error).message },
      { status: 500 },
    );
  }

  let resultCode: string | undefined;
  let apTransId: string | undefined;
  let paidAmount: number | undefined;
  let paidCurrency: string | undefined;
  try {
    const res = (await inquiry(cfg, merOrderId)) as {
      data?: {
        paymentResult?: { resultCode?: string };
        apTransId?: string;
        merTransAmt?: string;
        merTransCur?: string;
      };
    };
    resultCode = res?.data?.paymentResult?.resultCode;
    apTransId = res?.data?.apTransId;
    const amt = Number(res?.data?.merTransAmt);
    paidAmount = Number.isFinite(amt) && amt > 0 ? amt : undefined;
    paidCurrency = res?.data?.merTransCur;
  } catch (e) {
    return NextResponse.json(
      { status: "unknown", paid: false, error: "Could not verify payment", detail: (e as Error).message },
      { status: 502 },
    );
  }

  if (resultCode !== "SUCCESS") {
    const pending = resultCode === "RECEIVE" || resultCode === "PAYING" || !resultCode;
    return NextResponse.json({ status: pending ? "pending" : "failed", paid: false, resultCode });
  }

  // Payment confirmed → create the card + code now.
  const gift = body.gift ?? {};
  const design = typeof gift.design === "string" && gift.design ? gift.design : "";
  const product = design ? await getProductBySlug(design) : null;

  const { card, created } = await createActiveCard({
    merOrderId,
    // Authoritative amount: what the gateway charged, falling back to the product.
    amountMinor: paidAmount ?? product?.priceMinor ?? 0,
    currency: paidCurrency ?? product?.currency ?? "SGD",
    designId: product?.slug ?? design ?? "card",
    productName: product?.name ?? null,
    recipientName: str(gift.recipient, 120),
    recipientEmail: str(gift.recipientEmail, 200),
    senderName: str(gift.sender, 120),
    buyerEmail: str(gift.buyerEmail, 200),
    message: str(gift.message, 280),
    apTransId: apTransId ?? null,
  });

  if (created) {
    // Best-effort — don't fail the response if email delivery has a hiccup.
    await sendGiftEmails({
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
    }).catch(() => {});
  }

  return NextResponse.json(view(card, product?.image ?? null));
}
