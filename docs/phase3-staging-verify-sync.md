# Phase 3 staging verification — location-scoped inventory sync

Run **before starting Phase 4** (reorder/expiry automation depends on correct branch stock).

## Prerequisites

1. Backend deployed with Flyway **V71+**.
2. Run `scripts/seed-staging-two-locations.sql` on staging DB (edit `tenant_id` / `user_id` if needed).
3. Mobile app points at staging API; log in as a user with access to both locations.

## Steps

1. Login → location picker → select **Branch B** (`location_code` = `BRANCH_B`).
2. Open **Stock** → pull to refresh (or leave and return to trigger sync).

## Network tab (required)

On `GET /api/v1/inventory/balances` (and batch sync if called):

| Check | Expected |
|-------|----------|
| Query | `?location=BRANCH_B` (value = `selectedLocationCode`, not the UUID) |
| Header | `X-Location-Id: <uuid>` for Branch B row in `locations` table |
| Header | `X-Tenant-Id`, `Authorization` present |

**Note:** `X-Location-Id` is the location **UUID** from `GET /locations`. The `location` query param is the **code** (`SHOP`, `BRANCH_B`).

## Data check

With demo seed script quantities:

| Product | SHOP | BRANCH_B |
|---------|------|----------|
| Demo Water | 120 | **40** |
| Demo Flour | 8 | **95** |
| Demo Airtime | 500 | **12** |

If SHOP and BRANCH_B show the same counts, sync is still wrong — do not start Phase 4.

## Rollback tags

| Tag | When to use |
|-----|-------------|
| `phase3-hardened` | After location sync fix + create-transfer UI (`a153d37`) |
| `phase3-complete` | Initial Phase 3 merge (before hardened sync) |

```bash
git checkout phase3-hardened   # safe for Phase 4 baseline
```
