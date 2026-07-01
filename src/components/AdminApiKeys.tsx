"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type KeyView = { environment: string; key: string };

export default function AdminApiKeys({ keys, baseUrl }: { keys: KeyView[]; baseUrl: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function regen(environment: string) {
    if (!confirm(`Regenerate the ${environment} key? The old one stops working immediately.`)) return;
    setBusy(environment);
    setError(null);
    try {
      const res = await fetch("/api/admin/api-keys/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not regenerate");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function copy(k: string) {
    navigator.clipboard?.writeText(k).catch(() => {});
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  }

  if (keys.length === 0) {
    return (
      <p style={{ color: "#9aa3b2", fontSize: 14 }}>
        API keys are issued to <b>developer</b> accounts. Ask an admin to create a developer account for you.
      </p>
    );
  }

  const order = ["sandbox", "production"];
  const sorted = [...keys].sort((a, b) => order.indexOf(a.environment) - order.indexOf(b.environment));

  return (
    <div style={{ maxWidth: 760 }}>
      <p style={{ color: "#9aa3b2", fontSize: 13, marginBottom: 16 }}>
        Use these keys in the <code>x-api-key</code> header. Start in <b>sandbox</b>, then switch to <b>production</b> when ready.
        Base URL: <code style={codeInline}>{baseUrl}</code>
      </p>
      {error && <p style={{ color: "#ff9fc0", fontSize: 13, marginBottom: 10 }}>{error}</p>}
      {sorted.map((k) => {
        const sandbox = k.environment === "sandbox";
        return (
          <div key={k.environment} style={{ background: "#181b22", border: "1px solid #262b36", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: sandbox ? "#3a3320" : "#16361f",
                  color: sandbox ? "#f4d58d" : "#7ee2a0",
                }}
              >
                {k.environment}
              </span>
              <span style={{ color: "#7c8595", fontSize: 12 }}>{sandbox ? "for testing (sandbox data)" : "live redemptions"}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <code style={{ flex: 1, minWidth: 240, background: "#0f1115", border: "1px solid #20242d", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: "#d7dde6", overflowX: "auto", wordBreak: "break-all" }}>
                {k.key}
              </code>
              <button onClick={() => copy(k.key)} style={ghostBtn}>{copied === k.key ? "Copied" : "Copy"}</button>
              <button onClick={() => regen(k.environment)} disabled={busy === k.environment} style={ghostBtn}>
                {busy === k.environment ? "…" : "Regenerate"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const codeInline: React.CSSProperties = { background: "#1b1f27", border: "1px solid #262b36", borderRadius: 6, padding: "1px 6px", fontSize: 12 };
const ghostBtn: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid #2d333f",
  background: "#2d333f",
  color: "#e2e6ec",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};
