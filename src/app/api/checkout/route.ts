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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Creates an Aleta Planet order and returns the hosted-page `paymentLink`.
 * The browser then redirects the shopper to that link to pay with Visa/Mastercard.
 */
export async function POST(req: NextRequest) {
  let payload: {
    design?: unknown;
    buyerEmail?: unknown;
    contactNumber?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { design, buyerEmail, contactNumber } = payload;

  if (!isDesignId(design)) {
    return NextResponse.json({ error: "Unknown card design" }, { status: 400 });
  }
  if (typeof buyerEmail !== "string" || !EMAIL_RE.test(buyerEmail)) {
    return NextResponse.json({ error: "A valid buyer email is required" }, { status: 400 });
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

  const origin = req.nextUrl.origin;
  const baseUrl = resolveBaseUrl(origin);
  const merOrderId = generateMerOrderId();

  const order: OrderRequest = {
    merOrderId,
    merTransAmt: GIFT_AMOUNT_MINOR,
    // Aleta redirects the shopper back here with the result; we forward to the result page.
    frontUrl: `${baseUrl}/api/payment-return`,
    webhook: `${baseUrl}/api/webhook`,
    customerEmail: buyerEmail,
    customerContactNumber:
      typeof contactNumber === "string" && contactNumber.trim()
        ? contactNumber.trim()
        : DEFAULT_CONTACT_NUMBER,
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
    return NextResponse.json(
      { error: "Failed to reach payment gateway", detail: (e as Error).message },
      { status: 502 },
    );
  }
}
