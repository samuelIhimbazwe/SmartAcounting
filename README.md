# SmartAccounting Backend v3.0

Enterprise multi-tenant ERP backend implementation aligned to the SmartAccounting v3.0 architecture and delivery scope.

## Current feature set

- Spring Boot 3 / Java 21 backend
- Clean package structure (`dashboard`, `copilot`, `forecast`, `anomaly`, `audit`, `tenant`, `security`)
- Role-scoped dashboard APIs under `/api/v1/dashboards/**`
- AI endpoints under `/api/v1/ai/**`
- Agentic copilot runs with persisted plan/step traces
- SSE alerts stream endpoint
- Cryptographic hash-chained audit log entity + service
- Tenant context propagation with request headers:
  - `X-Tenant-Id`
  - `X-User-Id`
- JWT login endpoint with tenant/user claims
- Flyway migrations for core Phase 1 schema + dashboard read-model tables
- PostgreSQL RLS policies for tenant isolation (`app.tenant_id` session variable)
- CQRS projectors for CEO/CFO/Sales/Ops/HR/Marketing/Accounting read models
- Event ingestion endpoint for projection testing (`POST /api/v1/events`)
- Transactional outbox for domain event delivery reliability (`outbox_events` + relay worker)
- Auth endpoint rate limiting (`/api/v1/auth/login`, `/api/v1/auth/refresh`) via Redis
- MFA challenge flow for privileged roles (`POST /api/v1/auth/mfa/challenge` + OTP on login)
- Idempotency keys for high-risk financial mutations
- Correlation-aware logging with request/user/tenant context in log pattern
- Permission-scoped authorization support (`@permissionGuard`) and service-account API key auth
- Async forecast jobs (`POST /api/v1/ai/forecast/jobs/{metric}` + status polling)
- Tenant admin and new domain APIs for HR, assets, documents, and tenant data sharing

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). For **smartchain-mobile**, `npm install` needs `--legacy-peer-deps` until React Native is upgraded ([why](docs/mobile-npm-install.md)).

## Run

```bash
./gradlew bootRun
```

Windows PowerShell:

```powershell
.\gradlew.bat bootRun
```

One-command local startup (opens backend + frontend terminals and starts docker dependencies):

```powershell
.\dev-up.ps1
```

Optional flags:

- `-SkipDeps` (skip `docker compose up -d`)
- `-SkipInstall` (skip `npm install` before frontend dev server)
- `-IncludeAi` (use `docker compose -f docker-compose.yml -f docker-compose.ai.yml up -d` instead of core-only)

### Database setup

Default local database settings used by backend:

- `DB_URL=jdbc:postgresql://localhost:5433/smartchain` (Compose publishes Postgres on **5433** so it does not collide with a separate PostgreSQL install on 5432)
- `DB_USERNAME=smartchain`
- `DB_PASSWORD=smartchain`

Start **core** dependencies only (PostgreSQL, Redis, backend — accounting/POS keep running even if AI services are down):

```powershell
# Set DB_PASSWORD in .env (required); example for local dev:
# DB_PASSWORD=smartchain

docker compose up -d
```

Optional **AI layer** (forecast + Kafka). Backend does **not** wait for these services to start.

```powershell
docker compose -f docker-compose.yml -f docker-compose.ai.yml up -d
```

When Kafka is enabled in config, point the app at the compose broker (for example `KAFKA_BOOTSTRAP_SERVERS=kafka:9092` and `KAFKA_ENABLED=true` via environment).

Then run backend locally (without Docker backend):

```powershell
.\gradlew.bat bootRun
```

Flyway migrations run automatically on startup.

## Authentication flow

1. Call `POST /api/v1/auth/login` with:
   - `username`
   - `password`
   - `tenantId` (UUID)
   - `userId` (UUID)
2. Use returned bearer token in `Authorization: Bearer <token>`.
3. All `/api/v1/**` routes require JWT, and dashboard APIs enforce role-to-dashboard scoping.
4. Rotate sessions with `POST /api/v1/auth/refresh` using `refreshToken`.
5. Revoke with `POST /api/v1/auth/logout`.

### OAuth2 social login (Google / Microsoft)

The web app supports **authorization-code** social login when the API has IdP credentials configured. This is separate from (and preferred over) the older **ID-token** buttons that use `VITE_GOOGLE_CLIENT_ID` / `VITE_MICROSOFT_CLIENT_ID` in the frontend.

**Backend environment variables** (restart API after setting):

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth2 web client ID |
| `GOOGLE_CLIENT_SECRET` | Google client secret |
| `MICROSOFT_CLIENT_ID` | Microsoft Entra application (client) ID |
| `MICROSOFT_CLIENT_SECRET` | Microsoft client secret |
| `OAUTH2_REDIRECT_URI` | Frontend callback after login (default `http://localhost:5173/auth/oauth2/callback`) |

**Redirect URIs to register with each provider** (API callbacks):

- Local: `http://localhost:8080/api/v1/auth/oauth2/callback/google` and `.../microsoft`
- Production: `https://api.smartchain.rw/api/v1/auth/oauth2/callback/google` and `.../microsoft`

**Flow:** Login page → “Continue with Google/Microsoft” → IdP → API callback → redirect to `{OAUTH2_REDIRECT_URI}` with JWT query params → `/auth/oauth2/callback` stores session and routes to the role dashboard.

