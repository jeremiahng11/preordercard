import { NextRequest, NextResponse } from "next/server";
import { getAletaConfig, inquiry } from "@/lib/aleta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Query a transaction's status by merOrderId / merCaptureId / merRefundId (spec §6.6).
 * Used by the result page to confirm payment server-side rather than trusting the
 * redirect's `resultCode` alone.
 */
export async function GET(req: NextRequest) {
  const merTransId = req.nextUrl.searchParams.get("merTransId");
  if (!merTransId) {
    return NextResponse.json({ error: "merTransId is required" }, { status: 400 });
  }

  let cfg;
  try {
    cfg = getAletaConfig();
  } catch (e) {
    return NextResponse.json(
      { error: "Payment gateway is not configured", detail: (e as Error).message },
      { status: 500 },
    );
  }

  try {
    const result = await inquiry(cfg, merTransId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: "Inquiry failed", detail: (e as Error).message },
      { status: 502 },
    );
  }
}
