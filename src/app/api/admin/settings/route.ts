import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { setPaymentMethods } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: enable/disable payment methods. */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  return NextResponse.json({ ok: true, card, paynow });
}
