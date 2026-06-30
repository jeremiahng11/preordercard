import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { setProductStatus } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["active", "soldout", "delisted"] as const;

/** Admin: mark a product active / soldout / delisted. */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: { id?: unknown; status?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (typeof status !== "string" || !ALLOWED.includes(status as (typeof ALLOWED)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await setProductStatus(id, status as (typeof ALLOWED)[number]);
  if (!updated) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ ok: true, status: updated.status });
}
