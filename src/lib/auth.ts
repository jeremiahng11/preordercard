import crypto from "node:crypto";
import { resolveApiKey, type Environment } from "@/lib/apikeys";

/**
 * Partner API-key auth for the redemption endpoints. The Aleta Adventure app
 * sends its key in the `x-api-key` header (or `Authorization: Bearer <key>`).
 *
 * Keys can be either:
 *  - a per-developer key (sandbox or production) from the api_keys table, or
 *  - the global REDEEM_API_KEY env value (treated as production).
 *
 * The resolved `environment` scopes which gift cards the request can act on.
 */
export interface ApiAuth {
  ok: boolean;
  environment: Environment;
  userId: string | null;
}

function timingEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export async function checkApiKey(req: Request): Promise<ApiAuth> {
  const provided =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!provided) return { ok: false, environment: "production", userId: null };

  const master = process.env.REDEEM_API_KEY;
  if (master && master.trim() && timingEqual(provided, master)) {
    return { ok: true, environment: "production", userId: null };
  }

  try {
    const resolved = await resolveApiKey(provided);
    if (resolved) return { ok: true, environment: resolved.environment, userId: resolved.userId };
  } catch {
    /* db unavailable */
  }
  return { ok: false, environment: "production", userId: null };
}
