# Cinnamoroll × Aleta — Gift a Card

A Next.js app for buying a collectible **Cinnamoroll Visa Platinum** gift card,
with a real **Visa / Mastercard** checkout powered by the **Aleta Planet UnifyApi**
(sandbox). Card details are entered on Aleta's PCI-compliant hosted page, so this
app never handles a raw card number.

## What it is

- A mobile-first gifting flow: choose a design → enter gift details → review →
  pay with Visa/Mastercard → success (redemption code + email preview + redeem).
- The "Pay with card" path creates an Aleta **order** server-side, then redirects
  the shopper to Aleta's hosted payment page (`paymentLink`).
- On completion Aleta redirects back to `/api/payment-return` (→ `/payment/result`)
  and also calls the `/api/webhook` notification endpoint.

## Tech

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Node `crypto` for
RSA-SHA256 signing · standalone output for a small Docker image.

## Payment flow (spec §1, Option 1 — hosted page)

1. Browser `POST /api/checkout` with `{ design, buyerEmail }`.
2. Server signs and calls `POST {server}/unifyApi/v1/payments/order` with
   `autoCapture=Y`, returns the `paymentLink`.
3. Browser saves gift details to `localStorage` and redirects to `paymentLink`.
4. Shopper pays + completes 3-D Secure on Aleta's page.
5. Aleta redirects to `frontUrl` (`/api/payment-return`) with a `resultCode`,
   which forwards to `/payment/result` (success / pending / failure).
6. Aleta `POST`s the async notification to `webhook` (`/api/webhook`), whose
   signature is verified and acknowledged with HTTP 200.

### Request signing (spec §7)

```
unsignedContent =
  "POST|/unifyApi/v1/payments/order\n"
  + request-time + "|" + client-id + "|" + sub-client-id + "|" + service + "\n"
  + body
signature = "algorithm=RSA256, value=" + base64( SHA256withRSA(unsignedContent, privateKey) )
```

Implemented in [`src/lib/aleta.ts`](src/lib/aleta.ts).

## Run locally

```bash
npm install
cp .env.example .env   # fill in your sandbox credentials
npm run dev            # http://localhost:3000
```

> The PayNow option is a front-end demo. The **card** option performs the real
> sandbox integration. Webhooks need a public HTTPS URL — locally, expose your
> port with a tunnel (e.g. ngrok) and set `APP_BASE_URL` to the tunnel URL.

### Environment variables

| Var | Required | Description |
|-----|----------|-------------|
| `ALETA_SERVER` | – | Host without protocol. Default `paysit.aletapay.com`. |
| `ALETA_MERCHANT_CODE` | ✅ | Merchant code (`client-id`). |
| `ALETA_MID` | ✅ | Visa/Master MID (`sub-client-id`). |
| `ALETA_SERVICE` | – | `VISA` (default) or `MASTERCARD`. |
| `ALETA_PRIVATE_KEY` | ✅ | Your RSA private key (PKCS#8 base64, one line, no PEM header). |
| `ALETA_PUBLIC_KEY` | – | Aleta's public key, to verify callbacks. |
| `APP_BASE_URL` | – | Public base URL for callbacks. Auto-detected on Railway. |

See [`.env.example`](.env.example) for key-generation commands.

## Test cards (spec Appendix III)

| Scenario | Visa | Mastercard | CVV / Expiry |
|----------|------|------------|--------------|
| Success 3DS challenge | `4000020951595032` | `2221008123677736` | `217` · `12/25` |
| Success 3DS frictionless | `4000027891380961` | `5333302221254276` | `217` · `12/25` |
| Success non-3DS | `4000027891380961` | `5101081046006034` | `217` · `12/25` |

The gift price is fixed at **S$18.00** (`merTransAmt=1800`, SGD), which is `>= 150`
(minor units) so it triggers the 3DS test scenarios.

## Deploy to Railway

This repo includes a multi-stage [`Dockerfile`](Dockerfile) and
[`railway.json`](railway.json) (Dockerfile builder).

1. Create a new Railway project from this repo (it auto-detects the Dockerfile).
2. Add the environment variables above in the service **Variables** tab.
3. Railway injects `PORT` and `RAILWAY_PUBLIC_DOMAIN` — `APP_BASE_URL` is derived
   automatically, or set it explicitly to your custom domain.
4. Deploy. Visit the generated URL.

Run the production image locally with Docker:

```bash
docker compose up --build   # http://localhost:3000
```

## Project layout

```
src/
  app/
    page.tsx                  Home → gifting flow
    layout.tsx, globals.css
    payment/result/page.tsx   Post-payment landing (success/pending/fail)
    api/
      checkout/route.ts       Create order → return paymentLink
      payment-return/route.ts frontUrl handler (GET/POST) → result page
      webhook/route.ts        Async notification (verify + ack)
      inquiry/route.ts        Query a transaction
  components/
    CinnamorollGiftFlow.tsx   The ported UI (client component)
  lib/
    aleta.ts                  Signing, verification, order/inquiry client
    config.ts                 Pricing, currency, base-URL resolution
    assets.ts                 Embedded base64 card artwork
```

## License

MIT
