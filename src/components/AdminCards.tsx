"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type CardView = {
  id: string;
  code: string;
  createdAt: string;
  status: string;
  recipientName: string | null;
  recipientEmail: string | null;
  senderName: string | null;
  buyerEmail: string | null;
  amountMinor: number;
  currency: string;
  redeemedAt: string | null;
  merOrderId: string;
};

const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "Inactive", bg: "#3a3320", fg: "#f4d58d" },
  active: { label: "Active", bg: "#16361f", fg: "#7ee2a0" },
  redeemed: { label: "Redeemed", bg: "#1c2c44", fg: "#8fc1ff" },
  revoked: { label: "Revoked", bg: "#3a2330", fg: "#ff9fc0" },
  refunded: { label: "Refunded", bg: "#332842", fg: "#c9aef4" },
  expired: { label: "Expired", bg: "#2a2e36", fg: "#aab2c0" },
  cancelled: { label: "Cancelled", bg: "#2a2e36", fg: "#aab2c0" },
};

function money(minor: number, currency: string) {
  return `${currency} ${(minor / 100).toFixed(2)}`;
}

function when(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminCards({ cards }: { cards: CardView[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function act(id: string, action: "revoke" | "refund" | "resend") {
    if (action === "refund" && !confirm("Refund this purchase via Aleta? This cannot be undone.")) return;
    if (action === "revoke" && !confirm("Revoke this code? It will no longer be redeemable.")) return;
    setBusyId(id);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || `${action} failed`);
      if (action === "resend") setNote("Email sent.");
      else router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const cell: React.CSSProperties = { padding: "12px 14px", borderBottom: "1px solid #20242d", verticalAlign: "top" };
  const th: React.CSSProperties = {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#7c8595",
    borderBottom: "1px solid #262b36",
  };

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
      {cards.length === 0 ? (
        <p style={{ color: "#7c8595", fontSize: 14 }}>No gift cards yet.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #20242d", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#e2e6ec" }}>
            <thead>
              <tr>
                <th style={th}>Code</th>
                <th style={th}>Purchased</th>
                <th style={th}>Recipient</th>
                <th style={th}>From (sender)</th>
                <th style={th}>Amount</th>
                <th style={th}>Status</th>
                <th style={th}>Redeemed</th>
                <th style={{ ...th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => {
                const s = STATUS_STYLE[c.status] ?? { label: c.status, bg: "#2a2e36", fg: "#aab2c0" };
                const canRevoke = c.status === "pending" || c.status === "active";
                const canRefund = c.status === "active" || c.status === "redeemed";
                const busy = busyId === c.id;
                return (
                  <tr key={c.id}>
                    <td style={{ ...cell, fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>{c.code}</td>
                    <td style={{ ...cell, whiteSpace: "nowrap", color: "#aeb6c2" }}>{when(c.createdAt)}</td>
                    <td style={cell}>
                      <div>{c.recipientName || "—"}</div>
                      <div style={{ color: "#7c8595", fontSize: 11 }}>{c.recipientEmail || ""}</div>
                    </td>
                    <td style={cell}>
                      <div>{c.senderName || "—"}</div>
                      <div style={{ color: "#7c8595", fontSize: 11 }}>{c.buyerEmail || ""}</div>
                    </td>
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>{money(c.amountMinor, c.currency)}</td>
                    <td style={cell}>
                      <span
                        style={{
                          background: s.bg,
                          color: s.fg,
                          padding: "3px 9px",
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td style={{ ...cell, whiteSpace: "nowrap", color: "#aeb6c2" }}>{when(c.redeemedAt)}</td>
                    <td style={{ ...cell, textAlign: "right", whiteSpace: "nowrap" }}>
                      {canRevoke && (
                        <button onClick={() => act(c.id, "revoke")} disabled={busy} style={btn("#2d333f")}>
                          Revoke
                        </button>
                      )}
                      {canRefund && (
                        <button onClick={() => act(c.id, "resend")} disabled={busy} style={btn("#2d333f")}>
                          Resend
                        </button>
                      )}
                      {canRefund && (
                        <button onClick={() => act(c.id, "refund")} disabled={busy} style={btn("#4a2740", "#ffb0cd")}>
                          Refund
                        </button>
                      )}
                      {!canRevoke && !canRefund && <span style={{ color: "#5b6473" }}>—</span>}
                    </td>
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

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }
  return (
    <button onClick={logout} style={{ ...btn("#2d333f"), marginLeft: 0 }}>
      Sign out
    </button>
  );
}

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
