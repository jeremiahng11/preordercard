import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

/** Payment method toggles. Default: both enabled. */
export interface PaymentMethods {
  card: boolean;
  paynow: boolean;
}

const KEY_CARD = "pay_card_enabled";
const KEY_PAYNOW = "pay_paynow_enabled";

export async function getPaymentMethods(): Promise<PaymentMethods> {
  const db = getDb();
  const rows = await db
    .select()
    .from(appSettings)
    .where(inArray(appSettings.key, [KEY_CARD, KEY_PAYNOW]));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  // Default to enabled unless explicitly set to "false".
  return {
    card: map.get(KEY_CARD) !== "false",
    paynow: map.get(KEY_PAYNOW) !== "false",
  };
}

export async function setPaymentMethods(methods: PaymentMethods): Promise<void> {
  const db = getDb();
  const now = new Date();
  for (const [key, on] of [
    [KEY_CARD, methods.card],
    [KEY_PAYNOW, methods.paynow],
  ] as const) {
    await db
      .insert(appSettings)
      .values({ key, value: on ? "true" : "false", updatedAt: now })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: on ? "true" : "false", updatedAt: now } });
  }
}
