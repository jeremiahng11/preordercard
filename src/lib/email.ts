import nodemailer, { type Transporter } from "nodemailer";
import { designName, formatAmount, storeLinks } from "@/lib/config";
import { getProductBySlug } from "@/lib/products";

/**
 * Email delivery over SMTP (works with Brevo, SendGrid, Mailjet, Amazon SES, or
 * any SMTP host). Configure via env:
 *   SMTP_HOST   e.g. smtp-relay.brevo.com  /  smtp.sendgrid.net
 *   SMTP_PORT   587 (STARTTLS, default) or 465 (implicit TLS)
 *   SMTP_USER   provider SMTP login  (SendGrid: the literal "apikey")
 *   SMTP_PASS   provider SMTP key / password
 *   EMAIL_FROM  e.g.  Aleta Adventure <gifts@aletaadventure.com>
 * If SMTP creds are not set, emails are logged instead of sent — so the app
 * works without email creds.
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
  /** Front-art data URL. If omitted, it's looked up from the product by designId. */
  image?: string | null;
  /** Scheduled recipient delivery date (shown on the buyer receipt when set). */
  deliverAt?: Date | string | null;
}

/** Format a scheduled delivery date in SGT, or null if not a future date. */
function scheduledLabel(deliverAt: Date | string | null | undefined): string | null {
  if (!deliverAt) return null;
  const d = deliverAt instanceof Date ? deliverAt : new Date(deliverAt);
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return null;
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Singapore" });
}

type Attachment = { filename: string; content: Buffer; contentType: string; cid: string };

/** Turn a base64 data URL into an inline (CID) attachment, or null if not one. */
function dataUrlToAttachment(dataUrl: string | null | undefined, cid: string): Attachment | null {
  if (!dataUrl) return null;
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  const contentType = m[1];
  const ext = contentType.split("/")[1].split("+")[0].replace("jpeg", "jpg");
  return { filename: `card.${ext}`, content: Buffer.from(m[2], "base64"), contentType, cid };
}

const CARD_CID = "cardfront";

/** <img> referencing the inline card attachment; empty when there's no image. */
function cardImageTag(present: boolean): string {
  if (!present) return "";
  return `<img src="cid:${CARD_CID}" alt="Your gift card" width="436" style="width:100%;max-width:436px;height:auto;border-radius:14px;display:block;margin:14px auto 0" />`;
}

function cardName(d: GiftEmailData): string {
  return d.productName || designName(d.designId);
}

function isConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM,
  );
}

