# Pre Go-Live Checklist

Consolidated deferred work, integration TODOs, and manual QA across Phases 1–6.  
**Tags:** `phase6-complete` @ `fb79a94`, `phase6-hardened` @ `6e1e08b`.

**Coverage (scoped `collectCoverageFrom`, 2026-05-19):** Statements **84.94%** · Branches **74.48%** · Functions **78.43%** · Lines **84.65%**  
Command: `cd smartchain-mobile && npx jest --coverage --coverageReporters=text-summary`  
Baseline: [phase6-coverage-baseline.txt](./phase6-coverage-baseline.txt)

---

## Must resolve before any real business uses this system

### RRA fiscal (Phase 4)

| Item | Location | Action |
|------|----------|--------|
| [ ] Live eBMS/EFD endpoint, auth, payload | `RraEfdService.java` (`RRA_API_TODO`) | Wire real RRA-certified client |
| [ ] Mobile EFD POST + idempotency header | `smartchain-mobile/src/services/efd.ts` (`RRA_API_TODO`) | Match production schema |
| [ ] TIN format + lookup API | `smartchain-mobile/src/fiscal/tinValidation.ts` (`RRA_API_TODO`) | Confirm with RRA docs |
| [ ] EIS gateway (not stub) | `RraHttpGateway.java`, `RwandaComplianceProperties` | Set `SMARTACCOUNTING_RRA_RWANDA_ENABLED=true`, `RRA_EIS_API_TOKEN` |
| [ ] Live EFD sandbox test | [phase4-manual-test.md](./phase4-manual-test.md) | Z/X report, QR scannable on device |

### Payments & receipts (Phase 0 / 6)

| Item | Location | Action |
|------|----------|--------|
| [ ] MoMo **STK push** (customer-initiated) | `MobileMoneyWebhookController.java`, POS checkout | MTN/Airtel API credentials + webhook secrets |
| [ ] MoMo **USSD verify** (cashier-entered code) | `MomoVerifyService.java`, `MobilePaymentController.java` | Set `SMARTACCOUNTING_MOBILE-MONEY_VERIFY-ENABLED=true` + verify URLs |
| [ ] WhatsApp Business API | `WhatsAppBroadcastService.java`, `MobileReceiptController.java` (`WHATSAPP_API_TODO`) | See [integrations.md](./integrations.md) |
| [ ] SMS gateway | `SmsDispatchService.java`, `SmsProperties` (`SMS_API_TODO` in controller comment) | `SMARTACCOUNTING_SMS_ENABLED=true`, provider URL + token |
| [ ] Preferred supplier on products | `PurchaseOrderService.createFromLowStock` | Required for auto-reorder / forecast PO batch |

### AI & copilot

| Item | Location | Action |
|------|----------|--------|
| [ ] Anthropic API key (non-stub) | `.env` `ANTHROPIC_API_KEY`, `AiController` `/ai/status` | Real agent prose |
| [ ] OpenAI embeddings (optional RAG) | `.env` `OPENAI_API_KEY` | If using vector search |

### Infrastructure & secrets

| Item | Location | Action |
|------|----------|--------|
| [ ] SSL pinning cert | `android/app/src/main/assets/smartaccounting-cert.cer` | Set `SSL_PINNING_CERT_INSTALLED=true` in `pinning.ts` |
| [ ] FCM Android | `android/app/google-services.json` | Firebase project `rw.smartaccounting.app` |
| [ ] FCM iOS | `ios/GoogleService-Info.plist` | Placeholder in repo — replace |
| [ ] Sentry DSN | `smartchain-mobile/.env.production`, `crashReporting.ts` | Real DSN |
| [ ] Android release keystore | Play signing, CI secrets | [mobile-readiness.md](./mobile-readiness.md) |
| [ ] Play internal track | First signed AAB uploaded | EAS `production` profile |
| [ ] Staging API contract tests | `STAGING_API_URL`, `CONTRACT_*` env | 4 Jest tests skip without — **not** `HARDWARE_REQUIRED` |

### Backend data & features (deferred / mocked)

| Item | Location | Action |
|------|----------|--------|
| [ ] HQ analytics dashboard real SQL | `AnalyticsDashboardService.java` (`_note` mock on `GET /analytics/dashboard`) | Replace mock aggregates |
| [ ] HQ product CRUD at branch | [phase3-manual-test.md](./phase3-manual-test.md), `en.json` `locations.phase4Note` | HQ-only create/edit; branch view-only |
| [ ] Briefing KPI stubs | `*KpiProjector.java`, `MarketingBriefingService`, `ForecastService` | DPO, turnover, revenue vs target, forecast accuracy, etc. |
| [ ] VAT filing CFO notifications | `VatFilingCalendarService.java` | Workflow wiring |
| [ ] Location-scoped sync verified | [phase3-staging-verify-sync.md](./phase3-staging-verify-sync.md) | Before trusting multi-branch stock |

