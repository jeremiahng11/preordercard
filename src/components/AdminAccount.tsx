"use client";

import { useState } from "react";

export default function AdminAccount({ username }: { username: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (next !== confirm) {
      setError("New passwords don't match");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not change password");
      setCurrent("");
      setNext("");
      setConfirm("");
      setMsg("Password changed");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 460 }}>
      <div style={card}>
        <div style={{ fontSize: 13, color: "#9aa3b2", marginBottom: 14 }}>
          Signed in as <b style={{ color: "#e8eaed" }}>{username}</b>
        </div>
        <Label>Current password</Label>
        <input style={input} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <Label>New password</Label>
        <input style={input} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <Label>Confirm new password</Label>
        <input style={input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />

        {error && <p style={{ color: "#ff9fc0", fontSize: 13, marginTop: 10 }}>{error}</p>}
        {msg && <p style={{ color: "#7ee2a0", fontSize: 13, marginTop: 10 }}>{msg}</p>}

        <button onClick={save} disabled={busy || !current || next.length < 6 || !confirm} style={primaryBtn}>
          {busy ? "Saving…" : "Change password"}
        </button>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#181b22", border: "1px solid #262b36", borderRadius: 14, padding: 18 };
const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 9,
  border: "1px solid #2d333f",
  background: "#0f1115",
  color: "#e8eaed",
  fontSize: 14,
  outline: "none",
  marginBottom: 10,
};
function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9aa3b2", marginBottom: 4 }}>{children}</label>;
}
const primaryBtn: React.CSSProperties = {
  marginTop: 6,
  padding: "11px 18px",
  borderRadius: 10,
  border: 0,
  background: "linear-gradient(135deg,#6b39e8,#9b5cf0)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
