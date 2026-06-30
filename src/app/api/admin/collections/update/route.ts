import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { updateCollection } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: unknown, max: number): string | null {
  return typeof v === "string" ? v.trim().slice(0, max) : null;
}

/** Admin: edit a collection's name + marketing copy (eyebrow/title/description). */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const patch: { name?: string; eyebrow?: string | null; title?: string | null; description?: string | null } = {};
  if (body.name !== undefined) {
    const name = str(body.name, 120);
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    patch.name = name;
  }
  if (body.eyebrow !== undefined) patch.eyebrow = str(body.eyebrow, 160);
  if (body.title !== undefined) patch.title = str(body.title, 160);
  if (body.description !== undefined) patch.description = str(body.description, 600);

  const updated = await updateCollection(id, patch);
  if (!updated) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
