import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { countUsers, deleteUser, getUserById } from "@/lib/users";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: delete a user (can't delete yourself or the last remaining user). */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: { id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (id === me.id) return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
  if ((await countUsers()) <= 1) return NextResponse.json({ error: "At least one user must remain" }, { status: 400 });

  const target = await getUserById(id);
  const ok = await deleteUser(id);
  if (!ok) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await audit(me.username, "user_deleted", target?.username ?? id);
  return NextResponse.json({ ok: true });
}
