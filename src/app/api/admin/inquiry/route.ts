import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { getAletaConfig, inquiry } from "@/lib/aleta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin diagnostic: query Aleta for a transaction's status by merOrderId. */
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const merTransId = req.nextUrl.searchParams.get("merTransId")?.trim();
  if (!merTransId) return NextResponse.json({ error: "merTransId is required" }, { status: 400 });

  let cfg;
  try {
    cfg = getAletaConfig();
  } catch (e) {
    return NextResponse.json({ error: "Payment gateway is not configured", detail: (e as Error).message }, { status: 500 });
  }

  try {
    const result = await inquiry(cfg, merTransId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "Inquiry failed", detail: (e as Error).message }, { status: 502 });
  }
}
