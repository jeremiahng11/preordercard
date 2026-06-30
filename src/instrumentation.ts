/**
 * Runs once when the server boots. We apply pending Drizzle migrations here so a
 * fresh Railway deploy provisions the schema automatically — no manual step.
 *
 * Skips cleanly when DATABASE_URL is unset (e.g. during `next build`) so the
 * build never depends on a live database.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) {
    console.warn("[migrate] DATABASE_URL not set — skipping migrations");
    return;
  }

  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const postgres = (await import("postgres")).default;

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
    console.log("[migrate] migrations applied");
  } catch (e) {
    console.error("[migrate] failed:", (e as Error).message);
  } finally {
    await sql.end({ timeout: 5 });
  }

  try {
    const { seedProducts } = await import("@/lib/seed");
    await seedProducts();
  } catch (e) {
    console.error("[seed] failed:", (e as Error).message);
  }
}
