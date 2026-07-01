import type { NextRequest } from "next/server";

/**
 * Lightweight CSRF defense: for state-changing admin requests, require the
 * Origin (or Referer) host to match the request host. Combined with the
 * SameSite=Lax session cookie, this blocks cross-site POSTs.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin") || req.headers.get("referer");
  if (!origin) return true; // some legit clients omit it; cookie SameSite still applies
  try {
    const o = new URL(origin).host;
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
    return o === host;
  } catch {
    return false;
  }
}

/** Simple fixed-window in-memory rate limiter (per-process; resets on redeploy). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > max) return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : "") || "unknown";
}
