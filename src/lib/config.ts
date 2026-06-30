/** Shared, non-secret app configuration (safe to import on the server). */

export const CURRENCY = "SGD";

/** Gift price in the currency's minimum unit. SGD has 2 decimals → 1800 = S$18.00. */
export const GIFT_AMOUNT_MINOR = "1800";

export const DESIGN_IDS = ["pinkcloud", "rainbow", "seaside"] as const;
export type DesignId = (typeof DESIGN_IDS)[number];

export function isDesignId(v: unknown): v is DesignId {
  return typeof v === "string" && (DESIGN_IDS as readonly string[]).includes(v);
}

/**
 * Resolve the publicly reachable base URL for this deployment, used to build
 * the `frontUrl` (redirect) and `webhook` (async notification) callbacks.
 *
 * Priority: explicit APP_BASE_URL → Railway's injected domain → request origin.
 */
export function resolveBaseUrl(requestOrigin?: string): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railway) return `https://${railway.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  if (requestOrigin) return requestOrigin.replace(/\/$/, "");
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
