import crypto from "node:crypto";

/**
 * Aleta Planet UnifyApi (Visa / Mastercard) — server-side client.
 *
 * Implements the request-signing + response-verification scheme described in
 * "Visa Mastercard API V1.0":
 *
 *   unsignedContent =
 *     httpMethod + "|" + url + "\n"
 *     + request-time + "|" + client-id + "|" + sub-client-id + "|" + service + "\n"
 *     + body
 *
 *   signature = "algorithm=RSA256, value=" + base64( SHA256withRSA(unsignedContent, privateKey) )
 *
 * We use the *hosted payment page* flow (spec §1 Option 1): call /order, then
 * redirect the shopper to the returned `paymentLink`. Card data is entered on
 * Aleta's PCI-compliant page, so this server never touches a PAN.
 */

const HTTP_METHOD = "POST";
const API_BASE_PATH = "/unifyApi/v1/payments";

export interface AletaConfig {
  server: string; // e.g. "paysit.aletapay.com"
  merchantCode: string; // client-id
  mid: string; // sub-client-id
  service: string; // "VISA" | "MASTERCARD"
  privateKeyPem: string;
  publicKeyPem: string | null; // Aleta's public key (for verifying callbacks)
}

export interface AletaResult {
  resultStatus: "S" | "F" | "U" | string;
  resultCode: string;
  resultMsg?: string;
}

export interface OrderRequest {
  merOrderId: string;
  merTransAmt: string; // minimum-unit amount, e.g. "1800" = SGD 18.00
  frontUrl: string;
  webhook: string;
  customerEmail: string;
  customerContactNumber: string;
  billingAddress: {
    address1: string;
    postcode: string;
    city: string;
    countryCode: string;
    state?: string;
  };
  autoCapture?: "Y" | "N";
  doThreeDS?: "Y";
}

export interface OrderResponse {
  result: AletaResult;
  data?: {
    paymentResult?: AletaResult;
    merOrderId: string;
    apTransId?: string;
    merTransAmt?: string;
    merTransCur?: string;
    transTime?: string;
    paymentLink?: string;
    doThreeDS?: boolean;
    [k: string]: unknown;
  };
}

/** Wrap a bare base64 key body in PEM armor, normalizing escaped newlines. */
function toPem(raw: string, label: "PRIVATE KEY" | "PUBLIC KEY"): string {
  const cleaned = raw.trim().replace(/\\n/g, "\n");
  if (cleaned.includes("BEGIN")) return cleaned;
  const body = cleaned.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? cleaned;
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
}

