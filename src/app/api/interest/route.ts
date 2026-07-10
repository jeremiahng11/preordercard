import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { createInterest, markInterestEmailed } from "@/lib/customer-interest";
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
  const productSlug =
    typeof body.productSlug === "string"
      ? body.productSlug.trim()
      : typeof body.productCode === "string"
        ? body.productCode.trim()
        : "";
  const promoCode = typeof body.promoCode === "string" ? body.promoCode.trim().toUpperCase() : "";
  const lang = body.lang === "zh" ? "zh" : "en";

  if (!fullName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  if (!PHONE_RE.test(mobile)) return NextResponse.json({ error: "Valid mobile number is required" }, { status: 400 });
  if (!productSlug) return NextResponse.json({ error: "Please select a design" }, { status: 400 });

  const product = await getProductBySlug(productSlug);
  if (!product) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }
  // Name and code are taken from the product record so they always match admin edits.
  const productName = product.name;
  const productCode = product.code;

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
    lang,
  });

  void audit(fullName, "interest_registered", productCode, promoUsed ?? "none");

  void sendInterestConfirmationEmail({
    fullName,
    email,
    productName,
    productCode,
    priceMinor: product.priceMinor,
    currency: product.currency,
    promoCode: promoUsed,
    promoDiscountPercent,
    image: product.image,
    lang,
  })
    .then((result) => {
      if (result.sent > 0) return markInterestEmailed(interest.id);
    })
    .catch((error) => {
      console.error("Failed to send interest confirmation email:", error);
    });

  return NextResponse.json({ ok: true, id: interest.id, promoDiscountPercent });
}
