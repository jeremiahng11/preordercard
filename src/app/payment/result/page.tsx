"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CARD_IMG, ADV_LOGO } from "@/lib/assets";

const DESIGNS: Record<string, { name: string; back: string }> = {
  pinkcloud: { name: "Pink Cloud", back: "linear-gradient(140deg,#BFE3FB,#E9D4F0 55%,#FBD3E4)" },
  rainbow: { name: "Rainbow Breeze", back: "linear-gradient(140deg,#CDE7FF,#F6E3C9 45%,#F8CFE6)" },
  seaside: { name: "Seaside Holiday", back: "linear-gradient(140deg,#BFE6FB,#A9CDF7 60%,#D9EFFB)" },
};

type StoredOrder = {
  form: {
    recipient: string;
    email: string;
    sender: string;
    buyerEmail: string;
    message: string;
    design: string;
  };
  code: string;
};

const wrap: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
  color: "#2C2433",
  minHeight: "100vh",
  background:
    "radial-gradient(120% 90% at 0% 0%, #FDEFF5 0%, transparent 45%),radial-gradient(120% 90% at 100% 0%, #EAF2FE 0%, transparent 45%),#FBF5F8",
  display: "flex",
  justifyContent: "center",
  padding: "28px 16px 56px",
};
const shell: React.CSSProperties = { width: "100%", maxWidth: 480 };
const panel: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #EFE3EC",
  borderRadius: 20,
  padding: 22,
  boxShadow: "0 14px 34px -24px rgba(44,36,51,.5)",
  textAlign: "center",
};
const h1: React.CSSProperties = {
  fontFamily: "'Baloo 2',sans-serif",
  fontWeight: 800,
  fontSize: 24,
  lineHeight: 1.12,
  letterSpacing: "-.4px",
};
const lead: React.CSSProperties = { color: "#9087A0", fontSize: 14, lineHeight: 1.5, fontWeight: 500 };
const btnPrimary: React.CSSProperties = {
  display: "block",
  width: "100%",
  border: 0,
  borderRadius: 14,
  padding: "14px 18px",
  marginTop: 16,
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(135deg,#E84E7E,#C6356A)",
  textDecoration: "none",
};
const codeBox: React.CSSProperties = {
  background: "linear-gradient(135deg,#2C2433,#43344E)",
  borderRadius: 16,
  padding: 18,
  marginTop: 16,
};

function isSuccess(code: string | null) {
  return code === "SUCCESS";
}
function isPending(code: string | null) {
  return code === "RECEIVE" || code === "PAYING" || code === null;
}

function randomCode() {
  const ch = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const blk = () => Array.from({ length: 4 }, () => ch[Math.floor(Math.random() * ch.length)]).join("");
  return "CNR-" + blk() + "-" + blk();
}

function ResultInner() {
  const params = useSearchParams();
  const resultCode = params.get("resultCode");
  const merOrderId = params.get("merOrderId");

  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [copied, setCopied] = useState(false);
  const fallbackCode = useMemo(randomCode, []);

  useEffect(() => {
    if (!merOrderId) return;
    try {
      const raw = localStorage.getItem("gac:order:" + merOrderId);
      if (raw) setOrder(JSON.parse(raw) as StoredOrder);
    } catch {
      /* ignore */
    }
  }, [merOrderId]);

  const design = order?.form.design ?? "pinkcloud";
  const designMeta = DESIGNS[design] ?? DESIGNS.pinkcloud;
  const code = order?.code ?? fallbackCode;

  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const success = isSuccess(resultCode);
  const pending = isPending(resultCode);

  return (
    <div style={wrap}>
      <div style={shell}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <img src={ADV_LOGO} alt="Aleta Adventure" style={{ height: 30 }} />
          <span style={{ color: "#6B39E8", fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 17 }}>
            Aleta Adventure
          </span>
        </div>

        <div style={panel}>
          {success && (
            <>
              <div style={{ fontSize: 40 }}>🎉</div>
              <h1 style={h1}>Payment successful!</h1>
              <p style={{ ...lead, marginTop: 6 }}>
                {order ? (
                  <>
                    We&apos;ve emailed <b style={{ color: "#2C2433" }}>{order.form.recipient || "your friend"}</b> their
                    Cinnamoroll {designMeta.name} card.
                  </>
                ) : (
                  <>Your Cinnamoroll {designMeta.name} card is on its way.</>
                )}
              </p>
              <div style={{ margin: "16px auto 0", maxWidth: 280 }}>
                <img
                  src={(CARD_IMG as Record<string, string>)[design]}
                  alt={designMeta.name}
                  style={{ width: "100%", borderRadius: 16, display: "block" }}
                />
              </div>
              <div style={codeBox}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#C9B8F4",
                    marginBottom: 7,
                  }}
                >
                  Redemption code
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontWeight: 700,
                    fontSize: 22,
                    letterSpacing: 3,
                    color: "#fff",
                  }}
                >
                  {code}
                </div>
                <button
                  onClick={copy}
                  style={{
                    marginTop: 10,
                    border: 0,
                    borderRadius: 10,
                    padding: "6px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    color: "#fff",
                    background: "rgba(255,255,255,.15)",
                  }}
                >
                  {copied ? "✓ Copied" : "⧉ Copy code"}
                </button>
              </div>
              {merOrderId && (
                <p style={{ ...lead, fontSize: 11, marginTop: 10 }}>Order reference: {merOrderId}</p>
              )}
            </>
          )}

          {!success && pending && (
            <>
              <div style={{ fontSize: 40 }}>⏳</div>
              <h1 style={h1}>Payment processing…</h1>
              <p style={{ ...lead, marginTop: 6 }}>
                Your payment is being confirmed. You&apos;ll receive an email once it&apos;s complete.
              </p>
              {merOrderId && (
                <p style={{ ...lead, fontSize: 11, marginTop: 10 }}>Order reference: {merOrderId}</p>
              )}
            </>
          )}

          {!success && !pending && (
            <>
              <div style={{ fontSize: 40 }}>😿</div>
              <h1 style={h1}>{resultCode === "CANCELLED" ? "Payment cancelled" : "Payment unsuccessful"}</h1>
              <p style={{ ...lead, marginTop: 6 }}>
                {resultCode === "CANCELLED"
                  ? "You cancelled the payment. No charge was made."
                  : "We couldn't complete your payment. No charge was made — please try again."}
              </p>
            </>
          )}

          <a href="/" style={btnPrimary}>
            {success ? "Send another gift" : "Back to start"}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div style={wrap} />}>
      <ResultInner />
    </Suspense>
  );
}
