import { isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { collections, products } from "@/lib/db/schema";
import { CARD_IMG } from "@/lib/assets";

/**
 * Seed defaults on first boot (idempotent):
 *  - the "Cinnamoroll" collection with the storefront marketing copy
 *  - the three original cards, assigned to that collection
 *  - backfill: any existing card without a collection is attached to Cinnamoroll
 */
const CINNAMOROLL = {
  slug: "cinnamoroll",
  name: "Cinnamoroll",
  eyebrow: "Limited Edition · Cinnamoroll",
  title: "Cinnamoroll Visa Platinum",
  description:
    "Give the prettiest way to pay. A collectible Visa Platinum debit card, sent as a gift with a one-time code your friend redeems in the Aleta app in seconds.",
};

const CARDS = [
  { slug: "pinkcloud", name: "Pink Cloud", back: "linear-gradient(140deg,#BFE3FB,#E9D4F0 55%,#FBD3E4)" },
  { slug: "rainbow", name: "Rainbow Breeze", back: "linear-gradient(140deg,#CDE7FF,#F6E3C9 45%,#F8CFE6)" },
  { slug: "seaside", name: "Seaside Holiday", back: "linear-gradient(140deg,#BFE6FB,#A9CDF7 60%,#D9EFFB)" },
];

export async function seedDefaults(): Promise<void> {
  const db = getDb();

  // 1) Ensure the Cinnamoroll collection exists.
  let [coll] = await db.select().from(collections).limit(1);
  if (!coll) {
    [coll] = await db
      .insert(collections)
      .values({ ...CINNAMOROLL, status: "active", sortOrder: 0 })
      .onConflictDoNothing()
      .returning();
    if (coll) console.log("[seed] created Cinnamoroll collection");
  }
  if (!coll) {
    [coll] = await db.select().from(collections).limit(1);
  }

  // 2) Seed the three cards if there are none yet.
  const [anyProduct] = await db.select({ id: products.id }).from(products).limit(1);
  if (!anyProduct && coll) {
    const img = CARD_IMG as Record<string, string>;
    await db
      .insert(products)
      .values(
        CARDS.map((c, i) => ({
          collectionId: coll!.id,
          slug: c.slug,
          name: c.name,
          priceMinor: 1800,
          currency: "SGD",
          image: img[c.slug],
          back: c.back,
          status: "active",
          sortOrder: i,
        })),
      )
      .onConflictDoNothing();
    console.log("[seed] inserted default cards");
  }

  // 3) Backfill: attach any collection-less cards to Cinnamoroll.
  if (coll) {
    await db.update(products).set({ collectionId: coll.id }).where(isNull(products.collectionId));
  }
}
