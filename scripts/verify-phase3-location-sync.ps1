# Phase 3 location-scoped inventory verification (live API).
# Usage:
#   $env:API_BASE = "http://localhost:8080"
#   .\scripts\verify-phase3-location-sync.ps1

$ErrorActionPreference = "Stop"
$Base = if ($env:API_BASE) { $env:API_BASE.TrimEnd("/") } else { "http://localhost:8080" }
$Api = "$Base/api/v1"

$TenantId = if ($env:CONTRACT_TENANT_ID) { $env:CONTRACT_TENANT_ID } else { "11111111-1111-4111-8111-111111111111" }
$UserId = if ($env:CONTRACT_USER_ID) { $env:CONTRACT_USER_ID } else { "33333333-3333-4333-8333-333333333304" }
$Username = if ($env:CONTRACT_USERNAME) { $env:CONTRACT_USERNAME } else { "ops" }
$Password = if ($env:CONTRACT_PASSWORD) { $env:CONTRACT_PASSWORD } else { "password" }
$BranchBLocationId = "b1111111-1111-4111-8111-111111111102"
$DemoWaterProductId = "22222222-2222-4222-8222-222222222201"

Write-Host "==> Login ($Username)"
$loginBody = @{
  username = $Username
  password = $Password
  tenantId = $TenantId
  userId = $UserId
  mfaChallengeId = $null
  otpCode = $null
} | ConvertTo-Json

$login = Invoke-RestMethod -Method Post -Uri "$Api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.token
if (-not $token) { throw "Login failed: no token" }

function Get-Balances($locationCode) {
  $uri = "$Api/inventory/balances?location=$locationCode"
  $headers = @{
    Authorization = "Bearer $token"
    "X-Tenant-Id" = $TenantId
    "X-User-Id" = $UserId
    "X-Location-Id" = $BranchBLocationId
  }
  return Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
}

function Get-Qty($rows, $productId) {
  $row = $rows | Where-Object { $_.productId -eq $productId } | Select-Object -First 1
  if (-not $row) { return $null }
  return [decimal]$row.quantity
}

Write-Host "==> SHOP balances"
$shop = Get-Balances "SHOP"
$shopWater = Get-Qty $shop $DemoWaterProductId

Write-Host "==> BRANCH_B balances"
$branch = Get-Balances "BRANCH_B"
$branchWater = Get-Qty $branch $DemoWaterProductId

Write-Host "Demo water — SHOP: $shopWater  BRANCH_B: $branchWater"

if ($null -eq $shopWater -or $null -eq $branchWater) {
  throw "FAIL: demo water missing at one or both locations (run seed-staging-two-locations.sql)"
}
if ($shopWater -eq $branchWater) {
  throw "FAIL: SHOP and BRANCH_B counts match — location filter or seed is broken"
}

Write-Host "PASS: SHOP and BRANCH_B report different inventory counts."
