import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { createProduct } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 3_000_000; // ~3 MB data URL cap

function validImage(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("data:image/") && v.length <= MAX_IMAGE_BYTES;
}

/** Admin: create a new card product. */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const priceMinor = Number(body.priceMinor);
  const back = typeof body.back === "string" && body.back.trim() ? body.back.trim() : undefined;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!Number.isInteger(priceMinor) || priceMinor <= 0) {
    return NextResponse.json({ error: "Price must be a positive number (in cents)" }, { status: 400 });
  }
  if (!validImage(body.image)) {
    return NextResponse.json({ error: "A card image (data URL, ≤3MB) is required" }, { status: 400 });
  }

  try {
    const product = await createProduct({ name, priceMinor, image: body.image, back });
    return NextResponse.json({ ok: true, id: product.id, slug: product.slug });
  } catch (e) {
    return NextResponse.json({ error: "Could not create product", detail: (e as Error).message }, { status: 500 });
  }
}
