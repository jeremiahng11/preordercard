/** Shared, non-secret app configuration (safe to import on the server). */

export const CURRENCY = "SGD";

/** Gift price in the currency's minimum unit. SGD has 2 decimals → 1800 = S$18.00. */
export const GIFT_AMOUNT_MINOR = "1800";

export const DESIGN_IDS = ["pinkcloud", "rainbow", "seaside"] as const;
export type DesignId = (typeof DESIGN_IDS)[number];

export const DESIGN_NAMES: Record<string, string> = {
  pinkcloud: "Pink Cloud",
  rainbow: "Rainbow Breeze",
  seaside: "Seaside Holiday",
};

export function designName(id: string): string {
  return DESIGN_NAMES[id] ?? "Cinnamoroll";
}

export function isDesignId(v: unknown): v is DesignId {
  return typeof v === "string" && (DESIGN_IDS as readonly string[]).includes(v);
}

/** Format a minor-unit amount for display, e.g. (1800, "SGD") → "S$18.00". */
export function formatAmount(minor: number, currency: string): string {
  const symbol = currency === "SGD" ? "S$" : `${currency} `;
  return `${symbol}${(minor / 100).toFixed(2)}`;
}

/** Aleta Adventure app store links (override via env with the real URLs). */
export function storeLinks() {
  return {
    appStore:
      process.env.APP_STORE_URL || "https://apps.apple.com/sg/app/aleta-adventure/id6761358158",
    playStore:
      process.env.PLAY_STORE_URL ||
      "https://play.google.com/store/apps/details?id=com.aletaplanet.adventure",
  };
}

function isInternalHost(host: string): boolean {
  return /^(0\.0\.0\.0|127\.|localhost|\[?::1\]?)/.test(host);
}

/**
 * Resolve the publicly reachable base URL for this deployment, used to build
 * the `frontUrl` (redirect) and `webhook` (async notification) callbacks AND
 * the post-payment redirect target.
 *
 * Priority: explicit APP_BASE_URL → proxy's X-Forwarded-Host (Railway/etc.) →
 * Railway's injected domain → request origin → localhost. Internal addresses
 * (0.0.0.0, 127.x, localhost) are skipped so we never redirect there in prod.
 */
export function resolveBaseUrl(req?: { headers?: Headers; nextUrl?: { origin: string } }): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const h = req?.headers;
  const fwdHost = h?.get("x-forwarded-host") || h?.get("host");
  if (fwdHost && !isInternalHost(fwdHost)) {
    const proto = h?.get("x-forwarded-proto")?.split(",")[0] || "https";
    return `${proto}://${fwdHost}`.replace(/\/$/, "");
  }

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railway) return `https://${railway.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  const origin = req?.nextUrl?.origin;
  if (origin && !isInternalHost(new URL(origin).host)) return origin.replace(/\/$/, "");
  return "http://localhost:3000";
}

/** Default SG billing address used when the checkout form doesn't collect one. */
export const DEFAULT_BILLING = {
  address1: "1 Marina Boulevard",
  postcode: "018989",
  city: "Singapore",
  countryCode: "SG",
} as const;

export const DEFAULT_CONTACT_NUMBER = "+65-80000000";
