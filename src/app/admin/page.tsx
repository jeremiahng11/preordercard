import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listInterests } from "@/lib/customer-interest";
import AdminNav from "@/components/AdminNav";
import AdminInterests from "@/components/AdminInterests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  if (!isAdminConfigured()) {
    return (
      <Shell nav={false}>
        <p style={{ color: "#ff9fc0" }}>
          Admin is not configured. Set <code>ADMIN_PASSWORD</code> to enable the admin area.
        </p>
      </Shell>
    );
  }

  const me = await getCurrentUser();
  if (!me) redirect("/admin/login");

  if (!isDbConfigured()) {
    return (
      <Shell role={me.role}>
        <p style={{ color: "#ff9fc0" }}>
          Database is not configured. Set <code>DATABASE_URL</code> to view customer interests.
        </p>
      </Shell>
    );
  }

  const interests = await listInterests(200);
  const total = interests.length;
  const promoApplied = interests.filter((item) => item.promoCode).length;
  const productCounts = interests.reduce<Record<string, number>>((acc, item) => {
    acc[item.productName] = (acc[item.productName] ?? 0) + 1;
    return acc;
  }, {});
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const recentInterests = interests.slice(0, 20).map((item) => ({
    ...item,
    createdAt: new Date(item.createdAt).toLocaleString(),
  }));

  const stats = [
    { label: "Interest registrations", value: String(total), color: "#7ee2a0" },
    { label: "Promo codes used", value: String(promoApplied), color: "#8fc1ff" },
    { label: "No promo", value: String(total - promoApplied), color: "#f4d58d" },
  ];

  return (
    <Shell role={me.role}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Dashboard</h1>
      <p style={{ color: "#7c8595", fontSize: 13, margin: "0 0 18px" }}>
        Customer interest summary and the latest preorder registrations.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
        {stats.map((s) => (
          <div key={s.label} style={cardBox}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#7c8595", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {topProducts.length > 0 && (
        <div style={{ ...cardBox, marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: "#7c8595", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Top requested products
          </div>
          {topProducts.map(([name, count]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span>{name}</span>
              <span style={{ fontWeight: 600 }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...cardBox, marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: "#7c8595", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
          Latest registrations
        </div>
        <AdminInterests interests={recentInterests} />
        {total > recentInterests.length && (
          <p style={{ marginTop: 14, color: "#9aa3b2", fontSize: 13 }}>
            Showing the latest {recentInterests.length} of {total} interest records.
          </p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, nav = true, role = "user" }: { children: ReactNode; nav?: boolean; role?: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
        {nav && <AdminNav role={role} />}
        {children}
      </div>
    </div>
  );
}

const cardBox: React.CSSProperties = { background: "#181b22", border: "1px solid #262b36", borderRadius: 12, padding: "14px 16px" };
