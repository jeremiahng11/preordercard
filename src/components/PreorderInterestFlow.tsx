"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { ADV_LOGO } from "@/lib/assets";

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
  return date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

function fmtPrice(minor: number, currency: string): string {
  const sym = currency === "SGD" ? "S$" : currency + " ";
  return sym + (minor / 100).toFixed(2);
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
`;

export default function PreorderInterestFlow({ collections }: { collections: StoreCollection[] }) {
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
      const data = await res.json();
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
                <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", boxShadow: "0 22px 50px -18px rgba(120,80,140,.5)" }}>
                  <img src={selected.img} alt={selected.name} style={{ width: "100%", display: "block" }} />
                </div>
                <div style={{ marginTop: 16 }}>
                  <div className="sg-eyebrow">Early access application</div>
                  <h1 className="sg-h1">Apply for early access to {selected.name}</h1>
                  <p className="sg-lead">Submit your details below and apply to reserve your preferred design. We’ll contact you once the card is available from the 24th.</p>
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
                  <div className="sg-row" style={{ gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div className="sg-label">Price</div>
                      <div className="sg-price">{priceLabel}</div>
                    </div>
                    {comingSoon ? (
                      <div className="sg-badge" style={{ background: "#EEE9FF", color: "#6B39E8" }}>Available {comingSoonLabel || "soon"}</div>
                    ) : null}
                  </div>
                  <p className="sg-note">Product code: <strong>{selected.id}</strong></p>
                </div>

<div style={{ marginTop: 14 }}>
                  <button type="button" className="sg-btn sg-btn-primary" onClick={handleSubmit} disabled={!detailsOk || submitting || unavailable} style={{ width: "100%" }}>
                    {submitting ? "Submitting…" : "Submit interest"}
                  </button>
                </div>
                {submitError && <p className="sg-hint" style={{ color: "var(--rose)", marginTop: 12 }}>{submitError}</p>}
                {unavailable && <p className="sg-hint" style={{ marginTop: 12 }}>This design is not accepting preorder interest right now.</p>}
              </div>
            )}

            {!submitted && (
              <div className="sg-fadein">
                <div className="sg-panel">
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
                  <p className="sg-hint">Use a promo code if you have one; e.g. IMKOMEI15. We’ll validate it when you submit.</p>
                </div>

                <div style={{ marginTop: 14 }}>
                  <button type="button" className="sg-btn sg-btn-primary" onClick={handleSubmit} disabled={!detailsOk || submitting || unavailable} style={{ width: "100%" }}>
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
                  <h1 className="sg-h1" style={{ fontSize: 22 }}>Interest registered!</h1>
                  <p className="sg-lead" style={{ marginTop: 10 }}>We’ll email you when the {selected.name} card is available from the 24th.</p>
                  <p className="sg-note" style={{ marginTop: 10 }}>Product code: <strong>{selected.id}</strong></p>
                  <p className="sg-note">Price shown: <strong>{priceLabel}</strong></p>
                  {promoDiscount ? <p className="sg-note">Promo discount applied: <strong>{promoDiscount}%</strong></p> : null}
                </div>

                <button className="sg-btn sg-btn-primary" style={{ marginTop: 14, width: "100%" }} onClick={() => setSubmitted(false)}>
                  Review another design
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
