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

## SMS fallback

| Variable | Description |
|----------|-------------|
| `SMARTACCOUNTING_SMS_ENABLED` | Master switch |
| `SMARTACCOUNTING_SMS_DRY-RUN` | Log only |
| `SMARTACCOUNTING_SMS_PROVIDER-URL` | HTTP POST endpoint |
| `SMARTACCOUNTING_SMS_BEARER-TOKEN` | Auth header |

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
