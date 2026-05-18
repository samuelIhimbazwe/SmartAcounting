param(
  [switch]$SkipDeps,
  [switch]$SkipInstall,
  [switch]$IncludeAi
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendRoot = Join-Path $projectRoot 'frontend'

Write-Host "Project root: $projectRoot"

if (-not $SkipDeps) {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker is not installed or not in PATH."
    Write-Host "Install Docker Desktop or rerun with -SkipDeps and provide local Postgres/Redis."
    exit 1
  }
  if ($IncludeAi) {
    Write-Host "Starting Docker dependencies (core + AI: postgres, redis, backend, forecast, kafka)..."
    docker compose -f docker-compose.yml -f docker-compose.ai.yml up -d
  } else {
    Write-Host "Starting Docker dependencies (core: postgres, redis, backend)..."
    docker compose up -d
  }
} else {
  Write-Host "Skipping dependency startup (-SkipDeps)."
}

$backendCommand = "Set-Location '$projectRoot'; .\gradlew.bat bootRun"
$frontendInstall = if ($SkipInstall) { "" } else { "npm install; " }
$frontendCommand = "Set-Location '$frontendRoot'; ${frontendInstall}npm run dev"

Write-Host "Opening backend terminal..."
Start-Process powershell.exe -ArgumentList @(
  '-NoExit',
  '-Command',
  $backendCommand
)

Write-Host "Opening frontend terminal..."
Start-Process powershell.exe -ArgumentList @(
  '-NoExit',
  '-Command',
  $frontendCommand
)

Write-Host ""
Write-Host "Started services:"
Write-Host "- Backend:  http://localhost:8080"
Write-Host "- Frontend: http://localhost:5173"
Write-Host ""
Write-Host "Options:"
Write-Host "- -SkipDeps   : do not run docker compose up -d"
Write-Host "- -SkipInstall: skip npm install before npm run dev"
Write-Host "- -IncludeAi  : also start docker-compose.ai.yml (forecast + kafka)"
