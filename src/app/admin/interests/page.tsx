import { redirect } from "next/navigation";
import { getCurrentUser, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listInterests } from "@/lib/customer-interest";
import AdminNav from "@/components/AdminNav";
import AdminInterests, { type InterestView } from "@/components/AdminInterests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminInterestsPage() {
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

  const interests = (await listInterests(500)).map((item) => ({
    id: item.id,
    fullName: item.fullName,
    email: item.email,
    mobile: item.mobile,
    productName: item.productName,
    productCode: item.productCode,
    priceMinor: item.priceMinor,
    currency: item.currency,
    promoCode: item.promoCode,
    promoDiscountPercent: item.promoDiscountPercent,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
        <AdminNav role={me.role} />
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Customer interests</h1>
        <AdminInterests interests={interests} />
      </div>
    </div>
  );
}
