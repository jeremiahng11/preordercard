import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { getPaymentMethods } from "@/lib/settings";
import AdminSettings from "@/components/AdminSettings";

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Settings</h1>
          <div style={{ display: "flex", gap: 14 }}>
            <Link href="/admin/collections" style={{ color: "#9b8cf0", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Collections</Link>
            <Link href="/admin/products" style={{ color: "#9b8cf0", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Products</Link>
            <Link href="/admin" style={{ color: "#9b8cf0", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Codes</Link>
          </div>
        </div>
        {dbError ? <p style={{ color: "#ff9fc0" }}>{dbError}</p> : <AdminSettings card={card} paynow={paynow} />}
      </div>
    </div>
  );
}
