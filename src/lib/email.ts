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
  return shell(`
    <h1 style="font-size:20px;margin:0 0 6px;color:#2C2433">Your gift is on its way! 🎀</h1>
    <p style="color:#9087A0;font-size:14px;margin:0 0 4px">You sent a Cinnamoroll Visa Platinum gift card (<b>${escape(dn)}</b>) to <b style="color:#2C2433">${to}</b>. We've emailed them the redemption code.</p>
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
export async function sendGiftEmails(d: GiftEmailData): Promise<EmailResult> {
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
  if (d.recipientEmail) {
    tasks.push(sendOne(d.recipientEmail, `🎀 ${from} sent you a Cinnamoroll Visa gift card!`, recipientHtml(d, hasImage), attachments));
  }
  if (d.buyerEmail) {
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
