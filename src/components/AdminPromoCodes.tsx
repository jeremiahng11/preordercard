"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PromoCodeView = {
  id: string;
  name: string;
  code: string;
  discountPercent: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleDateString("en-SG", { dateStyle: "medium", timeZone: "Asia/Singapore" });
}

/** ISO timestamp → yyyy-mm-dd for a <input type="date">. */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

type EditState = { name: string; code: string; discountPercent: string; expiresAt: string; active: boolean };

export default function AdminPromoCodes({ promoCodes, canWrite = true }: { promoCodes: PromoCodeView[]; canWrite?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [expiresAt, setExpiresAt] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

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

  function startEdit(promo: PromoCodeView) {
    setRowError(null);
    setEditId(promo.id);
    setEdit({
      name: promo.name,
      code: promo.code,
      discountPercent: String(promo.discountPercent),
      expiresAt: toDateInput(promo.expiresAt),
      active: promo.active,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEdit(null);
    setRowError(null);
  }

  async function saveEdit(id: string) {
    if (!edit) return;
    setRowError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/promocodes/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: edit.name,
          code: edit.code,
          discountPercent: Number(edit.discountPercent),
          expiresAt: edit.expiresAt || null,
          active: edit.active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Unable to update promo code.");
      cancelEdit();
      router.refresh();
    } catch (err) {
      setRowError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(promo: PromoCodeView) {
    setRowError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/promocodes/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promo.id, active: !promo.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Unable to update promo code.");
      router.refresh();
    } catch (err) {
      setRowError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gap: 18 }}>
        {canWrite && (
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
        )}

        <section style={{ background: "#11151f", border: "1px solid #242d3e", borderRadius: 18, padding: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Existing promo codes</h2>
          {rowError && <div style={{ color: "#ff9fc0", fontSize: 13, marginBottom: 10 }}>{rowError}</div>}
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
                  {canWrite && <th style={{ ...th, textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((promo) => {
                  const editing = editId === promo.id && edit;
                  if (editing) {
                    return (
                      <tr key={promo.id}>
                        <td style={td}>
                          <input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} style={cellInput} />
                        </td>
                        <td style={td}>
                          <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={cellInput} />
                        </td>
                        <td style={td}>
                          <input type="number" min="1" max="100" value={edit.discountPercent} onChange={(e) => setEdit({ ...edit, discountPercent: e.target.value })} style={{ ...cellInput, width: 70 }} />
                        </td>
                        <td style={td}>
                          <input type="date" value={edit.expiresAt} onChange={(e) => setEdit({ ...edit, expiresAt: e.target.value })} style={cellInput} />
                        </td>
                        <td style={td}>
                          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
                            <span>{edit.active ? "Yes" : "No"}</span>
                          </label>
                        </td>
                        <td style={td}>{fmtDateTime(promo.createdAt)}</td>
                        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                          <button onClick={() => saveEdit(promo.id)} disabled={busy} style={btn("#16361f", "#7ee2a0")}>Save</button>
                          <button onClick={cancelEdit} disabled={busy} style={btn("#2d333f")}>Cancel</button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={promo.id}>
                      <td style={td}>{promo.code}</td>
                      <td style={td}>{promo.name}</td>
                      <td style={td}>{promo.discountPercent}%</td>
                      <td style={td}>{fmtDate(promo.expiresAt)}</td>
                      <td style={td}>{promo.active ? "Yes" : "No"}</td>
                      <td style={td}>{fmtDateTime(promo.createdAt)}</td>
                      {canWrite && (
                        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                          <button onClick={() => startEdit(promo)} disabled={busy} style={btn("#2d333f")}>Edit</button>
                          <button onClick={() => toggleActive(promo)} disabled={busy} style={btn(promo.active ? "#3a2330" : "#16361f", promo.active ? "#ffb0cd" : "#7ee2a0")}>
                            {promo.active ? "Disable" : "Enable"}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
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

const cellInput: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid #242d3e",
  background: "#0f141d",
  color: "#e8eaed",
  padding: "6px 8px",
  fontSize: 13,
  maxWidth: 160,
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
  verticalAlign: "middle",
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
