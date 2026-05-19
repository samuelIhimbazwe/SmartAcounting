# Phase 3 migration plan — multi-location & multi-register

## Assumptions today (to remove)

| Area | Current | Files |
|------|---------|-------|
| Location | String `location_code` / `SHOP` / `MAIN`; no FK | `InventoryService`, `PosProperties`, mobile `DEFAULT_LOCATION` |
| Register | Free-text `posRegisterCode` (`REG1`, `REG-01`) | `tillSlice`, `posSlice`, `TillOpenScreen`, `CheckoutScreen` |
| Till session | One OPEN per register; `GET /current` per cashier | `TillSessionService`, `tillSessions.ts` |
| Stock | `product_variants.stock_qty` (single warehouse) | WMDB schema v5, `inventoryRepository` |
| Price list | Tenant-wide; customer list only | `PriceListService`, `pricingEngine.ts` |
| Dashboard | Tenant KPIs; inventory alerts hardcode `SHOP` | `DashboardService`, `OwnerDashboardScreen` |
| API headers | `X-Tenant-Id`, `X-User-Id` only | `client.ts` |

## Target model

- **Location** (UUID): branches with `location_code` for legacy inventory join.
- **Register** (UUID): per-location tills; sessions link `register_id` + `location_id`.
- **StockLevel**: `product_id` + `variant_id` + `location_id` + qty (mobile WMDB + backend table).
- **StockTransfer**: DRAFT → IN_TRANSIT → RECEIVED / CANCELLED.
- **PriceList**: `scope` GLOBAL \| LOCATION; optional `location_id`.
- **Checkout price order**: branch list → customer list → global list → base price.

## Execution order

1. Flyway V71 + Java entities/repos/services/controllers
2. `LocationContext` + `X-Location-Id` filter; extend till/checkout/inventory scoping
3. Mobile schema v6, `locationSlice`, headers, location picker, register picker
4. Floor view, HQ dashboard `scope=all`, stock transfer screens
5. Jest: location scoping, transfer FSM, price resolution order
