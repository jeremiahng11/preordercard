import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listPromoCodes } from "@/lib/promocodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });
  const codes = await listPromoCodes();
  return NextResponse.json({ promoCodes: codes });
}
