import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminAudit, type AdminAudit } from "@/lib/db/schema";

/** Record an admin action. Best-effort — never throws to the caller. */
export async function audit(actor: string | null, action: string, target?: string, detail?: string): Promise<void> {
  try {
    await getDb()
      .insert(adminAudit)
      .values({ actor: actor ?? null, action, target: target ?? null, detail: detail ?? null });
  } catch (e) {
    console.error("[audit] failed:", (e as Error).message);
  }
}

export async function listAudit(limit = 200): Promise<AdminAudit[]> {
  return getDb().select().from(adminAudit).orderBy(desc(adminAudit.createdAt)).limit(limit);
}
