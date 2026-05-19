# Phase 1 manual test script (smartchain-mobile)

Run on a device or emulator with backend staging configured.

## 1. Variant GRN → sell per variant

1. Open **Stock** → product with S/M/L variants (seed from product detail if needed).
2. **Receive without PO** → pick supplier → add line for variant M → batch `LOT-M1`, qty 2 → post GRN.
3. Open **POS** → scan variant M barcode → complete sale.
4. Confirm variant M stock decreased; receipt print shows variant label and lot if Bluetooth printer connected.

## 2. Offline PO → sync → GRN

1. Enable airplane mode.
2. **Suppliers** → create supplier → **Create PO** with two lines → save draft.
3. Go online; confirm PO syncs (`needsSync` cleared on PO detail).
4. **Receive PO** → post GRN → stock increases for both lines.

## 3. Expiry list

1. Receive stock with expiry within 30 days.
2. Open **Expiring** (or Copilot shortcut) → product appears.
3. Sell via POS using **Apply FEFO batch** → oldest expiry batch used.

## 4. Serial on receipt

1. Product detail → enable **Serial tracking**.
2. Receive with serial `IMEI-TEST-001`.
3. Checkout → enter serial → complete sale.
4. **Receipt** → print → footer includes `SN: IMEI-TEST-001`.

## 5. Reorder → draft PO

1. Set reorder point above current stock on a product; set preferred supplier.
2. **Low stock** or **Reorder** → **Create PO draft** → verify supplier and qty prefilled.
3. Multi-line PO: add second product line before send.

## 6. i18n smoke

1. Switch app language FR/RW in settings.
2. Open Stock receive, PO create, and POS checkout — labels use translated keys (no raw key names).

## Automated checks (dev machine)

```bash
cd smartchain-mobile
npx tsc --noEmit
npm test
npx jest src/api/__contracts__/procurement.test.ts --verbose
```
