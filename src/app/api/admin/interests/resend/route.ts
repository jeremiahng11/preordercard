import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { getInterestById, markInterestEmailed } from "@/lib/customer-interest";
import { sendInterestConfirmationEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: resend the confirmation email to a preorder-interest applicant. */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: { id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const interest = await getInterestById(id);
  if (!interest) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  const result = await sendInterestConfirmationEmail({
    fullName: interest.fullName,
    email: interest.email,
    productName: interest.productName,
    productCode: interest.productCode,
    priceMinor: interest.priceMinor,
    currency: interest.currency,
    promoCode: interest.promoCode,
    promoDiscountPercent: interest.promoDiscountPercent,
    lang: interest.lang,
  });

  if (result.errors.length) {
    return NextResponse.json({ error: "Email send failed", detail: result.errors[0] }, { status: 502 });
  }
  if (result.sent > 0) {
    await markInterestEmailed(id);
    await audit(me.username, "interest_email_resent", interest.email);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true, warning: "Email is not configured — logged instead of sent." });
}
