# Production path — implementation guide

This document maps the eight-step production rollout to what is implemented in this repository and what you still configure in your cloud provider.

## 1. Hosting baseline

| Deliverable | Location |
|-------------|----------|
| Postgres + Redis (dev) | `docker-compose.yml` |
| Full stack (API + web + DB + Redis) | `docker-compose.prod.yml` |
| API container | `Dockerfile` (non-root, healthcheck) |
| Static web + reverse proxy | `frontend/Dockerfile`, `deploy/nginx/nginx.conf` |
| One-command prod start | `scripts/prod-up.ps1` |
| DB backup script | `scripts/backup.sh` (cron on host; adjust container name) |

**You still provide:** TLS certificate (Let's Encrypt / load balancer), managed Postgres/Redis in cloud, DNS, firewall.

```powershell
copy .env.production.example .env.production
# Edit secrets, then:
.\scripts\prod-up.ps1 -Build
```

Web: `http://localhost` (port 80). API is proxied at `/api/*`.

## 2. Secrets and `prod` profile

| Deliverable | Location |
|-------------|----------|
| Env template | `.env.production.example`, `.env.example` |
| Strict AI keys in prod | `application-prod.yml` → `fail-on-missing-provider-keys: true` |
| No demo login accounts in prod | `ProdAuthUsersConfig` (`@Profile("prod")`) — DB users only |
| Deployment checklist | `docs/deployment.md` |

## 3. Identity (DB-backed production auth)

| Deliverable | Location |
|-------------|----------|
| DB-only `UserDetailsService` in prod | `ProdAuthUsersConfig`, `DatabaseUserDetailsService` |
| Dev: in-memory demo users + DB | `AuthUsersConfig` (`@Profile("!prod")`), `CompositeUserDetailsService` (DB first) |
| Login returns tenant/user/role | `LoginIdentityService`, extended `AuthResponse` |
| Frontend stores resolved IDs | `auth.ts`, `authStore.ts`, `LoginPage.tsx` |

Production users must exist in `users` with `password_hash` (self-service signup or admin insert). Demo `ceo`/`password` is **disabled** when `spring.profiles.active=prod`.

## 4. Reindex and copilot smoke

| Deliverable | Location |
|-------------|----------|
| Provider status endpoint | `GET /api/v1/ai/copilot/provider-status` |
| Admin reindex | `POST /api/v1/ai/admin/reindex-all` (see `docs/deployment.md`) |
| Post-deploy smoke | `scripts/prod-smoke.ps1` |

```powershell
.\scripts\prod-smoke.ps1 -LoginFirst   # dev stack with demo login
.\scripts\prod-smoke.ps1 -BaseUrl https://api.example.com -AccessToken "..."
```

## 5. MoMo and SMS (production configuration)

| Deliverable | Location |
|-------------|----------|
| Webhook HMAC-style token check | `MobileMoneyWebhookController` (rejects if secret unset) |
| Prod env vars | `MOBILE_MONEY_*`, `SMS_*` in `.env.production.example` |

**You still provide:** MTN/Airtel merchant contracts, callback URLs, live SMS aggregator.

## 6. RRA / EBM

| Status | Notes |
|--------|--------|
| Implemented | `EbmService` HTTP client, config UI `/compliance/ebm` |
| Not in repo | Official RRA certified SDK — configure `ebmApiUrl` to your certified gateway |

## 7. UI gaps (partial)

| Item | Status |
|------|--------|
| Transaction forms → real APIs | Fixed in `frontend/src/shared/api/forms.ts` |
| Bank / PO / HR / EBM pages | Sprint 1 routes (see prior commit) |
| Full PO GRN wizard, payment runs UI | Backlog |

## 8. CI/CD and monitoring

| Deliverable | Location |
|-------------|----------|
| GitHub Actions CI | `.github/workflows/ci.yml` (compile, test, build images on `main`) |
| Actuator health | `/actuator/health/readiness`, `/liveness` |
| Prometheus metrics | `/actuator/prometheus` (expose via reverse proxy in prod) |

**You still provide:** deploy pipeline to your registry, staging environment, alerting (PagerDuty/Datadog), log aggregation.

## Local development (unchanged)

```powershell
docker compose up -d
.\gradlew.bat bootRun --args="--spring.profiles.active=dev"
cd frontend; npm run dev
```

Login: `ceo` / `password`, tenant `11111111-1111-4111-8111-111111111111`.
