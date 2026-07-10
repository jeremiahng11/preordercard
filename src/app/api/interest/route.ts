import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { createInterest } from "@/lib/customer-interest";
import { getProductBySlug } from "@/lib/products";
import { getPromoCodeByCode, isPromoCodeActive } from "@/lib/promocodes";
import { audit } from "@/lib/audit";
import { sendInterestConfirmationEmail } from "@/lib/email";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^[0-9+()\-\s]{6,40}$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Store is not configured" }, { status: 500 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 200) : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const mobile = typeof body.mobile === "string" ? body.mobile.trim() : "";
  const productCode = typeof body.productCode === "string" ? body.productCode.trim() : "";
  const productName = typeof body.productName === "string" ? body.productName.trim() : "";
  const promoCode = typeof body.promoCode === "string" ? body.promoCode.trim().toUpperCase() : "";

  if (!fullName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  if (!PHONE_RE.test(mobile)) return NextResponse.json({ error: "Valid mobile number is required" }, { status: 400 });
  if (!productName) return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  if (!productCode) return NextResponse.json({ error: "Product code is required" }, { status: 400 });

  const product = await getProductBySlug(productCode);
  if (!product) {
    return NextResponse.json({ error: "Unknown product code" }, { status: 400 });
  }

  let promoDiscountPercent: number | null = null;
  let promoUsed: string | null = null;
  if (promoCode) {
    const promo = await getPromoCodeByCode(promoCode);
    if (!promo || !isPromoCodeActive(promo)) {
      return NextResponse.json({ error: "Promo code is invalid or expired" }, { status: 400 });
    }
    promoUsed = promo.code;
    promoDiscountPercent = promo.discountPercent;
  }

  const interest = await createInterest({
    fullName,
    email,
    mobile,
    productName,
    productCode,
    priceMinor: product.priceMinor,
    currency: product.currency,
    promoCode: promoUsed,
    promoDiscountPercent,
  });

  void audit(fullName, "interest_registered", productCode, promoUsed ?? "none");

  void sendInterestConfirmationEmail({
    fullName,
    email,
    productName,
    productCode,
    promoCode: promoUsed,
    promoDiscountPercent,
  }).catch((error) => {
    console.error("Failed to send interest confirmation email:", error);
  });

  return NextResponse.json({ ok: true, id: interest.id, promoDiscountPercent });
}
