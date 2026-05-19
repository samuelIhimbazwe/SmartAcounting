# Phase 5 — Mobile hardware ecosystem

## Dependencies

Install in `smartchain-mobile` with `--legacy-peer-deps` (see [mobile-npm-install.md](./mobile-npm-install.md)):

- `react-native-tcp-socket` — ESC/POS over TCP (port 9100)
- `react-native-zeroconf` — mDNS printer discovery (Android)
- `react-native-print` — AirPrint / system print (iOS + Android fallback)

Native linking: run `npx react-native run-android` after `npm install` so Gradle picks up new modules.

## Print routing (Android)

1. **Network** — preferred route + configured IP/mDNS printer → `NetworkPrinterService`
2. **Bluetooth** — existing `BluetoothPrinterService` (unchanged API)
3. **System** — `react-native-print` HTML receipt when no hardware route or on failure

**iOS:** AirPrint only via `SystemPrintService` + receipt HTML on `ReceiptScreen`.

Configure under **Settings → Receipt printer** (route + network list) and **Settings → POS hardware** (drawer, PLU, scanner, pole).

## Manual verification checklist

- [ ] Network printer: discover or add IP, test print, sale receipt over TCP
- [ ] Bluetooth: still pairs and prints (regression)
- [ ] Cash drawer kick after CASH sale; manual open on Till (manager roles) + audit `CASH_DRAWER_OPEN`
- [ ] PLU barcode: weight embedded → correct qty in cart
- [ ] Scanner mode: 5 rapid scans &lt; 3s without drops
- [ ] Labels: product detail + GRN receive prompt (ZPL / ESC/POS)
- [ ] iOS: AirPrint from receipt screen
- [ ] Pole display (optional): TCP lines on welcome / line / total / thank-you

## Tests

```bash
cd smartchain-mobile
npm test -- --testPathPattern="pluParser|escposCashDrawer"
npx tsc --noEmit
```

### Jest “4 skipped” in local runs

All four skips come from `__tests__/staging.apiContract.test.ts` when `STAGING_API_URL` is unset (and two more cases skip without `CONTRACT_*` creds). That is **staging environment**, not missing hardware — expected on a dev laptop. CI runs them when secrets are configured. There are no hardware-dependent `it.skip` tests in the mobile suite; physical printer/scanner checks use [phase5-hardware.md](./phase5-hardware.md) manual checklist instead.

Coverage baseline: [phase5-coverage-baseline.txt](./phase5-coverage-baseline.txt).
