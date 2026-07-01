"use client";

import { useState } from "react";

export default function InquiryTool() {
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/inquiry?merTransId=" + encodeURIComponent(id.trim()));
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setResult((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: "#181b22", border: "1px solid #262b36", borderRadius: 12, padding: 16, marginTop: 22 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Gateway inquiry</div>
      <div style={{ color: "#7c8595", fontSize: 12, marginBottom: 10 }}>
        Look up a transaction on Aleta by merOrderId / merCaptureId / merRefundId.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="GAC…"
          style={{ flex: 1, minWidth: 200, padding: "9px 11px", borderRadius: 9, border: "1px solid #2d333f", background: "#0f1115", color: "#e8eaed", fontSize: 13, outline: "none" }}
        />
        <button
          onClick={run}
          disabled={busy || !id.trim()}
          style={{ padding: "9px 16px", borderRadius: 9, border: 0, background: "#2d333f", color: "#e2e6ec", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          {busy ? "Checking…" : "Inquire"}
        </button>
      </div>
      {result && (
        <pre style={{ marginTop: 12, background: "#0f1115", border: "1px solid #20242d", borderRadius: 8, padding: 12, fontSize: 12, color: "#d7dde6", overflowX: "auto", maxHeight: 260 }}>
          {result}
        </pre>
      )}
    </div>
  );
}
