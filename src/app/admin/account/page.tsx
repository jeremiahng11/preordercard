import { redirect } from "next/navigation";
import { getCurrentUser, isAdminConfigured } from "@/lib/admin-auth";
import AdminAccount from "@/components/AdminAccount";
import AdminNav from "@/components/AdminNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  if (!isAdminConfigured()) redirect("/admin");
  const me = await getCurrentUser();
  if (!me) redirect("/admin/login");

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
        <AdminNav />
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Account</h1>
        <AdminAccount username={me.username} />
      </div>
    </div>
  );
}
