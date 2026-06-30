import { NextRequest, NextResponse } from "next/server";
import {
  createOrder,
  generateMerOrderId,
  getAletaConfig,
  type OrderRequest,
} from "@/lib/aleta";
import {
  CURRENCY,
  DEFAULT_BILLING,
  DEFAULT_CONTACT_NUMBER,
  GIFT_AMOUNT_MINOR,
  isDesignId,
  resolveBaseUrl,
} from "@/lib/config";
import { isDbConfigured } from "@/lib/db";
import { createPendingCard } from "@/lib/giftcards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function str(v: unknown, max = 200): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

/**
 * Creates an Aleta Planet order and returns the hosted-page `paymentLink`.
 * Persists a PENDING gift card first so the redemption code exists and can be
 * activated by the payment webhook. The browser redirects to the paymentLink.
 */
export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { design, buyerEmail } = payload;

  if (!isDesignId(design)) {
    return NextResponse.json({ error: "Unknown card design" }, { status: 400 });
  }
  if (typeof buyerEmail !== "string" || !EMAIL_RE.test(buyerEmail)) {
    return NextResponse.json({ error: "A valid buyer email is required" }, { status: 400 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured", detail: "Set DATABASE_URL to enable purchases" },
      { status: 500 },
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

  const baseUrl = resolveBaseUrl(req.nextUrl.origin);
  const merOrderId = generateMerOrderId();

  // 1) Persist a pending gift card (with its redemption code) before paying.
  try {
    await createPendingCard({
      merOrderId,
      amountMinor: Number.parseInt(GIFT_AMOUNT_MINOR, 10),
      currency: CURRENCY,
      designId: design,
      recipientName: str(payload.recipient, 120),
      recipientEmail: str(payload.recipientEmail, 200),
      senderName: str(payload.sender, 120),
      buyerEmail,
      message: str(payload.message, 280),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Could not create the gift card", detail: (e as Error).message },
      { status: 500 },
    );
  }

  // 2) Create the Aleta order to obtain the hosted-page payment link.
  const order: OrderRequest = {
    merOrderId,
    merTransAmt: GIFT_AMOUNT_MINOR,
    frontUrl: `${baseUrl}/api/payment-return`,
    webhook: `${baseUrl}/api/webhook`,
    customerEmail: buyerEmail,
    customerContactNumber:
      str(payload.contactNumber, 18) ?? DEFAULT_CONTACT_NUMBER,
    billingAddress: { ...DEFAULT_BILLING },
    autoCapture: "Y",
  };

  try {
    const res = await createOrder(cfg, order);
    const paymentLink = res.data?.paymentLink;
    const status = res.result?.resultStatus;

    if (!paymentLink || status === "F") {
      return NextResponse.json(
        {
          error: "Order was not accepted by the gateway",
          resultCode: res.result?.resultCode,
          resultMsg: res.result?.resultMsg ?? res.data?.paymentResult?.resultMsg,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      merOrderId,
      paymentLink,
      amount: GIFT_AMOUNT_MINOR,
      currency: CURRENCY,
    });
  } catch (e) {
    console.error("[checkout] order failed:", (e as Error).message);
    return NextResponse.json(
      { error: "Failed to reach payment gateway", detail: (e as Error).message },
      { status: 502 },
    );
  }
}
