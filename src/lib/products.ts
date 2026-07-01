import crypto from "node:crypto";
import { asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { products, type Product } from "@/lib/db/schema";

const DEFAULT_BACK = "linear-gradient(140deg,#BFE3FB,#E9D4F0 55%,#FBD3E4)";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || "card";
}

/** Storefront list — everything except delisted, in display order. */
export async function listStorefrontProducts(): Promise<Product[]> {
  const db = getDb();
  return db
    .select()
    .from(products)
    .where(ne(products.status, "delisted"))
    .orderBy(asc(products.sortOrder), asc(products.createdAt));
}

/** Admin list — all products including delisted. */
export async function listAllProducts(): Promise<Product[]> {
  const db = getDb();
  return db.select().from(products).orderBy(asc(products.sortOrder), asc(products.createdAt));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const db = getDb();
  const [row] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return row ?? null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = getDb();
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return row ?? null;
}

export interface CreateProductInput {
  name: string;
  priceMinor: number;
  currency?: string;
  image: string; // data URL
  back?: string;
  backImage?: string | null; // optional data URL back artwork
  collectionId?: string | null;
  comingSoon?: boolean;
  comingSoonDate?: string | null;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const db = getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = crypto.randomBytes(2).toString("hex");
    const slug = `${slugify(input.name)}-${suffix}`.slice(0, 48);
    try {
      const [row] = await db
        .insert(products)
        .values({
          slug,
          name: input.name,
          priceMinor: input.priceMinor,
          currency: input.currency ?? "SGD",
          image: input.image,
          back: input.back || DEFAULT_BACK,
          backImage: input.backImage ?? null,
          collectionId: input.collectionId ?? null,
          comingSoon: input.comingSoon ?? false,
          comingSoonDate: input.comingSoonDate ?? null,
          status: "active",
        })
        .returning();
      return row;
    } catch (e) {
      if ((e as Error).message.includes("products_slug_uq") && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("Could not create product");
}

export interface UpdateProductInput {
  name?: string;
  priceMinor?: number;
  image?: string;
  back?: string;
  backImage?: string | null;
  collectionId?: string | null;
  comingSoon?: boolean;
  comingSoonDate?: string | null;
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product | null> {
  const db = getDb();
  const patch: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.priceMinor !== undefined) patch.priceMinor = input.priceMinor;
  if (input.image !== undefined) patch.image = input.image;
  if (input.back !== undefined) patch.back = input.back;
  if (input.backImage !== undefined) patch.backImage = input.backImage;
  if (input.collectionId !== undefined) patch.collectionId = input.collectionId;
  if (input.comingSoon !== undefined) patch.comingSoon = input.comingSoon;
  if (input.comingSoonDate !== undefined) patch.comingSoonDate = input.comingSoonDate;
  const [row] = await db.update(products).set(patch).where(eq(products.id, id)).returning();
  return row ?? null;
}

export async function setProductStatus(
  id: string,
  status: "active" | "soldout" | "delisted",
): Promise<Product | null> {
  const db = getDb();
  const [row] = await db
    .update(products)
    .set({ status, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  return row ?? null;
}

/** True when a product can currently be purchased. */
export function isPurchasable(p: Product): boolean {
  return p.status === "active" && !p.comingSoon;
}
