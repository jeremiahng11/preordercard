import { eq, desc, sql, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customerInterests, type CustomerInterest } from "@/lib/db/schema";

export interface CustomerInterestInput {
  fullName: string;
  email: string;
  mobile: string;
  productName: string;
  productCode: string;
  priceMinor: number;
  currency: string;
  promoCode?: string | null;
  promoDiscountPercent?: number | null;
  lang?: string;
}

export async function createInterest(input: CustomerInterestInput): Promise<CustomerInterest> {
  const db = getDb();
  const [row] = await db
    .insert(customerInterests)
    .values({
      fullName: input.fullName,
      email: input.email,
      mobile: input.mobile,
      productName: input.productName,
      productCode: input.productCode,
      priceMinor: input.priceMinor,
      currency: input.currency,
      promoCode: input.promoCode ?? null,
      promoDiscountPercent: input.promoDiscountPercent ?? null,
      lang: input.lang === "zh" ? "zh" : "en",
    })
    .returning();
  return row;
}

export async function listInterests(limit = 200): Promise<CustomerInterest[]> {
  const db = getDb();
  return db.select().from(customerInterests).orderBy(desc(customerInterests.createdAt)).limit(limit);
}

/** Count registrations not yet included in a CSV download. */
export async function countUndownloadedInterests(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ id: customerInterests.id }).from(customerInterests).where(isNull(customerInterests.downloadedAt));
  return rows.length;
}

/**
 * Atomically claim all not-yet-downloaded registrations: stamp downloaded_at
 * and return exactly the rows that were marked, so a later export won't repeat
 * them. Ordered oldest-first for a stable CSV.
 */
export async function takeUndownloadedInterests(): Promise<CustomerInterest[]> {
  const db = getDb();
  const rows = await db
    .update(customerInterests)
    .set({ downloadedAt: sql`now()` })
    .where(isNull(customerInterests.downloadedAt))
    .returning();
  return rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** All registrations, oldest-first — for a full ("download everything") export. */
export async function listAllInterests(): Promise<CustomerInterest[]> {
  const db = getDb();
  return db.select().from(customerInterests).orderBy(customerInterests.createdAt);
}

export async function getInterestById(id: string): Promise<CustomerInterest | null> {
  const db = getDb();
  const [row] = await db.select().from(customerInterests).where(eq(customerInterests.id, id)).limit(1);
  return row ?? null;
}

/** Mark a registration as revoked (kept for the record, but flagged cancelled). */
export async function revokeInterest(id: string): Promise<CustomerInterest | null> {
  const db = getDb();
  const [row] = await db
    .update(customerInterests)
    .set({ status: "revoked" })
    .where(eq(customerInterests.id, id))
    .returning();
  return row ?? null;
}

/** Permanently delete a registration. */
export async function deleteInterest(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.delete(customerInterests).where(eq(customerInterests.id, id)).returning({ id: customerInterests.id });
  return rows.length > 0;
}

/** Record that the confirmation email was (re)sent to the applicant just now. */
export async function markInterestEmailed(id: string): Promise<void> {
  const db = getDb();
  await db.update(customerInterests).set({ lastEmailedAt: sql`now()` }).where(eq(customerInterests.id, id));
}
