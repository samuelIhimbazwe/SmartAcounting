Param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Username = "cfo",
    [string]$Password = "password",
    [string]$TenantId = "11111111-1111-1111-1111-111111111111",
    [string]$UserId = "22222222-2222-2222-2222-222222222222"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$k6Dir = Join-Path $root "k6"
$reportDir = Join-Path $PWD "build\reports\performance"
New-Item -ItemType Directory -Path $reportDir -Force | Out-Null

$dashboardJson = Join-Path $reportDir "dashboard-kpi-summary.json"
$copilotJson = Join-Path $reportDir "copilot-query-summary.json"
$reportMd = Join-Path $reportDir "performance-smoke-report.md"

$env:BASE_URL = $BaseUrl
$env:SC_USERNAME = $Username
$env:SC_PASSWORD = $Password
$env:SC_TENANT_ID = $TenantId
$env:SC_USER_ID = $UserId

Write-Host "Running dashboard KPI smoke..."
k6 run (Join-Path $k6Dir "dashboard-kpi.js") --summary-export $dashboardJson

Write-Host "Running copilot query smoke..."
k6 run (Join-Path $k6Dir "copilot-query.js") --summary-export $copilotJson

Write-Host "Generating combined report..."
python (Join-Path $k6Dir "generate_summary.py") $dashboardJson $copilotJson $reportMd

Write-Host "Done. Report: $reportMd"
