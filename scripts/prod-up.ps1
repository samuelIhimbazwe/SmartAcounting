# Start production-style Docker stack (Postgres + Redis + API + nginx web).
param(
  [string]$EnvFile = ".env.production",
  [switch]$Build
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path $EnvFile)) {
  Write-Host "Missing $EnvFile — copy from .env.production.example and set secrets." -ForegroundColor Red
  exit 1
}

$buildFlag = if ($Build) { "--build" } else { "" }
Write-Host "Starting prod stack (env: $EnvFile)..." -ForegroundColor Cyan
Invoke-Expression "docker compose -f docker-compose.prod.yml --env-file $EnvFile up -d $buildFlag"

Write-Host ""
Write-Host "Web UI:  http://localhost (or WEB_PORT from env)" -ForegroundColor Green
Write-Host "Smoke:   .\scripts\prod-smoke.ps1 -LoginFirst" -ForegroundColor Green
Write-Host "Logs:    docker compose -f docker-compose.prod.yml logs -f api" -ForegroundColor Green
