# Option B — ensure Postgres is up and Flyway applies V60 demo seed (Rwanda retail FRW figures).
# Usage: .\scripts\seed-demo.ps1
# Then start backend: .\gradlew.bat bootRun --args="--spring.profiles.active=dev"
# Login: tenant 11111111-1111-4111-8111-111111111111 (see V41 dev seed for username/password)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Starting Postgres (docker compose)..."
docker compose up -d postgres

Write-Host "Waiting for Postgres on localhost:5433..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  docker compose exec -T postgres pg_isready -U smartchain -d smartchain 2>$null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $ready) {
  Write-Error "Postgres did not become ready in time."
}

Write-Host @"

Demo tenant (V60): 11111111-1111-4111-8111-111111111111
Flyway runs V60__demo_sales_seed.sql on next backend boot (paid invoices, POS sales, KPI snapshots).

CEO dashboard should show ~12.45M FRW current-period revenue (~+8% vs prior month).

Set in .env / IDE run config:
  ANTHROPIC_API_KEY=sk-ant-...   (Option A — live copilot prose)
  DEMO_TENANT_ID=11111111-1111-4111-8111-111111111111

Start backend:  .\gradlew.bat bootRun
Start frontend: cd frontend; npm run dev

Check copilot config: curl http://localhost:8080/api/v1/ai/copilot/provider-status

"@
