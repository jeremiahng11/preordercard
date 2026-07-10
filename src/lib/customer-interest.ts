import { eq, desc } from "drizzle-orm";
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
