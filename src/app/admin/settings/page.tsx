import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { getPaymentMethods } from "@/lib/settings";
import AdminSettings from "@/components/AdminSettings";
import AdminNav from "@/components/AdminNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  if (!isAdminConfigured()) redirect("/admin");
  if (!(await isAdminAuthed())) redirect("/admin/login");

  let card = true;
  let paynow = true;
  let dbError: string | null = null;
  if (isDbConfigured()) {
    try {
      const pm = await getPaymentMethods();
      card = pm.card;
      paynow = pm.paynow;
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
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Settings</h1>
        {dbError ? <p style={{ color: "#ff9fc0" }}>{dbError}</p> : <AdminSettings card={card} paynow={paynow} />}
      </div>
    </div>
  );
}
