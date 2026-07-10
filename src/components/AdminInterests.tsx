"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type InterestView = {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  productName: string;
  productCode: string;
  priceMinor: number;
  currency: string;
  promoCode: string | null;
  promoDiscountPercent: number | null;
  status: string;
  lastEmailedAt: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  active: { label: "Active", bg: "#16361f", fg: "#7ee2a0" },
  revoked: { label: "Revoked", bg: "#3a2330", fg: "#ff9fc0" },
};

function formatCurrency(minor: number, currency: string) {
  const sym = currency === "SGD" ? "S$" : currency + " ";
  return sym + (minor / 100).toFixed(2);
}

function when(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" });
}

export default function AdminInterests({
  interests,
  canWrite = true,
  canDelete = false,
}: {
  interests: InterestView[];
  canWrite?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function act(id: string, action: "resend" | "revoke" | "delete") {
    if (action === "revoke" && !confirm("Revoke this registration? It will be flagged as cancelled.")) return;
    if (action === "delete" && !confirm("Permanently delete this registration? This cannot be undone.")) return;
    setBusyId(id);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/interests/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ? `${data.error} — ${data.detail}` : data.error || `${action} failed`);
      if (action === "resend") setNote(data.warning || "Confirmation email sent.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && (
        <div style={{ background: "#3a2330", color: "#ff9fc0", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}
      {note && (
        <div style={{ background: "#16361f", color: "#7ee2a0", padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {note}
        </div>
      )}
      {interests.length === 0 ? (
        <p style={{ color: "#7c8595", fontSize: 14 }}>No registrations yet.</p>
      ) : (
        <div style={{ overflowX: "auto", background: "#11151f", border: "1px solid #242d3e", borderRadius: 18 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Mobile</th>
                <th style={th}>Product</th>
                <th style={th}>Code</th>
                <th style={th}>Price</th>
                <th style={th}>Promo</th>
                <th style={th}>Status</th>
                <th style={th}>Registered</th>
                <th style={th}>Last emailed</th>
                {canWrite && <th style={{ ...th, textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {interests.map((item) => {
                const s = STATUS_STYLE[item.status] ?? { label: item.status, bg: "#2a2e36", fg: "#aab2c0" };
                const busy = busyId === item.id;
                return (
                  <tr key={item.id} style={row}>
                    <td style={td}>{item.fullName}</td>
                    <td style={td}>{item.email}</td>
                    <td style={td}>{item.mobile}</td>
                    <td style={td}>{item.productName}</td>
                    <td style={td}>{item.productCode}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{formatCurrency(item.priceMinor, item.currency)}</td>
                    <td style={td}>{item.promoCode ? `${item.promoCode} (${item.promoDiscountPercent ?? 0}%)` : "—"}</td>
                    <td style={td}>
                      <span style={{ background: s.bg, color: s.fg, padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap", color: "#aeb6c2" }}>{when(item.createdAt)}</td>
                    <td style={{ ...td, whiteSpace: "nowrap", color: "#aeb6c2" }}>{when(item.lastEmailedAt)}</td>
                    {canWrite && (
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button onClick={() => act(item.id, "resend")} disabled={busy} style={btn("#2d333f")}>
                          Resend
                        </button>
                        {item.status !== "revoked" && (
                          <button onClick={() => act(item.id, "revoke")} disabled={busy} style={btn("#3a2330", "#ffb0cd")}>
                            Revoke
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => act(item.id, "delete")} disabled={busy} style={btn("#4a2740", "#ffb0cd")}>
                            Delete
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "1px solid #242d3e",
  color: "#9aa3b2",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #181c24",
  verticalAlign: "top",
};

const row: React.CSSProperties = {
  background: "#0f1115",
};

function btn(bg: string, fg = "#e2e6ec"): React.CSSProperties {
  return {
    marginLeft: 8,
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #2d333f",
    background: bg,
    color: fg,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}
