# Phase 6 manual test checklist

## Copilot approvals
1. Run agent action that requires approval (SSE `approval_required`).
2. Confirm **ApprovalCard** shows description, impact, Approve / Reject / Ask more.
3. Approve → `POST /ai/copilot/agent/approvals/{id}/approve`.
4. Reject with reason → reject endpoint.
5. Badge on Copilot tab reflects pending count; push notification opens Copilot.

## Demand forecast & reorder
1. CEO dashboard → Demand forecast chip or screen.
2. `POST /ai/analytics/demand-forecast` lists gaps; tap **Create PO** opens stock reorder.
3. Foreground app → reorder suggestions card; approve-all creates draft POs; dismiss hides 7 days.

## Anomalies & cash flow
1. Trigger or mock `void_spike` SSE → dashboard alert → detail screen.
2. Mark reviewed / escalate.
3. Cash flow widget → 30-day chart; negative balance warning.

## Receipt delivery
1. Select customer with phone; complete sale.
2. Receipt screen → **Send via WhatsApp** (dry-run until `WHATSAPP_API_TODO` key).
3. Settings → Receipt delivery: ask / always / never.

## USSD MoMo
1. Checkout → MOMO tender → enter USSD code → **Verify payment** (30s timeout).
2. Complete sale only after CONFIRMED.

## Scale
1. Sync large catalog → progress bar; search debounced 200ms, 20/page.
2. Sale history → scroll loads pages; max 50 rows in memory.
3. Barcode scan miss → **Identify by camera** or catalog search fallback.

## Phase 6.1 hardening (wired)
- Anomaly **Mark reviewed** → `POST /anomaly/alerts/reviewed` (creates case if needed).
- Anomaly **Escalate** → action queue item `ANOMALY_ESCALATION`.
- Reorder **Approve all** → `POST /ai/reorder-suggestions/approve-all` (draft PO per low-stock SKU).
- Forecast **Create PO** → `POST /ai/analytics/demand-forecast/create-pos`.

## Automated gates
```bash
cd smartchain-mobile && npm install --legacy-peer-deps && npx tsc --noEmit && npm test
./gradlew compileJava
maestro test e2e/smoke.yaml
maestro test e2e/smoke-full.yaml   # OPS_MANAGER / CEO staging user
```

Integration env vars: [integrations.md](./integrations.md) and `.env.example`.
