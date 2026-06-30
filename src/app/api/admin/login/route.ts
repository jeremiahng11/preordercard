import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  checkAdminPassword,
  createSessionToken,
  isAdminConfigured,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Admin is not configured (set ADMIN_PASSWORD)" }, { status: 500 });
  }

  let body: { password?: unknown };
  try {
    body = (await req.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
