import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { promoCodes, type PromoCode } from "@/lib/db/schema";

export function isPromoCodeActive(code: PromoCode): boolean {
  if (!code.active) return false;
  if (code.expiresAt && new Date(code.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  const db = getDb();
  return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
}

export async function getPromoCodeByCode(code: string): Promise<PromoCode | null> {
  const db = getDb();
  const [row] = await db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1);
  return row ?? null;
}

export async function createPromoCode(input: {
  name: string;
  code: string;
  discountPercent: number;
  expiresAt?: Date | null;
  active?: boolean;
}): Promise<PromoCode> {
  const db = getDb();
  const [row] = await db
    .insert(promoCodes)
    .values({
      name: input.name,
      code: input.code.toUpperCase(),
      discountPercent: input.discountPercent,
      expiresAt: input.expiresAt ?? null,
      active: input.active ?? true,
    })
    .returning();
  return row;
}

export async function updatePromoCode(
  id: string,
  input: {
    name?: string;
    code?: string;
    discountPercent?: number;
    expiresAt?: Date | null;
    active?: boolean;
  },
): Promise<PromoCode | null> {
  const db = getDb();
  const patch: Partial<typeof promoCodes.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) patch.name = input.name;
  if (input.code !== undefined) patch.code = input.code.toUpperCase();
  if (input.discountPercent !== undefined) patch.discountPercent = input.discountPercent;
  if (input.expiresAt !== undefined) patch.expiresAt = input.expiresAt;
  if (input.active !== undefined) patch.active = input.active;

  const [row] = await db.update(promoCodes).set(patch).where(eq(promoCodes.id, id)).returning();
  return row ?? null;
}
