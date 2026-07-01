import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { getByCode } from "@/lib/giftcards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_RE = /^CNR-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

/**
 * Non-mutating check — lets the app show "valid ✓" before committing a redemption.
 *
 *   GET /api/redeem/validate?code=CNR-XXXX-XXXX
 *   headers: x-api-key: <partner key>
 *
 * Does NOT redeem. `redeemable` is true only for paid, un-redeemed cards.
 */
export async function GET(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ valid: false, reason: "SERVER_MISCONFIGURED" }, { status: 500 });
  }
  const auth = await checkApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ valid: false, reason: "UNAUTHORIZED" }, { status: 401 });
  }

  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  if (!CODE_RE.test(code)) {
    return NextResponse.json(
      { valid: false, reason: "BAD_REQUEST", message: "Expected a code like CNR-XXXX-XXXX" },
      { status: 400 },
    );
  }

  try {
    const card = await getByCode(code, auth.environment);
    if (!card) {
      return NextResponse.json({ valid: false, redeemable: false, reason: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({
      valid: true,
      redeemable: card.status === "active",
      status: card.status,
      environment: auth.environment,
      amount: card.amountMinor,
      currency: card.currency,
      design: card.designId,
      recipientName: card.recipientName ?? null,
    });
  } catch (e) {
    return NextResponse.json({ valid: false, reason: "SERVER_ERROR", message: (e as Error).message }, { status: 500 });
  }
}
