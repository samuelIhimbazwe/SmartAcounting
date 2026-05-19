# Phase 3 manual test checklist

## Setup

1. Apply Flyway **V71** and seed at least two `locations` + `registers` per tenant (or call `GET /locations` to auto-create default SHOP).
2. Grant `user_location_access` for test users on both locations.

## Location scoping

1. Log in as user with 2+ locations → location picker appears.
2. Select location A → stock/POS/till use `X-Location-Id` header.
3. Settings → Switch location → B; till session cleared; data re-scoped.

## Multi-register

1. Open till at location A → pick register REG-01 → complete open.
2. Second device/user opens REG-02 at same location.
3. Manager → Till → Floor view → both sessions listed (refreshes ~60s).

## HQ dashboard

1. CEO/CFO → Dashboard → “All branches” card loads (`GET /analytics/dashboard?scope=all`).

## Stock transfer

1. Manager at A creates transfer to B (`POST /stock/transfers`).
2. Stock deducted at A (`stock_levels`).
3. Manager at B → Stock → Transfers → Receive.

## Branch pricing

1. Create LOCATION-scoped price list for branch B.
2. Checkout at B uses branch price before customer/global/base.

## Phase 4 prep (triage)

| Item | Action |
|------|--------|
| HQ dashboard SQL | **Leave mocked** — `_note` on `GET /analytics/dashboard?scope=all` |
| Mobile create transfer | **Done** — Stock → Transfers → Create transfer |
| HQ product CRUD gating | **Deferred** — i18n key `locations.phase4Note`; branch view-only for now |
| Inventory sync location | **Fixed** — `getSyncLocationCode()` → `?location=` on balances/batches/expiry |

Verify before Phase 4: switch to Branch B → pull to refresh Stock → quantities match Branch B only.

## Automated gates

```bash
cd smartchain-mobile && npx tsc --noEmit && npm run test:coverage
```
