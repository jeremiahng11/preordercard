import { buildSignContent, formatRequestTime, getAletaConfig, sign, type AletaResult } from "@/lib/aleta";

/**
 * Aleta PayNow (dynamic QR) client.
 *
 * ⚠️ CONTRACT NOTE: the Visa/Mastercard PDF does not document the PayNow
 * genQrc / inquiry request+response field names. The bodies and the response
 * parsing below are best-guess mappings derived from the UnifyApi patterns and
 * the Postman "Generate QRC" example. Everything is parameterised — adjust the
 * field names / paths here (and the env vars) once you have the PayNow API doc.
 *
 * Signing reuses the same RSA-SHA256 canonical content as UnifyApi:
 *   POST|<path>\n + request-time|client-id|sub-client-id|service\n + body
 */

export interface PaynowConfig {
  server: string;
  merchantCode: string;
  mid: string; // PayNow MID
  service: string; // header "service"
  privateKeyPem: string;
  publicKeyPem: string | null;
  genQrcPath: string;
  inquiryPath: string;
  // genQrc required body params (confirm exact values against the PayNow doc):
  tid: string;
  channel: string;
  txnType: string;
  qrcType: string;
}

export function getPaynowConfig(): PaynowConfig {
  const base = getAletaConfig(); // reuses server, merchantCode, privateKey
  const mid = process.env.ALETA_PAYNOW_MID;
  if (!mid || !mid.trim()) throw new Error("Missing required environment variable: ALETA_PAYNOW_MID");
  return {
    server: base.server,
    merchantCode: base.merchantCode,
    mid,
    service: process.env.ALETA_PAYNOW_SERVICE || "ALETAPLANET",
    privateKeyPem: base.privateKeyPem,
    publicKeyPem: process.env.ALETA_PAYNOW_PUBLIC_KEY
      ? wrapPem(process.env.ALETA_PAYNOW_PUBLIC_KEY)
      : null,
    genQrcPath: process.env.ALETA_PAYNOW_GENQRC_PATH || "/qrc/v1/paynow/genQrc",
    inquiryPath: process.env.ALETA_PAYNOW_INQUIRY_PATH || "/qrc/v1/paynow/inquiry",
    tid: process.env.ALETA_PAYNOW_TID || "",
    channel: process.env.ALETA_PAYNOW_CHANNEL || "PAYNOW",
    txnType: process.env.ALETA_PAYNOW_TXNTYPE || "SALE",
    qrcType: process.env.ALETA_PAYNOW_QRCTYPE || "12",
  };
}

function wrapPem(raw: string): string {
  const cleaned = raw.trim().replace(/\\n/g, "\n");
  if (cleaned.includes("BEGIN")) return cleaned;
  const body = cleaned.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? cleaned;
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

export function isPaynowConfigured(): boolean {
  return Boolean(process.env.ALETA_PAYNOW_MID && process.env.ALETA_PAYNOW_MID.trim());
}

async function call<T>(cfg: PaynowConfig, path: string, payload: unknown): Promise<T> {
  const body = JSON.stringify(payload);
  const requestTime = formatRequestTime();
  const content = buildSignContent({
    url: path,
    requestTime,
    merchantCode: cfg.merchantCode,
    mid: cfg.mid,
    service: cfg.service,
    body,
  });
  const signature = sign(content, cfg.privateKeyPem);
  const res = await fetch(`https://${cfg.server}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "request-time": requestTime,
      signature,
      "client-id": cfg.merchantCode,
      "sub-client-id": cfg.mid,
      service: cfg.service,
    },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`PayNow ${path} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
}

/** yyyyMMddHHmmss in SGT, `minutes` from now (for expiryTime). */
function expiryTime(minutes: number): string {
  const sgt = new Date(Date.now() + (8 * 60 + minutes) * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${sgt.getUTCFullYear()}${p(sgt.getUTCMonth() + 1)}${p(sgt.getUTCDate())}${p(sgt.getUTCHours())}${p(sgt.getUTCMinutes())}${p(sgt.getUTCSeconds())}`;
}

export interface QrcResult {
  ok: boolean;
  qrString?: string; // the EMVCo/PayNow payload to render as a QR
  resultCode?: string;
  resultMsg?: string;
  apTransId?: string;
  raw?: unknown; // full parsed response, for diagnostics
}

const QR_FIELDS = ["qrCode", "qrString", "qrContent", "qrcContent", "emvco", "qrData", "qrPayload", "codeUrl", "qrUrl", "payload"] as const;

function findQr(obj: Record<string, unknown> | undefined): string | undefined {
  if (!obj) return undefined;
  for (const f of QR_FIELDS) {
    const v = obj[f];
    if (typeof v === "string" && v.length > 8) return v;
  }
  return undefined;
}

function isSuccessCode(code: string | undefined): boolean {
  if (!code) return false;
  return ["S00", "0000", "00", "000", "SUCCESS"].includes(code);
}

/** Generate a PayNow QR for an order. */
export async function generatePaynowQrc(
  cfg: PaynowConfig,
  params: { merOrderId: string; amountMinor: number; webhook: string },
): Promise<QrcResult> {
  // Body shape required by the PayNow genQrc API (fields per its error message):
  // tid, mid, channel, txnType, merCode, qrcType — plus order/amount/callback.
  const reqBody = {
    merCode: cfg.merchantCode,
    mid: cfg.mid,
    tid: cfg.tid,
    channel: cfg.channel,
    txnType: cfg.txnType,
    qrcType: cfg.qrcType,
    merOrderId: params.merOrderId,
    merTransAmt: String(params.amountMinor),
    expiryTime: expiryTime(30),
    webhook: params.webhook,
  };
  console.log("[paynow] genQrc request:", JSON.stringify(reqBody));
  const res = await call<Record<string, unknown> & { data?: Record<string, unknown> }>(cfg, cfg.genQrcPath, reqBody);

  console.log("[paynow] genQrc response:", JSON.stringify(res).slice(0, 1500));

  const data = (res.data as Record<string, unknown> | undefined) ?? undefined;
  const qrString = findQr(res) || findQr(data);
  const respCode = (res.respCode as string) ?? (res.result as AletaResult | undefined)?.resultCode;
  const respMsg = (res.respMsg as string) ?? (res.result as AletaResult | undefined)?.resultMsg;
  const ok = Boolean(qrString) && (isSuccessCode(respCode) || respCode === undefined);

  return {
    ok,
    qrString,
    apTransId: (res.apTransId as string) ?? (data?.apTransId as string),
    resultCode: respCode,
    resultMsg: respMsg,
    raw: res,
  };
}

export interface PaynowStatus {
  resultCode?: string; // SUCCESS | PAYING | RECEIVE | FAIL | ...
  apTransId?: string;
  amountMinor?: number;
  currency?: string;
}

/** Inquire a PayNow order's payment status. */
export async function inquiryPaynow(cfg: PaynowConfig, merOrderId: string): Promise<PaynowStatus> {
  // ── GUESSED INQUIRY BODY/RESPONSE — confirm against the PayNow doc ──
  const res = await call<{
    data?: {
      paymentResult?: AletaResult;
      apTransId?: string;
      merTransAmt?: string;
      merTransCur?: string;
    };
  }>(cfg, cfg.inquiryPath, { merOrderId });
  const d = res.data ?? {};
  const amt = Number(d.merTransAmt);
  return {
    resultCode: d.paymentResult?.resultCode,
    apTransId: d.apTransId,
    amountMinor: Number.isFinite(amt) && amt > 0 ? amt : undefined,
    currency: d.merTransCur,
  };
}
