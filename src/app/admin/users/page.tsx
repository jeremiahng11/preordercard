import { redirect } from "next/navigation";
import { getCurrentUser, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listUsers } from "@/lib/users";
import AdminUsers, { type UserView } from "@/components/AdminUsers";
import AdminNav from "@/components/AdminNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  if (!isAdminConfigured()) redirect("/admin");
  const me = await getCurrentUser();
  if (!me) redirect("/admin/login");

  let users: UserView[] = [];
  let dbError: string | null = null;
  if (isDbConfigured()) {
    try {
      users = await listUsers();
    } catch (e) {
      dbError = (e as Error).message;
    }
  } else {
    dbError = "Database is not configured.";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
        <AdminNav />
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Users</h1>
        {dbError ? <p style={{ color: "#ff9fc0" }}>{dbError}</p> : <AdminUsers users={users} currentUserId={me.id} isAdmin={me.role === "admin"} />}
      </div>
    </div>
  );
}