- `GET /api/v1/auth/oauth2/providers` — lists enabled providers (empty if secrets are not set).
- New users get a **TRIAL** tenant and **CEO** role; existing email accounts are linked automatically.
- Username/password login and `POST /api/v1/auth/oauth-login` (ID token) are unchanged.

When backend OAuth2 is configured, the login page shows only the redirect buttons (not the popup / One Tap widgets).

**Desktop (Electron):** set `OAUTH2_REDIRECT_URI=smartchain://auth/oauth2/callback` on the API and use the `smartchain-desktop` app. See [`smartchain-desktop/README.md`](smartchain-desktop/README.md).

## JWT key rotation

- Active key:
  - `JWT_SECRET`
  - `JWT_KEY_ID`
- Backward verification keys:
  - `JWT_LEGACY_SECRETS` (comma-separated)

New access tokens are signed with the active key id (`kid`); validation accepts active + legacy keys.

## Default test users

- `ceo` / `password`
- `cfo` / `password`
- `sales` / `password`
- `ops` / `password`
- `hr` / `password`
- `marketing` / `password`
- `accounting` / `password`

Use tenant UUID **`11111111-1111-4111-8111-111111111111`** on the login screen (or copy `frontend/.env.example` to `frontend/.env.local`) so JWT tenant scope matches the seeded demo data below.

### Demo catalog & inventory (Flyway V40)

Migration **`V40__dev_demo_seed.sql`** inserts a tenant **Demo Retail Co**, three products, **SHOP** inventory rows, and POS catalog lines with barcodes:

| Barcode       | Item                         |
|---------------|------------------------------|
| `5901234123457` | Demo Water 500ml           |
| `5901234123458` | Demo Maize Flour 2kg       |
| `5901234123459` | Demo Mobile Airtime Card   |

Flour is seeded with **low stock** (8 units vs reorder 15) so low-stock views have something to show. Clear persisted browser auth (`localStorage` key `smartaccounting-auth`) if an old tenant UUID is stuck after upgrading.

### Expanded end-to-end demo seed (Flyway V41)

Migration **`V41__dev_demo_seed_expanded.sql`** layers a realistic, cross-feature dataset on the same demo tenant so every screen — and any AI/copilot agent — has something to act on. It is **idempotent** (re-running is safe) and uses fixed UUIDs so links between objects are stable across runs.

