import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { createUser } from "@/lib/users";
import { createKeysForUser } from "@/lib/apikeys";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: create a new admin user. */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: { username?: unknown; password?: unknown; role?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "admin" || body.role === "developer" ? body.role : "user";

  const result = await createUser(username, password, role as "admin" | "user" | "developer");
  if (!result.ok) {
    const msg =
      result.reason === "USERNAME_TAKEN"
        ? "That username is already taken"
        : "Username must be 3+ chars and password 6+ chars";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  // Developers get sandbox + production API keys.
  if (role === "developer") await createKeysForUser(result.user.id);
  await audit(me.username, "user_created", result.user.username, `role=${role}`);
  return NextResponse.json({ ok: true, user: result.user });
}
