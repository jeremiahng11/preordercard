import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { revokeCard } from "@/lib/giftcards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: revoke a code (active/pending → revoked). No payment is touched. */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 500 });
  }

  let body: { id?: unknown };
  try {
    body = (await req.json()) as { id?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const card = await revokeCard(id);
  if (!card) {
    return NextResponse.json(
      { error: "Card could not be revoked (only pending/active cards can be revoked)" },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, status: card.status });
}
