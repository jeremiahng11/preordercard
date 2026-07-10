import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { createProduct } from "@/lib/products";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 3_000_000; // ~3 MB data URL cap

function validImage(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("data:image/") && v.length <= MAX_IMAGE_BYTES;
}

/** Admin: create a new card product. */
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

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const code = typeof body.code === "string" ? body.code.trim().slice(0, 48) : "";
  const priceMinor = Number(body.priceMinor);
  const back = typeof body.back === "string" && body.back.trim() ? body.back.trim() : undefined;
  const collectionId = typeof body.collectionId === "string" && body.collectionId ? body.collectionId : null;
  const comingSoon = body.comingSoon === true;
  const comingSoonDate = comingSoon && typeof body.comingSoonDate === "string" && body.comingSoonDate.trim()
    ? body.comingSoonDate.trim().slice(0, 40)
    : null;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (code && !/^[\w -]{2,48}$/.test(code)) {
    return NextResponse.json({ error: "Product code may use letters, numbers, spaces, - and _ (2–48 chars)" }, { status: 400 });
  }
  if (!Number.isInteger(priceMinor) || priceMinor <= 0) {
    return NextResponse.json({ error: "Price must be a positive number (in cents)" }, { status: 400 });
  }
  if (!validImage(body.image)) {
    return NextResponse.json({ error: "A card image (data URL, ≤3MB) is required" }, { status: 400 });
  }
  const backImage = validImage(body.backImage) ? body.backImage : null;

  try {
    const product = await createProduct({ name, code: code || undefined, priceMinor, image: body.image, back, backImage, collectionId, comingSoon, comingSoonDate });
    await audit(me.username, "product_created", product.name);
    return NextResponse.json({ ok: true, id: product.id, slug: product.slug, code: product.code });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("already in use")) return NextResponse.json({ error: msg }, { status: 409 });
    return NextResponse.json({ error: "Could not create product", detail: msg }, { status: 500 });
  }
}
