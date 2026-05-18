# SmartAccounting Production Deployment Guide

This document describes environment variables, Spring profiles, and AI configuration for production and development. The backend reads secrets from the environment (see `src/main/resources/application.yml`).

## The three rules for production AI config

### Rule 1 — Always set both keys before deploying

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

Without these, the application can still start, but embeddings and copilot completion fall back to placeholder or non-LLM behaviour. **There is often no obvious error for end users** — only poor or meaningless answers. That silent degradation is the most dangerous failure mode.

### Rule 2 — Use placeholder providers in development

Use `placeholder` for both embedding and completion so developers do not need real API keys locally. The repo ships **`src/main/resources/application-dev.yml`** when `spring.profiles.active=dev`.

Example (same idea as `application-dev.yml`):

```yaml
smartaccounting:
  ai:
    embedding:
      provider: placeholder
    completion:
      provider: placeholder
```

### Rule 3 — Emergency hotfix override only

```bash
SMARTACCOUNTING_AI_FAIL_ON_MISSING_PROVIDER_KEYS=false
```

Use only if you must deploy a hotfix while API keys are temporarily unavailable. **Revert to `true` (or unset so `prod` profile defaults apply) immediately after.** Never run production this way long term.

---

## Required environment variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_URL` | Yes | PostgreSQL JDBC URL |
| `DB_USERNAME` | Yes | Database username |
| `DB_PASSWORD` | Yes | Database password |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_KEY_ID` | Yes (prod) | JWT key identifier (`smartaccounting.security.jwt-key-id`) |
| `REDIS_HOST` | Yes | Redis host |
| `REDIS_PORT` | Yes | Redis port (default `6379` if omitted in some stacks) |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated allowed browser origins |
| `OPENAI_API_KEY` | Yes (prod) | OpenAI API key for embeddings (`smartaccounting.ai.embedding.api-key`) |
| `ANTHROPIC_API_KEY` | Yes (prod) | Anthropic API key for completions (`smartaccounting.ai.completion.api-key`) |
| `MOBILE_MONEY_MTN_WEBHOOK_SECRET` | Yes (if MTN MoMo) | MTN MoMo callback shared secret |
| `MOBILE_MONEY_AIRTEL_WEBHOOK_SECRET` | Yes (if Airtel) | Airtel Money callback shared secret |
| `SMS_ENABLED` | Yes (prod SMS) | Set `true` when sending real SMS |
| `SMS_PROVIDER_URL` | Yes (if SMS) | SMS gateway URL |
| `SMS_BEARER_TOKEN` | Yes (if SMS) | SMS gateway bearer token |
| `SMS_SENDER_ID` | Yes (if SMS) | SMS sender id / name |
| `FORECAST_BASE_URL` | Yes (if forecast service) | Forecast microservice base URL |
| `KAFKA_ENABLED` | No | `true` to enable Kafka pipeline |

Optional / operational:

| Variable | Description |
|----------|-------------|
| `SMARTACCOUNTING_AI_FAIL_ON_MISSING_PROVIDER_KEYS` | When `true` with `prod` profile defaults, fails startup if OpenAI/Anthropic keys are missing while providers require them. |
| `KAFKA_BOOTSTRAP_SERVERS` | Kafka brokers when `KAFKA_ENABLED=true` |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API base URL (build-time) |

---

## Spring profiles

| Profile | Use case |
|---------|----------|
| `dev` | Local development — use placeholder AI providers; no paid keys required |
| `prod` | Production — real AI providers; `application-prod.yml` enables strict AI key validation by default |

Activate production profile, for example:

```bash
SPRING_PROFILES_ACTIVE=prod
```

### Local API + database (Docker)

Flyway requires the **pgvector** extension. From the repository root (next to `gradlew.bat` and `docker-compose.yml`):

```bash
docker compose up -d
.\gradlew.bat bootRun --args="--spring.profiles.active=dev"
```

Defaults match local Compose + Spring config: Postgres **`localhost:5433`** (host → container 5432), database **`smartchain`**, user/password **`smartchain`**; Redis **`localhost:6379`**. The Vite app uses **`VITE_API_BASE_URL=http://localhost:8080`** (`frontend/.env.development`). If the browser shows **`ERR_CONNECTION_REFUSED`** to port **8080**, the Spring Boot process is not running or failed during startup (check logs for Flyway or DB errors).

If Postgres was created earlier **without** pgvector and migrations failed, reset the volume and recreate: `docker compose down -v` then `docker compose up -d`.

---

## AI provider configuration

### Production (real AI)

```yaml
smartaccounting:
  ai:
    embedding:
      provider: openai
      model: text-embedding-3-small
      api-key: ${OPENAI_API_KEY}
    completion:
      provider: anthropic
      model: claude-sonnet-4-20250514
      api-key: ${ANTHROPIC_API_KEY}
```

### Development (no cost)

```yaml
smartaccounting:
  ai:
    embedding:
      provider: placeholder
    completion:
      provider: placeholder
```

---

## Embeddings reindex after switching to real keys

Legacy hash-based vectors are not compatible with OpenAI embeddings. After first deploy with real `OPENAI_API_KEY`, rebuild embeddings.

- **All tenants:** `POST /api/v1/ai/admin/reindex-all` (CEO or CFO JWT).
- **One tenant:** `POST /api/v1/ai/admin/reindex?tenantId={tenantId}` with headers `Authorization: Bearer …` and `X-Tenant-Id: {tenantId}`.

Each call deletes existing rows for the tenant(s) then re-inserts chunks.

---

