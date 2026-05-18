# Quick smoke test for retail flow improvements (B1/B2)
# Re-runnable: auto-creates a PO with lines when seeded POs have none.
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8080'
$tenantId = '11111111-1111-4111-8111-111111111111'
$ceoUserId = '33333333-3333-4333-8333-333333333301'
$opsUserId = '33333333-3333-4333-8333-333333333304'
$cfoUserId = '33333333-3333-4333-8333-333333333302'

# Demo seed references (V40 / V41)
$demoProductId = '22222222-2222-4222-8222-222222222201'
$demoSupplierId = 'b1111111-1111-4111-8111-111111111104'
$demoSupplierName = 'East-African Dairy Co'
$demoCustomerId = 'c1111111-1111-4111-8111-111111111104'

function Write-Result($name, $ok, $detail) {
    $mark = if ($ok) { 'PASS' } else { 'FAIL' }
    Write-Host "[$mark] $name - $detail"
}

function Get-AuthHeaders($username, $password, $userId) {
    $login = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method POST -ContentType 'application/json' -Body (@{
        username = $username
        password = $password
        tenantId = $tenantId
        userId   = $userId
    } | ConvertTo-Json)
    $token = if ($login.token) { $login.token } else { $login.accessToken }
    return @{
        Authorization = "Bearer $token"
        'X-Tenant-Id' = $tenantId
        'X-User-Id'   = $userId
    }
}

function Find-PoWithLines($opsHeaders) {
    $page = Invoke-RestMethod -Uri "$base/api/v1/procurement/purchase-orders?size=20" -Headers $opsHeaders
    $candidates = @($page.content)
    if (-not $candidates -or $candidates.Count -eq 0) {
        return $null
    }
    foreach ($po in $candidates) {
        if ($po.status -notin @('CONFIRMED', 'OPEN', 'SENT', 'PARTIALLY_RECEIVED')) {
            continue
        }
        $detail = Invoke-RestMethod -Uri "$base/api/v1/procurement/purchase-orders/$($po.id)" -Headers $opsHeaders
        if ($detail.lines -and $detail.lines.Count -gt 0) {
            return @{ Po = $po; Detail = $detail; Source = "existing $($po.poNumber)" }
        }
    }
    return $null
}

function New-SmokePurchaseOrder($opsHeaders) {
    $createBody = @{
        supplierId           = $demoSupplierId
        supplierName         = $demoSupplierName
        expectedDeliveryDate = (Get-Date).AddDays(7).ToString('yyyy-MM-dd')
        currencyCode         = 'RWF'
        notes                = 'Smoke-test auto PO'
        lines                = @(@{
            productId       = $demoProductId
            sku             = 'DEMO-WATER'
            productName     = 'Demo Water 500ml'
            orderedQuantity = 20
            unitCost        = 500
        })
    } | ConvertTo-Json -Depth 5
    $po = Invoke-RestMethod -Uri "$base/api/v1/procurement/purchase-orders/create" -Method POST -Headers $opsHeaders -ContentType 'application/json' -Body $createBody
    Invoke-RestMethod -Uri "$base/api/v1/procurement/purchase-orders/$($po.id)/confirm" -Method POST -Headers $opsHeaders | Out-Null
    $detail = Invoke-RestMethod -Uri "$base/api/v1/procurement/purchase-orders/$($po.id)" -Headers $opsHeaders
    return @{ Po = $po; Detail = $detail; Source = "created $($po.poNumber)" }
}

function Ensure-SmokePurchaseOrder($opsHeaders) {
    $found = Find-PoWithLines $opsHeaders
    if ($found) {
        return $found
    }
    Write-Host "  (no seeded PO with lines - creating smoke PO)" -ForegroundColor DarkYellow
    return New-SmokePurchaseOrder $opsHeaders
}

Write-Host "=== SmartAccounting retail smoke test ===" -ForegroundColor Cyan

# 1. Login (CEO)
try {
    $ceoHeaders = Get-AuthHeaders 'ceo' 'password' $ceoUserId
    Write-Result 'Login' $true 'token received'
} catch {
    Write-Result 'Login' $false $_.Exception.Message
    exit 1
}

# 2. Inventory batches
try {
    $batches = Invoke-RestMethod -Uri "$base/api/v1/inventory/batches?location=SHOP" -Headers $ceoHeaders
    Write-Result 'Inventory batches' $true "$($batches.Count) batch rows"
} catch {
    Write-Result 'Inventory batches' $false $_.Exception.Message
}

