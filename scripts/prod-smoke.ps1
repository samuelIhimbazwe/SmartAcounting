# Post-deploy smoke checks (local prod compose or remote API).
# Usage:
#   .\scripts\prod-smoke.ps1
#   .\scripts\prod-smoke.ps1 -BaseUrl https://api.yourdomain.com -TenantId ... -AccessToken ...

param(
  [string]$BaseUrl = "http://localhost",
  [string]$TenantId = "11111111-1111-4111-8111-111111111111",
  [string]$AccessToken = "",
  [switch]$LoginFirst
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
  param([string]$Method, [string]$Path, [object]$Body = $null, [hashtable]$Headers = @{})
  $uri = "$BaseUrl$Path"
  $params = @{ Method = $Method; Uri = $uri; Headers = $Headers }
  if ($Body) {
    $params.Body = ($Body | ConvertTo-Json)
    $params.ContentType = "application/json"
  }
  return Invoke-RestMethod @params
}

Write-Host "=== SmartAccounting production smoke ===" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"

Write-Host "`n[1] Readiness" -ForegroundColor Yellow
$healthPath = if ($BaseUrl -match "localhost$") { "/api/actuator/health/readiness" } else { "/actuator/health/readiness" }
try {
  $health = Invoke-Api GET $healthPath
  Write-Host "  Status: $($health.status)" -ForegroundColor Green
} catch {
  Write-Host "  FAILED: $_" -ForegroundColor Red
  exit 1
}

Write-Host "`n[2] Copilot provider status" -ForegroundColor Yellow
try {
  $ai = Invoke-Api GET "/api/v1/ai/copilot/provider-status"
  Write-Host "  Mode: $($ai.mode) | Configured: $($ai.configured)"
  Write-Host "  $($ai.hint)"
} catch {
  Write-Host "  WARN: $_" -ForegroundColor DarkYellow
}

if ($LoginFirst) {
  Write-Host "`n[3] Login (demo — dev only)" -ForegroundColor Yellow
  $login = Invoke-Api POST "/api/v1/auth/login" @{
    username = "ceo"
    password = "password"
    tenantId = $TenantId
    userId = "33333333-3333-4333-8333-333333333301"
  }
  $AccessToken = $login.token
  if ($login.tenantId) { $TenantId = $login.tenantId }
  Write-Host "  Token received (tenant $($login.tenantId))"
}

if ($AccessToken) {
  $headers = @{
    Authorization = "Bearer $AccessToken"
    "X-Tenant-Id" = $TenantId
    "X-User-Id" = "33333333-3333-4333-8333-333333333301"
  }
  Write-Host "`n[4] Copilot query" -ForegroundColor Yellow
  try {
    $copilot = Invoke-Api POST "/api/v1/ai/copilot/query" @{ role = "CEO"; question = "What is our revenue trend?" } $headers
    $answer = $copilot.answer
    if ($answer) {
      Write-Host "  Answer preview: $($answer.Substring(0, [Math]::Min(120, $answer.Length)))..."
    }
  } catch {
    Write-Host "  WARN: copilot query failed: $_" -ForegroundColor DarkYellow
  }
}

Write-Host "`n=== Smoke complete ===" -ForegroundColor Cyan
Write-Host "Next: POST /api/v1/ai/admin/reindex-all with CEO/CFO token after first prod deploy with OpenAI key."
