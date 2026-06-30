import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { CARD_IMG } from "@/lib/assets";

/**
 * Seed the three original card products on first boot (idempotent — only runs
 * when the products table is empty). Reuses the embedded base64 artwork so the
 * storefront keeps working; admin can then add/edit products from the UI.
 */
const SEED = [
  { slug: "pinkcloud", name: "Pink Cloud", back: "linear-gradient(140deg,#BFE3FB,#E9D4F0 55%,#FBD3E4)" },
  { slug: "rainbow", name: "Rainbow Breeze", back: "linear-gradient(140deg,#CDE7FF,#F6E3C9 45%,#F8CFE6)" },
  { slug: "seaside", name: "Seaside Holiday", back: "linear-gradient(140deg,#BFE6FB,#A9CDF7 60%,#D9EFFB)" },
];

export async function seedProducts(): Promise<void> {
  const db = getDb();
  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length) return;

  const img = CARD_IMG as Record<string, string>;
  await db
    .insert(products)
    .values(
      SEED.map((s, i) => ({
        slug: s.slug,
        name: s.name,
        priceMinor: 1800,
        currency: "SGD",
        image: img[s.slug],
        back: s.back,
        status: "active",
        sortOrder: i,
      })),
    )
    .onConflictDoNothing();
  console.log("[seed] inserted default products");
}