| Feature area | What V41 seeds | How to test (UI / API) |
|---|---|---|
| Retail catalog | 12 extra products (oil, rice, sugar, soap, tea, bread, milk, eggs, drink, notebook, pen, charcoal) with unique barcodes | `GET /api/v1/retail/products`, `/retail` screen |
| Inventory levels | On-hand at **SHOP** for all 15 SKUs (3 deliberately at/below reorder) | `GET /api/v1/inventory/balances?location=SHOP`, low-stock dashboards |
| Inventory batches (FEFO) | 10 lots across products with **near-expiry**, mid-expiry, and long-shelf dates, including cost prices | `GET /api/v1/inventory/expiry-risk?location=SHOP&daysAhead=30`, `GET /api/v1/inventory/batches?location=SHOP` |
| POS catalog | 12 priced FRW items linked back to products with reorder points | POS Scan/Add screen, `GET /api/v1/pos/catalog/items` |
| Sales orders + POS sales | 6 walk-in POS sales (3 registers, last 7 days) + 2 direct orders with line items, cost prices, and tenders (CASH / MOMO / AIRTEL_MONEY / CARD / ON_ACCOUNT) | Sales dashboards, `GET /api/v1/retail/till/expected?...`, receipt reprint `POST /api/v1/pos/receipts/{transactionId}/reprint` |
| Mobile money reconciliation | Settlement dedup rows for matched MoMo references | `pos_payment_tenders.reconciliation_status` reads MATCHED / PENDING |
| Till closes | 5 historical closes across **REG-01** / **REG-02** including a deliberate variance day | `GET /api/v1/retail/till/expected?businessDate=YYYY-MM-DD&posRegisterCode=REG-01` |
| Customers (AR) | 7 customers with varied credit limits + bad-debt risk scores | `GET /api/v1/finance/customers/{id}/credit-status`, `/finance/credit-ledger` |
| Suppliers (AP) | 5 suppliers with credit limits and payment terms | `GET /api/v1/finance/suppliers/{id}/credit-status` |
| Invoices (AR) | 9 invoices covering OPEN / PARTIALLY_PAID / PAID / aged 30 / 60 / 90+ buckets + POS on-account | `GET /api/v1/finance/invoices?status=`, CFO aging widgets |
| Supplier bills (AP) | 6 bills across current / 30 / 60 / 90+ + paid + partial | CFO AP widgets, `/finance/credit-ledger` style screens |
| Payments | IN + OUT payments (CONFIRMED + PENDING) tied to invoices/bills | Payment application views |
| Payment applications + recon | Matched and unmatched recon items, account-level reconciliations (variance + clean) | `POST /api/v1/accounting/reconciliation/auto-match`, `GET /api/v1/accounting/reconciliation/unmatched` |
| Journal entries | 6 sample journals covering sales, payments, inventory receipt, payroll, depreciation | Ledger views, journal export |
| Purchase orders | 4 POs across RECEIVED / OPEN / CONFIRMED statuses | Procurement screens |
| Fixed assets | 5 assets (POS terminal, fridge, motorbike, shelving, laptop) with varying useful life | `GET /api/v1/assets`, `GET /api/v1/assets/{id}/depreciation-schedule` |
| HR | 10 employees + 4 leave requests (PENDING / APPROVED / MATERNITY) | `GET /api/v1/hr/headcount`, `/api/v1/hr/leave` |
| Workflow rules | 3 active rules (high-value invoice, credit-limit breach, low-stock auto-PO) | `GET /api/v1/workflow/rules/{id}/evaluate?dryRun=true` |
| Notification rules + events + SMS log | Rules for INVOICE_OVERDUE / LOW_STOCK / POS_RECEIPT / EXPIRY_RISK + 5 sample events + SENT/FAILED/DRY_RUN SMS rows | `GET /api/v1/notifications/rules`, `/events`, `/sms-deliveries` |
| Action queue | 4 actions including 2 in PENDING_APPROVAL (approval workflow demo) | `GET /api/v1/actions/queue`, copilot approval flow |
| Tax profiles | Rwanda VAT_STANDARD 18%, VAT_ZERO 0%, WHT_SERVICES 15% | `POST /api/v1/tax/calculate` |
| Scenario library | 1 template per role (CEO/CFO/Sales/Ops/HR/Marketing/Accounting) | `GET /api/v1/platform/scenarios/{role}` |
| Tenant feature flags | 7 flags (Copilot, RRA, Mobile Money, etc.) | `GET /api/v1/platform/features` |
| Marketplace plugins | rra-eis-rwanda, pos-thermal, momo-mtn | Marketplace screens |
| FX rates | USD/EUR/KES/UGX → FRW for today + USD historic | `GET /api/v1/currency/convert?...`, `/finance/fx-rates` |
| Webhooks | 3 subscriptions (active + disabled) + 2 delivery log entries (DELIVERED + FAILED w/ retries) | Webhook admin screens |
| Anomaly cases + feed | 1 case per role with severity/z-score/contributors + dashboard feed entries | `GET /api/v1/anomaly/cases/{role}`, dashboard "Anomalies" panels |
| Close tasks | Current period: 1 IN_PROGRESS + 6 OPEN with dependencies + 1 completed task from last period | `GET /api/v1/accounting/close/tasks/{period}`, `.../critical-path` |
| Dashboard snapshots | Today's row in **every** snapshot table (CEO/CFO/CFO-KPI/Sales/Sales-pipeline/Ops/Ops-efficiency/HR/Marketing/Accounting-close) + AR/AP aging | All `/api/v1/dashboards/{role}/kpis` payloads come back populated immediately |
| RRA Rwanda | Settings row, 2 EIS submissions (ACK + PENDING), 2 VAT filings (SUBMITTED + DRAFT) | RRA admin screens |
| Tenant data sharing | 2 grants in each direction with a partner tenant | `GET /api/v1/platform/data-sharing/grants` |
| Custom fields | `loyalty_tier` enum on customers + `origin_country` on products with sample values | Custom field UI / API |
| Audit log | 2-entry hash chain for invoice create + update | `GET /api/v1/audit/...` (if exposed) and DB inspection |
| Copilot agent | 3 historical runs (CFO/Ops/Sales), per-step traces, and 2 hash-chained audit rows | `GET /api/v1/ai/copilot/agent/runs`, copilot UI history |
| Forecast jobs | 1 COMPLETED job + 1 QUEUED job | `GET /api/v1/ai/forecast/jobs/{metric}` |
| Service account keys | 1 active + 1 revoked key | `GET /api/v1/admin/service-accounts/keys` |
| Second tenant | `11111111-1111-4111-8111-111111111112` "Demo Supply Partner Co" — for data-sharing/RLS tests | n/a |

#### Suggested AI-assisted test prompts

Once logged in, ask the copilot agent (`/api/v1/ai/copilot/agent/run`) prompts that exercise the seeded data, for example:

- **CFO**: `"Summarize AR aging and recommend collection actions for the top 2 overdue customers."`
- **CFO**: `"action: escalate overdue invoices and stage purchase orders for low-stock SKUs."` (writes routed through approval gate — already 2 pending approvals seeded)
- **Ops**: `"List products at risk (low stock or expiring within 7 days) and draft a restock list."`
- **Sales**: `"Compare today's till takings to the last 5 business days. Where is the variance?"`
- **CEO**: `"Brief me on this week's anomalies across finance, ops, and sales."`
- **Accounting**: `"Walk me through the open month-end close tasks and the critical path blockers."`

The seed leaves obvious "hooks" (overdue invoices, low-stock SKUs, near-expiry batches, MoMo pending recon, recon variance) so each prompt has concrete things to return.

## Retail operations (buy → store → sell)

API sequence diagrams and business rules for procurement (GRN rejection, accepted-qty billing), FEFO inventory, POS, returns, and AR SMS reminders:

- [docs/retail-buy-store-sell-flows.md](docs/retail-buy-store-sell-flows.md)

## Implementation status

Core platform modules, accounting modules, and cross-cutting backend services are implemented and wired:

