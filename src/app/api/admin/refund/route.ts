import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { getAletaConfig, refundOrder } from "@/lib/aleta";
import { isDbConfigured } from "@/lib/db";
import { getById, markRefunded } from "@/lib/giftcards";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin: refund a card's purchase via Aleta, then mark it refunded (and thus
 * non-redeemable). Allowed for active or redeemed cards.
 */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 500 });
  }

  let body: { id?: unknown };
  try {
    body = (await req.json()) as { id?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const card = await getById(id);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (!["active", "redeemed"].includes(card.status)) {
    return NextResponse.json(
      { error: `Only active or redeemed cards can be refunded (status: ${card.status})` },
      { status: 409 },
    );
  }

  let cfg;
  try {
    cfg = getAletaConfig();
  } catch (e) {
    return NextResponse.json(
      { error: "Payment gateway is not configured", detail: (e as Error).message },
      { status: 500 },
    );
  }

  try {
    const refund = await refundOrder(cfg, card.merOrderId, card.amountMinor);
    if (!refund.ok) {
      return NextResponse.json(
        { error: "Refund was not accepted by the gateway", resultCode: refund.resultCode, detail: refund.resultMsg },
        { status: 502 },
      );
    }
    const updated = await markRefunded(id);
    await audit(me.username, "code_refunded", card.code, `merRefundId=${refund.merRefundId ?? ""}`);
    return NextResponse.json({ ok: true, status: updated?.status ?? "refunded", merRefundId: refund.merRefundId });
  } catch (e) {
    return NextResponse.json({ error: "Refund failed", detail: (e as Error).message }, { status: 502 });
  }
}
