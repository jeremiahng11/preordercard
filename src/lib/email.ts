import { designName, formatAmount, storeLinks } from "@/lib/config";

/**
 * Email delivery via Resend's HTTP API. If RESEND_API_KEY / EMAIL_FROM are not
 * set, emails are logged instead of sent — so the app works without email creds.
 */

export interface GiftEmailData {
  code: string;
  designId: string;
  productName?: string | null;
  amountMinor: number;
  currency: string;
  recipientName: string | null;
  recipientEmail: string | null;
  senderName: string | null;
  buyerEmail: string | null;
  message: string | null;
}

function cardName(d: GiftEmailData): string {
  return d.productName || designName(d.designId);
}

function isConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function sendOne(to: string, subject: string, html: string): Promise<void> {
  if (!isConfigured()) {
    console.log(`[email:skipped] to=${to} subject=${subject} (set RESEND_API_KEY + EMAIL_FROM to send)`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
}

function shell(inner: string): string {
  return `<div style="font-family:'Segoe UI',system-ui,sans-serif;background:#FBF5F8;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #EFE3EC;border-radius:20px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#E84E7E,#B79BF0);padding:18px 22px;color:#fff;font-weight:800;font-size:18px">Aleta Adventure</div>
    <div style="padding:22px">${inner}</div>
  </div>
</div>`;
}

function codeBox(code: string): string {
  return `<div style="background:linear-gradient(135deg,#2C2433,#43344E);border-radius:14px;padding:16px;text-align:center;margin:16px 0">
    <div style="font-size:10px;letter-spacing:1.5px;color:#C9B8F4;text-transform:uppercase;font-weight:700;margin-bottom:6px">Redemption code</div>
    <div style="font-family:monospace;font-size:22px;letter-spacing:3px;color:#fff;font-weight:700">${code}</div>
  </div>`;
}

function storeButtons(): string {
  const { appStore, playStore } = storeLinks();
  const btn = (href: string, label: string) =>
    `<a href="${href}" style="display:inline-block;margin:4px;padding:10px 16px;background:#2C2433;color:#fff;border-radius:10px;text-decoration:none;font-size:13px;font-weight:700">${label}</a>`;
  return `<div style="text-align:center;margin-top:14px">${btn(appStore, "📱 App Store")}${btn(playStore, "▶ Google Play")}</div>`;
}

function recipientHtml(d: GiftEmailData): string {
  const name = d.recipientName || "there";
  const from = d.senderName || "A friend";
  const dn = cardName(d);
  return shell(`
    <h1 style="font-size:20px;margin:0 0 6px;color:#2C2433">You've got a gift, ${escape(name)}! 🎁</h1>
    <p style="color:#9087A0;font-size:14px;margin:0 0 4px"><b style="color:#2C2433">${escape(from)}</b> sent you a collectible Cinnamoroll Visa Platinum gift card — <b>${escape(dn)}</b>.</p>
    ${d.message ? `<p style="font-style:italic;color:#6b6075;font-size:14px;margin:10px 0">"${escape(d.message)}"</p>` : ""}
    ${codeBox(d.code)}
    <p style="color:#9087A0;font-size:13px;margin:0">Download the Aleta Adventure app, then enter this code to activate your card.</p>
    ${storeButtons()}
  `);
}

function buyerHtml(d: GiftEmailData): string {
  const dn = cardName(d);
  const amount = formatAmount(d.amountMinor, d.currency);
  const to = d.recipientName ? escape(d.recipientName) : "your friend";
  return shell(`
    <h1 style="font-size:20px;margin:0 0 6px;color:#2C2433">Your gift is on its way! 🎀</h1>
    <p style="color:#9087A0;font-size:14px;margin:0 0 4px">You sent a Cinnamoroll Visa Platinum gift card (<b>${escape(dn)}</b>) to <b style="color:#2C2433">${to}</b>. We've emailed them the redemption code.</p>
    <p style="color:#9087A0;font-size:14px;margin:0 0 4px">Amount paid: <b style="color:#2C2433">${amount}</b></p>
    ${codeBox(d.code)}
    <p style="color:#9087A0;font-size:13px;margin:0 0 2px">Here's the code too, in case they need a hand. Keep this email for your records.</p>
    ${storeButtons()}
  `);
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Send the gift email to the recipient and a receipt to the buyer. Best-effort. */
export async function sendGiftEmails(d: GiftEmailData): Promise<void> {
  const from = d.senderName || "Someone";
  const tasks: Promise<void>[] = [];
  if (d.recipientEmail) {
    tasks.push(
      sendOne(d.recipientEmail, `🎀 ${from} sent you a Cinnamoroll Visa gift card!`, recipientHtml(d)),
    );
  }
  // Email the sender/buyer too (their own confirmation + code + receipt).
  if (d.buyerEmail) {
    const subject = d.recipientName
      ? `🎀 Your Cinnamoroll gift to ${d.recipientName} is on its way!`
      : "🎀 Your Cinnamoroll gift is on its way!";
    tasks.push(sendOne(d.buyerEmail, subject, buyerHtml(d)));
  }
  const results = await Promise.allSettled(tasks);
  results.forEach((r) => {
    if (r.status === "rejected") console.error("[email] send failed:", r.reason?.message ?? r.reason);
  });
}