- Multi-tenant security and role scoping (JWT + tenant context + role guard)
- CQRS read model projections for dashboard KPIs and drilldowns
- Accounting flows (AR/AP, ledger events, close tasks, reconciliation, payment application)
- Platform services (sync, exports, webhooks, notifications, action queue, tax)
- AI/copilot and forecast integration paths
- Audit logging, caching, and event streaming/dispatch support

## PostgreSQL RLS integration test (opt-in)

Run real RLS verification against PostgreSQL by setting:

- `RUN_PG_TESTS=true`
- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`

Then execute tests. The `RlsIsolationIT` test validates cross-tenant isolation on `event_log`.

## Acceptance report task

Generate a criterion-tagged report from automated tests:

```bash
gradle acceptanceReport
```

Output:

- `build/reports/acceptance/acceptance-report.md`

## k6 performance smoke

Scripts:

- `perf/k6/dashboard-kpi.js`
- `perf/k6/copilot-query.js`

See `perf/k6/README.md` for setup and thresholds.

Quick combined run:

- PowerShell: `./perf/smoke.ps1`
- Bash: `bash ./perf/smoke.sh`

Combined report output:

- `build/reports/performance/performance-smoke-report.md`

Gradle shortcut:

- `gradle perfSmoke`
- `gradle accountingRegression`
- `gradle accountingRegressionPg`

`accountingRegressionPg` includes Postgres/Kafka integration suites when enabled:

- `RUN_PG_TESTS=true` (+ `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`)
- `RUN_KAFKA_TESTS=true` (Docker/Testcontainers available)

## Core module APIs added

- Dashboard:
  - `GET /api/v1/dashboards/{role}/kpis`
  - `GET /api/v1/dashboards/{role}/charts/{widget}`
  - `GET /api/v1/dashboards/{role}/charts/{widget}/drilldown`
  - `GET /api/v1/dashboards/{role}/anomalies`
  - `GET /api/v1/dashboards/{role}/alerts`
  - `GET /api/v1/dashboards/{role}/actions`
  - `GET /api/v1/dashboards/{role}/alerts/stream`
  - `POST /api/v1/dashboards/actions/{type}`
- Auth:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/mfa/challenge`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
- Events:
  - `POST /api/v1/events`
- Inventory: `POST /api/v1/inventory/move`
- HR:
  - `GET /api/v1/hr/headcount`
  - `POST /api/v1/hr/employees`
  - `GET /api/v1/hr/employees`
  - `POST /api/v1/hr/leave`
  - `GET /api/v1/hr/leave`
- Assets:
  - `POST /api/v1/assets`
  - `GET /api/v1/assets`
  - `GET /api/v1/assets/{assetId}/depreciation-schedule`
- Documents:
  - `POST /api/v1/documents/upload-requests`
  - `GET /api/v1/documents?entityType=&entityId=`
- Service accounts:
  - `POST /api/v1/admin/service-accounts/keys`
  - `GET /api/v1/admin/service-accounts/keys`
  - `POST /api/v1/admin/service-accounts/keys/{id}/revoke`
- Tenant admin:
  - `POST /api/v1/admin/tenants`
  - `GET /api/v1/admin/tenants?page=&size=`
  - `POST /api/v1/admin/tenants/{tenantId}/disable`
- Inter-tenant sharing:
  - `POST /api/v1/platform/data-sharing/grants`
  - `GET /api/v1/platform/data-sharing/grants?page=&size=`
  - `POST /api/v1/platform/data-sharing/grants/{id}/revoke`
- Finance: `POST /api/v1/finance/journal-entries`
- Workflow: `POST /api/v1/workflow/rules`
- Workflow evaluator: `GET /api/v1/workflow/rules/{id}/evaluate`
- Procurement: `POST /api/v1/procurement/purchase-orders`
- Sales: `POST /api/v1/sales/orders`
- Webhooks: `POST /api/v1/webhooks/subscriptions`
- Currency: `POST /api/v1/currency/rates`
- Marketplace: `POST /api/v1/marketplace/plugins/install`
- IoT: `POST /api/v1/iot/events`

## CQRS projections expanded

- `cfo_kpi_snapshot`, `sales_kpi_snapshot`, `ops_kpi_snapshot`
- `ar_ap_aging_snapshot`
- Scheduled projectors:
  - `FinancialSnapshotProjector`
  - `SalesOpsSnapshotProjector`
- Dashboard KPI API now reads projected CFO/Sales/Ops snapshots when present.

## Kafka event pipeline (toggleable)

- Set `KAFKA_ENABLED=true` to enable Kafka publisher + consumer.
- Config:
  - `KAFKA_BOOTSTRAP_SERVERS`
  - `KAFKA_GROUP_ID`
  - `KAFKA_TOPIC_DOMAIN_EVENTS`
- Default mode (`KAFKA_ENABLED=false`) uses no-op publisher and keeps local/test setup lightweight.
- Publisher uses `tenantId` as Kafka key for partition locality.
- DLQ topic: `KAFKA_TOPIC_DLQ_EVENTS` for publish/consumer failures.
- Optional Kafka integration test uses Testcontainers (`RUN_KAFKA_TESTS=true`).

## Additional platform APIs