### Mobile — Phase 6 scale & ML (not blocking stub demo)

| Item | Location | Action |
|------|----------|--------|
| [ ] TFLite product recognition | `productRecognition.ts` | Add `react-native-fast-tflite`, model weights, weekly WiFi download |
| [ ] 50k SKU search &lt; 300ms | `productSearchIndex.ts` | Measure on device with full catalog |
| [ ] Sale history 500+ scroll perf | `SaleHistoryScreen.tsx` | Flipper / Systrace |
| [ ] App launch &lt; 2s | Cold start on Tecno / Samsung A-series | Profile with Flipper |
| [ ] Initial catalog sync UX | `inventorySync.ts` (500/batch) | Large tenant first-install test |
| [ ] Feature-phone USSD menus | Backend only partial | Full operator handoff beyond cashier verify |

---

## Automated gates (run before go-live sign-off)

```bash
cd smartchain-mobile && npm ci --legacy-peer-deps
npx tsc --noEmit
npm run test:coverage
npm run test:contract    # requires STAGING_API_URL + CONTRACT_*
cd .. && ./gradlew compileJava
maestro test e2e/smoke.yaml
maestro test e2e/smoke-full.yaml   # OPS_MANAGER / CEO user
./scripts/smoke-staging.sh https://staging.yourdomain.com
```

See [mobile-phase-gates.md](./mobile-phase-gates.md).

---

## Manual QA day (physical hardware required)

### Security & device

- [ ] SSL pinning rejects Charles / mitmproxy (production build)
- [ ] FCM push received on physical Android
- [ ] Biometric unlock after first login
- [ ] i18n FR: Settings → language changes POS/till strings

### POS & till (Phase 1)

- [ ] CASHIER shell: Till → POS only
- [ ] Open till → CASH sale → receipt → close till
- [ ] MOMO split tender + USSD verify → complete sale
- [ ] Offline sale queues and syncs after reconnect
- [ ] Returns + stock count offline queue

### Hardware (Phase 5) — Android unless noted

- [ ] Bluetooth ESC/POS receipt
- [ ] Network printer mDNS discovery + TCP 9100 print
- [ ] Cash drawer opens on CASH sale
- [ ] PLU scale barcode (weight/price mode)
- [ ] USB scanner rapid-fire (5 items, no drops)
- [ ] Label printer ZPL/ESC-POS + barcode scannability
- [ ] Pole display (if enabled)
- [ ] iOS AirPrint receipt

### Fiscal (Phase 4)

- [ ] VAT breakdown on receipt
- [ ] Fiscal audit chain export
- [ ] X-report / Z-report from till
- [ ] Z-report QR code scannable

### Intelligence (Phase 6)

- [ ] Copilot query stream + agent approval card + tab badge
- [ ] Push notification opens Copilot on approval
- [ ] Anomaly alert → detail → Mark reviewed / Escalate (action queue)
- [ ] Reorder “Approve all” creates draft POs (preferred supplier set)
- [ ] Demand forecast → Create PO for gaps
- [ ] Cash flow chart + negative balance warning
- [ ] WhatsApp receipt on real customer phone (live API)
- [ ] Two devices — concurrent tills on floor view

### Stock & procurement

- [ ] PO create → send → GRN receive → stock updates
- [ ] Stock transfer between branches
- [ ] Low stock → draft PO

---

## Reference: explicit TODO markers in repo

| Marker | Files |
|--------|--------|
| `RRA_API_TODO` | `efd.ts`, `tinValidation.ts`, `RraEfdService.java`, `phase4-manual-test.md` |
| `WHATSAPP_API_TODO` | `MobileReceiptController.java`, `phase6-manual-test.md` |
| `SMS_API_TODO` | `MobileReceiptController.java` (comment) |
| `HARDWARE_REQUIRED` | **Not used** — staging skips annotated `STAGING_ENV_REQUIRED` in `staging.apiContract.test.ts` |
| `phase4Note` | `en.json`, `phase3-manual-test.md` (HQ product CRUD deferred) |

---

## Phase completion tags (git)

| Tag | Commit (approx.) | Scope |
|-----|------------------|--------|
| `phase3-complete` / `phase3-hardened` | Location sync, multi-register | Store hardening |
| `phase4-complete` | RRA fiscal, VAT, EFD mock, audit chain | Compliance |
| `phase5-complete` / `phase5-hardened` | Printers, PLU, labels, hardware | Hardware |
| `phase6-complete` | `fb79a94` | AI layer + scale + go-live checklist |
| `phase6-hardened` | `6e1e08b` | Wired approvals, PO batch, integrations config |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | Gates + staging green |
| Product / Ops | | | Manual QA day complete |
| Compliance (RRA) | | | EFD sandbox / production cert |
