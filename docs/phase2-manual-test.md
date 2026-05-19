# Phase 2 manual test checklist

Run on a device or emulator with backend + mobile pointed at the same environment.

## Customer + price list + loyalty

1. Create a customer with a price list assigned (manager/web or mobile form).
2. At POS checkout, tap **Select customer** and pick that customer.
3. Scan/add a product that has a price list line — unit price should differ from base.
4. Complete sale — verify loyalty points increase on customer detail (after sync if online).

## On-account credit

1. Set customer `credit_limit` > 0.
2. At checkout, select customer — **On account** tender chip appears.
3. Complete sale with ON_ACCOUNT tender — credit balance increases.
4. Open **Credit statement** — transaction listed; record a payment.

## Promotions

1. Sync active promotions (Promotion manage screen).
2. Build cart meeting DISCOUNT_PCT minimum — discount line appears on checkout.
3. Add BUY_X_GET_Y product quantities — free/discount line applied.

## Layaway

1. Select customer, add lines, enter tender ≥ 30% of total.
2. Tap **Layaway** — order appears in Layaway list; variant stock reduced.
3. Record payment until balance is 0; **Mark collected**.
4. Cancel another layaway — stock restored.

## Quotes

1. Build cart, save quote from Quote builder.
2. Share quote (system share sheet).
3. From Quote list, **Convert to sale** — POS checkout pre-filled; complete sale.

## Regression

- `npx tsc --noEmit` in `smartchain-mobile`
- `npm test` in `smartchain-mobile`