## Emergency override (AI keys)

```bash
SMARTACCOUNTING_AI_FAIL_ON_MISSING_PROVIDER_KEYS=false
```

**Not recommended.** Use only for a short hotfix window, then restore validation and keys.

---

## Pre-deployment checklist

### Infrastructure

- [ ] PostgreSQL running with durable storage / named volume
- [ ] Redis running with durable storage / named volume
- [ ] Daily backup cron (or managed backups) configured and tested
- [ ] `CORS_ALLOWED_ORIGINS` includes the production web origin(s)

### Backend

- [ ] `spring.profiles.active=prod`
- [ ] All required environment variables set
- [ ] `OPENAI_API_KEY` valid and funded
- [ ] `ANTHROPIC_API_KEY` valid and funded
- [ ] Flyway migrations run cleanly on the target database
- [ ] `./gradlew test` — all passing
- [ ] `./gradlew acceptanceReport` — no failures (if you use this task)

### Frontend

- [ ] `VITE_API_BASE_URL` points at the production API
- [ ] `npm run build` — clean
- [ ] `npm run test:e2e` — all passing (e.g. 5/5 smoke)

### After first deploy

- [ ] Trigger reindex for all tenants (`POST /api/v1/ai/admin/reindex-all`) or per-tenant reindex
- [ ] Smoke test copilot with a real question; answer should be coherent and role-appropriate
- [ ] Confirm MoMo callback URL registered with MTN (if used)
- [ ] Confirm SMS sending works (if enabled)
- [ ] Create first real tenant via self-service signup (or your onboarding path)

---

## Post-deploy runbook

### 1. Verify backend is up

```bash
curl https://api.smartaccounting.rw/actuator/health/readiness
```

Expect `status` **UP** and components such as **db** and **redis** healthy (exact JSON shape depends on Spring Boot version).

### 2. Run database migrations

Flyway runs on startup. In logs, confirm migrations applied successfully (no Flyway errors).

### 3. Trigger full reindex (first deploy with real OpenAI key)

`reindex-all` processes tenants with status **ACTIVE** or **TRIAL** only (see `TenantService`).

```bash
curl -X POST "https://api.smartaccounting.rw/api/v1/ai/admin/reindex-all" \
  -H "Authorization: Bearer {ceo-or-cfo-token}" \
  -H "X-Tenant-Id: {any-valid-tenant-for-your-user}"
```

Wait for JSON. Confirm `failed` is `0` and each tenant in `results` shows **OK** (with chunk counts). If any **FAILED**, fix the underlying error and re-run.

### 4. Copilot smoke test

```bash
curl -X POST "https://api.smartaccounting.rw/api/v1/ai/copilot/query" \
  -H "Authorization: Bearer {ceo-token}" \
  -H "X-Tenant-Id: {tenantId}" \
  -H "Content-Type: application/json" \
  -d "{\"role\":\"CEO\",\"question\":\"What is our revenue trend this month?\"}"
```

Expect a coherent answer grounded in tenant data (after reindex). If answers feel generic or empty, re-run **reindex-all** and confirm embeddings exist in Postgres.

### 5. MoMo webhook smoke test

```bash
curl -X POST "https://api.smartaccounting.rw/api/v1/integrations/mobile-money/mtn/callback?tenantId={tenantId}" \
  -H "X-Webhook-Token: {MTN_WEBHOOK_SECRET}" \
  -H "Content-Type: application/json" \
  -d "{\"financialTransactionId\":\"TEST-001\",\"amount\":1000,\"currency\":\"RWF\",\"status\":\"SUCCESSFUL\"}"
```

Expect HTTP **200**. Without a matching POS tender, the callback may remain unmatched — that can still indicate the path is reachable.

### 6. SMS smoke test

```bash
curl -X POST "https://api.smartaccounting.rw/api/v1/notifications/events" \
  -H "Authorization: Bearer {ceo-token}" \
  -H "X-Tenant-Id: {tenantId}" \
  -H "Content-Type: application/json" \
  -d "{\"channels\":[\"sms\"],\"phoneNumber\":\"+250788000000\",\"message\":\"SmartAccounting deployment smoke test\"}"
```

Then `GET /api/v1/notifications/sms-deliveries` (with auth) and confirm delivery rows as appropriate for your SMS configuration (`SMS_DRY_RUN`, provider, etc.).

### 7. Till smoke test

```bash
curl "https://api.smartaccounting.rw/api/v1/retail/till/expected?businessDate=2026-05-12&posRegisterCode=TILL-01" \
  -H "Authorization: Bearer {token-with-retail-access}" \
  -H "X-Tenant-Id: {tenantId}"
```

Expect **200** and a JSON body with expected tender totals (values depend on data).

### 8. Optional — rate limits and quotas

If your deployment enables copilot or trial rate limits, verify behaviour matches policy (for example HTTP **429** when exceeded). This repository may not ship a specific copilot rate limit; treat this step as **policy-specific**.

### All checks passed?

Monitor logs for the first hour: **500**s on AI routes, **FAILED** reindex rows, and unexpected MoMo unmatched volume.

---

## Related paths in this repository

- Backend config: `src/main/resources/application.yml`, `application-dev.yml`, `application-prod.yml`
- Admin AI routes: `src/main/java/com/smartaccounting/controller/AiAdminController.java` (`/api/v1/ai/admin/reindex`, `/reindex-all`)
- Startup AI key validation: `src/main/java/com/smartaccounting/config/AiProviderKeysStartupCheck.java`
- Frontend env example: `frontend/.env.production.example`
