import { NextRequest, NextResponse } from "next/server";
import { buildSignContent, getAletaConfig, verifySignature } from "@/lib/aleta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Async transaction notification (spec §6.8). We verify the signature (when
 * Aleta's public key is configured), log the result, and MUST respond HTTP 200
 * to acknowledge — otherwise Aleta keeps retrying.
 *
 * Cards are created/activated on the confirmation path (/api/confirm), which is
 * driven by the post-payment redirect and verified via inquiry. The webhook is
 * kept for observability and acknowledgement.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let verified: boolean | null = null;
  try {
    const cfg = getAletaConfig();
    const signatureHeader = req.headers.get("signature");
    if (cfg.publicKeyPem && signatureHeader) {
      const content = buildSignContent({
        url: req.nextUrl.href,
        requestTime: req.headers.get("request-time") ?? "",
        merchantCode: req.headers.get("client-id") ?? cfg.merchantCode,
        mid: req.headers.get("sub-client-id") ?? cfg.mid,
        service: req.headers.get("service") ?? cfg.service,
        body: rawBody,
      });
      verified = verifySignature(content, signatureHeader, cfg.publicKeyPem);
    }
  } catch {
    verified = null;
  }

  let info: { apTransId?: string; transType?: string; merOrderId?: string; paymentResult?: { resultCode?: string } } | null = null;
  try {
    info = JSON.parse(rawBody);
  } catch {
    /* ignore */
  }

  console.log("[aleta webhook]", {
    verified,
    transType: info?.transType,
    merOrderId: info?.merOrderId,
    apTransId: info?.apTransId,
    resultCode: info?.paymentResult?.resultCode,
  });

  return NextResponse.json({ received: true });
}
