# SmartChain Backend v3.0

Enterprise multi-tenant ERP backend implementation aligned to the SmartChain v3.0 architecture and delivery scope.

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

## Run

```bash
./gradlew bootRun
```

Windows PowerShell:

```powershell
.\gradlew.bat bootRun
```

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
- Dashboard export: `POST /api/v1/dashboards/{role}/export`
- Webhook dispatch logging: persisted in `webhook_delivery_log` via async dispatch service.
- Drill-down pagination/filtering: `GET /api/v1/dashboards/{role}/charts/{widget}/drilldown?page=&size=&from=&to=`
- Accounting execution APIs: `POST /api/v1/accounting/payments`, `POST /api/v1/accounting/reconciliations`
- Anomaly case APIs: `POST /api/v1/anomaly/cases`, `GET /api/v1/anomaly/cases/{role}`
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
  - `docker-compose.yml` wires postgres + redis + forecast + backend
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
     - per-run max duration timeout (`smartchain.copilot.agent.execution.max-duration-seconds`)
     - step cap (`smartchain.copilot.agent.execution.max-steps`)
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
# SmartAcounting
