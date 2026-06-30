import CinnamorollGiftFlow, { type StoreProduct } from "@/components/CinnamorollGiftFlow";
import { isDbConfigured } from "@/lib/db";
import { listStorefrontProducts } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  let products: StoreProduct[] = [];
  if (isDbConfigured()) {
    try {
      const rows = await listStorefrontProducts();
      products = rows.map((p) => ({
        id: p.slug,
        name: p.name,
        img: p.image,
        back: p.back,
        priceMinor: p.priceMinor,
        currency: p.currency,
        status: p.status,
      }));
    } catch {
      /* fall back to empty state */
    }
  }
  return <CinnamorollGiftFlow products={products} />;
}
