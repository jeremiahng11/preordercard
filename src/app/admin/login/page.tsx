"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Login failed");
      }
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1115",
        fontFamily: "system-ui, sans-serif",
        padding: 16,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#181b22",
          border: "1px solid #262b36",
          borderRadius: 14,
          padding: 28,
          color: "#e8eaed",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Gift Card Admin</h1>
        <p style={{ color: "#9aa3b2", fontSize: 13, marginTop: 6 }}>Sign in to manage purchased codes.</p>

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginTop: 20, marginBottom: 6 }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            padding: "11px 12px",
            borderRadius: 10,
            border: "1px solid #2d333f",
            background: "#0f1115",
            color: "#e8eaed",
            fontSize: 14,
            outline: "none",
          }}
        />

        {error && <p style={{ color: "#ff8095", fontSize: 13, marginTop: 12 }}>{error}</p>}

        <button
          type="submit"
          disabled={busy || !password}
          style={{
            width: "100%",
            marginTop: 18,
            padding: "12px 16px",
            borderRadius: 10,
            border: 0,
            fontWeight: 700,
            fontSize: 14,
            cursor: busy ? "default" : "pointer",
            color: "#fff",
            background: "linear-gradient(135deg,#6b39e8,#9b5cf0)",
            opacity: busy || !password ? 0.6 : 1,
          }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
