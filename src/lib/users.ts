import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminUsers, type AdminUser } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/passwords";

export type PublicUser = { id: string; username: string; createdAt: string };

function toPublic(u: AdminUser): PublicUser {
  return { id: u.id, username: u.username, createdAt: u.createdAt.toISOString() };
}

export function normalizeUsername(u: string): string {
  return u.trim().toLowerCase();
}

export async function listUsers(): Promise<PublicUser[]> {
  const db = getDb();
  const rows = await db.select().from(adminUsers).orderBy(asc(adminUsers.createdAt));
  return rows.map(toPublic);
}

export async function getUserById(id: string): Promise<AdminUser | null> {
  const db = getDb();
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return row ?? null;
}

export async function getUserByUsername(username: string): Promise<AdminUser | null> {
  const db = getDb();
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.username, normalizeUsername(username))).limit(1);
  return row ?? null;
}

export async function countUsers(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ id: adminUsers.id }).from(adminUsers);
  return rows.length;
}

export type CreateUserResult = { ok: true; user: PublicUser } | { ok: false; reason: "USERNAME_TAKEN" | "INVALID" };

export async function createUser(username: string, password: string): Promise<CreateUserResult> {
  const uname = normalizeUsername(username);
  if (uname.length < 3 || password.length < 6) return { ok: false, reason: "INVALID" };
  const db = getDb();
  try {
    const [row] = await db
      .insert(adminUsers)
      .values({ username: uname, passwordHash: hashPassword(password) })
      .returning();
    return { ok: true, user: toPublic(row) };
  } catch (e) {
    if ((e as Error).message.includes("admin_users_username_uq")) return { ok: false, reason: "USERNAME_TAKEN" };
    throw e;
  }
}

/** Returns the user on valid credentials, else null. */
export async function verifyLogin(username: string, password: string): Promise<AdminUser | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: "WRONG_CURRENT" | "INVALID" }> {
  if (newPassword.length < 6) return { ok: false, reason: "INVALID" };
  const user = await getUserById(userId);
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) return { ok: false, reason: "WRONG_CURRENT" };
  const db = getDb();
  await db
    .update(adminUsers)
    .set({ passwordHash: hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(adminUsers.id, userId));
  return { ok: true };
}

/** Admin reset: set a user's password without knowing the current one. */
export async function setPassword(userId: string, newPassword: string): Promise<void> {
  const db = getDb();
  await db
    .update(adminUsers)
    .set({ passwordHash: hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(adminUsers.id, userId));
}

export async function deleteUser(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.delete(adminUsers).where(eq(adminUsers.id, id)).returning();
  return rows.length > 0;
}

/** Seed the first admin user from env on an empty table. */
export async function ensureSeedUser(): Promise<void> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;
  if ((await countUsers()) > 0) return;
  const username = normalizeUsername(process.env.ADMIN_USERNAME || "admin");
  await createUser(username, password);
  console.log(`[seed] created initial admin user "${username}"`);
}
