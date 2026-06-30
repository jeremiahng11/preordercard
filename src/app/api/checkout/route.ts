import { NextRequest, NextResponse } from "next/server";
import {
  createOrder,
  generateMerOrderId,
  getAletaConfig,
  type OrderRequest,
} from "@/lib/aleta";
import {
  DEFAULT_BILLING,
  DEFAULT_CONTACT_NUMBER,
  resolveBaseUrl,
} from "@/lib/config";
import { isDbConfigured } from "@/lib/db";
import { getProductBySlug, isPurchasable } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function str(v: unknown, max = 200): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

/**
 * Creates an Aleta Planet order for the selected product and returns the
 * hosted-page `paymentLink`. The order amount comes from the product in the DB
 * (authoritative — never trusts a client price). No gift card is stored yet;
 * it's created on payment confirmation (see /api/confirm).
 */
export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { design, buyerEmail } = payload;

  if (typeof design !== "string" || !design) {
    return NextResponse.json({ error: "A card must be selected" }, { status: 400 });
  }
  if (typeof buyerEmail !== "string" || !EMAIL_RE.test(buyerEmail)) {
    return NextResponse.json({ error: "A valid buyer email is required" }, { status: 400 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Store is not configured" }, { status: 500 });
  }

  const product = await getProductBySlug(design);
  if (!product) {
    return NextResponse.json({ error: "Unknown card" }, { status: 400 });
  }
  if (!isPurchasable(product)) {
    return NextResponse.json({ error: "This card is no longer available" }, { status: 409 });
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

  const baseUrl = resolveBaseUrl(req);
  const merOrderId = generateMerOrderId();

  const order: OrderRequest = {
    merOrderId,
    merTransAmt: String(product.priceMinor),
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
      console.error("[checkout] order rejected:", JSON.stringify(res));
      return NextResponse.json(
        {
          error: "Order was not accepted by the gateway",
          resultCode: res.result?.resultCode ?? res.data?.paymentResult?.resultCode,
          resultMsg: res.result?.resultMsg ?? res.data?.paymentResult?.resultMsg,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      merOrderId,
      paymentLink,
      amount: product.priceMinor,
      currency: product.currency,
    });
  } catch (e) {
    console.error("[checkout] order failed:", (e as Error).message);
    return NextResponse.json(
      { error: "Failed to reach payment gateway", detail: (e as Error).message },
      { status: 502 },
    );
  }
}