- Sync queue: `POST /api/v1/sync/queue`, `POST /api/v1/sync/flush`
  - `POST /api/v1/sync/queue` accepts a batched array of sync operations (each with `deviceId`, `idempotencyKey`, Lamport clock, and payload).
  - `POST /api/v1/sync/flush` replays queued `POS_SALE` payloads through checkout (stock + ledger), and attempts mobile-money settlement for MOMO / AIRTEL references.
  - conflict handling: if a sale line lacks stock at flush time, that line is skipped, flagged in queue `error_message`, and remaining lines continue (`SYNCED_WITH_CONFLICT`).
  - manual trigger for tests/ops: `POST /api/v1/admin/jobs/sync-flush/run`
- Dashboard export: `POST /api/v1/dashboards/{role}/export`
- Webhook dispatch logging: persisted in `webhook_delivery_log` via async dispatch service.
- Drill-down pagination/filtering: `GET /api/v1/dashboards/{role}/charts/{widget}/drilldown?page=&size=&from=&to=`
- Accounting execution APIs: `POST /api/v1/accounting/payments`, `POST /api/v1/accounting/reconciliations`
- Anomaly case APIs: `POST /api/v1/anomaly/cases`, `GET /api/v1/anomaly/cases/{role}`
- **MTN MoMo / Airtel Money (POS):** `POST` or `PUT` `/api/v1/integrations/mobile-money/mtn/callback` and `.../airtel/callback` (unauthenticated; send header `X-Webhook-Token` set to `MOBILE_MONEY_MTN_WEBHOOK_SECRET` or `MOBILE_MONEY_AIRTEL_WEBHOOK_SECRET`). Register the operator callback URL with `?tenantId=<uuid>` when the body does not include `tenantId`. The JSON body can be our **canonical** shape (`tenantId`, `transactionId`, `amount`, `currencyCode`, optional `phoneNumber`) or a **provider-native** payload: common fields (e.g. `financialTransactionId`, `referenceId`, `amount`, `currency`, `status`, phone/MSISDN, and nested `data/...` paths) are mapped in `MobileMoneyIngressService`. If the callback omits amount/currency, we infer them from the matching POS tender line when the transaction reference matches.
- **POS receipts:** `POST /api/v1/pos/receipts/print` with `{ "transactionId": "<sales-order-uuid>" }` returns an ESC/POS payload (`escPos`) for 80mm thermal printers, including store header, date/time, cashier, itemized SKU lines, payment methods, total, change, and transaction reference. `POST /api/v1/pos/receipts/{transactionId}/reprint` regenerates the same payload with a reprint marker. If receipt tenders include `MOMO` or `AIRTEL_MONEY` and callback phone is captured, an SMS receipt is dispatched to that phone.
- **POS → inventory:** Link a catalog barcode to a `productId` and optional `reorderPoint` via `POST /api/v1/pos/catalog/items` (or the POS “Add / edit catalog item” form). On successful checkout, stock moves from `POS_DEFAULT_LOCATION` (default `SHOP`) to `POS_SALE_SINK_LOCATION` (default `SOLD`) through `InventoryService#deductForPosSale`. Load on-hand with `POST /api/v1/inventory/receive` (or existing move APIs) to the same location before selling. `LOW_STOCK` is published on `domain.inventory.events` when on-hand at that location is at or below `reorderPoint` after a sale. Set `POS_ALLOW_NEGATIVE_STOCK=true` only if you accept overselling.
- **Customer credit limits (ON_ACCOUNT):** POS checkout enforces customer credit limit from `finance_customers.credit_limit` (FRW) before creating on-account invoices. If exceeded, API returns `422` with `{ error: "CREDIT_LIMIT_EXCEEDED", currentBalance, creditLimit, availableCredit }`. Use `managerOverride: true` in POS checkout request to bypass **only** for authenticated `ACCOUNTING_CONTROLLER` / `CFO`.
- **Inventory pull endpoints:** `GET /api/v1/inventory/low-stock?location=` returns products where on-hand is at/below reorder point at the location, with `currentOnHand`, `reorderPoint`, `daysOfStockRemaining` (based on 30-day POS sales velocity), and `lastRestockedDate`. `GET /api/v1/inventory/expiry-risk?location=&daysAhead=` returns positive-on-hand batches expiring within the lookahead window. Backend roles: `OPS_MANAGER`, `ACCOUNTING_CONTROLLER`.
- **Inventory batches / expiry (FEFO):** `POST /api/v1/inventory/receive` accepts optional `lotCode` and `expiryDate` (ISO date), and `GET /api/v1/inventory/batches?location=` lists on-hand lots. POS deduction uses FEFO (earliest expiry first) when batch rows exist; legacy non-batch balances still deduct normally.
- **Retail ops / till:** `GET|POST /api/v1/retail/products` lists or creates tenant products (SKU, name, optional barcode). `GET /api/v1/retail/till/expected?businessDate=<ISO date>&posRegisterCode=` returns expected cash/mobile totals for that **business day** (timezone `smartaccounting.pos.business-time-zone`, default `Africa/Kigali`). `POST /api/v1/retail/till/close` with `businessDate`, `posRegisterCode`, and counted tender amounts records variance vs expected. The UI lives at `/retail`. Backend roles: `CEO`, `SALES_MANAGER`, `OPS_MANAGER`, `ACCOUNTING_CONTROLLER`.
- **Customer credit status:** `GET /api/v1/finance/customers/{id}/credit-status` returns `currentBalance`, `creditLimit`, `availableCredit`, and oldest overdue invoice metadata.
- **Supplier credit controls:** supplier finance profile stores `creditLimit` and `paymentTermsDays`. `POST /api/v1/finance/supplier-bills` now checks post-save outstanding payable against supplier credit limit; if exceeded, it emits `SUPPLIER_CREDIT_LIMIT_EXCEEDED` notification with channels `["sms","in-app"]` targeted to CFO and message `"Supplier [name] credit limit exceeded. Outstanding: [amount]. Limit: [limit]."`. `GET /api/v1/finance/suppliers/{id}/credit-status` returns `totalOutstanding`, `creditLimit`, `availableCredit`, and `nextDueDate`.
- **Barcode label printing:** `GET /api/v1/retail/products/{productId}/barcode-label` returns a printable Code-128 (ZXing) label payload with barcode image (`barcodePngBase64`), product name, FRW price, and earliest expiry date (if any). If product barcode is missing, an internal barcode is auto-generated and persisted. `POST /api/v1/retail/products/barcode-labels/batch` accepts a list of `{ productId, quantity }` and returns bulk label jobs.
- **Inventory visibility:** `GET /api/v1/inventory/balances?location=` returns on-hand per product at a location (product name when linked).
- **POS on account:** Checkout may include tender `ON_ACCOUNT` plus `onAccountCustomerName`; when the on-account amount is positive, an AR **invoice** is created (due date +14 days) via `ReceivablesPayablesService`.
- **Credit ledger:** `GET /api/v1/finance/invoices?status=&customerName=` returns tenant AR invoices (`FINANCE_READ`) with overdue flagging for open invoices past due; UI at `/finance/credit-ledger` for CEO/CFO/ACCOUNTING/SALES/OPERATIONS.
- **POS multi-currency:** The checkout session currency must match tender totals. Catalog items may be priced in another currency; lines are converted using the latest tenant `fx_rates` row for the pair (**quote-per-base**; inverse used when only the reverse pair exists). Preview conversion with `GET /api/v1/currency/convert?amount=&from=&to=` (CEO/CFO/SALES_MANAGER/OPS_MANAGER/ACCOUNTING_CONTROLLER). Post rates with `POST /api/v1/currency/rates` (CEO/CFO/ACCOUNTING_CONTROLLER) or the **FX rates** screen in the app at `/finance/fx-rates` (same roles).
- **Notifications tenant isolation:** notification rule matching and rule/event listing are tenant-scoped in `NotificationService` (`/api/v1/notifications/rules` and `/api/v1/notifications/events`) to avoid cross-tenant fanout.
- **SMS notifications (channel-aware):** add `"sms"` in notification rule channels, then emit payload with `phoneNumber` or `phoneNumbers` plus optional `message`. Delivery is controlled by `smartaccounting.sms.*` (`SMS_ENABLED`, `SMS_DRY_RUN`, `SMS_PROVIDER_URL`, `SMS_BEARER_TOKEN`, `SMS_SENDER_ID`); default is disabled + dry-run safe.
- **Receipt printing config:** `smartaccounting.receipt.*` is mapped to `RECEIPT_STORE_NAME`, `RECEIPT_STORE_ADDRESS`, `RECEIPT_FOOTER_TEXT`, `RECEIPT_PRINTER_TYPE` (`thermal`, `pdf`, `sms-only`).
- **Label printing config:** `smartaccounting.label.printer-type` is mapped to `LABEL_PRINTER_TYPE` (`thermal-label`, `pdf`, `a4-sheet`).
- **SMS delivery audit:** `GET /api/v1/notifications/sms-deliveries?page=&size=&eventId=` returns per-recipient SMS outcomes (`SENT`, `FAILED`, `DRY_RUN`) with response code and error message for support/ops traceability.
- **SMS CSV export (server-side):** `GET /api/v1/notifications/sms-deliveries/export?eventId=&status=&phone=&limit=` streams CSV (max 5000 rows per request) for operations evidence sharing and archive.
- Webhook security/retries: HMAC-SHA256 signature header + retry/backoff metadata in delivery logs.
- Ledger flow APIs:
  - `POST /api/v1/finance/flows/invoice-issued`
  - `POST /api/v1/finance/flows/payment-received`
  - `POST /api/v1/finance/flows/goods-received`
  - `POST /api/v1/finance/flows/stock-writeoff`
