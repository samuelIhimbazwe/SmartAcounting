# SmartAccounting — 90% readiness checklist

Use this list before staging/production cutover.

## 1. CI (local)

```bash
./gradlew test                    # unit tests
./gradlew integrationTest         # needs Docker for Kafka IT; Postgres via embedded or CI service
cd frontend && npm run build
cd smartchain-mobile && npm install --legacy-peer-deps   # see docs/mobile-npm-install.md
```

## 2. Production secrets

Copy `.env.production.example` → `.env.production` and set:

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | ≥64 characters |
| `FCM_SERVICE_ACCOUNT_PATH` | Firebase Admin JSON for push |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | Error tracking |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Copilot (required in prod profile) |
| `MOBILE_MONEY_*_WEBHOOK_SECRET` | MoMo callbacks |
| `KEYSTORE_*` (mobile Android) | Release signing |

Mobile: copy `smartchain-mobile/.env.production` and set `SENTRY_DSN`. Replace `android/app/google-services.json` from Firebase Console for `rw.smartaccounting.app`.

SSL pinning: place `smartaccounting-cert.cer` in:

- `smartchain-mobile/android/app/src/main/assets/`
- `smartchain-mobile/ios/HelloWorld/` (add to Xcode project)

## 3. Staging deploy

```bash
# On staging host with Docker:
copy .env.production.example .env.staging
# edit secrets, then:
docker compose -f docker-compose.prod.yml --env-file .env.staging up -d --build
./scripts/smoke-staging.sh https://staging.yourdomain.com
```

## 4. Mobile store (internal testing)

```bash
cd smartchain-mobile
npm install --legacy-peer-deps
npx eas-cli login
npx eas build --profile preview --platform android
```

See `smartchain-mobile/eas.json` and `docs/mobile-desktop-release.md`.

## 5. Smoke after deploy

- Login (web + mobile)
- POS sale → receipt print (Android)
- Till open → checkout → till close
- Copilot question (CEO role)
- Push token registers (`POST /notifications/push-token`)
