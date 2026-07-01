import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { updateCollection } from "@/lib/collections";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: unknown, max: number): string | null {
  return typeof v === "string" ? v.trim().slice(0, max) : null;
}

/** Admin: edit a collection's name + marketing copy (eyebrow/title/description). */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role === "developer") return NextResponse.json({ error: "Developer accounts are read-only" }, { status: 403 });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const patch: {
    name?: string;
    eyebrow?: string | null;
    title?: string | null;
    description?: string | null;
    comingSoon?: boolean;
    comingSoonDate?: string | null;
  } = {};
  if (body.name !== undefined) {
    const name = str(body.name, 120);
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    patch.name = name;
  }
  if (body.eyebrow !== undefined) patch.eyebrow = str(body.eyebrow, 160);
  if (body.title !== undefined) patch.title = str(body.title, 160);
  if (body.description !== undefined) patch.description = str(body.description, 600);
  if (body.comingSoon !== undefined) patch.comingSoon = body.comingSoon === true;
  if (body.comingSoonDate !== undefined) patch.comingSoonDate = str(body.comingSoonDate, 40);

  const updated = await updateCollection(id, patch);
  if (!updated) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  await audit(me.username, "collection_updated", updated.name);
  return NextResponse.json({ ok: true });
}
