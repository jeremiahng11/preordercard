import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { createPromoCode } from "@/lib/promocodes";
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const discountPercent = Number(body.discountPercent);
  const expiresAt = typeof body.expiresAt === "string" && body.expiresAt.trim() ? new Date(body.expiresAt) : null;
  const active = body.active !== false;

  if (!name) return NextResponse.json({ error: "Promo name is required" }, { status: 400 });
  if (!code || !codeRe.test(code)) return NextResponse.json({ error: "Promo code must be 3–32 chars, letters/numbers/_/- only" }, { status: 400 });
  if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    return NextResponse.json({ error: "Discount percent must be a whole number between 1 and 100" }, { status: 400 });
  }
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
  }

  try {
    const promo = await createPromoCode({ name, code, discountPercent, expiresAt, active });
    await audit(me.username, "promo_created", promo.code);
    return NextResponse.json({ ok: true, id: promo.id });
  } catch (e) {
    return NextResponse.json({ error: "Could not create promo" , detail: (e as Error).message }, { status: 500 });
  }
}
