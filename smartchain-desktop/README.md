# SmartAccounting Desktop

Electron **v0.2** shell around the shared React frontend (`../frontend`), with native printer, HID barcode scanner, SQLite offline queue, and auto-update.

**Release checklist:** [docs/desktop-readiness.md](../docs/desktop-readiness.md) · **Manual QA:** [docs/desktop-manual-test.md](../docs/desktop-manual-test.md)



For production API deployment, AI keys, and CORS, see **[`docs/deployment.md`](../docs/deployment.md)**.



## Run (development)



```powershell

cd smartchain-desktop

npm install

npm run dev

```



This starts Vite on `http://localhost:5173` and opens Electron pointed at that URL.



## OAuth2 social login (Google / Microsoft)



The web app uses an **authorization-code** flow. In the browser, the API redirects to `http://localhost:5173/auth/oauth2/callback`.



The desktop app uses a **custom URL scheme** so tokens return to Electron after the user signs in via the system browser:



| Setting | Desktop value |

|---------|----------------|

| `OAUTH2_REDIRECT_URI` (API env) | `smartchain://auth/oauth2/callback` |



**API environment** (same Google/Microsoft client IDs as the web stack):



```bash

GOOGLE_CLIENT_ID=...

GOOGLE_CLIENT_SECRET=...

MICROSOFT_CLIENT_ID=...

MICROSOFT_CLIENT_SECRET=...

OAUTH2_REDIRECT_URI=smartchain://auth/oauth2/callback

```



**IdP redirect URIs** (unchanged — still the API callback, not `smartchain://`):



- `http://localhost:8080/api/v1/auth/oauth2/callback/google`

- `http://localhost:8080/api/v1/auth/oauth2/callback/microsoft`



**Flow:**



1. User clicks “Continue with Google” in the desktop app.

2. The system browser opens the API authorize URL.

3. After IdP login, the API issues JWTs and redirects to `smartchain://auth/oauth2/callback?...`.

4. The OS launches or focuses SmartChain; the main process forwards tokens to the renderer.



On Windows dev, the `smartchain://` handler is registered when you run `npm run dev` from this folder.



## Build installers



```powershell

npm run build:win    # NSIS + portable

npm run build:mac

npm run build:linux

```



Set `VITE_API_BASE_URL` in `../frontend/.env.production` before `npm run build:frontend` so the packaged app calls the correct API.

Desktop builds set `VITE_DESKTOP_BUNDLE=true`, which uses **relative asset paths** (`base: ./`) and **hash routing** (`#/login`, `#/dashboard/ceo`, …) so navigation works under `file://` in the packaged app. Dev mode (`npm run dev`) still uses `http://localhost:5173` with normal browser routing.



## Native capabilities (preload)



Exposed on `window.smartAccountingDesktop`: printer, scanner, offline SQLite queue, export save dialog, tray navigation, and `auth.startOAuth` / `auth.onOAuth2Callback` for desktop OAuth.

## Production checklist

1. Set `VITE_API_BASE_URL` in `frontend/.env.production` (see `.env.production.example` in this folder).
2. Run `npm run build:win` (or mac/linux) — uses `VITE_DESKTOP_BUNDLE=true` for hash routing and relative assets.
3. Configure API with `OAUTH2_REDIRECT_URI=smartchain://auth/oauth2/callback` and Google/Microsoft secrets.
4. Register IdP redirect URIs on the **API** host (`…/api/v1/auth/oauth2/callback/google`, etc.).
5. After building, run a normal `npm run build` in `frontend/` if you also deploy the web app (desktop build overwrites `frontend/dist`).

### In-app features (desktop)

| Feature | Location |
|---------|----------|
| Settings, printers, link Google/Microsoft | User menu → **Settings & devices** (`/settings`) |
| Offline sale sync | Automatic when back online (SQLite queue) |
| Receipt print | POS → **Print receipt** (native USB/serial first) |
| Tray shortcuts | POS, Dashboard, Quit |

