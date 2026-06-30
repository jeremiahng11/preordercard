import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { updateProduct } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 3_000_000;

/** Admin: edit a product's name, price, image and/or back gradient. */
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

  const patch: {
    name?: string;
    priceMinor?: number;
    image?: string;
    back?: string;
    collectionId?: string | null;
    comingSoon?: boolean;
    comingSoonDate?: string | null;
  } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    patch.name = name;
  }
  if (body.priceMinor !== undefined) {
    const price = Number(body.priceMinor);
    if (!Number.isInteger(price) || price <= 0) {
      return NextResponse.json({ error: "Price must be a positive number (in cents)" }, { status: 400 });
    }
    patch.priceMinor = price;
  }
  if (body.image !== undefined) {
    if (typeof body.image !== "string" || !body.image.startsWith("data:image/") || body.image.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image must be a data URL ≤3MB" }, { status: 400 });
    }
    patch.image = body.image;
  }
  if (typeof body.back === "string" && body.back.trim()) patch.back = body.back.trim();
  if (body.collectionId !== undefined) {
    patch.collectionId = typeof body.collectionId === "string" && body.collectionId ? body.collectionId : null;
  }
  if (body.comingSoon !== undefined) patch.comingSoon = body.comingSoon === true;
  if (body.comingSoonDate !== undefined) {
    patch.comingSoonDate =
      typeof body.comingSoonDate === "string" && body.comingSoonDate.trim()
        ? body.comingSoonDate.trim().slice(0, 40)
        : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await updateProduct(id, patch);
  if (!updated) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
