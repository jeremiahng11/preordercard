"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { ADV_LOGO } from "@/lib/assets";
import { AppStoreBadge, GooglePlayBadge } from "@/components/StoreBadges";

export type StoreLinks = { appStore: string; playStore: string };

export type StoreProduct = {
  id: string;
  name: string;
  img: string;
  back: string;
  backImage: string | null;
  priceMinor: number;
  currency: string;
  status: string;
  comingSoon: boolean;
  comingSoonDate: string | null;
};

export type StoreCollection = {
  id: string;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  comingSoon: boolean;
  comingSoonDate: string | null;
  cards: StoreProduct[];
};

function fmtComingSoon(d: string | null | undefined): string {
  if (!d) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" });
}

function fmtPrice(minor: number, currency: string): string {
  const sym = currency === "SGD" ? "S$" : currency + " ";
  return sym + (minor / 100).toFixed(2);
}

/** Animated collectible card: floats, has a moving shine, and flips on tap. */
function GiftCard({
  product,
  recipient,
  float,
  interactive,
  comingSoon,
  comingSoonDate,
}: {
  product: StoreProduct;
  recipient?: string;
  float?: boolean;
  interactive?: boolean;
  comingSoon?: boolean;
  comingSoonDate?: string | null;
}) {
  const [flipped, setFlipped] = useState(false);
  const name = (recipient || "").trim().toUpperCase() || "YOUR NAME";
  const isSoon = comingSoon ?? product.comingSoon;
  const soonDate = fmtComingSoon(comingSoonDate ?? product.comingSoonDate);

  const comingSoonBanner = isSoon ? (
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

  return (
    <div className={"sg-floatwrap" + (float ? " float" : "")}>
      <div
        className={"sg-flip" + (flipped ? " flipped" : "")}
        onClick={() => interactive && setFlipped((f) => !f)}
        style={{ cursor: interactive ? "pointer" : "default" }}
      >
        {/* FRONT */}
        <div className="sg-face">
          <img src={product.img} alt={product.name} />
          <div className="sg-shine" />
          {interactive && <div className="sg-fliphint">↻ Tap to flip</div>}
          {comingSoonBanner}
        </div>
        {/* BACK */}
        <div className="sg-face sg-face-back" style={{ background: product.back }}>
          <div className="sg-shine" />
          {product.backImage ? (
            <img src={product.backImage} alt={"Back of " + product.name} />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');

.sg-root *{box-sizing:border-box;margin:0;padding:0;}
.sg-root{--bg:#FBF5F8;--surface:#FFFFFF;--ink:#2C2433;--muted:#9087A0;--soft:#F3EAF1;--line:#EFE3EC;--rose:#E84E7E;--rose-deep:#C6356A;--sky:#7FB6F0;--lilac:#B79BF0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--ink);background:radial-gradient(120% 90% at 0% 0%,#FDEFF5 0%,transparent 45%),radial-gradient(120% 90% at 100% 0%,#EAF2FE 0%,transparent 45%),var(--bg);min-height:100vh;padding:28px 16px 56px;display:flex;justify-content:center;}
.sg-shell{width:100%;max-width:480px;}
.sg-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.sg-brand{display:flex;align-items:center;gap:8px;font-family:'Baloo 2';font-weight:800;font-size:18px;letter-spacing:-.3px;}
.sg-secure{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:5px;font-weight:600;}
.sg-panel{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 14px 34px -24px rgba(44,36,51,.5);}
.sg-h1{font-family:'Baloo 2';font-weight:800;font-size:25px;line-height:1.12;letter-spacing:-.4px;}
.sg-eyebrow{font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--rose);margin-bottom:8px;}
.sg-lead{color:var(--muted);font-size:14px;line-height:1.5;font-weight:500;}
.sg-row{display:flex;justify-content:space-between;align-items:center;}
.sg-price{font-family:'Baloo 2';font-weight:800;font-size:22px;}
.sg-swatches{display:flex;gap:9px;margin-top:8px;flex-wrap:wrap;}
.sg-sw{flex:1;cursor:pointer;border-radius:14px;overflow:hidden;border:2.5px solid transparent;transition:.15s;position:relative;background:#fff;}
.sg-sw img{width:100%;aspect-ratio:1.586/1;object-fit:cover;display:block;}
.sg-sw.sel{border-color:var(--rose);}
.sg-sw-name{font-size:12px;font-weight:700;text-align:center;padding:9px 6px;color:var(--ink);background:#fff;}
.sg-sw.sel .sg-sw-name{color:var(--rose);}
.sg-sw-soon{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);background:rgba(107,57,232,.92);color:#fff;font-size:11px;font-weight:800;letter-spacing:1.5px;text-align:center;padding:6px 0;text-transform:uppercase;}
.sg-btn{width:100%;border:0;cursor:pointer;border-radius:14px;padding:15px;font-family:'Plus Jakarta Sans';font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px;transition:.18s;}
.sg-btn-primary{background:linear-gradient(135deg,var(--rose),var(--rose-deep));color:#fff;box-shadow:0 12px 24px -10px rgba(200,53,106,.7);}
.sg-btn-primary:hover{transform:translateY(-1px);box-shadow:0 16px 28px -10px rgba(200,53,106,.8);}
.sg-btn-ghost{background:var(--soft);color:var(--ink);}
.sg-btn-ghost:hover{background:#ECDDE9;}
.sg-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.sg-label{font-size:12px;font-weight:700;color:var(--ink);margin:16px 0 6px;display:block;}
.sg-input,.sg-area{width:100%;border:1.5px solid var(--line);border-radius:12px;padding:12px 13px;font-family:'Plus Jakarta Sans';font-size:14px;font-weight:500;color:var(--ink);background:#FCFAFC;outline:none;transition:.15s;}
.sg-input:focus,.sg-area:focus{border-color:var(--rose);background:#fff;box-shadow:0 0 0 4px rgba(232,78,126,.1);}
.sg-area{resize:none;min-height:74px;line-height:1.45;}
.sg-hint{font-size:11px;color:var(--muted);margin-top:5px;font-weight:500;}
.sg-note{font-size:13px;color:var(--ink);line-height:1.6;margin-top:10px;}
.sg-badge{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;}

/* ---- animated flip card ---- */
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
.sg-back-pad{position:absolute;inset:0;padding:18px 20px;display:flex;flex-direction:column;justify-content:space-between;color:#3a2a3c;}
.sg-back-top{display:flex;justify-content:space-between;align-items:flex-start;}
.sg-le{font-size:9px;font-weight:800;letter-spacing:1.1px;background:rgba(255,255,255,.72);padding:4px 9px;border-radius:99px;text-transform:uppercase;}
.sg-stripe{height:34px;background:#2c2433;opacity:.82;border-radius:3px;margin:0 -20px;}
.sg-back-num{font-family:'JetBrains Mono';font-weight:500;font-size:14px;letter-spacing:2px;opacity:.92;margin-top:10px;}
.sg-back-foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:6px;}
.sg-back-tiny{font-size:8px;opacity:.7;letter-spacing:1px;text-transform:uppercase;}
.sg-back-name{font-family:'Baloo 2';font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.6px;}
.sg-visa{font-style:italic;font-weight:800;font-size:17px;letter-spacing:-.5px;color:#1A1F71;}
.sg-visa small{font-style:normal;font-weight:600;font-size:8px;letter-spacing:.5px;display:block;text-align:right;margin-top:-2px;color:#1A1F71;}
@media (prefers-reduced-motion: reduce){.sg-floatwrap.float{animation:none;}.sg-shine{animation:none;display:none;}}
`;

export default function PreorderInterestFlow({
  collections,
  storeLinks,
}: {
  collections: StoreCollection[];
  storeLinks: StoreLinks;
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    promoCode: "",
    collection: collections[0]?.id ?? "",
    design: collections[0]?.cards[0]?.id ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [promoValidity, setPromoValidity] = useState<{ valid: boolean; message: string } | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const shareApp = async () => {
    const url = typeof window !== "undefined" ? window.location.href : storeLinks.appStore;
    const shareData = {
      title: "Aleta Adventure — Early bird reservation",
      text: "Reserve your Cinnamoroll collectible card and get the Aleta Adventure app!",
      url,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareNote("Link copied to clipboard!");
        setTimeout(() => setShareNote(null), 2500);
      }
    } catch {
      /* user dismissed the share sheet — ignore */
    }
  };

  const setField = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const phoneRe = /^[0-9+()\-\s]{6,40}$/;
  const validEmail = emailRe.test(form.email);
  const validMobile = phoneRe.test(form.mobile);
  const detailsOk = form.fullName.trim() && validEmail && validMobile;
  const selectedCollection = collections.find((c) => c.id === form.collection) ?? collections[0];
  const cards = selectedCollection?.cards ?? [];
  const selected = cards.find((d) => d.id === form.design) ?? cards[0];
  const collComingSoon = !!selectedCollection?.comingSoon;
  const comingSoon = collComingSoon || !!selected?.comingSoon;
  const comingSoonRawDate = collComingSoon ? selectedCollection?.comingSoonDate ?? null : selected?.comingSoonDate ?? null;
  const comingSoonLabel = fmtComingSoon(comingSoonRawDate);
  const unavailable = selected?.status === "delisted";
  const priceLabel = selected ? fmtPrice(selected.priceMinor, selected.currency) : "";
  const activeDiscount = promoValidity?.valid && promoDiscount ? promoDiscount : 0;
  const discountedMinor = selected ? Math.round(selected.priceMinor * (1 - activeDiscount / 100)) : 0;
  const discountedLabel = selected ? fmtPrice(discountedMinor, selected.currency) : "";

  const pickCollection = (c: StoreCollection) => setForm({ ...form, collection: c.id, design: c.cards[0]?.id ?? "" });

  useEffect(() => {
    if (!form.promoCode.trim()) {
      setPromoValidity(null);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setPromoChecking(true);
      setPromoValidity(null);
      try {
        const res = await fetch(`/api/promo/validate?code=${encodeURIComponent(form.promoCode.trim())}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setPromoValidity({ valid: false, message: data.error || "Promo code is invalid" });
          }
        } else if (!cancelled) {
          setPromoValidity({ valid: true, message: `Promo applied: ${data.discountPercent}% off` });
          setPromoDiscount(data.discountPercent ?? null);
        }
      } catch {
        if (!cancelled) {
          setPromoValidity({ valid: false, message: "Could not validate promo code" });
        }
      } finally {
        if (!cancelled) setPromoChecking(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [form.promoCode]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          mobile: form.mobile,
          productName: selected.name,
          productCode: selected.id,
          promoCode: form.promoCode.trim(),
        }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || "Unexpected server response" };
      }
      if (!res.ok) {
        throw new Error(data.error || data.detail || "Could not submit your interest.");
      }
      setPromoDiscount(typeof data.promoDiscountPercent === "number" ? data.promoDiscountPercent : null);
      setSubmitted(true);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const appPromo = (
    <div className="sg-panel" style={{ marginTop: 16 }}>
      <p className="sg-note" style={{ marginTop: 0 }}>
        📲 Get ready for <strong>24 July</strong> — download the Aleta Adventure app so you’re set to use your code when the preorder opens.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <AppStoreBadge href={storeLinks.appStore} />
        <GooglePlayBadge href={storeLinks.playStore} />
      </div>
      <button type="button" className="sg-btn sg-btn-ghost" style={{ marginTop: 12 }} onClick={shareApp}>
        🔗 Share
      </button>
      {shareNote && <p className="sg-hint" style={{ color: "#2F855A", marginTop: 8 }}>{shareNote}</p>}
    </div>
  );

  return (
    <div className="sg-root">
      <style>{STYLES}</style>
      <div className="sg-shell">
        <div className="sg-top">
          <div className="sg-brand">
            <img src={ADV_LOGO} alt="Aleta Adventure" style={{ height: 30 }} />
            <span style={{ color: "#6B39E8", marginLeft: 8 }}>Aleta Adventure</span>
          </div>
          <div className="sg-secure">📆 Preorder interest · available from 24th onwards</div>
        </div>

        {selected ? (
          <>
            {!submitted && (
              <div className="sg-fadein">
                <GiftCard
                  product={selected}
                  recipient={form.fullName}
                  comingSoon={comingSoon}
                  comingSoonDate={comingSoonRawDate}
                  float
                  interactive
                />
                <div style={{ marginTop: 16 }}>
                  <div className="sg-eyebrow">Early access application</div>
                  <h1 className="sg-h1">Apply for early access to {selected.name}</h1>
                  <p className="sg-lead">This is an early-bird access, not a charge. Submit your details to reserve our Cinnamoroll {selected.name} at your early-bird price — we’ll email you when it’s available on 24 July.</p>
                </div>

                <div className="sg-panel" style={{ marginTop: 16 }}>
                  <label className="sg-label">Choose a design</label>
                  <div className="sg-swatches">
                    {cards.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className={`sg-sw${form.design === d.id ? " sel" : ""}`}
                        onClick={() => setForm({ ...form, design: d.id })}
                        style={{ opacity: d.status === "delisted" ? 0.4 : 1, pointerEvents: d.status === "delisted" ? "none" : "auto" }}
                      >
                        <img src={d.img} alt={d.name} />
                        {d.comingSoon && <div className="sg-sw-soon">Coming soon</div>}
                        <div className="sg-sw-name">{d.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sg-panel" style={{ marginTop: 16 }}>
                  <div className="sg-eyebrow">Your details</div>
                  <h1 className="sg-h1" style={{ fontSize: 22 }}>Request updates for {selected.name}</h1>
                  <p className="sg-note" style={{ marginTop: 10 }}>Mandatory fields: Name, Email address, Mobile</p>

                  <label className="sg-label">Name</label>
                  <input className="sg-input" value={form.fullName} onChange={setField("fullName")} placeholder="e.g. Jeremiah" />

                  <label className="sg-label">Email address</label>
                  <input className="sg-input" value={form.email} onChange={setField("email")} placeholder="you@example.com" />
                  {form.email && !validEmail && <p className="sg-hint" style={{ color: "var(--rose)" }}>Enter a valid email address.</p>}

                  <label className="sg-label">Mobile number</label>
                  <input className="sg-input" value={form.mobile} onChange={setField("mobile")} placeholder="e.g. +65 9123 4567" />
                  {form.mobile && !validMobile && <p className="sg-hint" style={{ color: "var(--rose)" }}>Enter a valid mobile number.</p>}

                  <label className="sg-label">Promo code (optional)</label>
                  <input className="sg-input" value={form.promoCode} onChange={setField("promoCode")} placeholder="e.g. IMKOMEI15" />
                  {promoValidity && (
                    <p className="sg-hint" style={{ color: promoValidity.valid ? "#2F855A" : "var(--rose)", marginTop: 6 }}>
                      {promoChecking ? "Checking promo code..." : promoValidity.message}
                    </p>
                  )}

                  <label style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 18 }}>
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      style={{ width: 18, height: 18, marginTop: 2 }}
                    />
                    <span style={{ fontSize: 14, lineHeight: 1.4, color: "var(--ink)" }}>
                      I agree to allow Aleta Planet to contact me for the Early Bird Signup.
                    </span>
                  </label>
                </div>

                <div className="sg-panel" style={{ marginTop: 16 }}>
                  <div className="sg-row" style={{ gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div className="sg-label">Your 24th July Early Bird Price will be:</div>
                      {activeDiscount > 0 ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                          <div className="sg-price">{discountedLabel}</div>
                          <div style={{ fontSize: 15, color: "#9087A0", textDecoration: "line-through" }}>{priceLabel}</div>
                          <div className="sg-badge" style={{ background: "#E7F7EE", color: "#2F855A" }}>{activeDiscount}% off</div>
                        </div>
                      ) : (
                        <div className="sg-price">{priceLabel}</div>
                      )}
                    </div>
                    {comingSoon ? (
                      <div className="sg-badge" style={{ background: "#EEE9FF", color: "#6B39E8" }}>Available {comingSoonLabel || "soon"}</div>
                    ) : null}
                  </div>
                  <p className="sg-note">Product code: <strong>{selected.id}</strong></p>
                </div>

                {appPromo}

                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="sg-btn sg-btn-primary"
                    onClick={handleSubmit}
                    disabled={!detailsOk || submitting || unavailable || !agreed}
                    style={{ width: "100%" }}
                  >
                    {submitting ? "Submitting…" : "Submit interest"}
                  </button>
                </div>
                {submitError && <p className="sg-hint" style={{ color: "var(--rose)", marginTop: 12 }}>{submitError}</p>}
              </div>
            )}

            {submitted && (
              <div className="sg-fadein">
                <div className="sg-panel" style={{ textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 99, background: "linear-gradient(135deg,#9FE3C3,#6FD9A8)", display: "grid", placeItems: "center", margin: "0 auto 14px", color: "#fff", fontSize: 30, boxShadow: "0 10px 24px -8px rgba(111,217,168,.7)" }}>✓</div>
                  <h1 className="sg-h1" style={{ fontSize: 22 }}>Reservation confirmed!</h1>
                  <p className="sg-lead" style={{ marginTop: 10 }}>This early bird is a reservation — we’ve saved your {selected.name} at your early-bird price. We’ll email you when it’s available on 24 July.</p>
                  <p className="sg-note" style={{ marginTop: 10 }}>Product code: <strong>{selected.id}</strong></p>
                  {promoDiscount ? (
                    <>
                      <p className="sg-note">Original price: <strong style={{ textDecoration: "line-through" }}>{priceLabel}</strong></p>
                      <p className="sg-note">Promo discount applied: <strong>{promoDiscount}% off</strong></p>
                      <p className="sg-note">You pay: <strong>{fmtPrice(Math.round(selected.priceMinor * (1 - promoDiscount / 100)), selected.currency)}</strong></p>
                    </>
                  ) : (
                    <p className="sg-note">Price shown: <strong>{priceLabel}</strong></p>
                  )}
                  {form.promoCode.trim() && (
                    <p className="sg-note">Use your promo code <strong>{form.promoCode.trim().toUpperCase()}</strong> on 24 July when the preorder opens.</p>
                  )}
                </div>

                {appPromo}

                <button className="sg-btn sg-btn-primary" style={{ marginTop: 14, width: "100%" }} onClick={() => setSubmitted(false)}>
                  Back to Register
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="sg-panel" style={{ textAlign: "center" }}>
            <h1 className="sg-h1">No cards are available</h1>
            <p className="sg-lead" style={{ marginTop: 10 }}>Please add designs in the admin panel, then return to express preorder interest.</p>
          </div>
        )}
      </div>
    </div>
  );
}
