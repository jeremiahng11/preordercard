# Gift Card Redemption API

For the **Aleta Adventure app**. Lets the app validate a Cinnamoroll gift code and
redeem it (once per purchase) so the user gets their Visa Platinum card at $0.

- **Base URL:** `https://<your-deployment>` (e.g. the Railway URL)
- **Auth:** every request must send an API key:
  `x-api-key: <your key>` (or `Authorization: Bearer <your key>`)
- **Content-Type:** `application/json`

A code is **only redeemable after the purchase payment succeeds**. Each code is
valid for **exactly one** redemption — concurrent/duplicate calls cannot
double-redeem (enforced by an atomic database update).

Code format: `CNR-XXXX-XXXX` (uppercase; alphabet excludes `0/O/1/I`).

---

## Authentication & environments

Each **developer account** (created by an admin) is issued two keys, visible on the
**API keys** page of the admin app:

| Key | Prefix | Scope |
|-----|--------|-------|
| Sandbox | `gac_sk_test_…` | Reads/redeems **sandbox** cards only. Build & test here. |
| Production | `gac_sk_live_…` | Reads/redeems **real** purchased cards. Go-live only. |

The same endpoints serve both — the key you send decides which dataset you touch.
Sandbox and production data are fully isolated: a sandbox key can never see or burn
a real card, and vice versa. Every response echoes an `environment` field
(`sandbox` or `production`) so you can confirm which key resolved. The legacy
`REDEEM_API_KEY` env value (if set) still works and is treated as a production key.

---

## 1. Validate a code (no side effects)

Check a code before committing — e.g. to show "valid ✓" in the app UI.

```
GET /api/redeem/validate?code=CNR-AB2C-9XYZ
x-api-key: <your key>
```

**200 — found**
```json
{
  "valid": true,
  "redeemable": true,
  "status": "active",
  "amount": 1800,
  "currency": "SGD",
  "design": "pinkcloud",
  "recipientName": "Mei Ling",
  "environment": "sandbox"
}
```
`redeemable` is `true` only when `status === "active"` (paid and not yet used).
`amount` is in the currency's **minor unit** (1800 = SGD 18.00).

**404 — not found** → `{ "valid": false, "redeemable": false, "reason": "NOT_FOUND" }`

---

## 2. Redeem a code (single use)

Burns the code. Call this when the user actually applies the card.

```
POST /api/redeem
x-api-key: <your key>
Content-Type: application/json

{ "code": "CNR-AB2C-9XYZ", "userRef": "aleta-user-123" }
```
`userRef` (optional) records which app user redeemed it.

**200 — redeemed** (apply the card at $0)
```json
{
  "valid": true,
  "status": "redeemed",
  "code": "CNR-AB2C-9XYZ",
  "amount": 1800,
  "currency": "SGD",
  "design": "pinkcloud",
  "recipientName": "Mei Ling",
  "redeemedAt": "2026-06-30T09:15:00.000Z",
  "merOrderId": "GAC1a2b3c...",
  "environment": "sandbox"
}
```

**Failure responses**

| HTTP | `reason` | Meaning |
|------|----------|---------|
| 400 | `BAD_REQUEST` | Missing/invalid code format |
| 401 | `UNAUTHORIZED` | Missing or wrong API key |
| 402 | `NOT_PAID` | Purchase payment not completed yet |
| 404 | `NOT_FOUND` | No such code |
| 409 | `ALREADY_REDEEMED` | Code was already used (includes `redeemedAt`) |
| 409 | `NOT_REDEEMABLE` | Code cancelled/expired |
| 500 | `SERVER_MISCONFIGURED` / `SERVER_ERROR` | Server-side issue |

All failures return `{ "valid": false, "reason": "...", "message": "..." }`.

---

## 3. Sandbox — create a test card (sandbox key only)

Mints an **active** sandbox code with no real payment, so you can exercise the full
validate → redeem flow. Returns `403` if called with a production key.

```
POST /api/sandbox/cards
x-api-key: <sandbox key>
Content-Type: application/json

{ "amount": 1800, "currency": "SGD", "recipientName": "Test User" }
```
All body fields are optional (defaults: `amount` 1800, `currency` SGD).

**200 — created**
```json
{
  "ok": true,
  "code": "CNR-T3ST-1234",
  "status": "active",
  "amount": 1800,
  "currency": "SGD",
  "environment": "sandbox"
}
```

Suggested test flow: create → `validate` (redeemable) → `redeem` → `redeem` again
(expect `409 ALREADY_REDEEMED`).

---

## Recommended app flow

1. (Optional) `GET /api/redeem/validate` to preview the code.
2. `POST /api/redeem` when the user confirms.
3. On `200`, provision the Visa Platinum card to the user (value = `amount`/`currency`).
4. On `409 ALREADY_REDEEMED`, tell the user the code was already used.
5. On `402 NOT_PAID`, ask them to try again shortly (payment still settling).

Treat `POST /api/redeem` as the authoritative commit — `validate` is advisory and
a code could be redeemed by another device between the two calls.

## cURL examples

```bash
# create a sandbox test card (sandbox key)
curl -s -X POST "https://<host>/api/sandbox/cards" \
  -H "x-api-key: $SANDBOX_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount":1800,"currency":"SGD","recipientName":"Test User"}'

# validate
curl -s "https://<host>/api/redeem/validate?code=CNR-AB2C-9XYZ" \
  -H "x-api-key: $API_KEY"

# redeem
curl -s -X POST "https://<host>/api/redeem" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"CNR-AB2C-9XYZ","userRef":"aleta-user-123"}'
```
