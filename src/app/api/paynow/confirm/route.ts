import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getByMerOrderId } from "@/lib/giftcards";
import { cardView, finalizeOrder, type GiftInput } from "@/lib/finalize";
import { getPaynowConfig, inquiryPaynow, isPaynowConfigured } from "@/lib/paynow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Poll target for the PayNow QR screen. Checks payment status via PayNow inquiry;
 * once SUCCESS, creates the gift card + code and emails both parties (idempotent).
 *
 *   POST /api/paynow/confirm  { merOrderId, gift: {...} }
 */
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 500 });
  }
  if (!isPaynowConfigured()) {
    return NextResponse.json({ error: "PayNow is not configured" }, { status: 500 });
  }

  let body: { merOrderId?: unknown; gift?: GiftInput };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const merOrderId = typeof body.merOrderId === "string" ? body.merOrderId : "";
  if (!merOrderId) return NextResponse.json({ error: "merOrderId is required" }, { status: 400 });

  const existing = await getByMerOrderId(merOrderId);
  if (existing) return NextResponse.json(await cardView(existing));

  let cfg;
  try {
    cfg = getPaynowConfig();
  } catch (e) {
    return NextResponse.json({ error: "PayNow is not configured", detail: (e as Error).message }, { status: 500 });
  }

  let status;
  try {
    status = await inquiryPaynow(cfg, merOrderId);
  } catch (e) {
    return NextResponse.json(
      { status: "unknown", paid: false, error: "Could not verify payment", detail: (e as Error).message },
      { status: 502 },
    );
  }

  if (status.resultCode !== "SUCCESS") {
    const pending = status.resultCode === "RECEIVE" || status.resultCode === "PAYING" || !status.resultCode;
    return NextResponse.json({ status: pending ? "pending" : "failed", paid: false, resultCode: status.resultCode });
  }

  const { card } = await finalizeOrder({
    merOrderId,
    gift: body.gift ?? {},
    paidAmount: status.amountMinor,
    paidCurrency: status.currency,
    apTransId: status.apTransId,
  });
  return NextResponse.json(await cardView(card));
}
