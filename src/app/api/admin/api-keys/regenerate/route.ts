import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listKeysForUser, regenerateKey } from "@/lib/apikeys";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Regenerate the current developer's sandbox or production key. */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: { environment?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const environment = body.environment === "sandbox" || body.environment === "production" ? body.environment : null;
  if (!environment) return NextResponse.json({ error: "environment must be sandbox or production" }, { status: 400 });

  // Only the owner (a developer with keys) can rotate their own keys.
  const existing = await listKeysForUser(me.id);
  if (existing.length === 0) {
    return NextResponse.json({ error: "No API keys on this account" }, { status: 403 });
  }

  const row = await regenerateKey(me.id, environment);
  await audit(me.username, "apikey_regenerated", environment);
  return NextResponse.json({ ok: true, environment, key: row?.key });
}
