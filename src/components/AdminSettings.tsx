"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSettings({ card, paynow }: { card: boolean; paynow: boolean }) {
  const router = useRouter();
  const [c, setC] = useState(card);
  const [p, setP] = useState(paynow);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardEnabled: c, paynowEnabled: p }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg("Saved");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    border: "1px solid #262b36",
    borderRadius: 12,
    background: "#181b22",
    marginBottom: 12,
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <p style={{ color: "#9aa3b2", fontSize: 13, marginBottom: 16 }}>
        Choose which payment methods customers can use at checkout. At least one must stay on.
      </p>

      <div style={row}>
        <div>
          <div style={{ fontWeight: 700 }}>💳 Credit / Debit card</div>
          <div style={{ color: "#7c8595", fontSize: 12 }}>Visa / Mastercard via Aleta Planet</div>
        </div>
        <Toggle on={c} onClick={() => setC((v) => !v)} />
      </div>

      <div style={row}>
        <div>
          <div style={{ fontWeight: 700 }}>🇸🇬 PayNow</div>
          <div style={{ color: "#7c8595", fontSize: 12 }}>Scan &amp; pay with any SG bank app</div>
        </div>
        <Toggle on={p} onClick={() => setP((v) => !v)} />
      </div>

      {error && <p style={{ color: "#ff9fc0", fontSize: 13 }}>{error}</p>}
      {msg && <p style={{ color: "#7ee2a0", fontSize: 13 }}>{msg}</p>}

      <button
        onClick={save}
        disabled={busy || (!c && !p)}
        style={{
          marginTop: 8,
          padding: "11px 18px",
          borderRadius: 10,
          border: 0,
          background: "linear-gradient(135deg,#6b39e8,#9b5cf0)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          opacity: busy || (!c && !p) ? 0.6 : 1,
        }}
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
      {!c && !p && <p style={{ color: "#f4d58d", fontSize: 12, marginTop: 8 }}>Keep at least one method enabled.</p>}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 52,
        height: 30,
        borderRadius: 99,
        border: 0,
        cursor: "pointer",
        background: on ? "linear-gradient(135deg,#34D17F,#13A05B)" : "#3a3f4b",
        position: "relative",
        transition: "background .15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 25 : 3,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .15s",
        }}
      />
    </button>
  );
}
