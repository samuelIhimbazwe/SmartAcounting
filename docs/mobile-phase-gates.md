# Mobile phase gates

**Do not start the next mobile phase until all four gates pass for the current phase.**

| # | Gate | Automated in CI? | Command / evidence |
|---|------|------------------|-------------------|
| 1 | **Jest + coverage** | Yes | `cd smartchain-mobile && npm run test:coverage` |
| 2 | **Maestro on device** | No (physical device) | `maestro test e2e/smoke.yaml` on a plugged-in phone/emulator with staging APK |
| 3 | **API contract vs staging** | Yes (needs secrets) | `npm run test:contract` with `STAGING_API_URL` + creds |
| 4 | **Manual device checklist** | No | Tick every box in [mobile-readiness.md](./mobile-readiness.md) for that phase |

---

## Gate 1 — Jest coverage

```bash
cd smartchain-mobile
npm ci --legacy-peer-deps   # required: see docs/mobile-npm-install.md
npm run test:coverage
```

- All tests must pass (0 failures).
- Coverage must meet thresholds in `jest.config.js` (`coverageThreshold`).
- Ratchet thresholds when a phase adds tests; do not set thresholds above measured coverage.

### Coverage threshold roadmap (`jest.config.js` global)

| Phase | Lines / statements (min %) | Branches / functions (min %) |
|-------|--------------------------|------------------------------|
| 2 (now) | 38 | 27 |
| 3 | 43 | 32 |
| 4 | 55 | 40 |
| 5 | 62 | 48 |
| 6 | 70 | 55 |

Phase 4 targets a larger jump (VAT, hash chain, Z-report) where pure logic tests are dense.

Baseline snapshots: [phase2-coverage-baseline.txt](./phase2-coverage-baseline.txt), [phase4-coverage-baseline.txt](./phase4-coverage-baseline.txt), [phase5-coverage-baseline.txt](./phase5-coverage-baseline.txt), [phase6-coverage-baseline.txt](./phase6-coverage-baseline.txt).

Pre go-live consolidated checklist: [pre-golive-checklist.md](./pre-golive-checklist.md).

Extended E2E: `e2e/smoke-full.yaml` (dashboard reorder → stock → sale → copilot).

**Local “4 skipped”:** the staging API contract suite (`staging.apiContract.test.ts`) skips when `STAGING_API_URL` is not set — not hardware gaps. See comments in that file (`STAGING_ENV_REQUIRED`).

---

## Gate 2 — Maestro (physical device)

Prerequisites:

- Release or **EAS preview** APK installed (`eas build --profile preview --platform android`).
- App points at **staging** API (`.env.staging` / EAS env).
- Maestro CLI installed; device visible (`adb devices`).
- English UI (or update `e2e/smoke.yaml` for FR/RW).

```bash
export MAESTRO_USERNAME=<staging user>
export MAESTRO_PASSWORD=<password>
maestro test e2e/smoke.yaml
```

Flow must complete with **no manual taps** (login → till open → sale → receipt → till close).

Record: device model, APK build id, date, and `maestro test` exit code in your release notes.

---

## Gate 3 — API contract (staging)

Validates mobile-critical HTTP shapes against a live staging backend (not mocks).

```bash
cd smartchain-mobile
export STAGING_API_URL=https://staging.yourdomain.com/api/v1
export CONTRACT_USERNAME=...
export CONTRACT_PASSWORD=...
export CONTRACT_TENANT_ID=...
export CONTRACT_USER_ID=...
npm run test:contract
```

Also run backend staging smoke:

```bash
./scripts/smoke-staging.sh https://staging.yourdomain.com
```

---

## Gate 4 — Manual device checklist

Use [mobile-readiness.md](./mobile-readiness.md). Each phase below lists which rows must be ticked before advancing.

### Phase 1 — Core POS + till

- [ ] EAS preview APK + staging login
- [ ] CASHIER shell: Till → POS only
- [ ] Open till → CASH (+ optional MOMO split) sale → receipt → close till
- [ ] Offline sale queues and syncs after reconnect
- [ ] Gates 1–3 green

### Phase 2 — Copilot + extended offline

- [ ] CEO: Dashboard + all tabs
- [ ] Copilot query stream + agent approval card
- [ ] Returns + stock count offline queue
- [ ] i18n FR in Settings on POS/till strings
- [ ] Gates 1–3 green

### Phase 3 — Store hardening

- [ ] FCM on physical Android
- [ ] SSL pinning rejected under MITM (production build)
- [ ] Biometric unlock after first login
- [ ] Play internal track: signed AAB uploaded
- [ ] Gates 1–3 green

---

## CI reference

`.github/workflows/mobile-phase-gate.yml` runs Gate 1 on every PR touching `smartchain-mobile/`.  
Gate 3 runs when repository secrets `STAGING_API_URL`, `CONTRACT_*` are configured.  
Gates 2 and 4 remain **human sign-off**.
