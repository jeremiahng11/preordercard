import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { updatePromoCode } from "@/lib/promocodes";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const codeRe = /^[A-Z0-9_-]{3,32}$/;

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
    code?: string;
    discountPercent?: number;
    expiresAt?: Date | null;
    active?: boolean;
  } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    if (!name) return NextResponse.json({ error: "Promo name cannot be empty" }, { status: 400 });
    patch.name = name;
  }
  if (body.code !== undefined) {
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!code || !codeRe.test(code)) return NextResponse.json({ error: "Promo code must be 3–32 chars, letters/numbers/_/- only" }, { status: 400 });
    patch.code = code;
  }
  if (body.discountPercent !== undefined) {
    const discountPercent = Number(body.discountPercent);
    if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
      return NextResponse.json({ error: "Discount percent must be a whole number between 1 and 100" }, { status: 400 });
    }
    patch.discountPercent = discountPercent;
  }
  if (body.expiresAt !== undefined) {
    const expiresAt = typeof body.expiresAt === "string" && body.expiresAt.trim() ? new Date(body.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
    patch.expiresAt = expiresAt;
  }
  if (body.active !== undefined) {
    patch.active = body.active === true;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await updatePromoCode(id, patch);
  if (!updated) return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
  await audit(me.username, "promo_updated", updated.code);
  return NextResponse.json({ ok: true });
}
