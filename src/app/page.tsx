import CinnamorollGiftFlow, { type StoreCollection } from "@/components/CinnamorollGiftFlow";
import { isDbConfigured } from "@/lib/db";
import { listActiveCollections } from "@/lib/collections";
import { listStorefrontProducts } from "@/lib/products";
import { getPaymentMethods, type PaymentMethods } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  let collections: StoreCollection[] = [];
  let paymentMethods: PaymentMethods = { card: true, paynow: true };

  if (isDbConfigured()) {
    try {
      const [colls, prods, pm] = await Promise.all([
        listActiveCollections(),
        listStorefrontProducts(),
        getPaymentMethods(),
      ]);
      paymentMethods = pm;
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

  return <CinnamorollGiftFlow collections={collections} paymentMethods={paymentMethods} />;
}
