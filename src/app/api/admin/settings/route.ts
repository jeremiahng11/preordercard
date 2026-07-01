import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { setPaymentMethods } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: enable/disable payment methods. */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: { cardEnabled?: unknown; paynowEnabled?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const card = body.cardEnabled === true;
  const paynow = body.paynowEnabled === true;
  if (!card && !paynow) {
    return NextResponse.json({ error: "At least one payment method must be enabled" }, { status: 400 });
  }

  await setPaymentMethods({ card, paynow });
  await audit(me.username, "settings_updated", "payment_methods", `card=${card} paynow=${paynow}`);
  return NextResponse.json({ ok: true, card, paynow });
}
