import { NextRequest, NextResponse } from "next/server";
import { getAletaConfig, inquiry } from "@/lib/aleta";
import { isDbConfigured } from "@/lib/db";
import { getByMerOrderId } from "@/lib/giftcards";
import { cardView, finalizeOrder, type GiftInput } from "@/lib/finalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Finalize a card (Visa/Mastercard) purchase after the payment redirect.
 * Confirms SUCCESS via Aleta inquiry, then creates the gift card + code and
 * emails both parties. Idempotent.
 *
 *   POST /api/confirm  { merOrderId, gift: { recipient, recipientEmail, sender, buyerEmail, message, design } }
 */
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 500 });
  }

  let body: { merOrderId?: unknown; gift?: GiftInput };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const merOrderId = typeof body.merOrderId === "string" ? body.merOrderId : "";
  if (!merOrderId) return NextResponse.json({ error: "merOrderId is required" }, { status: 400 });

  // Already finalized? Return it without re-creating or re-emailing.
  const existing = await getByMerOrderId(merOrderId);
  if (existing) return NextResponse.json(await cardView(existing));

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

  const { card } = await finalizeOrder({
    merOrderId,
    gift: body.gift ?? {},
    paidAmount,
    paidCurrency,
    apTransId,
  });
  return NextResponse.json(await cardView(card));
}
