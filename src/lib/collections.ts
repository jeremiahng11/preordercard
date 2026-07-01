import crypto from "node:crypto";
import { asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { collections, type Collection } from "@/lib/db/schema";

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return base || "collection";
}

/** Storefront list — active collections only, in display order. */
export async function listActiveCollections(): Promise<Collection[]> {
  const db = getDb();
  return db
    .select()
    .from(collections)
    .where(ne(collections.status, "hidden"))
    .orderBy(asc(collections.sortOrder), asc(collections.createdAt));
}

/** Admin list — all collections. */
export async function listAllCollections(): Promise<Collection[]> {
  const db = getDb();
  return db.select().from(collections).orderBy(asc(collections.sortOrder), asc(collections.createdAt));
}

export async function getCollectionById(id: string): Promise<Collection | null> {
  const db = getDb();
  const [row] = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  return row ?? null;
}

export interface CreateCollectionInput {
  name: string;
  eyebrow?: string | null;
  title?: string | null;
  description?: string | null;
  comingSoon?: boolean;
  comingSoonDate?: string | null;
}

export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
  const db = getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${slugify(input.name)}-${crypto.randomBytes(2).toString("hex")}`.slice(0, 48);
    try {
      const [row] = await db
        .insert(collections)
        .values({
          slug,
          name: input.name,
          eyebrow: input.eyebrow ?? null,
          title: input.title ?? null,
          description: input.description ?? null,
          comingSoon: input.comingSoon ?? false,
          comingSoonDate: input.comingSoonDate ?? null,
          status: "active",
        })
        .returning();
      return row;
    } catch (e) {
      if ((e as Error).message.includes("collections_slug_uq") && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("Could not create collection");
}

export interface UpdateCollectionInput {
  name?: string;
  eyebrow?: string | null;
  title?: string | null;
  description?: string | null;
  comingSoon?: boolean;
  comingSoonDate?: string | null;
}

export async function updateCollection(id: string, input: UpdateCollectionInput): Promise<Collection | null> {
  const db = getDb();
  const patch: Partial<typeof collections.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.eyebrow !== undefined) patch.eyebrow = input.eyebrow;
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.comingSoon !== undefined) patch.comingSoon = input.comingSoon;
  if (input.comingSoonDate !== undefined) patch.comingSoonDate = input.comingSoonDate;
  const [row] = await db.update(collections).set(patch).where(eq(collections.id, id)).returning();
  return row ?? null;
}

export async function setCollectionStatus(id: string, status: "active" | "hidden"): Promise<Collection | null> {
  const db = getDb();
  const [row] = await db
    .update(collections)
    .set({ status, updatedAt: new Date() })
    .where(eq(collections.id, id))
    .returning();
  return row ?? null;
}
