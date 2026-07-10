import { eq, desc, sql } from "drizzle-orm";
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
    })
    .returning();
  return row;
}

export async function listInterests(limit = 200): Promise<CustomerInterest[]> {
  const db = getDb();
  return db.select().from(customerInterests).orderBy(desc(customerInterests.createdAt)).limit(limit);
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
