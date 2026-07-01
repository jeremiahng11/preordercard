import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { createUser } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: create a new admin user. */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: { username?: unknown; password?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  const result = await createUser(username, password);
  if (!result.ok) {
    const msg =
      result.reason === "USERNAME_TAKEN"
        ? "That username is already taken"
        : "Username must be 3+ chars and password 6+ chars";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  return NextResponse.json({ ok: true, user: result.user });
}
