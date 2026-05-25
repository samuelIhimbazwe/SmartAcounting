# Desktop manual test

Run against **staging or production** API with a packaged build (`npm run build:win`) unless noted.

## Auth

1. Launch installer → login screen loads (`#/login`).
2. Log in as `monitor-cashier@rw.smartaccounting.app` (or CEO) with demo password.
3. Optional: **Continue with Google** — browser opens → approve → app focuses with session.
4. User menu → **Settings & devices** → printers listed (may be empty without hardware).

## POS (fixed PC)

1. Tray icon → **POS** (or navigate to `#/pos`).
2. Scan barcode with USB scanner — line added to cart.
3. Complete **CASH** sale.
4. **Print receipt** — verify thermal output.
5. Disconnect network → add another sale → message indicates offline queue.
6. Reconnect → yellow banner shows sync; pending count returns to 0.

## Back office

1. Log in as CEO → `#/dashboard/ceo` KPIs render.
2. Copilot sidebar opens; send a test prompt.
3. Export drill-down CSV → save dialog writes file.

## Auto-update (packaged only)

1. Publish a higher version to GitHub Releases.
2. Launch older build → within ~1h (or restart) update prompt appears.
