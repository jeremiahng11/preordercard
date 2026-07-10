import PreorderInterestFlow, { type StoreCollection } from "@/components/PreorderInterestFlow";
import { isDbConfigured } from "@/lib/db";
import { listActiveCollections } from "@/lib/collections";
import { listStorefrontProducts } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  let collections: StoreCollection[] = [];

  if (isDbConfigured()) {
    try {
      const [colls, prods] = await Promise.all([
        listActiveCollections(),
        listStorefrontProducts(),
      ]);
      collections = colls
        .map((c) => ({
          id: c.slug,
          name: c.name,
          eyebrow: c.eyebrow ?? "",
          title: c.title ?? c.name,
          description: c.description ?? "",
          comingSoon: c.comingSoon,
          comingSoonDate: c.comingSoonDate ?? null,
          cards: prods
            .filter((p) => p.collectionId === c.id)
            .map((p) => ({
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
        }))
        .filter((c) => c.cards.length > 0);
    } catch {
      /* fall back to empty state */
    }
  }

  return <PreorderInterestFlow collections={collections} />;
}
