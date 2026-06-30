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

It also issues a **single-use redemption code** per purchase and exposes a
**Redemption API** for the Aleta Adventure app to validate/redeem codes — see
[`docs/REDEMPTION_API.md`](docs/REDEMPTION_API.md).

## Tech

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Postgres + Drizzle ORM ·
Node `crypto` for RSA-SHA256 signing · standalone output for a small Docker image.

## Gift code lifecycle

```
checkout  →  PENDING   (code generated + stored, not redeemable)
webhook   →  ACTIVE    (Aleta confirms payment SUCCESS → redeemable once)
/api/redeem → REDEEMED (Aleta Adventure app burns it, atomically)
```

Activation only happens on the server-to-server **webhook** (or an Aleta
**inquiry** fallback) — never the browser redirect. The single-use guarantee is a
conditional `UPDATE ... WHERE status='active'`, so concurrent redeems can't double-spend.

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
| `DATABASE_URL` | ✅ | Postgres connection string (stores gift cards). Migrations auto-run on boot. |
| `REDEEM_API_KEY` | ✅ | Shared secret for the redemption API (`x-api-key`). |
| `ADMIN_PASSWORD` | ✅ | Password for the `/admin` dashboard. |
| `APP_BASE_URL` | – | Public base URL for callbacks. Auto-detected on Railway. |

## Admin dashboard

`/admin` (password from `ADMIN_PASSWORD`) lets staff:

- **Codes** — every purchased code with purchase date/time, recipient + email,
  sender + buyer email, amount, and status (Active, Redeemed, Revoked, Refunded).
  **Revoke** disables a code; **Refund** issues an Aleta refund then marks it Refunded.
- **Products** (`/admin/products`) — add new card products (name, price, image
  upload), edit name/price/artwork, and mark **sold out** or **delist**. The
  storefront and pricing are driven entirely by these DB products.
- **API docs** (`/admin/api-docs`) — the redemption reference for the app devs.

## Purchase → code lifecycle

Cards are **only created once payment is confirmed** (nothing is stored for
abandoned/failed checkouts). After the payment redirect, `/api/confirm` verifies
SUCCESS via Aleta inquiry, then generates the code, stores the card, and emails
both the recipient (gift + code) and the buyer (receipt). Emails use Resend when
`RESEND_API_KEY`/`EMAIL_FROM` are set, otherwise they're logged.

### Database

Uses Postgres via Drizzle ORM. Migrations live in [`drizzle/`](drizzle/) and are
applied automatically at server startup (see [`src/instrumentation.ts`](src/instrumentation.ts)).
Local commands:

```bash
npm run db:generate   # regenerate migration SQL from src/lib/db/schema.ts
npm run db:migrate    # apply migrations to DATABASE_URL
npm run db:studio     # browse data in Drizzle Studio
```

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
2. Add a **Postgres** plugin, then set `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
3. Add the other environment variables above in the service **Variables** tab
   (including `REDEEM_API_KEY`).
4. Railway injects `PORT` and `RAILWAY_PUBLIC_DOMAIN` — `APP_BASE_URL` is derived
   automatically, or set it explicitly to your custom domain.
5. Deploy. Migrations run on boot; visit the generated URL.

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
      checkout/route.ts       Create order + persist PENDING card → paymentLink
      payment-return/route.ts frontUrl handler (GET/POST) → result page
      webhook/route.ts        Async notification (verify + activate card)
      inquiry/route.ts        Query a transaction
      gift/route.ts           Result-page code lookup (+ inquiry fallback)
      redeem/route.ts         POST redeem (single use) — app developers
      redeem/validate/route.ts GET non-mutating code check — app developers
  components/
    CinnamorollGiftFlow.tsx   The ported UI (client component)
  instrumentation.ts          Runs DB migrations on startup
  lib/
    aleta.ts                  Signing, verification, order/inquiry client
    auth.ts                   Partner API-key check (redemption)
    config.ts                 Pricing, currency, base-URL resolution
    giftcards.ts              Create / activate / redeem gift cards
    db/                       Drizzle schema + client
    assets.ts                 Embedded base64 card artwork
drizzle/                      Generated SQL migrations
docs/REDEMPTION_API.md        API reference for the Aleta Adventure app
```

## License

MIT
