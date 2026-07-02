import type { Metadata } from "next";
import LegalPage, { H2 } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service · Aleta Adventure Gift Cards" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="1 July 2026">
      <p>
        These Terms govern your purchase and use of digital Cinnamoroll Visa Platinum gift cards
        (&quot;Gift Cards&quot;) offered by Aleta Adventure. By purchasing a Gift Card you agree to these Terms.
      </p>

      <H2>1. The Gift Card</H2>
      <p>
        Each Gift Card is a digital voucher delivered by email as a unique redemption code. The recipient redeems
        the code in the Aleta Adventure app to activate a Visa Platinum card loaded with the stated value. Each
        code is valid for a <b>single</b> redemption and has no cash value until redeemed.
      </p>

      <H2>2. Purchase &amp; payment</H2>
      <p>
        Prices are shown at checkout in the currency stated (SGD unless noted). Payments are processed securely by
        our payment partner, Aleta Planet. We do not receive or store your full card details. Your order is
        confirmed only once payment succeeds.
      </p>

      <H2>3. Delivery</H2>
      <p>
        Gift Cards are delivered by email to the recipient address you provide, either immediately or on the
        scheduled date you choose. You are responsible for entering a correct email address. A receipt is emailed
        to you (the buyer) at purchase.
      </p>

      <H2>4. Redemption &amp; expiry</H2>
      <p>
        A code becomes redeemable only after payment succeeds and may be redeemed once. Do not share the code with
        anyone you do not intend to gift, as whoever redeems it first receives the value.
      </p>

      <H2>5. Refunds</H2>
      <p>
        Refunds are handled under our <a href="/refund" style={{ color: "#6B39E8" }}>Refund &amp; Cancellation Policy</a>.
      </p>

      <H2>6. Acceptable use</H2>
      <p>
        You agree not to purchase or use Gift Cards fraudulently, for money laundering, resale without authorisation,
        or any unlawful purpose. We may cancel or revoke codes obtained through fraud or error.
      </p>

      <H2>7. Liability</H2>
      <p>
        To the extent permitted by law, our liability for any claim relating to a Gift Card is limited to the amount
        paid for that Gift Card. We are not liable for codes delivered to an incorrect address you provided.
      </p>

      <H2>8. Governing law</H2>
      <p>These Terms are governed by the laws of Singapore.</p>

      <H2>9. Contact</H2>
      <p>Questions? Email us at <a href="mailto:support@aletaadventure.com" style={{ color: "#6B39E8" }}>support@aletaadventure.com</a>.</p>
    </LegalPage>
  );
}
