import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { redeemByCode, type RedeemReason } from "@/lib/giftcards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Maps a redemption failure reason to an HTTP status. */
const REASON_STATUS: Record<RedeemReason, number> = {
  NOT_FOUND: 404,
  NOT_PAID: 402,
  ALREADY_REDEEMED: 409,
  NOT_REDEEMABLE: 409,
};

const REASON_MESSAGE: Record<RedeemReason, string> = {
  NOT_FOUND: "This gift code does not exist.",
  NOT_PAID: "This gift card has not been paid for yet.",
  ALREADY_REDEEMED: "This gift card has already been redeemed.",
  NOT_REDEEMABLE: "This gift card cannot be redeemed.",
};

const CODE_RE = /^CNR-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

/**
 * Redeem a gift code (single use). Called by the Aleta Adventure app.
 *
 *   POST /api/redeem
 *   headers: x-api-key: <partner key>
 *   body: { "code": "CNR-XXXX-XXXX", "userRef"?: "<app user id>" }
 *
 * On success returns the card value + design so the app can provision the
 * Visa Platinum card to the user at $0.
 */
export async function POST(req: NextRequest) {
  const auth = checkApiKey(req);
  if (!auth.configured) {
    return NextResponse.json(
      { valid: false, reason: "SERVER_MISCONFIGURED", message: "REDEEM_API_KEY is not set" },
      { status: 500 },
    );
  }
  if (!auth.ok) {
    return NextResponse.json({ valid: false, reason: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { valid: false, reason: "SERVER_MISCONFIGURED", message: "DATABASE_URL is not set" },
      { status: 500 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ valid: false, reason: "BAD_REQUEST" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const userRef = typeof body.userRef === "string" ? body.userRef.slice(0, 200) : undefined;

  if (!CODE_RE.test(code)) {
    return NextResponse.json(
      { valid: false, reason: "BAD_REQUEST", message: "Expected a code like CNR-XXXX-XXXX" },
      { status: 400 },
    );
  }

  try {
    const result = await redeemByCode(code, userRef);

    if (result.ok && result.card) {
      const c = result.card;
      return NextResponse.json({
        valid: true,
        status: "redeemed",
        code: c.code,
        amount: c.amountMinor,
        currency: c.currency,
        design: c.designId,
        recipientName: c.recipientName ?? null,
        redeemedAt: c.redeemedAt,
        merOrderId: c.merOrderId,
      });
    }

    const reason = result.reason ?? "NOT_FOUND";
    return NextResponse.json(
      {
        valid: false,
        reason,
        message: REASON_MESSAGE[reason],
        ...(reason === "ALREADY_REDEEMED" && result.card?.redeemedAt
          ? { redeemedAt: result.card.redeemedAt }
          : {}),
      },
      { status: REASON_STATUS[reason] },
    );
  } catch (e) {
    return NextResponse.json(
      { valid: false, reason: "SERVER_ERROR", message: (e as Error).message },
      { status: 500 },
    );
  }
}
