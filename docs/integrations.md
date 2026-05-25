# External integrations

Configure via environment variables (Spring relaxed binding) or `application.yml`.

## WhatsApp receipts

| Variable | Description |
|----------|-------------|
| `SMARTACCOUNTING_WHATSAPP_ENABLED` | Master switch |
| `SMARTACCOUNTING_WHATSAPP_DRY-RUN` | Log only (default `true`) |
| `SMARTACCOUNTING_WHATSAPP_API-URL` | Graph API base, e.g. `https://graph.facebook.com/v19.0` |
| `SMARTACCOUNTING_WHATSAPP_BEARER-TOKEN` | System user token |
| `SMARTACCOUNTING_WHATSAPP_PHONE-NUMBER-ID` | WABA phone number id |

Mobile: Settings → Receipt delivery; POST `/api/v1/pos/receipts/{id}/deliver`.

## SMS (MTN + Airtel routing)

Rwanda mobile numbers are routed by prefix:

| Network | Prefixes (after +250) | Configure |
|---------|----------------------|-----------|
| **MTN** | `78`, `79` | `SMARTACCOUNTING_SMS_MTN_PROVIDER-URL` |
| **Airtel** | `72`, `73` | `SMARTACCOUNTING_SMS_AIRTEL_PROVIDER-URL` |

| Variable | Description |
|----------|-------------|
| `SMARTACCOUNTING_SMS_ENABLED` | Master switch (`true` to send) |
| `SMARTACCOUNTING_SMS_DRY-RUN` | Log only, no HTTP (default `true` in dev) |
| `SMARTACCOUNTING_SMS_ROUTE-BY-NETWORK` | Route by prefix (default `true`) |
| `SMARTACCOUNTING_SMS_MTN_PROVIDER-URL` | HTTP POST endpoint for MTN numbers |
| `SMARTACCOUNTING_SMS_MTN_BEARER-TOKEN` | Bearer token for MTN gateway |
| `SMARTACCOUNTING_SMS_MTN_SENDER-ID` | Sender id (optional; falls back to global) |
| `SMARTACCOUNTING_SMS_AIRTEL_PROVIDER-URL` | HTTP POST endpoint for Airtel numbers |
| `SMARTACCOUNTING_SMS_AIRTEL_BEARER-TOKEN` | Bearer token for Airtel gateway |
| `SMARTACCOUNTING_SMS_AIRTEL_SENDER-ID` | Sender id (optional) |
| `SMARTACCOUNTING_SMS_PROVIDER-URL` | Legacy fallback for unknown prefixes |
| `SMARTACCOUNTING_SMS_BEARER-TOKEN` | Legacy fallback bearer |
| `SMARTACCOUNTING_SMS_SENDER-ID` | Default sender id |

**HTTP body** (JSON POST):

```json
{
  "tenantId": "uuid",
  "eventType": "SIGNUP_OTP",
  "carrier": "MTN",
  "to": "+250788123456",
  "msisdn": "250788123456",
  "senderId": "SmartAccounting",
  "message": "Your SmartAccounting verification code is 123456. Valid 10 minutes."
}
```

Map this at your SMS aggregator or operator middleware. Signup OTP uses the same dispatcher.

**Local dev:** keep `SMS_DRY-RUN=true` and `SMARTACCOUNTING_PUBLIC-SIGNUP_EXPOSE-OTP-IN-RESPONSE=true` (dev profile) to show the code on the verify screen.

## MoMo USSD verify

| Variable | Description |
|----------|-------------|
| `SMARTACCOUNTING_MOBILE-MONEY_VERIFY-ENABLED` | Call operator verify URLs |
| `SMARTACCOUNTING_MOBILE-MONEY_MTN-VERIFY-URL` | MTN verify POST endpoint |
| `SMARTACCOUNTING_MOBILE-MONEY_AIRTEL-VERIFY-URL` | Airtel verify POST endpoint |
| `SMARTACCOUNTING_MOBILE-MONEY_VERIFY-BEARER-TOKEN` | Shared bearer for verify calls |

Without live config, stub accepts codes ≥8 alphanumeric chars.

## RRA fiscal

Set `SMARTACCOUNTING_RRA_RWANDA_ENABLED=true` and `RRA_EIS_API_TOKEN` per [phase4-manual-test.md](./phase4-manual-test.md).