- AR/AP document APIs:
  - `POST /api/v1/finance/invoices`
  - `POST /api/v1/finance/supplier-bills`
- Month-end close workflow APIs:
  - `POST /api/v1/accounting/close/tasks`
  - `POST /api/v1/accounting/close/tasks/{period}/{taskKey}/complete`
  - `GET /api/v1/accounting/close/tasks/{period}`
  - `GET /api/v1/accounting/close/tasks/{period}/critical-path`
- Payment application and matching APIs:
  - `POST /api/v1/accounting/payments/apply`
  - `POST /api/v1/accounting/reconciliation/auto-match`
  - `GET /api/v1/accounting/reconciliation/unmatched`
- Platform remaining modules:
  - Custom field values: `POST /api/v1/platform/custom-fields/values`, `GET /api/v1/platform/custom-fields/values/{entityType}/{entityId}`
  - Scenario library: `POST /api/v1/platform/scenarios`, `GET /api/v1/platform/scenarios/{role}`
  - Tenant feature flags: `POST /api/v1/platform/features/{featureKey}?enabled=true|false`, `GET /api/v1/platform/features`
  - Notifications: `POST /api/v1/notifications/rules`, `GET /api/v1/notifications/rules`, `POST /api/v1/notifications/events`, `GET /api/v1/notifications/events`
  - Action queue: `POST /api/v1/actions/queue`, `GET /api/v1/actions/queue`, `POST /api/v1/actions/process`
  - Tax compliance: `POST /api/v1/tax/profiles`, `POST /api/v1/tax/calculate`
