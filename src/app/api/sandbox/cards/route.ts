import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/auth";
import { generateMerOrderId } from "@/lib/aleta";
import { isDbConfigured } from "@/lib/db";
import { createActiveCard } from "@/lib/giftcards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sandbox test-card generator. Developers call this with their SANDBOX key to
 * mint a redeemable test gift card (environment=sandbox), then exercise
 * /api/redeem and /api/redeem/validate against it — fully isolated from
 * production data.
 *
 *   POST /api/sandbox/cards
 *   headers: x-api-key: <SANDBOX key>
 *   body (optional): { amount?: number(minor units), recipient?: string, recipientEmail?: string }
 */
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 500 });
  }
  const auth = await checkApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.environment !== "sandbox") {
    return NextResponse.json({ error: "Use your SANDBOX API key to create test cards" }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* body optional */
  }

  const amt = Number(body.amount);
  const amountMinor = Number.isInteger(amt) && amt > 0 ? amt : 1800;
  const recipient = typeof body.recipient === "string" ? body.recipient.slice(0, 120) : "Test Recipient";
  const recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail.slice(0, 200) : "test@example.com";

  const { card } = await createActiveCard({
    merOrderId: generateMerOrderId("SBX"),
    amountMinor,
    currency: "SGD",
    designId: "sandbox",
    productName: "Sandbox Test Card",
    environment: "sandbox",
    recipientName: recipient,
    recipientEmail,
    senderName: "Sandbox",
    buyerEmail: recipientEmail,
    message: "Sandbox test card",
  });

  return NextResponse.json({
    environment: "sandbox",
    code: card.code,
    status: card.status,
    amount: card.amountMinor,
    currency: card.currency,
    hint: "Redeem this at POST /api/redeem with your sandbox key.",
  });
}
