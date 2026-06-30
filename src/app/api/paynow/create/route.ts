import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { generateMerOrderId } from "@/lib/aleta";
import { resolveBaseUrl } from "@/lib/config";
import { isDbConfigured } from "@/lib/db";
import { getProductBySlug, isPurchasable } from "@/lib/products";
import { generatePaynowQrc, getPaynowConfig, isPaynowConfigured } from "@/lib/paynow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Create a PayNow dynamic QR for the selected product. Returns the QR as a data
 * URL for the browser to display; the browser then polls /api/paynow/confirm.
 * No gift card is stored until payment is confirmed.
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
  if (!isPaynowConfigured()) {
    return NextResponse.json(
      { error: "PayNow is not configured", detail: "Set ALETA_PAYNOW_MID" },
      { status: 500 },
    );
  }

  const product = await getProductBySlug(design);
  if (!product) return NextResponse.json({ error: "Unknown card" }, { status: 400 });
  if (product.comingSoon) {
    return NextResponse.json({ error: "This card isn't available for purchase yet" }, { status: 409 });
  }
  if (!isPurchasable(product)) {
    return NextResponse.json({ error: "This card is no longer available" }, { status: 409 });
  }

  let cfg;
  try {
    cfg = getPaynowConfig();
  } catch (e) {
    return NextResponse.json({ error: "PayNow is not configured", detail: (e as Error).message }, { status: 500 });
  }

  const baseUrl = resolveBaseUrl(req);
  const merOrderId = generateMerOrderId();

  try {
    const qrc = await generatePaynowQrc(cfg, {
      merOrderId,
      amountMinor: product.priceMinor,
      webhook: `${baseUrl}/api/webhook`,
    });
    if (!qrc.ok || !qrc.qrString) {
      return NextResponse.json(
        { error: "Could not generate the PayNow QR", resultCode: qrc.resultCode, detail: qrc.resultMsg },
        { status: 502 },
      );
    }
    const qrImage = await QRCode.toDataURL(qrc.qrString, { width: 320, margin: 1 });
    return NextResponse.json({
      merOrderId,
      qrImage,
      amount: product.priceMinor,
      currency: product.currency,
    });
  } catch (e) {
    console.error("[paynow] create failed:", (e as Error).message);
    return NextResponse.json(
      { error: "Failed to reach PayNow gateway", detail: (e as Error).message },
      { status: 502 },
    );
  }
}
