# SmartChain k6 Performance Smoke

These scripts provide backend performance validation aligned to SmartChain v3.0 section 16.

## Prerequisites

- Running SmartChain API locally (default `http://localhost:8080`)
- `k6` installed and available on PATH

## Environment variables

- `BASE_URL` (default: `http://localhost:8080`)
- `SC_USERNAME` (default: `cfo`)
- `SC_PASSWORD` (default: `password`)
- `SC_TENANT_ID` (optional UUID; auto-generated if omitted)
- `SC_USER_ID` (optional UUID; auto-generated if omitted)

## Run

```bash
k6 run perf/k6/dashboard-kpi.js
k6 run perf/k6/copilot-query.js
```

Combined smoke + report:

- PowerShell: `./perf/smoke.ps1`
- Bash: `bash ./perf/smoke.sh`

Combined markdown output:

- `build/reports/performance/performance-smoke-report.md`

## Targets encoded in scripts

- KPI p95 duration < 500ms
- Copilot query p95 duration < 1500ms
- Error rate < 1%