- Inventory CQRS high-priority APIs:
  - `POST /api/v1/inventory/move`
  - `POST /api/v1/inventory/receive`
  - publishes `domain.inventory.events` with stock movement/reservation payloads
- Workflow evaluator:
  - `GET /api/v1/workflow/rules/{id}/evaluate?dryRun=true&sampleAmount=12000`
  - supports condition trees (`and`/`or`) and dry-run diagnostics
- Refresh token hardening:
  - atomic single-use consume
  - scheduled cleanup job
  - concurrent refresh regression test
- Production hardening:
  - Transactional outbox table + retry/backoff relay for Kafka delivery
  - Auth brute-force/rate-limit protection with tenant+IP token bucket strategy
  - Idempotency support using `Idempotency-Key` on:
    - `POST /api/v1/accounting/payments`
    - `POST /api/v1/accounting/payments/apply`
    - `POST /api/v1/finance/journal-entries`
  - Correlation ID support:
    - request header `X-Correlation-Id` (generated if missing, returned in response)
    - MDC log context includes `correlationId`, `tenantId`, and `userId`
  - Projection replay/admin:
    - `POST /api/v1/admin/projections/rebuild?from=&to=`
    - `GET /api/v1/admin/projections/jobs/{id}`
  - Health probes:
    - `GET /actuator/health/liveness`
    - `GET /actuator/health/readiness`
    - readiness includes `db`, `redis`, `rls`, `kafka` (when enabled), and `forecast`
  - Soft-delete archive endpoints:
    - `POST /api/v1/finance/invoices/{id}/archive`
    - `POST /api/v1/finance/supplier-bills/{id}/archive`
    - `POST /api/v1/finance/journal-entries/{id}/archive`
    - archived rows are excluded from reconciliation/projection rollups
  - Pagination hardening on list endpoints:
    - `GET /api/v1/actions/queue?page=&size=`
    - `GET /api/v1/notifications/rules?page=&size=`
    - `GET /api/v1/notifications/events?page=&size=`
    - `GET /api/v1/anomaly/cases/{role}?page=&size=`
    - `GET /api/v1/accounting/reconciliation/unmatched?page=&size=`
- Forecast service integration:
  - backend endpoint uses external forecast service (`FORECAST_BASE_URL`)
  - Dockerized Python forecast service in `forecast-service/`
  - `docker-compose.yml` wires postgres + redis + backend; optional `docker-compose.ai.yml` adds forecast + Kafka
 - Copilot agent run APIs:
   - `POST /api/v1/ai/copilot/agent/run`
   - `POST /api/v1/ai/copilot/agent/run/stream` (SSE)
   - `GET /api/v1/ai/copilot/agent/runs/{id}`
   - `GET /api/v1/ai/copilot/agent/runs?page=&size=`
   - `POST /api/v1/ai/copilot/agent/runs/{id}/cancel`
   - `GET /api/v1/ai/copilot/agent/approvals?page=&size=`
   - `POST /api/v1/ai/copilot/agent/approvals/{id}/approve`
   - `POST /api/v1/ai/copilot/agent/approvals/{id}/reject`
   - `POST /api/v1/ai/copilot/agent/approvals/expire`
   - each run stores plan + tool step trace (`RETRIEVE_CONTEXT`, optional tool calls, `SYNTHESIZE`)
   - stream events include: `run_started`, `step`, `completed`, `failed`, `done`
   - request body for agent run supports:
     - `role` (required)
     - `question` (required)
     - `dryRun` (optional, default from policy)
     - `approveActions` (optional; required for write action execution when approval is enabled)
   - native domain tools now include:
     - `TOOL_FORECAST_NATIVE` (in-run forecast, no polling required)
     - `TOOL_ARAP_AGING` (live overdue AR/AP exposure snapshot)
     - `TOOL_INVENTORY_RISK` (live low-stock risk scan)
     - `TOOL_HR_HEADCOUNT` (live workforce capacity snapshot)
     - `TOOL_SALES_PIPELINE` (live open pipeline snapshot)
     - `TOOL_ACTION_QUEUE_ENQUEUE` (controlled action handoff; prompt must include `action:`)
   - compliance-grade AI audit trail:
     - hash-chained `copilot_agent_audit_log` per tenant
     - run status response includes `auditTrail` with chain hashes for verification
   - tool policy guardrails:
     - per-role tool allow/deny matrix
     - dry-run-safe execution mode for action tools
     - approval-gated write actions (`approveActions=true` when required)
     - pending approvals can be approved/rejected or expired via APIs
   - role-native response shaping:
     - each role maps to a dedicated persona profile (priorities, KPI focus, directive)
     - `query`, `whatif`, `briefing`, and agent runs return persona-aligned framing
     - agent run includes a `ROLE_PERSONA_ALIGNMENT` step in the execution trace
   - run safety controls:
     - per-run max duration timeout (`smartaccounting.copilot.agent.execution.max-duration-seconds`)
     - step cap (`smartaccounting.copilot.agent.execution.max-steps`)
     - explicit cancel endpoint for frontend-triggered cancellation
   - user isolation:
     - run status/list/cancel are scoped to current `tenantId + userId`

