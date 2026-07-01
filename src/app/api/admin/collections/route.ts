import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { createCollection } from "@/lib/collections";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

/** Admin: create a collection. */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = str(body.name, 120);
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  try {
    const comingSoon = body.comingSoon === true;
    const c = await createCollection({
      name,
      eyebrow: str(body.eyebrow, 160),
      title: str(body.title, 160),
      description: str(body.description, 600),
      comingSoon,
      comingSoonDate: comingSoon ? str(body.comingSoonDate, 40) : null,
    });
    await audit(me.username, "collection_created", c.name);
    return NextResponse.json({ ok: true, id: c.id, slug: c.slug });
  } catch (e) {
    return NextResponse.json({ error: "Could not create collection", detail: (e as Error).message }, { status: 500 });
  }
}