/** Read configuration from environment. Throws if anything required is missing. */
export function getAletaConfig(): AletaConfig {
  const server = (process.env.ALETA_SERVER || "paysit.aletapay.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const merchantCode = required("ALETA_MERCHANT_CODE");
  const mid = required("ALETA_MID");
  const service = (process.env.ALETA_SERVICE || "VISA").toUpperCase();
  const privateKeyPem = toPem(required("ALETA_PRIVATE_KEY"), "PRIVATE KEY");
  const publicKeyRaw = process.env.ALETA_PUBLIC_KEY;
  const publicKeyPem = publicKeyRaw ? toPem(publicKeyRaw, "PUBLIC KEY") : null;
  return { server, merchantCode, mid, service, privateKeyPem, publicKeyPem };
}

function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

/** Date in RFC3339 with a fixed +08:00 (SGT) offset, e.g. 2021-01-02T15:04:05+08:00. */
export function formatRequestTime(date: Date = new Date()): string {
  const sgt = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${sgt.getUTCFullYear()}-${p(sgt.getUTCMonth() + 1)}-${p(sgt.getUTCDate())}` +
    `T${p(sgt.getUTCHours())}:${p(sgt.getUTCMinutes())}:${p(sgt.getUTCSeconds())}+08:00`
  );
}

/** Build the canonical string that gets signed / verified. */
export function buildSignContent(params: {
  url: string; // path only, e.g. /unifyApi/v1/payments/order  (or the full webhook URL on callbacks)
  requestTime: string;
  merchantCode: string;
  mid: string;
  service: string;
  body: string; // exact raw JSON string
}): string {
  const { url, requestTime, merchantCode, mid, service, body } = params;
  return (
    `${HTTP_METHOD}|${url}\n` +
    `${requestTime}|${merchantCode}|${mid}|${service}\n` +
    `${body}`
  );
}

export function sign(content: string, privateKeyPem: string): string {
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(content, "utf8");
  const value = signer.sign(privateKeyPem, "base64");
  return `algorithm=RSA256, value=${value}`;
}

/** Verify an inbound signature header (e.g. on the webhook / front redirect). */
export function verifySignature(content: string, signatureHeader: string, publicKeyPem: string): boolean {
  const m = /value=\s*(.+)$/s.exec(signatureHeader);
  const value = (m ? m[1] : signatureHeader).trim();
  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(content, "utf8");
    return verifier.verify(publicKeyPem, value, "base64");
  } catch {
    return false;
  }
}

/** Generate a merchant order id (<=32 chars, alphanumeric). */
export function generateMerOrderId(prefix = "GAC"): string {
  const rand = crypto.randomBytes(12).toString("hex");
  return `${prefix}${rand}`.slice(0, 32);
}

/** Build the headers for a signed request to UnifyApi. */
function buildHeaders(cfg: AletaConfig, endpoint: string, body: string) {
  const requestTime = formatRequestTime();
  const url = `${API_BASE_PATH}/${endpoint}`;
  const content = buildSignContent({
    url,
    requestTime,
    merchantCode: cfg.merchantCode,
    mid: cfg.mid,
    service: cfg.service,
    body,
  });
  const signature = sign(content, cfg.privateKeyPem);
  return {
    "Content-Type": "application/json;charset=UTF-8",
    "request-time": requestTime,
    signature,
    "client-id": cfg.merchantCode,
    "sub-client-id": cfg.mid,
    service: cfg.service,
  };
}

async function callEndpoint<T>(cfg: AletaConfig, endpoint: string, payload: unknown): Promise<T> {
  const body = JSON.stringify(payload);
  const headers = buildHeaders(cfg, endpoint, body);
  const res = await fetch(`https://${cfg.server}${API_BASE_PATH}/${endpoint}`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Aleta ${endpoint} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 500)}`);
  }
  return json as T;
}

/** Create an order and obtain the hosted-page payment link. */
export function createOrder(cfg: AletaConfig, req: OrderRequest): Promise<OrderResponse> {
  return callEndpoint<OrderResponse>(cfg, "order", req);
}

/** Query a transaction by merOrderId / merCaptureId / merRefundId. */
export function inquiry(cfg: AletaConfig, merTransId: string): Promise<unknown> {
  return callEndpoint(cfg, "inquiry", { merTransId });
}

interface InquiryResponse {
  result?: AletaResult;
  data?: {
    apTransId?: string;
    paymentResult?: AletaResult;
    captureList?: Array<{ merCaptureId?: string; merCaptureAmt?: string }>;
  };
}

interface RefundResponse {
  result: AletaResult;
  data?: { paymentResult?: AletaResult; merRefundId?: string; merRefundAmt?: string };
}

/**
 * Refund an auto-captured order. The refund API works off a capture id, so we
 * first inquire the order to find its merCaptureId, then issue the refund.
 * Returns { ok, resultMsg } — ok=true only when Aleta accepts the refund.
 */
export async function refundOrder(
  cfg: AletaConfig,
  merOrderId: string,
  amountMinor: number,
): Promise<{ ok: boolean; resultCode?: string; resultMsg?: string; merRefundId?: string }> {
  const inq = (await callEndpoint<InquiryResponse>(cfg, "inquiry", { merTransId: merOrderId })) ?? {};
  const merCaptureId = inq.data?.captureList?.find((c) => c.merCaptureId)?.merCaptureId;
  if (!merCaptureId) {
    return { ok: false, resultMsg: "No captured transaction found to refund (order not captured)." };
  }

  const merRefundId = generateMerOrderId("RF");
  const res = await callEndpoint<RefundResponse>(cfg, "refund", {
    merCaptureId,
    merRefundId,
    merRefundAmt: String(amountMinor),
  });

  const status = res.result?.resultStatus ?? res.data?.paymentResult?.resultStatus;
  const ok = status === "S";
  return {
    ok,
    resultCode: res.result?.resultCode ?? res.data?.paymentResult?.resultCode,
    resultMsg: res.result?.resultMsg ?? res.data?.paymentResult?.resultMsg,
    merRefundId,
  };
}
