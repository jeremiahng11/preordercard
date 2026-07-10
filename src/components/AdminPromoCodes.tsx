"use client";

import { useState } from "react";

export type PromoCodeView = {
  id: string;
  name: string;
  code: string;
  discountPercent: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

export default function AdminPromoCodes({ promoCodes }: { promoCodes: PromoCodeView[] }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [expiresAt, setExpiresAt] = useState("");

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/promocodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code, discountPercent: Number(discountPercent), expiresAt: expiresAt || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Unable to create promo code.");
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gap: 18 }}>
        <section style={{ background: "#11151f", border: "1px solid #242d3e", borderRadius: 18, padding: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Create a promo code</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Promo name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={input} placeholder="Example: Preorder launch" />
            <label style={{ fontSize: 12, fontWeight: 700 }}>Promo code</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} style={input} placeholder="PREORDER24" />
            <label style={{ fontSize: 12, fontWeight: 700 }}>Discount %</label>
            <input value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} style={input} type="number" min="1" max="100" />
            <label style={{ fontSize: 12, fontWeight: 700 }}>Expires at</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={input} />
            {error && <div style={{ color: "#ff9fc0", fontSize: 13 }}>{error}</div>}
            <button type="button" onClick={submit} disabled={busy} style={button}>
              {busy ? "Saving…" : "Create promo code"}
            </button>
          </div>
        </section>

        <section style={{ background: "#11151f", border: "1px solid #242d3e", borderRadius: 18, padding: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Existing promo codes</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Code</th>
                  <th style={th}>Name</th>
                  <th style={th}>Discount</th>
                  <th style={th}>Expires</th>
                  <th style={th}>Active</th>
                  <th style={th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((promo) => (
                  <tr key={promo.id}>
                    <td style={td}>{promo.code}</td>
                    <td style={td}>{promo.name}</td>
                    <td style={td}>{promo.discountPercent}%</td>
                    <td style={td}>{promo.expiresAt ?? "Never"}</td>
                    <td style={td}>{promo.active ? "Yes" : "No"}</td>
                    <td style={td}>{promo.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #242d3e",
  background: "#0f141d",
  color: "#e8eaed",
  padding: "12px 14px",
  fontSize: 14,
};

const button: React.CSSProperties = {
  width: "100%",
  background: "#6b39e8",
  color: "#fff",
  borderRadius: 14,
  border: "0",
  padding: "14px 0",
  fontWeight: 700,
  cursor: "pointer",
};

const th: React.CSSProperties = {
  textAlign: "left",
  color: "#9aa3b2",
  padding: "10px 12px",
  borderBottom: "1px solid #242d3e",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #181c24",
};
