import crypto from "node:crypto";

/**
 * Partner API-key auth for the redemption endpoints. The Aleta Adventure app
 * sends its key in the `x-api-key` header (or `Authorization: Bearer <key>`).
 * Compared in constant time to avoid leaking the key via timing.
 */
export function checkApiKey(req: Request): { ok: boolean; configured: boolean } {
  const expected = process.env.REDEEM_API_KEY;
  if (!expected || !expected.trim()) return { ok: false, configured: false };

  const provided =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, configured: true };
}
