import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazy singleton Postgres connection + Drizzle client.
 * Throws a clear error if DATABASE_URL is not configured, which API routes
 * catch and surface as a 500 rather than crashing the process.
 */

declare global {
  // eslint-disable-next-line no-var
  var __giftacardDb: PostgresJsDatabase<typeof schema> | undefined;
  // eslint-disable-next-line no-var
  var __giftacardSql: ReturnType<typeof postgres> | undefined;
}

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !url.trim()) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }
  return url;
}

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!global.__giftacardDb) {
    const sql = postgres(getConnectionString(), { max: 5 });
    global.__giftacardSql = sql;
    global.__giftacardDb = drizzle(sql, { schema });
  }
  return global.__giftacardDb;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

export { schema };