# 3. Expiry risk (OPS role)
try {
    $opsHeaders = Get-AuthHeaders 'ops' 'password' $opsUserId
    $riskUri = "$base/api/v1/inventory/expiry-risk?location=SHOP" + '&daysAhead=30'
    $risk = Invoke-RestMethod -Uri $riskUri -Headers $opsHeaders
    Write-Result 'Expiry risk' $true "$($risk.Count) at-risk lots"
} catch {
    Write-Result 'Expiry risk' $false $_.Exception.Message
}

# 4. Purchase orders list
try {
    $pos = Invoke-RestMethod -Uri "$base/api/v1/procurement/purchase-orders?size=5" -Headers $ceoHeaders
    $count = if ($pos.content) { $pos.content.Count } else { 0 }
    Write-Result 'Purchase orders list' $true "$count items (page)"
} catch {
    Write-Result 'Purchase orders list' $false $_.Exception.Message
}

# 5. Customer phone (B2)
try {
    $credit = Invoke-RestMethod -Uri "$base/api/v1/finance/customers/$demoCustomerId/credit-status" -Headers $ceoHeaders
    $phoneOk = $null -ne $credit.phone -and $credit.phone -ne ''
    Write-Result 'Customer phone (B2)' $phoneOk "phone=$($credit.phone)"
} catch {
    Write-Result 'Customer phone (B2)' $false $_.Exception.Message
}

# 6. SMS reminder job (CFO has PROJECTION_REBUILD)
try {
    $cfoHeaders = Get-AuthHeaders 'cfo' 'password' $cfoUserId
    $sms = Invoke-RestMethod -Uri "$base/api/v1/admin/jobs/sms-reminder/run" -Method POST -Headers $cfoHeaders
    Write-Result 'SMS reminder job' $true "sent=$($sms.remindersSent) scanned=$($sms.openInvoicesScanned)"
} catch {
    Write-Result 'SMS reminder job' $false $_.Exception.Message
}

# 7. Block expired receive (B1)
$recvBody = @{
    productId            = $demoProductId
    location             = 'SHOP'
    quantity             = 1
    costPrice            = 100
    supplierRef          = 'SMOKE-TEST'
    expiryDate           = '2020-01-01'
    allowExpiredReceipt  = $false
} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$base/api/v1/inventory/receive" -Method POST -Headers $opsHeaders -ContentType 'application/json' -Body $recvBody | Out-Null
    Write-Result 'Expired receive blocked (B1)' $false 'expected 4xx but succeeded'
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Result 'Expired receive blocked (B1)' ($code -ge 400) "HTTP $code"
}

# 8. GRN with rejection — uses existing PO with lines or creates one
try {
    if (-not $opsHeaders) {
        $opsHeaders = Get-AuthHeaders 'ops' 'password' $opsUserId
    }
    $bundle = Ensure-SmokePurchaseOrder $opsHeaders
    $po = $bundle.Po
    $line = $bundle.Detail.lines[0]
    $grnBody = @{
        notes               = 'Smoke test GRN'
        allowExpiredReceipt = $false
        lines               = @(@{
            poLineId         = $line.id
            productId        = $line.productId
            sku              = $line.sku
            productName      = $line.productName
            expectedQuantity = $line.orderedQuantity
            receivedQuantity = 10
            rejectedQuantity = 2
            unitCost         = $line.unitCost
            expiryDate       = (Get-Date).AddMonths(6).ToString('yyyy-MM-dd')
            location         = 'SHOP'
        })
    } | ConvertTo-Json -Depth 6
    $grn = Invoke-RestMethod -Uri "$base/api/v1/procurement/purchase-orders/$($po.id)/grn" -Method POST -Headers $opsHeaders -ContentType 'application/json' -Body $grnBody
    $posted = Invoke-RestMethod -Uri "$base/api/v1/procurement/purchase-orders/grn/$($grn.id)/confirm" -Method POST -Headers $opsHeaders
    $ok = $posted.status -eq 'POSTED'
    Write-Result 'GRN confirm with rejection (B1)' $ok "grn=$($grn.grnNumber) via $($bundle.Source)"
} catch {
    Write-Result 'GRN confirm with rejection (B1)' $false $_.Exception.Message
}

Write-Host ""
Write-Host "Done. Frontend: http://localhost:5173" -ForegroundColor Green
