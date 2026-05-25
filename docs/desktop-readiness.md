# Desktop release readiness

SmartChain Desktop (`smartchain-desktop/`) packages the **web frontend** in Electron for HQ/back-office and **counter POS on Windows PCs** (USB printer + HID scanner).

**Not a replacement for** `smartchain-mobile` (till-first, RRA EFD queue, Phase 5 hardware). Use mobile for Rwanda shop-floor go-live; desktop for office + optional fixed checkout PC.

---

## Automated gates

```bash
cd frontend && npm ci && npm run build
cd smartchain-desktop && npm ci && npm run verify
```

CI: `.github/workflows/ci.yml` job `desktop` · Tagged releases: `desktop-v*` → `.github/workflows/desktop-release.yml`.

---

## Build installers (Windows)

```powershell
# 1. Point API at production/staging
copy smartchain-desktop\.env.production.example frontend\.env.production
# Edit VITE_API_BASE_URL=https://api.rw.smartaccounting.app/api/v1

# 2. API OAuth for desktop shell
# OAUTH2_REDIRECT_URI=smartchain://auth/oauth2/callback

# 3. Build
cd smartchain-desktop
npm ci
npm run build:win
# Output: smartchain-desktop/release/
```

macOS: `npm run build:mac` (notarize with Apple Developer ID before wide distribution).  
Linux: `npm run build:linux`.

---

## Manual QA checklist

See [desktop-manual-test.md](./desktop-manual-test.md).

| # | Test | Pass |
|---|------|------|
| 1 | Installer launches; hash routes work (`#/login`, `#/dashboard/ceo`) | [ ] |
| 2 | Username/password login against staging/prod API | [ ] |
| 3 | Google/Microsoft OAuth via system browser → app receives `smartchain://` callback | [ ] |
| 4 | Tray → **POS** opens `#/pos` | [ ] |
| 5 | USB HID scanner adds product to cart (auto-connect) | [ ] |
| 6 | CASH sale → **Print receipt** on USB/serial thermal printer | [ ] |
| 7 | Offline: disable network → complete sale → banner shows queued count | [ ] |
| 8 | Re-enable network → banner syncs queue without manual refresh | [ ] |
| 9 | Settings → list serial printers; link Google/Microsoft | [ ] |
| 10 | CEO dashboard KPIs load (same as web) | [ ] |

---

## Secrets & configuration

| Item | Where |
|------|--------|
| `VITE_API_BASE_URL` | `frontend/.env.production` before `build:frontend` |
| `OAUTH2_REDIRECT_URI` | API env: `smartchain://auth/oauth2/callback` |
| IdP redirect URIs | API host only (`…/api/v1/auth/oauth2/callback/google`) |
| Code signing (Windows) | Optional EV cert for SmartScreen trust |
| macOS notarization | `xcrun notarytool` after `build:mac` |
| Auto-update feed | GitHub Releases (`electron-builder` publish config) |

---

## Known limits (v0.2)

- No SSL certificate pinning (standard HTTPS only).
- No dedicated till open/close shell (use web POS or mobile till).
- No cash drawer, pole display, or label printer integration (mobile Phase 5).
- RRA fiscal follows **server/web** EBM config, not mobile EFD offline queue.
- Field POS on Android: prefer **smartchain-mobile**.

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Ops | | |
