# smartchain-mobile — npm install

## `--legacy-peer-deps` required

```bash
cd smartchain-mobile
npm install --legacy-peer-deps
# or: npm ci --legacy-peer-deps
```

**Cause:** `react-native-get-random-values@2` declares a peer dependency on React Native ≥ 0.81. This project is on **RN 0.76.5**, so a strict `npm install` fails with a peer conflict that looks unrelated to fiscal/crypto dependencies.

**Fix when:** React Native is upgraded to ≥ 0.81, or peer deps are pinned/overridden explicitly in `package.json`.

**Until then:** All install commands in CI, scripts, and onboarding must use `--legacy-peer-deps`, or rely on `smartchain-mobile/.npmrc` (see below).

## `.npmrc` (recommended)

`smartchain-mobile/.npmrc` sets `legacy-peer-deps=true` so local `npm install` / `npm ci` work without extra flags. CI workflows still pass `--legacy-peer-deps` explicitly for clarity and in case `.npmrc` is missing in a fork.

## CI references

- `.github/workflows/ci.yml` — mobile job
- `.github/workflows/mobile-phase-gate.yml`
- `.github/workflows/mobile-release.yml`
