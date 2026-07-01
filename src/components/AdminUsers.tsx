"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type UserView = { id: string; username: string; createdAt: string };

export default function AdminUsers({ users, currentUserId }: { users: UserView[]; currentUserId: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create user");
      setUsername("");
      setPassword("");
      setMsg("User created");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this user?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete user");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Add user</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Username</Label>
            <input style={input} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. wilson" />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Temporary password</Label>
            <input style={input} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 6 chars" />
          </div>
          <button onClick={create} disabled={busy || !username || password.length < 6} style={primaryBtn}>
            Create
          </button>
        </div>
        <p style={{ color: "#7c8595", fontSize: 12, marginTop: 8 }}>
          Share the temporary password with the user — they can change it under Account after logging in.
        </p>
        {error && <p style={{ color: "#ff9fc0", fontSize: 13, marginTop: 8 }}>{error}</p>}
        {msg && <p style={{ color: "#7ee2a0", fontSize: 13, marginTop: 8 }}>{msg}</p>}
      </div>

      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Users ({users.length})</div>
        {users.map((u) => (
          <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid #20242d" }}>
            <div>
              <span style={{ fontWeight: 600 }}>{u.username}</span>
              {u.id === currentUserId && <span style={{ color: "#7ee2a0", fontSize: 11, marginLeft: 8 }}>you</span>}
              <div style={{ color: "#5b6473", fontSize: 11 }}>added {new Date(u.createdAt).toLocaleDateString("en-SG", { dateStyle: "medium" })}</div>
            </div>
            {u.id !== currentUserId && (
              <button onClick={() => remove(u.id)} disabled={busy} style={dangerBtn}>
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#181b22", border: "1px solid #262b36", borderRadius: 14, padding: 18 };
const input: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 9,
  border: "1px solid #2d333f",
  background: "#0f1115",
  color: "#e8eaed",
  fontSize: 14,
  outline: "none",
};
function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9aa3b2", marginBottom: 4 }}>{children}</label>;
}
const primaryBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 9,
  border: 0,
  background: "linear-gradient(135deg,#6b39e8,#9b5cf0)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  height: 38,
};
const dangerBtn: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 8,
  border: "1px solid #4a2740",
  background: "#4a2740",
  color: "#ffb0cd",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};
