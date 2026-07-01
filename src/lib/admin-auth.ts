import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/users";

/**
 * Admin session: a signed, time-limited httpOnly cookie carrying the user id.
 * The signing key is derived from ADMIN_PASSWORD (a stable server secret), so a
 * user changing *their own* password does not invalidate everyone's sessions.
 */

export const ADMIN_COOKIE = "gac_admin";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

/** Admin is usable only when a server secret + DB are present. */
export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim());
}

function signingKey(): string {
  const seed = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
  if (!seed) throw new Error("ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) is not set");
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function hmac(value: string): string {
  return crypto.createHmac("sha256", signingKey()).update(value).digest("hex");
}

export function createSessionToken(userId: string): string {
  const exp = String(Date.now() + SESSION_TTL_MS);
  const payload = `${userId}.${exp}`;
  return `${payload}.${hmac(payload)}`;
}

/** Returns the userId from a valid, unexpired token, else null. */
export function readSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return null;
  const expected = hmac(`${userId}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return userId;
}

async function currentUserId(): Promise<string | null> {
  if (!isAdminConfigured()) return null;
  try {
    const store = await cookies();
    return readSessionToken(store.get(ADMIN_COOKIE)?.value);
  } catch {
    return null;
  }
}

/** The logged-in admin user, or null. Verifies the user still exists. */
export async function getCurrentUser(): Promise<{ id: string; username: string } | null> {
  const id = await currentUserId();
  if (!id) return null;
  try {
    const user = await getUserById(id);
    return user ? { id: user.id, username: user.username } : null;
  } catch {
    return null;
  }
}

export async function isAdminAuthed(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}
