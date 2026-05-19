# Mobile release readiness

Definition of done for merging mobile hardening work.

**Phase gate rule:** do not advance until all four gates pass — see [mobile-phase-gates.md](./mobile-phase-gates.md) (Jest coverage, Maestro on device, staging API contract, manual checklist ticked).

## Checklist

- [ ] EAS preview APK installs and logs in against staging API
- [ ] FCM push received on physical Android device
- [ ] SSL pinning verified — MITM proxy rejected in production build
- [ ] CASHIER login → Till tab only → open till → sale (CASH + MOMO split) → print receipt → close till
- [ ] CEO login → Dashboard + all tabs visible
- [ ] Copilot query stream works; agent run shows approval card
- [ ] Offline sale queues, syncs after reconnect
- [ ] Returns and stock count queue offline, sync on reconnect
- [ ] i18n: switching to FR in Settings changes all POS/till strings
- [ ] Biometric unlock offered after first login
- [ ] Gate 1: `cd smartchain-mobile && npm run test:coverage` (pass + threshold)
- [ ] Gate 2: Maestro smoke on physical device (`maestro test e2e/smoke.yaml`)
- [ ] Gate 3: `npm run test:contract` against staging (see mobile-phase-gates.md)
- [ ] Play internal track has at least one signed AAB

## Manual secrets / files (never commit real values)

| File | Purpose |
|------|---------|
| `android/app/src/main/assets/smartaccounting-cert.cer` | SSL pinning (prod) |
| `android/app/google-services.json` | FCM (Android) |
| `ios/GoogleService-Info.plist` | FCM (iOS) — see placeholder in repo |
| Android release keystore | Play signing |
| `.env.staging` | Staging API URL for EAS `preview` profile |

Set `SSL_PINNING_CERT_INSTALLED = true` in `src/config/pinning.ts` only after the cert asset is in place.

## EAS profiles

- **preview** — internal APK, `ENVIRONMENT=staging` (wire `API_BASE_URL` via `.env.staging` in EAS secrets)
- **production** — Play App Bundle, production API + pinning

## CI

`.github/workflows/mobile-release.yml` verifies cert + `google-services.json`, runs `tsc`, Jest, and optional Maestro (warn-only).
