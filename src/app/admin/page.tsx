import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listCards } from "@/lib/giftcards";
import AdminCards, { type CardView } from "@/components/AdminCards";
import AdminNav from "@/components/AdminNav";

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
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }

  if (!isDbConfigured()) {
    return (
      <Shell>
        <p style={{ color: "#ff9fc0" }}>
          Database is not configured. Set <code>DATABASE_URL</code> to view purchased codes.
        </p>
      </Shell>
    );
  }

  const rows = await listCards();
  const cards: CardView[] = rows.map((c) => ({
    id: c.id,
    code: c.code,
    createdAt: c.createdAt.toISOString(),
    status: c.status,
    recipientName: c.recipientName ?? null,
    recipientEmail: c.recipientEmail ?? null,
    senderName: c.senderName ?? null,
    buyerEmail: c.buyerEmail ?? null,
    amountMinor: c.amountMinor,
    currency: c.currency,
    redeemedAt: c.redeemedAt ? c.redeemedAt.toISOString() : null,
    merOrderId: c.merOrderId,
  }));

  const counts = rows.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const stats: { label: string; value: number; color: string }[] = [
    { label: "Total", value: rows.length, color: "#e8eaed" },
    { label: "Active", value: counts.active ?? 0, color: "#7ee2a0" },
    { label: "Redeemed", value: counts.redeemed ?? 0, color: "#8fc1ff" },
    { label: "Inactive", value: counts.pending ?? 0, color: "#f4d58d" },
    { label: "Revoked", value: counts.revoked ?? 0, color: "#ff9fc0" },
    { label: "Refunded", value: counts.refunded ?? 0, color: "#c9aef4" },
  ];

  return (
    <Shell>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Purchased codes</h1>
      <p style={{ color: "#7c8595", fontSize: 13, margin: "0 0 18px" }}>All gift cards, newest first.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 22 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "#181b22", border: "1px solid #262b36", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#7c8595", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <AdminCards cards={cards} />
    </Shell>
  );
}

function Shell({ children, nav = true }: { children: React.ReactNode; nav?: boolean }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
        {nav && <AdminNav />}
        {children}
      </div>
    </div>
  );
}
