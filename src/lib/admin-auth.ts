import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Minimal admin session: a signed, time-limited httpOnly cookie. The signing key
 * is derived from ADMIN_PASSWORD, so no extra secret is required and changing the
 * password invalidates existing sessions.
 */

export const ADMIN_COOKIE = "gac_admin";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim());
}

function signingKey(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !pw.trim()) throw new Error("ADMIN_PASSWORD is not set");
  return crypto.createHash("sha256").update(pw).digest("hex");
}

function hmac(value: string): string {
  return crypto.createHmac("sha256", signingKey()).update(value).digest("hex");
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createSessionToken(): string {
  const exp = String(Date.now() + SESSION_TTL_MS);
  return `${exp}.${hmac(exp)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const idx = token.indexOf(".");
  if (idx < 0) return false;
  const exp = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const expected = hmac(exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** True when the current request carries a valid admin session cookie. */
export async function isAdminAuthed(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  try {
    const store = await cookies();
    return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
  } catch {
    return false;
  }
}

export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
