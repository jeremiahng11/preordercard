import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { takeUndownloadedInterests, listAllInterests } from "@/lib/customer-interest";
import { audit } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";
import type { CustomerInterest } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sgt(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" });
}

function money(minor: number, currency: string): string {
  const sym = currency === "SGD" ? "S$" : `${currency} `;
  return `${sym}${(minor / 100).toFixed(2)}`;
}

/** Quote a CSV field (RFC 4180): wrap in quotes, double any embedded quotes. */
function csvField(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

const HEADERS = [
  "Name",
  "Email",
  "Mobile",
  "Product name",
  "Product code",
  "Price",
  "Promo code",
  "Promo discount %",
  "Status",
  "Registered (SGT)",
  "Last emailed (SGT)",
  "Downloaded (SGT)",
];

function toCsv(rows: CustomerInterest[]): string {
  const lines = [HEADERS.map(csvField).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.fullName,
        r.email,
        r.mobile,
        r.productName,
        r.productCode,
        money(r.priceMinor, r.currency),
        r.promoCode ?? "",
        r.promoDiscountPercent ?? "",
        r.status,
        sgt(r.createdAt),
        sgt(r.lastEmailedAt),
        sgt(r.downloadedAt),
      ]
        .map(csvField)
        .join(","),
    );
  }
  // Prepend a BOM so Excel opens UTF-8 (e.g. S$) correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Admin: export registrations as CSV. scope "new" marks them downloaded. */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role === "developer") return NextResponse.json({ error: "Developer accounts are read-only" }, { status: 403 });
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Database is not configured" }, { status: 500 });

  let body: { scope?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const scope = body.scope === "all" ? "all" : "new";

  const rows = scope === "all" ? await listAllInterests() : await takeUndownloadedInterests();
  await audit(me.username, scope === "all" ? "interests_exported_all" : "interests_exported_new", String(rows.length));

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations-${scope}.csv"`,
      "X-Row-Count": String(rows.length),
    },
  });
}
