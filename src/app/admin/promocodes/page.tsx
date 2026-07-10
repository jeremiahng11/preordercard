import { redirect } from "next/navigation";
import { getCurrentUser, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listPromoCodes } from "@/lib/promocodes";
import AdminNav from "@/components/AdminNav";
import AdminPromoCodes, { type PromoCodeView } from "@/components/AdminPromoCodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPromoCodesPage() {
  if (!isAdminConfigured()) redirect("/admin");
  const me = await getCurrentUser();
  if (!me) redirect("/admin/login");

  if (!isDbConfigured()) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
          <AdminNav role={me.role} />
          <p style={{ color: "#ff9fc0" }}>Database is not configured.</p>
        </div>
      </div>
    );
  }

  const promos = (await listPromoCodes()).map((promo) => ({
    id: promo.id,
    name: promo.name,
    code: promo.code,
    discountPercent: promo.discountPercent,
    expiresAt: promo.expiresAt ? promo.expiresAt.toISOString() : null,
    active: promo.active,
    createdAt: promo.createdAt.toISOString(),
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
        <AdminNav role={me.role} />
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Promo codes</h1>
        <AdminPromoCodes promoCodes={promos} canWrite={me.role !== "developer"} />
      </div>
    </div>
  );
}
