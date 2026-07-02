import type { Metadata } from "next";
import LegalPage, { H2 } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy · Aleta Adventure Gift Cards" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="1 July 2026">
      <p>This policy explains what personal data we collect when you buy a gift card, and how we use it.</p>

      <H2>What we collect</H2>
      <p>
        To process a gift purchase we collect the buyer&apos;s name and email, the recipient&apos;s name and email, your
        optional personal message, and the purchase details (card, amount, order reference). Payment card details are
        entered with our payment partner and are <b>not</b> collected or stored by us.
      </p>

      <H2>How we use it</H2>
      <p>
        We use this information to deliver the gift email and redemption code, send your receipt, provide customer
        support, process refunds, and prevent fraud. We do not sell your personal data.
      </p>

      <H2>Who we share it with</H2>
      <p>
        We share the minimum necessary with service providers who help us operate: our payment partner (Aleta Planet)
        to take payment, and our email provider to deliver the gift and receipt. They process data on our behalf.
      </p>

      <H2>Retention</H2>
      <p>
        We keep order and gift-card records for as long as needed to provide the service, support redemptions, and
        meet legal and accounting obligations, after which they are deleted or anonymised.
      </p>

      <H2>Your rights</H2>
      <p>
        You may request access to, correction of, or deletion of your personal data, subject to legal limits. Email
        us to make a request.
      </p>

      <H2>Contact</H2>
      <p>Email <a href="mailto:support@aletaadventure.com" style={{ color: "#6B39E8" }}>support@aletaadventure.com</a> with any privacy questions.</p>
    </LegalPage>
  );
}
