import { NextRequest, NextResponse } from "next/server";
import { getAletaConfig, inquiry } from "@/lib/aleta";
import { isDbConfigured } from "@/lib/db";
import { activateByMerOrderId, getByMerOrderId } from "@/lib/giftcards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Consumer-facing lookup for the post-payment result page. Returns the gift
 * card's status, and the redemption code only once it's paid (active/redeemed).
 *
 * If the card is still PENDING (webhook not yet delivered), we fall back to an
 * Aleta inquiry and activate it if the gateway reports SUCCESS — so the success
 * page works reliably even without inbound webhooks.
 *
 *   GET /api/gift?merOrderId=...
 */
export async function GET(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 500 });
  }

  const merOrderId = req.nextUrl.searchParams.get("merOrderId");
  if (!merOrderId) {
    return NextResponse.json({ error: "merOrderId is required" }, { status: 400 });
  }

  let card = await getByMerOrderId(merOrderId);
  if (!card) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  // Fallback activation via inquiry when the webhook hasn't landed yet.
  if (card.status === "pending") {
    try {
      const cfg = getAletaConfig();
      const res = (await inquiry(cfg, merOrderId)) as {
        data?: { paymentResult?: { resultCode?: string }; apTransId?: string };
      };
      if (res?.data?.paymentResult?.resultCode === "SUCCESS") {
        card = (await activateByMerOrderId(merOrderId, res.data.apTransId)) ?? card;
      }
    } catch {
      /* inquiry is best-effort */
    }
  }

  const paid = card.status === "active" || card.status === "redeemed";

  return NextResponse.json({
    merOrderId: card.merOrderId,
    status: card.status,
    paid,
    code: paid ? card.code : null,
    amount: card.amountMinor,
    currency: card.currency,
    design: card.designId,
    recipientName: card.recipientName ?? null,
  });
}
