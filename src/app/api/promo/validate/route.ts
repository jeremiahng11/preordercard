import { NextRequest, NextResponse } from "next/server";
import { getPromoCodeByCode, isPromoCodeActive } from "@/lib/promocodes";

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") || "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
  }

  const promo = await getPromoCodeByCode(code);
  if (!promo || !isPromoCodeActive(promo)) {
    return NextResponse.json({ error: "Promo code is invalid or expired" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, discountPercent: promo.discountPercent });
}
