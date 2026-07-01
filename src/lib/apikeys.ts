import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { apiKeys, type ApiKey } from "@/lib/db/schema";

export type Environment = "sandbox" | "production";

export function generateApiKey(env: Environment): string {
  const tag = env === "sandbox" ? "sk_test" : "sk_live";
  return `gac_${tag}_${crypto.randomBytes(24).toString("hex")}`;
}

/** Create (or replace) both sandbox + production keys for a user. */
export async function createKeysForUser(userId: string): Promise<ApiKey[]> {
  const db = getDb();
  await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
  const rows = await db
    .insert(apiKeys)
    .values([
      { userId, environment: "sandbox", key: generateApiKey("sandbox") },
      { userId, environment: "production", key: generateApiKey("production") },
    ])
    .returning();
  return rows;
}

export async function listKeysForUser(userId: string): Promise<ApiKey[]> {
  return getDb().select().from(apiKeys).where(eq(apiKeys.userId, userId));
}

/** Resolve a raw API key to its owner + environment, or null. */
export async function resolveApiKey(key: string): Promise<{ userId: string; environment: Environment } | null> {
  const db = getDb();
  const [row] = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1);
  if (!row) return null;
  return { userId: row.userId, environment: row.environment as Environment };
}

export async function regenerateKey(userId: string, environment: Environment): Promise<ApiKey | null> {
  const db = getDb();
  await db.delete(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.environment, environment)));
  const [row] = await db.insert(apiKeys).values({ userId, environment, key: generateApiKey(environment) }).returning();
  return row ?? null;
}
