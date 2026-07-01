import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listCards } from "@/lib/giftcards";
import AdminCards, { LogoutButton, type CardView } from "@/components/AdminCards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  if (!isAdminConfigured()) {
    return (
      <Shell>
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
      <Shell showNav>
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

  return (
    <Shell showNav>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 18, color: "#aeb6c2", fontSize: 13 }}>
        <span>Total: <b style={{ color: "#e8eaed" }}>{rows.length}</b></span>
        <span>Active: <b style={{ color: "#7ee2a0" }}>{counts.active ?? 0}</b></span>
        <span>Redeemed: <b style={{ color: "#8fc1ff" }}>{counts.redeemed ?? 0}</b></span>
        <span>Inactive: <b style={{ color: "#f4d58d" }}>{counts.pending ?? 0}</b></span>
        <span>Revoked: <b style={{ color: "#ff9fc0" }}>{counts.revoked ?? 0}</b></span>
        <span>Refunded: <b style={{ color: "#c9aef4" }}>{counts.refunded ?? 0}</b></span>
      </div>
      <AdminCards cards={cards} />
    </Shell>
  );
}

function Shell({ children, showNav }: { children: React.ReactNode; showNav?: boolean }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Gift Card Admin</h1>
          {showNav && (
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Link href="/admin/collections" style={{ color: "#9b8cf0", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
                Collections
              </Link>
              <Link href="/admin/products" style={{ color: "#9b8cf0", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
                Products
              </Link>
              <Link href="/admin/settings" style={{ color: "#9b8cf0", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
                Settings
              </Link>
              <Link href="/admin/api-docs" style={{ color: "#9b8cf0", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
                API docs
              </Link>
              <LogoutButton />
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
