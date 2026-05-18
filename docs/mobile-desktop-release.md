# Mobile & desktop release

## React Native (`smartchain-mobile`)

```bash
cd smartchain-mobile
eas build --profile preview --platform android
eas build --profile production --platform all
```

Set `PROD_API_URL` in `eas.json` per profile. Configure certificate pinning via Android `network_security_config.xml` and iOS ATS exceptions for your API host SHA-256.

## Electron (`smartchain-desktop`)

```bash
cd smartchain-desktop
npm run build
npm run dist
```

`electron-builder.yml` publishes installers to GitHub Releases. macOS notarisation: sign with Apple Developer ID, then `xcrun notarytool submit`.

## Environment

| Variable | Purpose |
|----------|---------|
| `PROD_API_URL` | HTTPS API base for mobile/desktop builds |
| `VITE_API_BASE_URL` | Web (empty = same-origin nginx proxy) |
