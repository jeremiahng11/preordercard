import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { getById } from "@/lib/giftcards";
import { sendGiftEmails } from "@/lib/email";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: re-send the gift + receipt emails for a card. */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role === "developer") return NextResponse.json({ error: "Developer accounts are read-only" }, { status: 403 });
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

  const card = await getById(id);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (!(card.status === "active" || card.status === "redeemed")) {
    return NextResponse.json({ error: "Only paid cards can be emailed" }, { status: 409 });
  }

  try {
    const result = await sendGiftEmails({
      code: card.code,
      designId: card.designId,
      productName: card.productName,
      amountMinor: card.amountMinor,
      currency: card.currency,
      recipientName: card.recipientName,
      recipientEmail: card.recipientEmail,
      senderName: card.senderName,
      buyerEmail: card.buyerEmail,
      message: card.message,
    });
    if (result.errors.length) {
      return NextResponse.json(
        { error: "Email provider rejected the send", detail: result.errors.join(" · ") },
        { status: 502 },
      );
    }
    if (result.sent === 0) {
      return NextResponse.json({
        ok: true,
        warning: "Email is not configured (RESEND_API_KEY / EMAIL_FROM) — nothing was sent, only logged.",
      });
    }
    await audit(me.username, "email_resent", card.code, `sent=${result.sent}`);
    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (e) {
    return NextResponse.json({ error: "Could not send email", detail: (e as Error).message }, { status: 502 });
  }
}