## Frontend contract (copilot agent)

Use this section as the source of truth for UI integration.

- Run status enum: `RUNNING | COMPLETED | FAILED | CANCELLED | TIMED_OUT`
- Step status enum: `COMPLETED | BLOCKED | SKIPPED | PREVIEW | PENDING_APPROVAL | CANCELLED | TIMED_OUT | FAILED`
- Approval status enum: `PENDING | APPROVED | REJECTED | EXPIRED | NOT_REQUIRED`

### Start run

- Endpoint: `POST /api/v1/ai/copilot/agent/run`
- Request body:

```json
{
  "role": "cfo",
  "question": "action: escalate overdue invoices and show forecast risk",
  "dryRun": false,
  "approveActions": false
}
```

- Response shape:

```json
{
  "runId": "uuid",
  "status": "COMPLETED",
  "dryRun": false,
  "persona": {
    "label": "CFO Finance Copilot",
    "priorities": ["cash control", "working capital", "close quality"],
    "kpiFocus": ["overdue AR/AP", "quick ratio", "journal quality"],
    "tone": "financial",
    "directive": "Prioritize financial controls, liquidity, and accounting correctness."
  },
  "response": {
    "answer": "string",
    "retrieved": [],
    "toolSignals": {},
    "steps": [],
    "confidence": 0.88,
    "promptVersion": "copilot-rag-v1"
  }
}
```

### Stream run

- Endpoint: `POST /api/v1/ai/copilot/agent/run/stream` (SSE)
- Event names: `run_started`, `step`, `completed`, `failed`, `cancelled`, `timed_out`, `done`, `error`
- Event payload base:

```json
{
  "event": "step",
  "runId": "uuid",
  "payload": {}
}
```

- `step` payload example:

```json
{
  "step": 3,
  "type": "TOOL_ACTION_QUEUE_ENQUEUE",
  "status": "PENDING_APPROVAL"
}
```

### Run retrieval and control

- `GET /api/v1/ai/copilot/agent/runs/{id}`
  - Returns run metadata + `steps` + `auditTrail`
- `GET /api/v1/ai/copilot/agent/runs?page=&size=`
  - Returns only current user runs (same tenant, same user)
- `POST /api/v1/ai/copilot/agent/runs/{id}/cancel`
  - Cancels only if run is currently `RUNNING`

### Approval workflow

- `GET /api/v1/ai/copilot/agent/approvals?page=&size=`
- `POST /api/v1/ai/copilot/agent/approvals/{id}/approve`
- `POST /api/v1/ai/copilot/agent/approvals/{id}/reject`
  - Optional body:

```json
{
  "reason": "Rejected by finance lead"
}
```

- `POST /api/v1/ai/copilot/agent/approvals/expire`
  - Forces immediate expiration pass for pending approvals

### Frontend behavior rules

- Treat `BLOCKED` tool steps as policy outcomes, not hard errors.
- Show `PREVIEW` and `PENDING_APPROVAL` as safe-action UX states.
- On `timed_out`/`cancelled` SSE events, stop stream UI and surface retry option.
- If `status=FAILED`, show `error` from run status endpoint; do not infer from step text.

## H2/RLS Compatibility Matrix

| Area | PostgreSQL behavior | H2 behavior | Guard strategy |
|---|---|---|---|
| Tenant DB session var (`set_config`/`current_setting`) | Session variable set and validated | Function not available | Skip on non-Postgres using JDBC product detection |
| Transaction tenant hook (`TenantDbSessionAspect`) | Applies transaction-local `app.tenant_id` | May throw bad SQL grammar | Catch runtime SQL errors and continue |
| Dashboard tenant hook (`DashboardService#setTenantConfig`) | Sets DB tenant config before queries | `set_config` unsupported | Wrap in guarded try/catch |
| KPI payload reads (`payload::text`) | Uses Postgres cast for JSONB | Cast unsupported | Fallback query without `::text` |
| Snapshot projectors (`jsonb_build_object`) | Native JSONB payloads | Function unsupported | H2 fallback path / tolerant rebuild execution |
| Projection rebuild endpoint | All projectors run in one flow | Individual projectors can fail on SQL dialect | Continue per-projector, report failures in job details |

### Audit scope completed

- Covered all main runtime uses of: `set_config('app.tenant_id', ...)`, `current_setting('app.tenant_id', ...)`, `jsonb_build_object`, `::jsonb`, and `::text`.
- Added/kept explicit fallback behavior so integration tests can run under H2 without weakening Postgres production behavior.