let transporter: Transporter | null = null;
function getTransport(): Transporter {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 upgrades via STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function sendOne(
  to: string,
  subject: string,
  html: string,
  attachments?: Attachment[],
): Promise<"sent" | "skipped"> {
  if (!isConfigured()) {
    console.log(`[email:skipped] to=${to} subject=${subject} (set SMTP_HOST/USER/PASS + EMAIL_FROM to send)`);
    return "skipped";
  }
  try {
    await getTransport().sendMail({ from: process.env.EMAIL_FROM, to, subject, html, attachments });
    return "sent";
  } catch (e) {
    const msg = (e as Error).message || String(e);
    throw new Error(`SMTP send failed: ${msg.slice(0, 300)}`);
  }
}

export interface EmailResult {
  sent: number;
  skipped: number;
  errors: string[];
}

const FONT = "'Segoe UI',system-ui,-apple-system,Arial,sans-serif";

/**
 * Table-based, fixed-width (480px) centered layout. Outlook's Word engine ignores
 * max-width / margin:auto on <div>, so we center with a table + an MSO-conditional
 * fixed-width table, and use bgcolor + background-color for solid fallbacks.
 */
function shell(inner: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#FBF5F8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FBF5F8">
  <tr><td align="center" style="padding:24px;font-family:${FONT}">
    <!--[if mso]><table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:480px;background-color:#ffffff;border:1px solid #EFE3EC;border-radius:20px;overflow:hidden">
      <tr><td bgcolor="#CC4E8E" style="background-color:#CC4E8E;background:linear-gradient(135deg,#E84E7E,#B79BF0);padding:18px 22px;color:#ffffff;font-weight:800;font-size:18px;font-family:${FONT}">Aleta Adventure</td></tr>
      <tr><td style="padding:22px;color:#2C2433;font-family:${FONT}">${inner}</td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body></html>`;
}

function codeBox(code: string): string {
  // bgcolor + background-color are solid fallbacks for Outlook (Word engine
  // ignores CSS gradients — without them the box is white and the code vanishes).
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0">
    <tr><td align="center" bgcolor="#2C2433" style="background-color:#2C2433;background:linear-gradient(135deg,#2C2433,#43344E);border-radius:14px;padding:16px">
      <div style="font-size:10px;letter-spacing:1.5px;color:#C9B8F4;text-transform:uppercase;font-weight:700;margin-bottom:6px;font-family:${FONT}">Redemption code</div>
      <div style="font-family:'Courier New',monospace;font-size:22px;letter-spacing:3px;color:#ffffff;font-weight:700">${code}</div>
    </td></tr>
  </table>`;
}

function storeButtons(): string {
  const { appStore, playStore } = storeLinks();
  const cell = (href: string, label: string) =>
    `<td bgcolor="#2C2433" style="background-color:#2C2433;border-radius:10px"><a href="${href}" style="display:inline-block;padding:10px 16px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;font-family:${FONT}">${label}</a></td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:16px auto 0">
    <tr>${cell(appStore, "📱 App Store")}<td style="width:10px">&nbsp;</td>${cell(playStore, "▶ Google Play")}</tr>
  </table>`;
}

function recipientHtml(d: GiftEmailData, hasImage: boolean): string {
  const name = d.recipientName || "there";
  const from = d.senderName || "A friend";
  const dn = cardName(d);
  return shell(`
    <h1 style="font-size:20px;margin:0 0 6px;color:#2C2433">You've got a gift, ${escape(name)}! 🎁</h1>
    <p style="color:#9087A0;font-size:14px;margin:0 0 4px"><b style="color:#2C2433">${escape(from)}</b> sent you a collectible Cinnamoroll Visa Platinum gift card — <b>${escape(dn)}</b>.</p>
    ${cardImageTag(hasImage)}
    ${d.message ? `<p style="font-style:italic;color:#6b6075;font-size:14px;margin:10px 0">"${escape(d.message)}"</p>` : ""}
    ${codeBox(d.code)}
    <p style="color:#9087A0;font-size:13px;margin:0">Download the Aleta Adventure app, then enter this code to activate your card.</p>
    ${storeButtons()}
  `);
}

function buyerHtml(d: GiftEmailData, hasImage: boolean): string {
  const dn = cardName(d);
  const amount = formatAmount(d.amountMinor, d.currency);
  const to = d.recipientName ? escape(d.recipientName) : "your friend";
  const scheduled = scheduledLabel(d.deliverAt);
  const delivery = scheduled
    ? `We'll email them the redemption code on <b style="color:#2C2433">${scheduled}</b>.`
    : `We've emailed them the redemption code.`;
  return shell(`
    <h1 style="font-size:20px;margin:0 0 6px;color:#2C2433">Your gift is on its way! 🎀</h1>
    <p style="color:#9087A0;font-size:14px;margin:0 0 4px">You sent a Cinnamoroll Visa Platinum gift card (<b>${escape(dn)}</b>) to <b style="color:#2C2433">${to}</b>. ${delivery}</p>
    <p style="color:#9087A0;font-size:14px;margin:0 0 4px">Amount paid: <b style="color:#2C2433">${amount}</b></p>
    ${cardImageTag(hasImage)}
    ${codeBox(d.code)}
    <p style="color:#9087A0;font-size:13px;margin:0 0 2px">Here's the code too, in case they need a hand. Keep this email for your records.</p>
    ${storeButtons()}
  `);
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Send the gift email to the recipient and a confirmation to the sender/buyer. */
export async function sendGiftEmails(
  d: GiftEmailData,
  opts?: { recipient?: boolean; buyer?: boolean },
): Promise<EmailResult> {
  const sendRecipient = opts?.recipient ?? true;
  const sendBuyer = opts?.buyer ?? true;
  const from = d.senderName || "Someone";

  // Resolve the card art (data URL): explicit override, else the product's image.
  let imageDataUrl = d.image ?? null;
  if (!imageDataUrl) {
    try {
      imageDataUrl = (await getProductBySlug(d.designId))?.image ?? null;
    } catch {
      /* image is best-effort; never block the email on a lookup failure */
    }
  }
  const attachment = dataUrlToAttachment(imageDataUrl, CARD_CID);
  const attachments = attachment ? [attachment] : undefined;
  const hasImage = Boolean(attachment);

  const tasks: Promise<"sent" | "skipped">[] = [];
  if (sendRecipient && d.recipientEmail) {
    tasks.push(sendOne(d.recipientEmail, `🎀 ${from} sent you a Cinnamoroll Visa gift card!`, recipientHtml(d, hasImage), attachments));
  }
  if (sendBuyer && d.buyerEmail) {
    const subject = d.recipientName
      ? `🎀 Your Cinnamoroll gift to ${d.recipientName} is on its way!`
      : "🎀 Your Cinnamoroll gift is on its way!";
    tasks.push(sendOne(d.buyerEmail, subject, buyerHtml(d, hasImage), attachments));
  }
  const results = await Promise.allSettled(tasks);
  const out: EmailResult = { sent: 0, skipped: 0, errors: [] };
  results.forEach((r) => {
    if (r.status === "fulfilled") r.value === "sent" ? out.sent++ : out.skipped++;
    else {
      const m = r.reason?.message ?? String(r.reason);
      out.errors.push(m);
      console.error("[email] send failed:", m);
    }
  });
  return out;
}

export interface InterestEmailData {
  fullName: string;
  email: string;
  productName: string;
  productCode: string;
  priceMinor?: number | null;
  currency?: string | null;
  promoCode?: string | null;
  promoDiscountPercent?: number | null;
}

/** A labelled row for the order-summary table. */
function summaryRow(label: string, value: string, opts?: { strong?: boolean; strike?: boolean }): string {
  const valStyle = [
    `color:${opts?.strong ? "#2C2433" : "#4B4356"}`,
    "font-size:14px",
    "text-align:right",
    opts?.strong ? "font-weight:700" : "",
    opts?.strike ? "text-decoration:line-through;color:#9087A0" : "",
  ]
    .filter(Boolean)
    .join(";");
  return `<tr>
    <td style="padding:6px 0;color:#9087A0;font-size:14px;font-family:${FONT}">${label}</td>
    <td style="padding:6px 0;font-family:${FONT};${valStyle}">${value}</td>
  </tr>`;
}

function orderSummary(data: InterestEmailData): string {
  const currency = data.currency || "SGD";
  const hasPrice = typeof data.priceMinor === "number" && data.priceMinor > 0;
  const base = hasPrice ? data.priceMinor! : 0;
  const discountPct = data.promoCode && data.promoDiscountPercent ? data.promoDiscountPercent : 0;
  const discounted = discountPct ? Math.round(base * (1 - discountPct / 100)) : base;

  const rows = [
    summaryRow("Design", escape(data.productName), { strong: true }),
    summaryRow("Product code", escape(data.productCode)),
  ];
  if (hasPrice) {
    if (discountPct) {
      rows.push(summaryRow("Price", formatAmount(base, currency), { strike: true }));
      rows.push(summaryRow(`Promo ${escape(data.promoCode!)} (−${discountPct}%)`, `−${formatAmount(base - discounted, currency)}`));
      rows.push(summaryRow("Early-bird total", formatAmount(discounted, currency), { strong: true }));
    } else {
      rows.push(summaryRow("Early-bird price", formatAmount(base, currency), { strong: true }));
    }
  } else if (data.promoCode) {
    rows.push(summaryRow("Promo code", `${escape(data.promoCode)}${discountPct ? ` (−${discountPct}%)` : ""}`, { strong: true }));
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;border-top:1px solid #EFE3EC;border-bottom:1px solid #EFE3EC">
    ${rows.join("")}
  </table>`;
}

function interestHtml(data: InterestEmailData): string {
  const promoNote = data.promoCode
    ? `<p style="margin:0 0 16px;color:#2C2433;font-size:14px">We’ve locked in your promo code <strong>${escape(data.promoCode)}</strong>${
        data.promoDiscountPercent ? ` — a ${data.promoDiscountPercent}% early-bird discount` : ""
      } for this reservation.</p>`
    : `<p style="margin:0 0 16px;color:#9087A0;font-size:14px">No promo code was entered for this reservation.</p>`;

  const codeInstruction = data.promoCode
    ? `<p style="margin:16px 0 0;color:#2C2433;font-size:14px;line-height:1.6">👉 Use your code <strong>${escape(data.promoCode)}</strong> on <strong>24 July</strong> when the preorder opens to claim your early-bird price.</p>`
    : `<p style="margin:16px 0 0;color:#2C2433;font-size:14px;line-height:1.6">👉 Come back on <strong>24 July</strong> when the preorder opens to place your order at your early-bird price.</p>`;

  return shell(`
    <h1 style="font-size:20px;margin:0 0 8px;color:#2C2433">Your early-bird reservation is confirmed, ${escape(data.fullName)}! 🎉</h1>
    <p style="color:#9087A0;font-size:14px;line-height:1.6;margin:0 0 8px">Thanks for reserving <strong>${escape(data.productName)}</strong>. This is a reservation — you won’t be charged yet. Here’s a summary of your early-bird reservation.</p>
    ${promoNote}
    ${orderSummary(data)}
    ${codeInstruction}
    <p style="margin:20px 0 8px;color:#2C2433;font-size:14px;line-height:1.6">📲 Download the <strong>Aleta Adventure</strong> app so you’re ready on 24 July:</p>
    ${storeButtons()}
    <p style="margin:20px 0 0;color:#9087A0;font-size:13px;line-height:1.5">We’ll email you again the moment the preorder opens and your selected design is available.</p>
    <p style="margin:24px 0 0;color:#2C2433;font-size:14px;font-weight:700">Thanks for your interest,<br/>The Aleta Adventure team</p>
  `);
}

export async function sendInterestConfirmationEmail(data: InterestEmailData): Promise<EmailResult> {
  const html = interestHtml(data);
  const subject = data.promoCode
    ? `Your early-bird reservation for ${data.productName} (promo ${data.promoCode})`
    : `Your early-bird reservation for ${data.productName}`;
  const result = await sendOne(data.email, subject, html);
  return { sent: result === "sent" ? 1 : 0, skipped: result === "skipped" ? 1 : 0, errors: [] };
}
