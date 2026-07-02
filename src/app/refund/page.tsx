import type { Metadata } from "next";
import LegalPage, { H2 } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Refund & Cancellation · Aleta Adventure Gift Cards" };

export default function RefundPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy" updated="1 July 2026">
      <p>
        We want you to be happy with your gift. This policy explains when a Gift Card purchase can be refunded or
        cancelled.
      </p>

      <H2>Unredeemed Gift Cards</H2>
      <p>
        If a Gift Card has <b>not yet been redeemed</b>, you may request a full refund within <b>14 days</b> of
        purchase. Email <a href="mailto:support@aletaadventure.com" style={{ color: "#6B39E8" }}>support@aletaadventure.com</a>{" "}
        with your order reference and the recipient email.
      </p>

      <H2>Redeemed Gift Cards</H2>
      <p>
        Once a code has been redeemed and the Visa Platinum card activated, the purchase is non-refundable, as the
        stored value has been issued.
      </p>

      <H2>Wrong or undelivered email</H2>
      <p>
        If the recipient did not receive the email, first check spam, then contact us — we can resend the code or
        correct the address at no charge. If a code was delivered to an incorrect address you provided and has not
        been redeemed, we can revoke and reissue it.
      </p>

      <H2>Duplicate or failed charges</H2>
      <p>
        If you were charged but did not receive a Gift Card, or were charged more than once, contact us with your
        order reference and we will investigate and refund any erroneous charge.
      </p>

      <H2>How refunds are made</H2>
      <p>
        Approved refunds are returned to the original payment method via our payment partner, Aleta Planet, typically
        within 5–10 business days depending on your bank.
      </p>

      <H2>Contact</H2>
      <p>Email <a href="mailto:support@aletaadventure.com" style={{ color: "#6B39E8" }}>support@aletaadventure.com</a> for any refund request.</p>
    </LegalPage>
  );
}
