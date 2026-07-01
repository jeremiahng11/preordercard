import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { listStorefrontProducts } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public storefront product list (active + soldout; excludes delisted). */
export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ products: [] });
  try {
    const rows = await listStorefrontProducts();
    return NextResponse.json({
      products: rows.map((p) => ({
        id: p.slug,
        name: p.name,
        img: p.image,
        back: p.back,
        backImage: p.backImage ?? null,
        priceMinor: p.priceMinor,
        currency: p.currency,
        status: p.status,
        comingSoon: p.comingSoon,
        comingSoonDate: p.comingSoonDate ?? null,
      })),
    });
  } catch (e) {
    return NextResponse.json({ products: [], error: (e as Error).message }, { status: 500 });
  }
}
