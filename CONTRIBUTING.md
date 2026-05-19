# Contributing to SmartAccounting

## Repository layout

| Path | Stack |
|------|--------|
| `/` (root) | Spring Boot backend, Flyway, Gradle |
| `frontend/` | Web UI (Vite) |
| `smartchain-mobile/` | React Native POS (RN 0.76) |
| `smartchain-desktop/` | Electron desktop |

## Backend

```bash
./gradlew test
./gradlew bootRun
```

See [README.md](./README.md) for database, Docker, and API details.

## Web frontend

```bash
cd frontend
npm install
npm run build
```

## Mobile (`smartchain-mobile`)

**npm install requires `--legacy-peer-deps`** (or use the repo’s `.npmrc` in that folder).

- **Cause:** `react-native-get-random-values@2` peer conflict on React Native 0.76.
- **Fix when:** RN is upgraded to ≥ 0.81, or peer deps are pinned in `package.json`.
- **Until then:** Use `--legacy-peer-deps` in any script/docs that runs `npm install` / `npm ci` outside `smartchain-mobile`, and ensure CI keeps the flag (workflows already do).

```bash
cd smartchain-mobile
npm install --legacy-peer-deps   # .npmrc also sets legacy-peer-deps=true
npm test
npx tsc --noEmit
```

Full note: [docs/mobile-npm-install.md](./docs/mobile-npm-install.md).

Phase gates and coverage: [docs/mobile-phase-gates.md](./docs/mobile-phase-gates.md).

## Pull requests

- Keep changes scoped; match existing naming and patterns.
- Mobile: `tsc --noEmit` and `npm test` must pass before merge.
- Backend: `./gradlew test` (and integration tests when touching sync/DB).
