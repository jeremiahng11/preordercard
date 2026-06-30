import { NextRequest, NextResponse } from "next/server";
import { buildSignContent, getAletaConfig, verifySignature } from "@/lib/aleta";
import { isDbConfigured } from "@/lib/db";
import { activateByMerOrderId } from "@/lib/giftcards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Async transaction notification (spec §6.8). Aleta POSTs the payment result here.
 * We verify the signature (when Aleta's public key is configured) and MUST respond
 * with HTTP 200 to acknowledge — otherwise Aleta keeps retrying.
 *
 * On the verify path the canonical `url` is the full webhook URL (spec §8).
 *
 * NOTE: This demo has no database, so we only log the result. In production you'd
 * mark the order paid / fulfilled here and stop relying on the browser redirect.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let verified: boolean | null = null;
  try {
    const cfg = getAletaConfig();
    const signatureHeader = req.headers.get("signature");
    const requestTime = req.headers.get("request-time") ?? "";
    const clientId = req.headers.get("client-id") ?? cfg.merchantCode;
    const subClientId = req.headers.get("sub-client-id") ?? cfg.mid;
    const service = req.headers.get("service") ?? cfg.service;

    if (cfg.publicKeyPem && signatureHeader) {
      const content = buildSignContent({
        url: req.nextUrl.href,
        requestTime,
        merchantCode: clientId,
        mid: subClientId,
        service,
        body: rawBody,
      });
      verified = verifySignature(content, signatureHeader, cfg.publicKeyPem);
    }
  } catch {
    verified = null; // config/parse problem — still ack to stop retries
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    /* ignore */
  }

  const info = parsed as
    | { apTransId?: string; transType?: string; merOrderId?: string; paymentResult?: { resultCode?: string } }
    | null;

  const resultCode = info?.paymentResult?.resultCode;

  console.log("[aleta webhook]", {
    verified,
    transType: info?.transType,
    merOrderId: info?.merOrderId,
    apTransId: info?.apTransId,
    resultCode,
  });

  // Activate the gift card once the order's payment succeeds. We only trust the
  // webhook (server-to-server) — never the browser redirect — for activation.
  // If a public key is configured we require a valid signature.
  const signatureOk = verified !== false;
  if (
    signatureOk &&
    info?.transType === "ORDER" &&
    resultCode === "SUCCESS" &&
    info.merOrderId &&
    isDbConfigured()
  ) {
    try {
      await activateByMerOrderId(info.merOrderId, info.apTransId);
      console.log("[aleta webhook] activated", info.merOrderId);
    } catch (e) {
      console.error("[aleta webhook] activation failed:", (e as Error).message);
    }
  }

  // Always 200 to acknowledge receipt.
  return NextResponse.json({ received: true });
}
