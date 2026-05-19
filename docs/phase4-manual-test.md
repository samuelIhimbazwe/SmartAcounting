# Phase 4 manual test — RRA fiscal compliance

## Prerequisites

- Flyway **V72** applied (`tax_configs`, fiscal columns on `sales_orders`, `z_reports`).
- Demo tenant has default **18% inclusive** tax config seeded.
- Mobile WMDB schema **v7**.

## VAT at checkout

1. Add items totaling **1180 FRW** (inclusive).
2. Cart shows **Subtotal (ex VAT) ~1000** and **VAT ~180**.
3. Complete sale — receipt shows VAT breakdown and fiscal mock signature/QR.

## Tax-exempt customer

1. Set customer `taxExempt` in backend (or local customer record).
2. Checkout — VAT line shows **exempt**, EFD skipped, receipt notes exempt.

## EFD queue

1. Simulate offline sale or force EFD queue (mock API throws until wired).
2. Sync bar shows **N EFD pending**.
3. Reconnect — pending count clears after retry.

## Z-report at till close

1. Open till → complete sales → **Close till**.
2. Z-report preview JSON appears; POST stored on server.
3. Audit log entry `TILL_CLOSE` appended.

## Audit log (CEO / controller)

1. Open fiscal audit screen (when routed in app).
2. Filter by `SALE` / date; export CSV via share sheet.
3. Run `verifyLocalAuditChain()` — chain intact.

## RRA_API_TODO before production

- Confirm eBMS/EFD endpoint, auth, and payload in `smartchain-mobile/src/services/efd.ts`.
- Confirm TIN regex and lookup in `smartchain-mobile/src/fiscal/tinValidation.ts`.
- Replace mock fiscal signature/QR in `RraEfdService` with live RRA response fields.
