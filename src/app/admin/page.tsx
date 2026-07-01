import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdminConfigured } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { countByStatus, listCardsPaged, salesByProduct, salesSummary } from "@/lib/giftcards";
import AdminCards, { type CardView } from "@/components/AdminCards";
import AdminNav from "@/components/AdminNav";
import InquiryTool from "@/components/InquiryTool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "redeemed", label: "Redeemed" },
  { key: "pending", label: "Inactive" },
  { key: "revoked", label: "Revoked" },
  { key: "refunded", label: "Refunded" },
];

function money(minor: number, currency: string) {
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
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
  const canWrite = me.role !== "developer";

  if (!isDbConfigured()) {
    return (
      <Shell role={me.role}>
        <p style={{ color: "#ff9fc0" }}>
          Database is not configured. Set <code>DATABASE_URL</code> to view purchased codes.
        </p>
      </Shell>
    );
  }

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [{ rows, total }, counts, summary, byProduct] = await Promise.all([
    listCardsPaged({ q, status, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countByStatus(),
    salesSummary(),
    salesByProduct(),
  ]);

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

  const cur = summary.currency;
  const stats = [
    { label: "Collected", value: money(summary.collectedMinor, cur), color: "#7ee2a0" },
    { label: "Redeemed", value: money(summary.redeemedMinor, cur), color: "#8fc1ff" },
    { label: "Outstanding", value: money(summary.outstandingMinor, cur), color: "#f4d58d" },
    { label: "Refunded", value: money(summary.refundedMinor, cur), color: "#c9aef4" },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged = { q, status, page: String(page), ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all" && !(k === "page" && v === "1")) p.set(k, v);
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <Shell role={me.role}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Dashboard</h1>
      <p style={{ color: "#7c8595", fontSize: 13, margin: "0 0 18px" }}>Sales overview and purchased codes.</p>

      {/* Money summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
        {stats.map((s) => (
          <div key={s.label} style={cardBox}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#7c8595", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Best sellers */}
      {byProduct.length > 0 && (
        <div style={{ ...cardBox, marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: "#7c8595", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Sales by card
          </div>
          {byProduct.map((p) => (
            <div key={p.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span>{p.name} <span style={{ color: "#7c8595" }}>· {p.count} sold</span></span>
              <span style={{ fontWeight: 600 }}>{money(p.grossMinor, p.currency)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {STATUS_TABS.map((t) => {
          const active = status === t.key;
          const c = t.key === "pending" ? counts.pending : counts[t.key];
          const n = t.key === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : c ?? 0;
          return (
            <Link
              key={t.key}
              href={qs({ status: t.key, page: "1" })}
              style={{
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
                padding: "6px 11px",
                borderRadius: 99,
                color: active ? "#fff" : "#9aa3b2",
                background: active ? "#6b39e8" : "#181b22",
                border: "1px solid #262b36",
              }}
            >
              {t.label} ({n})
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form action="/admin" method="get" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search code, email, name, order id…"
          style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: "1px solid #2d333f", background: "#0f1115", color: "#e8eaed", fontSize: 13, outline: "none" }}
        />
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 9, border: 0, background: "#2d333f", color: "#e2e6ec", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          Search
        </button>
        {(q || status !== "all") && (
          <Link href="/admin" style={{ padding: "9px 14px", borderRadius: 9, background: "#181b22", border: "1px solid #262b36", color: "#9aa3b2", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center" }}>
            Clear
          </Link>
        )}
      </form>

      <AdminCards cards={cards} canWrite={canWrite} />

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 13, color: "#9aa3b2" }}>
        <span>{total} result{total === 1 ? "" : "s"} · page {page} of {totalPages}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <PageLink href={qs({ page: String(page - 1) })} disabled={page <= 1} label="← Prev" />
          <PageLink href={qs({ page: String(page + 1) })} disabled={page >= totalPages} label="Next →" />
        </div>
      </div>

      <InquiryTool />
    </Shell>
  );
}

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) return <span style={{ padding: "7px 12px", borderRadius: 8, color: "#4a5160", border: "1px solid #20242d" }}>{label}</span>;
  return (
    <Link href={href} style={{ padding: "7px 12px", borderRadius: 8, color: "#e2e6ec", border: "1px solid #2d333f", background: "#2d333f", textDecoration: "none" }}>
      {label}
    </Link>
  );
}

const cardBox: React.CSSProperties = { background: "#181b22", border: "1px solid #262b36", borderRadius: 12, padding: "14px 16px" };

function Shell({ children, nav = true, role = "user" }: { children: React.ReactNode; nav?: boolean; role?: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0f1115", color: "#e8eaed", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 56px" }}>
        {nav && <AdminNav role={role} />}
        {children}
      </div>
    </div>
  );
}
