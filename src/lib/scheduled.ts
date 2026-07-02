import { getDueScheduledCards, markRecipientNotified } from "@/lib/giftcards";
import { sendGiftEmails } from "@/lib/email";

let running = false;

/**
 * Deliver any scheduled gift emails whose delivery time has arrived. Sends only
 * the recipient's gift (the buyer already got their receipt at purchase) and
 * marks the card so it's never sent twice. Failures (or unconfigured email) are
 * left unmarked so the next tick retries. Safe to call repeatedly.
 */
export async function sendDueScheduledGifts(): Promise<{ delivered: number; pending: number }> {
  const due = await getDueScheduledCards();
  let delivered = 0;
  let pending = 0;
  for (const card of due) {
    try {
      const res = await sendGiftEmails(
        {
          code: card.code,
          designId: card.designId,
          productName: card.productName,
          amountMinor: card.amountMinor,
          currency: card.currency,
          recipientName: card.recipientName,
          recipientEmail: card.recipientEmail,
          senderName: card.senderName,
          buyerEmail: card.buyerEmail,
          message: card.message,
          deliverAt: null, // delivering now
        },
        { recipient: true, buyer: false },
      );
      if (res.sent > 0) {
        await markRecipientNotified(card.id);
        delivered++;
      } else {
        pending++; // unconfigured/skipped or error → retry next tick
      }
    } catch (e) {
      pending++;
      console.error("[scheduler] send failed:", (e as Error).message);
    }
  }
  if (delivered) console.log(`[scheduler] delivered ${delivered} scheduled gift(s)`);
  return { delivered, pending };
}

/**
 * Start a lightweight in-process poller. Railway runs a persistent Node server,
 * so a setInterval is sufficient; each tick re-queries the DB, so it survives
 * restarts. No-op if already started.
 */
export function startScheduler(intervalMs = 5 * 60 * 1000): void {
  if (running) return;
  running = true;
  const tick = () => {
    sendDueScheduledGifts().catch((e) => console.error("[scheduler]", (e as Error).message));
  };
  setTimeout(tick, 15_000); // shortly after boot
  setInterval(tick, intervalMs);
  console.log("[scheduler] started (scheduled gift delivery)");
}
