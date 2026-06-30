"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CARD_IMG, ADV_LOGO } from "@/lib/assets";
import { AppStoreBadge, GooglePlayBadge } from "@/components/StoreBadges";

const DESIGNS: Record<string, { name: string; back: string }> = {
  pinkcloud: { name: "Pink Cloud", back: "linear-gradient(140deg,#BFE3FB,#E9D4F0 55%,#FBD3E4)" },
  rainbow: { name: "Rainbow Breeze", back: "linear-gradient(140deg,#CDE7FF,#F6E3C9 45%,#F8CFE6)" },
  seaside: { name: "Seaside Holiday", back: "linear-gradient(140deg,#BFE6FB,#A9CDF7 60%,#D9EFFB)" },
};

type StoredForm = {
  recipient: string;
  email: string;
  sender: string;
  buyerEmail: string;
  message: string;
  design: string;
};

type Confirm = {
  status: string;
  paid: boolean;
  code: string | null;
  design: string;
  image?: string | null;
  productName?: string | null;
  recipientName: string | null;
  amount?: number;
  currency?: string;
  appStore?: string;
  playStore?: string;
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
  borderRadius: 24,
  padding: "28px 24px",
  boxShadow: "0 30px 60px -32px rgba(120,80,140,.45)",
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
const codeBox: React.CSSProperties = { background: "linear-gradient(135deg,#2C2433,#43344E)", borderRadius: 16, padding: 18, marginTop: 16 };

function ResultInner() {
  const params = useSearchParams();
  const resultCode = params.get("resultCode");
  const merOrderId = params.get("merOrderId");

  const [form, setForm] = useState<StoredForm | null>(null);
  const [data, setData] = useState<Confirm | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let stored: StoredForm | null = null;
    try {
      if (merOrderId) {
        const raw = localStorage.getItem("gac:order:" + merOrderId);
        if (raw) {
          stored = (JSON.parse(raw) as { form: StoredForm }).form;
          setForm(stored);
        }
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;
    let attempts = 0;

    async function confirm() {
      if (!merOrderId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merOrderId,
            gift: stored
              ? {
                  recipient: stored.recipient,
                  recipientEmail: stored.email,
                  sender: stored.sender,
                  buyerEmail: stored.buyerEmail,
                  message: stored.message,
                  design: stored.design,
                }
              : undefined,
          }),
        });
        const d = (await res.json()) as Confirm;
        if (cancelled) return;
        setData(d);
        // Payment may still be settling — retry a few times while pending.
        if (!d.paid && d.status === "pending" && attempts < 4) {
          attempts += 1;
          setTimeout(confirm, 2500);
          return;
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false);
    }
    confirm();
    return () => {
      cancelled = true;
    };
  }, [merOrderId]);

  const design = data?.design ?? form?.design ?? "pinkcloud";
  const designMeta = DESIGNS[design] ?? DESIGNS.pinkcloud;
  const cardName = data?.productName ?? designMeta.name;
  const cardImage = data?.image ?? (CARD_IMG as Record<string, string>)[design] ?? (CARD_IMG as Record<string, string>).pinkcloud;
  const recipientName = data?.recipientName ?? form?.recipient ?? "";
  const code = data?.code ?? "";

  const copy = () => {
    if (!code) return;
    if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const success = data?.paid === true;
  const failed = !success && !loading && (resultCode === "FAIL" || resultCode === "CANCELLED" || data?.status === "failed");
  const pending = !success && !failed;

  return (
    <div style={wrap}>
      <div style={shell}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <img src={ADV_LOGO} alt="Aleta Adventure" style={{ height: 30 }} />
          <span style={{ color: "#6B39E8", fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 17 }}>Aleta Adventure</span>
        </div>

        <div style={panel}>
          {success && (
            <>
              <div
                style={{
                  width: 64,
                  height: 64,
                  margin: "0 auto 14px",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg,#34D17F,#13A05B)",
                  boxShadow: "0 12px 24px -10px rgba(19,160,91,.7)",
                  color: "#fff",
                  fontSize: 32,
                }}
              >
                ✓
              </div>
              <h1 style={h1}>Payment successful! 🎉</h1>
              <p style={{ ...lead, marginTop: 8 }}>
                We&apos;ve emailed <b style={{ color: "#2C2433" }}>{recipientName || "your friend"}</b> their{" "}
                {cardName} card.
              </p>
              <div style={{ margin: "18px auto 0", maxWidth: 300 }}>
                <img
                  src={cardImage}
                  alt={cardName}
                  style={{ width: "100%", borderRadius: 18, display: "block", boxShadow: "0 22px 44px -20px rgba(120,80,140,.6)" }}
                />
              </div>
              <div style={codeBox}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#C9B8F4", marginBottom: 7 }}>
                  Redemption code
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 22, letterSpacing: 3, color: "#fff" }}>
                  {code}
                </div>
                <button
                  onClick={copy}
                  style={{ marginTop: 10, border: 0, borderRadius: 10, padding: "6px 12px", fontWeight: 700, cursor: "pointer", color: "#fff", background: "rgba(255,255,255,.15)" }}
                >
                  {copied ? "✓ Copied" : "⧉ Copy code"}
                </button>
              </div>
              <p style={{ ...lead, fontSize: 13, marginTop: 14 }}>
                Download the Aleta Adventure app, then enter this code to activate the card.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <AppStoreBadge href={data?.appStore || "#"} />
                <GooglePlayBadge href={data?.playStore || "#"} />
              </div>
              {merOrderId && (
                <p style={{ ...lead, fontSize: 11, marginTop: 14, color: "#b9b1c4" }}>Order ref: {merOrderId}</p>
              )}
            </>
          )}

          {!success && pending && (
            <>
              <div style={{ fontSize: 40 }}>⏳</div>
              <h1 style={h1}>Payment processing…</h1>
              <p style={{ ...lead, marginTop: 6 }}>Confirming your payment — this only takes a moment.</p>
              {merOrderId && <p style={{ ...lead, fontSize: 11, marginTop: 10 }}>Order reference: {merOrderId}</p>}
            </>
          )}

          {!success && failed && (
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
