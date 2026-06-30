"use client";

import { useState, useMemo, useEffect, type ChangeEvent } from "react";
import { ADV_LOGO } from "@/lib/assets";

export type StoreProduct = {
  id: string; // product slug
  name: string;
  img: string; // data URL of front art
  back: string; // CSS gradient for the back face
  priceMinor: number;
  currency: string;
  status: string; // active | soldout | delisted
  comingSoon: boolean;
  comingSoonDate: string | null;
};

/** Format a coming-soon date for display (YYYY-MM-DD → "1 Aug 2026"), else raw. */
function fmtComingSoon(d: string | null | undefined): string {
  if (!d) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

export type StoreCollection = {
  id: string; // collection slug
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  cards: StoreProduct[];
};

function fmtPrice(minor: number, currency: string): string {
  const sym = currency === "SGD" ? "S$" : currency + " ";
  return sym + (minor / 100).toFixed(2);
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');

.sg-root *{box-sizing:border-box;margin:0;padding:0;}
.sg-root{
  --bg:#FBF5F8; --surface:#FFFFFF; --ink:#2C2433; --muted:#9087A0; --soft:#F3EAF1;
  --line:#EFE3EC; --rose:#E84E7E; --rose-deep:#C6356A; --sky:#7FB6F0; --lilac:#B79BF0;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif; color:var(--ink);
  background:
    radial-gradient(120% 90% at 0% 0%, #FDEFF5 0%, transparent 45%),
    radial-gradient(120% 90% at 100% 0%, #EAF2FE 0%, transparent 45%),
    var(--bg);
  min-height:100vh; padding:28px 16px 56px; display:flex; justify-content:center;
}
.sg-shell{width:100%; max-width:480px;}
.sg-display{font-family:'Baloo 2',sans-serif;}
.sg-mono{font-family:'JetBrains Mono',monospace;}

.sg-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.sg-brand{display:flex;align-items:center;gap:8px;font-family:'Baloo 2';font-weight:800;font-size:18px;letter-spacing:-.3px;}
.sg-dot{width:22px;height:22px;border-radius:8px;background:linear-gradient(135deg,var(--rose),var(--lilac));display:grid;place-items:center;color:#fff;font-size:13px;}
.sg-secure{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:5px;font-weight:600;}

.sg-steps{display:flex;align-items:center;gap:6px;margin-bottom:20px;}
.sg-step{flex:1;height:4px;border-radius:99px;background:var(--soft);transition:.4s;}
.sg-step.on{background:linear-gradient(90deg,var(--rose),var(--lilac));}
.sg-steplabel{font-size:11px;font-weight:700;color:var(--muted);letter-spacing:.4px;text-transform:uppercase;margin-bottom:8px;}

/* ---- flip card ---- */
.sg-floatwrap{perspective:1300px;}
.sg-floatwrap.float{animation:sgfloat 6s ease-in-out infinite;}
@keyframes sgfloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-9px);}}
.sg-flip{position:relative;width:100%;aspect-ratio:1.586/1;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.2,.85,.25,1);cursor:pointer;}
.sg-flip.flipped{transform:rotateY(180deg);}
.sg-face{position:absolute;inset:0;border-radius:22px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 22px 50px -18px rgba(120,80,140,.5);}
.sg-face img{width:100%;height:100%;object-fit:cover;display:block;}
.sg-face-back{transform:rotateY(180deg);}
.sg-shine{position:absolute;inset:0;background:linear-gradient(115deg,transparent 32%,rgba(255,255,255,.5) 48%,transparent 60%);transform:translateX(-120%);animation:sgshine 5.5s ease-in-out infinite;mix-blend-mode:screen;pointer-events:none;}
@keyframes sgshine{0%,60%{transform:translateX(-120%);}85%,100%{transform:translateX(120%);}}
.sg-fliphint{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.82);backdrop-filter:blur(3px);color:#3a2a3c;font-size:10px;font-weight:800;letter-spacing:.4px;padding:5px 9px;border-radius:99px;display:flex;gap:5px;align-items:center;pointer-events:none;}

/* back face content */
.sg-back-pad{position:absolute;inset:0;padding:18px 20px;display:flex;flex-direction:column;justify-content:space-between;color:#3a2a3c;}
.sg-back-top{display:flex;justify-content:space-between;align-items:flex-start;}
.sg-issuer{font-family:'Baloo 2';font-weight:800;font-size:16px;}
.sg-le{font-size:9px;font-weight:800;letter-spacing:1.1px;background:rgba(255,255,255,.72);padding:4px 9px;border-radius:99px;text-transform:uppercase;}
.sg-stripe{height:34px;background:#2c2433;opacity:.82;border-radius:3px;margin:0 -20px;}
.sg-back-num{font-family:'JetBrains Mono';font-weight:500;font-size:14px;letter-spacing:2px;opacity:.92;margin-top:10px;}
.sg-back-foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:6px;}
.sg-back-tiny{font-size:8px;opacity:.7;letter-spacing:1px;text-transform:uppercase;}
.sg-back-name{font-family:'Baloo 2';font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.6px;}
.sg-visa{font-style:italic;font-weight:800;font-size:17px;letter-spacing:-.5px;color:#1A1F71;}
.sg-visa small{font-style:normal;font-weight:600;font-size:8px;letter-spacing:.5px;display:block;text-align:right;margin-top:-2px;color:#1A1F71;}

/* panels / type */
.sg-panel{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 14px 34px -24px rgba(44,36,51,.5);}
.sg-h1{font-family:'Baloo 2';font-weight:800;font-size:25px;line-height:1.12;letter-spacing:-.4px;}
.sg-eyebrow{font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--rose);margin-bottom:8px;}
.sg-lead{color:var(--muted);font-size:14px;line-height:1.5;font-weight:500;}
.sg-row{display:flex;justify-content:space-between;align-items:center;}
.sg-price{font-family:'Baloo 2';font-weight:800;font-size:22px;}
.sg-strike{font-size:13px;color:var(--muted);text-decoration:line-through;font-weight:600;}

.sg-feat{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--line);}
.sg-feat:last-child{border-bottom:0;}
.sg-fi{width:30px;height:30px;border-radius:10px;flex-shrink:0;display:grid;place-items:center;font-size:15px;}
.sg-ft{font-weight:700;font-size:13.5px;}
.sg-fd{font-size:12px;color:var(--muted);font-weight:500;line-height:1.4;margin-top:1px;}

.sg-btn{width:100%;border:0;cursor:pointer;border-radius:14px;padding:15px;font-family:'Plus Jakarta Sans';font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px;transition:.18s;}
.sg-btn-primary{background:linear-gradient(135deg,var(--rose),var(--rose-deep));color:#fff;box-shadow:0 12px 24px -10px rgba(200,53,106,.7);}
.sg-btn-primary:hover{transform:translateY(-1px);box-shadow:0 16px 28px -10px rgba(200,53,106,.8);}
.sg-btn-ghost{background:var(--soft);color:var(--ink);}
.sg-btn-ghost:hover{background:#ECDDE9;}
.sg-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}

.sg-label{font-size:12px;font-weight:700;color:var(--ink);margin:14px 0 6px;display:block;}
.sg-input,.sg-area{width:100%;border:1.5px solid var(--line);border-radius:12px;padding:12px 13px;font-family:'Plus Jakarta Sans';font-size:14px;font-weight:500;color:var(--ink);background:#FCFAFC;outline:none;transition:.15s;}
.sg-input:focus,.sg-area:focus{border-color:var(--rose);background:#fff;box-shadow:0 0 0 4px rgba(232,78,126,.1);}
.sg-area{resize:none;min-height:74px;line-height:1.45;}
.sg-hint{font-size:11px;color:var(--muted);margin-top:5px;font-weight:500;}

.sg-swatches{display:flex;gap:9px;margin-top:8px;}
.sg-sw{flex:1;cursor:pointer;border-radius:11px;overflow:hidden;border:2.5px solid transparent;transition:.15s;position:relative;}
.sg-sw img{width:100%;aspect-ratio:1.586/1;object-fit:cover;display:block;}
.sg-sw.sel{border-color:var(--rose);}
.sg-sw-name{font-size:9.5px;font-weight:700;text-align:center;padding:5px 2px;color:var(--ink);background:#fff;}
.sg-sw.sel .sg-sw-name{color:var(--rose);}
.sg-sw-tick{position:absolute;top:5px;right:5px;width:17px;height:17px;border-radius:99px;background:var(--rose);color:#fff;font-size:10px;display:grid;place-items:center;}
.sg-sw-soon{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);background:rgba(107,57,232,.92);color:#fff;font-size:11px;font-weight:800;letter-spacing:1.5px;text-align:center;padding:6px 0;text-transform:uppercase;}

.sg-pay{display:flex;align-items:center;gap:12px;border:1.5px solid var(--line);border-radius:14px;padding:14px;cursor:pointer;margin-bottom:10px;transition:.15s;}
.sg-pay.sel{border-color:var(--rose);background:#FFF5F9;}
.sg-radio{width:20px;height:20px;border-radius:99px;border:2px solid var(--line);flex-shrink:0;display:grid;place-items:center;}
.sg-pay.sel .sg-radio{border-color:var(--rose);}
.sg-pay.sel .sg-radio::after{content:'';width:10px;height:10px;border-radius:99px;background:var(--rose);}
.sg-pm-name{font-weight:700;font-size:14px;}
.sg-pm-sub{font-size:11.5px;color:var(--muted);font-weight:500;}

.sg-sumrow{display:flex;justify-content:space-between;font-size:13.5px;font-weight:600;padding:6px 0;}
.sg-sumrow.muted{color:var(--muted);font-weight:500;}
.sg-sumtotal{display:flex;justify-content:space-between;align-items:center;border-top:1.5px dashed var(--line);margin-top:8px;padding-top:12px;}

.sg-codebox{background:linear-gradient(135deg,#2C2433,#43344E);border-radius:16px;padding:18px;text-align:center;position:relative;overflow:hidden;}
.sg-code{font-family:'JetBrains Mono';font-weight:700;font-size:23px;letter-spacing:3px;color:#fff;}
.sg-codecap{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#C9B8F4;margin-bottom:7px;}
.sg-copy{margin-top:12px;background:rgba(255,255,255,.12);color:#fff;border:0;padding:9px 14px;border-radius:10px;font-family:'Plus Jakarta Sans';font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;gap:6px;align-items:center;transition:.15s;}
.sg-copy:hover{background:rgba(255,255,255,.22);}

.sg-success-ring{width:64px;height:64px;border-radius:99px;background:linear-gradient(135deg,#9FE3C3,#6FD9A8);display:grid;place-items:center;margin:0 auto 14px;color:#fff;font-size:30px;box-shadow:0 10px 24px -8px rgba(111,217,168,.7);animation:sgpop .5s cubic-bezier(.2,1.4,.4,1);}
@keyframes sgpop{from{transform:scale(0);}to{transform:scale(1);}}

.sg-mail{border:1px solid var(--line);border-radius:16px;overflow:hidden;}
.sg-mail-head{background:var(--soft);padding:12px 14px;font-size:12px;line-height:1.7;}
.sg-mail-body{padding:20px 18px;text-align:center;background:#fff;}

.sg-overlay{position:fixed;inset:0;background:rgba(44,36,51,.55);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;padding:14px;z-index:50;animation:sgfade .2s ease;}
@keyframes sgfade{from{opacity:0;}to{opacity:1;}}
.sg-sheet{background:var(--bg);border-radius:24px 24px 18px 18px;width:100%;max-width:480px;padding:18px;max-height:90vh;overflow:auto;animation:sgup .25s cubic-bezier(.2,.9,.3,1);}
@keyframes sgup{from{transform:translateY(40px);opacity:.6;}to{transform:translateY(0);opacity:1;}}
.sg-x{background:var(--soft);border:0;width:32px;height:32px;border-radius:99px;cursor:pointer;font-size:16px;color:var(--ink);}

.sg-fadein{animation:sgin .35s ease;}
@keyframes sgin{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
`;

function GiftCard({ product, recipient, float, interactive, thumb }: {
  product: StoreProduct;
  recipient?: string;
  float?: boolean;
  interactive?: boolean;
  thumb?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const name = (recipient || "").trim().toUpperCase() || "YOUR FRIEND";
  const soonDate = fmtComingSoon(product.comingSoonDate);

  const comingSoonBanner = product.comingSoon ? (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", zIndex: 3 }}>
      <div
        style={{
          width: "170%",
          transform: "rotate(-9deg)",
          background: "rgba(44,36,51,.84)",
          color: "#fff",
          textAlign: "center",
          padding: "9px 0",
          boxShadow: "0 10px 24px rgba(0,0,0,.35)",
          backdropFilter: "blur(1px)",
        }}
      >
        <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 19, letterSpacing: 2.5 }}>COMING SOON</div>
        {soonDate && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, opacity: 0.92, marginTop: 1 }}>{soonDate}</div>}
      </div>
    </div>
  ) : null;

  if (thumb) {
    return (
      <div className="sg-face" style={{ position: "static", aspectRatio: "1.586/1" }}>
        <img src={product.img} alt={product.name} />
        {comingSoonBanner}
      </div>
    );
  }

  return (
    <div className={"sg-floatwrap" + (float ? " float" : "")}>
      <div
        className={"sg-flip" + (flipped ? " flipped" : "")}
        onClick={() => interactive && setFlipped((f) => !f)}
        style={{ cursor: interactive ? "pointer" : "default" }}
      >
        {/* FRONT — licensed Cinnamoroll art */}
        <div className="sg-face">
          <img src={product.img} alt={"Cinnamoroll " + product.name} />
          <div className="sg-shine" />
          {interactive && <div className="sg-fliphint">↻ Tap to flip</div>}
          {comingSoonBanner}
        </div>
        {/* BACK — Aleta personalized back */}
        <div className="sg-face sg-face-back" style={{ background: product.back }}>
          <div className="sg-shine" />
          <div className="sg-back-pad">
            <div className="sg-back-top">
              <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                <img src={ADV_LOGO} alt="Aleta Adventure" style={{ height: 14 }} />
                <span style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 8.5, color: "#6B39E8", lineHeight: 1, whiteSpace: "nowrap" }}>Aleta Adventure</span>
              </div>
              <div className="sg-le">Limited Edition</div>
            </div>
            <div className="sg-stripe" />
            <div>
              <div className="sg-back-num">•••• •••• •••• 2026</div>
              <div className="sg-back-foot">
                <div>
                  <div className="sg-back-tiny">Cardholder</div>
                  <div className="sg-back-name">{name}</div>
                </div>
                <div className="sg-visa">VISA<small>Platinum</small></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CinnamorollGiftFlow({ collections }: { collections: StoreCollection[] }) {
  const [step, setStep] = useState<string>("product");
  const [overlay, setOverlay] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    recipient: "",
    email: "",
    sender: "",
    buyerEmail: "",
    message: "Hope this makes your day a little cuter! 🎀",
    collection: collections[0]?.id ?? "",
    design: collections[0]?.cards[0]?.id ?? "",
  });
  const [pay, setPay] = useState("paynow");
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemed, setRedeemed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paynow, setPaynow] = useState<{ merOrderId: string; qrImage: string; amount: number; currency: string } | null>(null);

  const code = useMemo(() => {
    const ch = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const blk = () => Array.from({ length: 4 }, () => ch[Math.floor(Math.random() * ch.length)]).join("");
    return "CNR-" + blk() + "-" + blk();
  }, []);

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const validEmail = emailRe.test(form.email);
  const validBuyer = emailRe.test(form.buyerEmail);
  const detailsOk = form.recipient.trim() && validEmail && form.sender.trim() && validBuyer;
  const selectedCollection = collections.find((c) => c.id === form.collection) ?? collections[0];
  const cards = selectedCollection?.cards ?? [];
  const selected = cards.find((d) => d.id === form.design) ?? cards[0];
  const soldOut = selected ? selected.status !== "active" : true;
  const comingSoon = !!selected?.comingSoon;
  const comingSoonLabel = fmtComingSoon(selected?.comingSoonDate);
  const unavailable = soldOut || comingSoon;
  const priceLabel = selected ? fmtPrice(selected.priceMinor, selected.currency) : "";
  const stepIdx = ({ product: 0, details: 0, review: 1, success: 2 } as Record<string, number>)[step] ?? 0;

  const pickCollection = (c: StoreCollection) =>
    setForm({ ...form, collection: c.id, design: c.cards[0]?.id ?? "" });

  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const giftPayload = () => ({
    design: form.design,
    buyerEmail: form.buyerEmail,
    recipient: form.recipient,
    recipientEmail: form.email,
    sender: form.sender,
    message: form.message,
  });

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const endpoint = pay === "card" ? "/api/checkout" : "/api/paynow/create";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(giftPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        const base = data.error || "Could not start the payment. Please try again.";
        const code = data.resultCode ? ` (${data.resultCode})` : "";
        const extra = data.resultMsg || data.detail;
        throw new Error(extra ? `${base}${code} — ${extra}` : `${base}${code}`);
      }
      try {
        localStorage.setItem("gac:order:" + data.merOrderId, JSON.stringify({ form }));
      } catch {
        /* localStorage may be unavailable */
      }
      if (pay === "card") {
        if (!data.paymentLink) throw new Error("Could not start the payment. Please try again.");
        window.location.href = data.paymentLink as string;
      } else {
        if (!data.qrImage) throw new Error("Could not generate the PayNow QR. Please try again.");
        setPaynow({ merOrderId: data.merOrderId, qrImage: data.qrImage, amount: data.amount, currency: data.currency });
        setPaying(false);
      }
    } catch (e) {
      setPayError((e as Error).message);
      setPaying(false);
    }
  };

  useEffect(() => {
    if (!paynow) return;
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/paynow/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merOrderId: paynow.merOrderId, gift: giftPayload() }),
        });
        const d = await res.json();
        if (!stop && d.paid) {
          window.location.href = "/payment/result?merOrderId=" + encodeURIComponent(paynow.merOrderId);
        }
      } catch {
        /* keep polling */
      }
    };
    poll();
    const id = setInterval(poll, 3500);
    return () => {
      stop = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paynow]);

  if (!selected) {
    return (
      <div className="sg-root">
        <style>{STYLES}</style>
        <div className="sg-shell">
          <div className="sg-top">
            <div className="sg-brand">
              <img src={ADV_LOGO} alt="Aleta Adventure" style={{ height: 30 }} />
              <span style={{ color: "#6B39E8", fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 17, marginLeft: 8 }}>Aleta Adventure</span>
            </div>
          </div>
          <div className="sg-panel" style={{ textAlign: "center" }}>
            <h1 className="sg-h1" style={{ fontSize: 20 }}>No cards available</h1>
            <p className="sg-lead" style={{ marginTop: 8 }}>Please check back soon — new collectible cards are on the way.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sg-root">
      <style>{STYLES}</style>
      <div className="sg-shell">
        <div className="sg-top">
          <div className="sg-brand">
            <img src={ADV_LOGO} alt="Aleta Adventure" style={{ height: 30 }} /><span style={{ color: "#6B39E8", fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 17, marginLeft: 8 }}>Aleta Adventure</span>
          </div>
          <div className="sg-secure">🔒 Secure checkout</div>
        </div>

        {step !== "product" && (
          <>
            <div className="sg-steplabel">Step {stepIdx + 1} of 3 · {["Gift details", "Review & pay", "All done"][stepIdx]}</div>
            <div className="sg-steps">
              {[0, 1, 2].map((i) => <div key={i} className={"sg-step" + (i <= stepIdx ? " on" : "")} />)}
            </div>
          </>
        )}

        {/* ===== PRODUCT ===== */}
        {step === "product" && (
          <div className="sg-fadein">
            <GiftCard product={selected} recipient={form.recipient} float interactive />
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
              {selectedCollection.name} · <span style={{ color: "var(--rose)" }}>{selected.name}</span> — tap the card to see the back
            </div>

            {collections.length > 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pickCollection(c)}
                    className="sg-btn"
                    style={{
                      flex: "0 0 auto",
                      padding: "8px 14px",
                      fontSize: 13,
                      background: form.collection === c.id ? "linear-gradient(135deg,var(--rose),var(--lilac))" : "var(--soft)",
                      color: form.collection === c.id ? "#fff" : "var(--ink)",
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              {selectedCollection.eyebrow && <div className="sg-eyebrow">{selectedCollection.eyebrow}</div>}
              <h1 className="sg-h1">{selectedCollection.title}</h1>
              {selectedCollection.description && (
                <p className="sg-lead" style={{ marginTop: 8 }}>{selectedCollection.description}</p>
              )}
            </div>

            <label className="sg-label" style={{ marginTop: 16 }}>Choose a design — {cards.length} to collect</label>
            <div className="sg-swatches">
              {cards.map((d) => (
                <div key={d.id} className={"sg-sw" + (form.design === d.id ? " sel" : "")} onClick={() => setForm({ ...form, design: d.id })} style={{ opacity: d.status === "active" ? 1 : 0.6 }}>
                  <img src={d.img} alt={d.name} />{d.comingSoon && <div className="sg-sw-soon">Coming Soon</div>}
                  {form.design === d.id && <span className="sg-sw-tick">✓</span>}
                  <div className="sg-sw-name">{d.name}{d.comingSoon ? "" : d.status !== "active" ? " · Sold out" : ""}</div>
                </div>
              ))}
            </div>

            <div className="sg-panel" style={{ marginTop: 16 }}>
              <div className="sg-feat"><div className="sg-fi" style={{ background: "#FFF0F5" }}>💌</div><div><div className="sg-ft">Gifted by email</div><div className="sg-fd">We email your friend a code + your message.</div></div></div>
              <div className="sg-feat"><div className="sg-fi" style={{ background: "#EEF5FF" }}>⚡</div><div><div className="sg-ft">Redeem in 30 seconds</div><div className="sg-fd">They enter the code in-app to activate the card.</div></div></div>
              <div className="sg-feat"><div className="sg-fi" style={{ background: "#EFFBF4" }}>🎀</div><div><div className="sg-ft">Collectible & spendable</div><div className="sg-fd">A real Visa Platinum card, only sweeter.</div></div></div>
            </div>

            <div className="sg-panel" style={{ marginTop: 14 }}>
              <div className="sg-row">
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>One-time gift price</div>
                  <div className="sg-row" style={{ gap: 8 }}><span className="sg-price">{priceLabel}</span></div>
                </div>
                {comingSoon ? (
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#6B39E8", background: "#EEE9FF", padding: "5px 10px", borderRadius: 99 }}>COMING SOON</div>
                ) : soldOut ? (
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--rose)", background: "#FFF0F5", padding: "5px 10px", borderRadius: 99 }}>SOLD OUT</div>
                ) : null}
              </div>
              <button className="sg-btn sg-btn-primary" style={{ marginTop: 14 }} disabled={unavailable} onClick={() => setStep("details")}>
                {comingSoon
                  ? `Coming Soon${comingSoonLabel ? " · " + comingSoonLabel : ""}`
                  : soldOut
                    ? "Sold out"
                    : `Send ${selected.name} as a gift →`}
              </button>
              <p className="sg-hint" style={{ textAlign: "center", marginTop: 10 }}>
                {comingSoon
                  ? comingSoonLabel
                    ? `Available from ${comingSoonLabel}`
                    : "Available soon — check back shortly"
                  : "Limited edition"}
              </p>
            </div>
          </div>
        )}

        {/* ===== DETAILS ===== */}
        {step === "details" && (
          <div className="sg-fadein">
            <GiftCard product={selected} recipient={form.recipient} interactive />
            <div className="sg-panel" style={{ marginTop: 16 }}>
              <h1 className="sg-h1" style={{ fontSize: 20 }}>Who's it for?</h1>

              <label className="sg-label">Recipient's name</label>
              <input className="sg-input" placeholder="e.g. Mei Ling" value={form.recipient} onChange={set("recipient")} />

              <label className="sg-label">Recipient's email</label>
              <input className="sg-input" placeholder="friend@email.com" value={form.email} onChange={set("email")} />
              {form.email && !validEmail && <p className="sg-hint" style={{ color: "var(--rose)" }}>Enter a valid email so we can deliver the gift.</p>}

              <label className="sg-label">Your name (from)</label>
              <input className="sg-input" placeholder="e.g. Jeremiah" value={form.sender} onChange={set("sender")} />

              <label className="sg-label">Your email (for receipt)</label>
              <input className="sg-input" placeholder="you@email.com" value={form.buyerEmail} onChange={set("buyerEmail")} />
              {form.buyerEmail && !validBuyer && <p className="sg-hint" style={{ color: "var(--rose)" }}>Enter a valid email for your receipt.</p>}

              <label className="sg-label">Personal message</label>
              <textarea className="sg-area" maxLength={140} value={form.message} onChange={set("message")} />
              <p className="sg-hint">{140 - form.message.length} characters left</p>

              <label className="sg-label">Design</label>
              <div className="sg-swatches">
                {cards.map((d) => (
                  <div key={d.id} className={"sg-sw" + (form.design === d.id ? " sel" : "")} onClick={() => setForm({ ...form, design: d.id })} style={{ opacity: d.status === "active" ? 1 : 0.6 }}>
                    <img src={d.img} alt={d.name} />{d.comingSoon && <div className="sg-sw-soon">Coming Soon</div>}
                    {form.design === d.id && <span className="sg-sw-tick">✓</span>}
                    <div className="sg-sw-name">{d.name}{d.comingSoon ? "" : d.status !== "active" ? " · Sold out" : ""}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="sg-btn sg-btn-ghost" style={{ flex: ".7" }} onClick={() => setStep("product")}>Back</button>
              <button className="sg-btn sg-btn-primary" style={{ flex: 1.6 }} disabled={!detailsOk || unavailable} onClick={() => setStep("review")}>Continue to pay</button>
            </div>
          </div>
        )}

        {/* ===== REVIEW ===== */}
        {step === "review" && (
          <div className="sg-fadein">
            <div className="sg-panel">
              <div className="sg-steplabel" style={{ marginBottom: 12 }}>Order summary</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 96, flexShrink: 0, borderRadius: 12, overflow: "hidden" }}><GiftCard product={selected} thumb /></div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, fontFamily: "'Baloo 2'" }}>{selectedCollection.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{selected.name} · {selectedCollection.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>To {form.recipient || "—"} · {form.email}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Receipt to {form.buyerEmail}</div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="sg-sumrow muted"><span>Gift card · {selected.name}</span><span>{priceLabel}</span></div>
                <div className="sg-sumtotal"><span style={{ fontWeight: 800, fontSize: 15 }}>Total</span><span className="sg-price">{priceLabel}</span></div>
              </div>
            </div>

            <div className="sg-panel" style={{ marginTop: 14 }}>
              <div className="sg-steplabel" style={{ marginBottom: 12 }}>Payment method</div>
              <div className={"sg-pay" + (pay === "paynow" ? " sel" : "")} onClick={() => setPay("paynow")}>
                <div className="sg-radio" /><div style={{ flex: 1 }}><div className="sg-pm-name">PayNow</div><div className="sg-pm-sub">Scan & pay with any SG bank app</div></div><div style={{ fontSize: 18 }}>🇸🇬</div>
              </div>
              <div className={"sg-pay" + (pay === "card" ? " sel" : "")} onClick={() => setPay("card")}>
                <div className="sg-radio" /><div style={{ flex: 1 }}><div className="sg-pm-name">Credit / Debit card</div><div className="sg-pm-sub">Visa, Mastercard, Amex</div></div><div style={{ fontSize: 16 }}>💳</div>
              </div>
              {pay === "card" && (
                <div className="sg-fadein" style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", fontWeight: 500, lineHeight: 1.5 }}>
                  🔒 You'll be securely redirected to Aleta Planet to enter your Visa / Mastercard details and complete 3-D Secure.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="sg-btn sg-btn-ghost" style={{ flex: ".7" }} onClick={() => setStep("details")}>Back</button>
              <button className="sg-btn sg-btn-primary" style={{ flex: 1.6 }} disabled={paying || unavailable} onClick={handlePay}>{paying ? "Redirecting…" : pay === "card" ? `Pay ${priceLabel} with card →` : `Pay ${priceLabel}`}</button>
            </div>
            {payError && <p className="sg-hint" style={{ textAlign: "center", marginTop: 10, color: "var(--rose)" }}>{payError}</p>}
            <p className="sg-hint" style={{ textAlign: "center", marginTop: 10 }}>🔒 Secured by Aleta Planet · Card payments use the sandbox gateway</p>
          </div>
        )}

        {/* ===== SUCCESS ===== */}
        {step === "success" && (
          <div className="sg-fadein">
            <div className="sg-panel" style={{ textAlign: "center" }}>
              <div className="sg-success-ring">✓</div>
              <h1 className="sg-h1" style={{ fontSize: 22 }}>Gift on its way! 🎉</h1>
              <p className="sg-lead" style={{ marginTop: 6 }}>
                We've emailed <b style={{ color: "var(--ink)" }}>{form.recipient}</b> at<br />
                <span className="sg-mono" style={{ fontSize: 12 }}>{form.email}</span>
              </p>
              <div className="sg-codebox" style={{ marginTop: 16 }}>
                <div className="sg-codecap">Redemption code · {selected.name}</div>
                <div className="sg-code">{code}</div>
                <button className="sg-copy" onClick={copy}>{copied ? "✓ Copied" : "⧉ Copy code"}</button>
              </div>
              <p className="sg-hint" style={{ marginTop: 10 }}>Keep this safe. Your friend enters it in the Aleta app to activate their card.</p>
              <p className="sg-hint" style={{ marginTop: 4 }}>📧 A receipt has been sent to you at {form.buyerEmail}</p>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="sg-btn sg-btn-ghost" onClick={() => setOverlay("email")}>📧 Preview email</button>
              <button className="sg-btn sg-btn-ghost" onClick={() => setOverlay("redeem")}>🎁 Redeem flow</button>
            </div>
            <button className="sg-btn sg-btn-primary" style={{ marginTop: 10 }} onClick={() => setStep("product")}>Send another gift</button>
          </div>
        )}
      </div>

      {/* ===== EMAIL OVERLAY ===== */}
      {overlay === "email" && (
        <div className="sg-overlay" onClick={() => setOverlay(null)}>
          <div className="sg-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sg-row" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontFamily: "'Baloo 2'", fontSize: 17 }}>Email your friend gets</div>
              <button className="sg-x" onClick={() => setOverlay(null)}>✕</button>
            </div>
            <div className="sg-mail">
              <div className="sg-mail-head">
                <div><b>From:</b> Aleta Gifts &lt;gifts@aleta.app&gt;</div>
                <div><b>To:</b> {form.email}</div>
                <div><b>Subject:</b> 🎀 {form.sender} sent you a Cinnamoroll Visa card!</div>
              </div>
              <div className="sg-mail-body">
                <GiftCard product={selected} recipient={form.recipient} interactive />
                <h2 className="sg-display" style={{ fontWeight: 800, fontSize: 19, marginTop: 16 }}>You've got a gift, {form.recipient}! 🎁</h2>
                <p className="sg-lead" style={{ marginTop: 8, fontStyle: "italic" }}>"{form.message}"</p>
                <p className="sg-hint" style={{ marginTop: 4 }}>— from {form.sender}</p>
                <div className="sg-codebox" style={{ marginTop: 16 }}>
                  <div className="sg-codecap">Your redemption code</div>
                  <div className="sg-code">{code}</div>
                </div>
                <button className="sg-btn sg-btn-primary" style={{ marginTop: 14 }} onClick={() => { setOverlay("redeem"); setRedeemInput(code); }}>Redeem in the Aleta app →</button>
                <p className="sg-hint" style={{ marginTop: 12 }}>Don't have the app? Download it, then enter your code.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== REDEEM OVERLAY ===== */}
      {overlay === "redeem" && (
        <div className="sg-overlay" onClick={() => { setOverlay(null); setRedeemed(false); }}>
          <div className="sg-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sg-row" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontFamily: "'Baloo 2'", fontSize: 17 }}>Redeem in app</div>
              <button className="sg-x" onClick={() => { setOverlay(null); setRedeemed(false); }}>✕</button>
            </div>
            {!redeemed ? (
              <div className="sg-fadein">
                <GiftCard product={selected} recipient={form.recipient} interactive />
                <div className="sg-panel" style={{ marginTop: 16 }}>
                  <h2 className="sg-display" style={{ fontWeight: 800, fontSize: 18 }}>Enter your gift code</h2>
                  <p className="sg-lead" style={{ marginTop: 4, fontSize: 13 }}>Found in your gift email from {form.sender}.</p>
                  <input className="sg-input sg-mono" style={{ marginTop: 12, textAlign: "center", letterSpacing: 2, fontSize: 16 }} placeholder="CNR-XXXX-XXXX" value={redeemInput} onChange={(e) => setRedeemInput(e.target.value.toUpperCase())} />
                  <button className="sg-btn sg-btn-primary" style={{ marginTop: 12 }} disabled={redeemInput.replace(/[^A-Z0-9-]/g, "").length < 11} onClick={() => setRedeemed(true)}>Activate card</button>
                  <p className="sg-hint" style={{ textAlign: "center", marginTop: 10 }}>One-time use · Tied to your Aleta account</p>
                </div>
              </div>
            ) : (
              <div className="sg-fadein" style={{ textAlign: "center" }}>
                <div className="sg-success-ring">✓</div>
                <h2 className="sg-display" style={{ fontWeight: 800, fontSize: 20 }}>Card activated! 🎀</h2>
                <p className="sg-lead" style={{ marginTop: 6 }}>Your Cinnamoroll {selected.name} card is now in your Aleta wallet.</p>
                <div style={{ marginTop: 16 }}><GiftCard product={selected} recipient={form.recipient} float interactive /></div>
                <button className="sg-btn sg-btn-primary" style={{ marginTop: 18 }} onClick={() => { setOverlay(null); setRedeemed(false); }}>Go to my wallet</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== PAYNOW QR OVERLAY ===== */}
      {paynow && (
        <div className="sg-overlay" onClick={() => setPaynow(null)}>
          <div className="sg-sheet" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
            <div className="sg-row" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontFamily: "'Baloo 2'", fontSize: 17 }}>Scan to PayNow</div>
              <button className="sg-x" onClick={() => setPaynow(null)}>✕</button>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: 16, display: "inline-block", border: "1px solid var(--line)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={paynow.qrImage} alt="PayNow QR" style={{ width: 240, height: 240, display: "block" }} />
            </div>
            <div className="sg-price" style={{ marginTop: 12 }}>{fmtPrice(paynow.amount, paynow.currency)}</div>
            <p className="sg-lead" style={{ marginTop: 6, fontSize: 13 }}>
              Open your bank app, scan this PayNow QR, and approve the payment.
            </p>
            <p className="sg-hint" style={{ marginTop: 10 }}>⏳ Waiting for payment… this updates automatically.</p>
          </div>
        </div>
      )}
    </div>
  );
}

