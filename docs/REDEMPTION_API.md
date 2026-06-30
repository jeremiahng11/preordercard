# Gift Card Redemption API

For the **Aleta Adventure app**. Lets the app validate a Cinnamoroll gift code and
redeem it (once per purchase) so the user gets their Visa Platinum card at $0.

- **Base URL:** `https://<your-deployment>` (e.g. the Railway URL)
- **Auth:** every request must send the partner API key:
  `x-api-key: <REDEEM_API_KEY>` (or `Authorization: Bearer <REDEEM_API_KEY>`)
- **Content-Type:** `application/json`

A code is **only redeemable after the purchase payment succeeds**. Each code is
valid for **exactly one** redemption — concurrent/duplicate calls cannot
double-redeem (enforced by an atomic database update).

Code format: `CNR-XXXX-XXXX` (uppercase; alphabet excludes `0/O/1/I`).

---

## 1. Validate a code (no side effects)

Check a code before committing — e.g. to show "valid ✓" in the app UI.

```
GET /api/redeem/validate?code=CNR-AB2C-9XYZ
x-api-key: <REDEEM_API_KEY>
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
  "recipientName": "Mei Ling"
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
x-api-key: <REDEEM_API_KEY>
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
  "merOrderId": "GAC1a2b3c..."
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
# validate
curl -s "https://<host>/api/redeem/validate?code=CNR-AB2C-9XYZ" \
  -H "x-api-key: $REDEEM_API_KEY"

# redeem
curl -s -X POST "https://<host>/api/redeem" \
  -H "x-api-key: $REDEEM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"CNR-AB2C-9XYZ","userRef":"aleta-user-123"}'
```
