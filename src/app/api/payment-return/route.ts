import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Landing endpoint for Aleta's `frontUrl` redirect (spec §6.7 Front Result Redirect).
 *
 * Aleta may deliver the result as a GET query string or as a POST form/JSON body,
 * so we accept both, pull out the result code + order id, and 302 the shopper to
 * the friendly result page which restores their gift details from localStorage.
 */

function resultPageUrl(req: NextRequest, params: Record<string, string | undefined>) {
  const url = new URL("/payment/result", req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return url;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return NextResponse.redirect(
    resultPageUrl(req, {
      resultCode: sp.get("resultCode") ?? undefined,
      merOrderId: sp.get("merOrderId") ?? undefined,
      apTransId: sp.get("apTransId") ?? undefined,
    }),
  );
}

export async function POST(req: NextRequest) {
  const params: Record<string, string | undefined> = {};
  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      const json = (body.jsonBody as Record<string, unknown>) ?? body;
      params.resultCode = asStr(json.resultCode);
      params.merOrderId = asStr(json.merOrderId);
      params.apTransId = asStr(json.apTransId);
    } else {
      const form = await req.formData();
      params.resultCode = asStr(form.get("resultCode"));
      params.merOrderId = asStr(form.get("merOrderId"));
      params.apTransId = asStr(form.get("apTransId"));
      // Some gateways nest everything under a jsonBody field.
      const jsonBody = form.get("jsonBody");
      if (!params.resultCode && typeof jsonBody === "string") {
        try {
          const parsed = JSON.parse(jsonBody) as Record<string, unknown>;
          params.resultCode = asStr(parsed.resultCode);
          params.merOrderId = asStr(parsed.merOrderId);
          params.apTransId = asStr(parsed.apTransId);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* fall through to redirect with whatever we have */
  }

  // 303 so the browser follows with a GET to the result page.
  return NextResponse.redirect(resultPageUrl(req, params), { status: 303 });
}

function asStr(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}
