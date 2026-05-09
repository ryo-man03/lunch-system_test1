# Comprehensive Admin Functions Test (Simple Version)
# Tests all admin features with dummy data

$baseUrl = "http://localhost:8081"
$testResults = @()
$testCategories = @{}

Write-Host "`n============================================================" -ForegroundColor Cyan  
Write-Host "     COMPREHENSIVE ADMIN FUNCTIONS TEST" -ForegroundColor Cyan
Write-Host "     Test Server: $baseUrl" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Helper function
function Test-API {
    param(
        [string]$Category,
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    Write-Host "  [$Category] $Name" -ForegroundColor Yellow -NoNewline
    
    try {
        $params = @{
            Uri         = "$baseUrl$Endpoint"
            Method      = $Method
            ContentType = "application/json"
            WebSession  = $script:session
            TimeoutSec  = 10
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params['Body'] = ($Body | ConvertTo-Json -Depth 5)
        }
        
        $response = Invoke-RestMethod @params
        
        if ($response.success) {
            Write-Host " OK" -ForegroundColor Green
            $script:testResults += @{Category = $Category; Name = $Name; Status = "OK" }
            
            if (-not $script:testCategories.ContainsKey($Category)) {
                $script:testCategories[$Category] = @{OK = 0; WARN = 0; FAIL = 0 }
            }
            $script:testCategories[$Category].OK++
            
            return $response
        }
        else {
            Write-Host " WARN" -ForegroundColor Yellow
            Write-Host "      -> $($response.error)" -ForegroundColor Yellow
            $script:testResults += @{Category = $Category; Name = $Name; Status = "WARN"; Error = $response.error }
            
            if (-not $script:testCategories.ContainsKey($Category)) {
                $script:testCategories[$Category] = @{OK = 0; WARN = 0; FAIL = 0 }
            }
            $script:testCategories[$Category].WARN++
            
            return $response
        }
    }
    catch {
        Write-Host " FAIL" -ForegroundColor Red
        Write-Host "      -> $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += @{Category = $Category; Name = $Name; Status = "FAIL"; Error = $_.Exception.Message }
        
        if (-not $script:testCategories.ContainsKey($Category)) {
            $script:testCategories[$Category] = @{OK = 0; WARN = 0; FAIL = 0 }
        }
        $script:testCategories[$Category].FAIL++
        
        return $null
    }
}

# ===== 1. AUTHENTICATION =====
Write-Host "`n[1. AUTHENTICATION]" -ForegroundColor Magenta

try {
    $loginBody = @{email = "admin@example.com"; password = "admin123" } | ConvertTo-Json
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session
    
    Write-Host "  [Auth] Admin Login OK" -ForegroundColor Green
    Write-Host "      -> Logged in as: $($loginResponse.admin.email)" -ForegroundColor Gray
    $script:session = $session
    $script:testResults += @{Category = "Auth"; Name = "Admin Login"; Status = "OK" }
    $script:testCategories["Auth"] = @{OK = 1; WARN = 0; FAIL = 0 }
}
catch {
    Write-Host "  [Auth] Admin Login FAIL" -ForegroundColor Red
    exit 1
}

Test-API -Category "Auth" -Name "Session Check" -Method GET -Endpoint "/api/auth/session"

# ===== 2. DASHBOARD =====
Write-Host "`n[2. DASHBOARD & STATISTICS]" -ForegroundColor Magenta

$statsResult = Test-API -Category "Dashboard" -Name "Dashboard Stats" -Method GET -Endpoint "/api/dashboard/stats"
if ($statsResult) {
    Write-Host "      -> Intake: $($statsResult.stats.intake), Paid: $($statsResult.stats.paid), Picked: $($statsResult.stats.picked), Total: ¥$($statsResult.stats.total)" -ForegroundColor Gray
}

# ===== 3. MENU MANAGEMENT =====
Write-Host "`n[3. MENU MANAGEMENT]" -ForegroundColor Magenta

$menuResult = Test-API -Category "Menu" -Name "Get Menu List" -Method GET -Endpoint "/api/menu"
if ($menuResult) {
    Write-Host "      -> Total Menus: $($menuResult.items.Count)" -ForegroundColor Gray
}

$newMenuBody = @{
    storeId     = "S001"
    name        = "Integration Test Menu"
    price       = 777
    description = "Menu created by integration test"
}
$newMenuResult = Test-API -Category "Menu" -Name "Add New Menu" -Method POST -Endpoint "/api/menu/add" -Body $newMenuBody

if ($newMenuResult -and $newMenuResult.menu) {
    $menuId = $newMenuResult.menu.id
    Write-Host "      -> Created Menu ID: $menuId" -ForegroundColor Gray
    
    $updateMenuBody = @{price = 888; description = "Updated by integration test" }
    Test-API -Category "Menu" -Name "Update Menu" -Method PUT -Endpoint "/api/menu/$menuId" -Body $updateMenuBody
}

# ===== 4. ORDER MANAGEMENT =====
Write-Host "`n[4. ORDER MANAGEMENT]" -ForegroundColor Magenta

$allOrdersResult = Test-API -Category "Orders" -Name "Get All Orders" -Method GET -Endpoint "/api/orders"
if ($allOrdersResult) {
    Write-Host "      -> Total Orders: $($allOrdersResult.orders.Count)" -ForegroundColor Gray
}

$todayOrdersResult = Test-API -Category "Orders" -Name "Get Today Orders" -Method GET -Endpoint "/api/orders/today"
if ($todayOrdersResult) {
    Write-Host "      -> Today Orders: $($todayOrdersResult.orders.Count)" -ForegroundColor Gray
}

$intakeBody = @{
    userId     = "TEST9999"
    cart       = @(@{ menuId = "M001"; quantity = 1 })
    pickupDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
}
$intakeResult = Test-API -Category "Orders" -Name "Create Order Intake" -Method POST -Endpoint "/api/intake" -Body $intakeBody

if ($intakeResult -and $intakeResult.intakeCode) {
    $intakeCode = $intakeResult.intakeCode
    Write-Host "      -> Intake Code: $intakeCode" -ForegroundColor Gray
    
    $paymentBody = @{intakeCode = $intakeCode; paymentMethod = "cash" }
    $paymentResult = Test-API -Category "Orders" -Name "Process Payment" -Method POST -Endpoint "/api/payment" -Body $paymentBody
    
    if ($paymentResult -and $paymentResult.orderCode) {
        $orderCode = $paymentResult.orderCode
        Write-Host "      -> Order Code: $orderCode" -ForegroundColor Gray
        
        $pickupBody = @{orderCode = $orderCode }
        Test-API -Category "Orders" -Name "Process Pickup" -Method POST -Endpoint "/api/pickup" -Body $pickupBody
    }
}

# ===== 5. STORE MANAGEMENT =====
Write-Host "`n[5. STORE MANAGEMENT]" -ForegroundColor Magenta

$storesResult = Test-API -Category "Stores" -Name "Get Store List" -Method GET -Endpoint "/api/stores"
if ($storesResult) {
    Write-Host "      -> Total Stores: $($storesResult.stores.Count)" -ForegroundColor Gray
}

$newStoreBody = @{name = "Test Store Integration"; contactPhone = "000-9999-9999"; active = $true }
Test-API -Category "Stores" -Name "Add New Store" -Method POST -Endpoint "/api/stores/add" -Body $newStoreBody

# ===== 6. USER MANAGEMENT =====
Write-Host "`n[6. USER MANAGEMENT]" -ForegroundColor Magenta

$newUserBody = @{
    studentId  = "S2026999"
    name       = "Test User Integration"
    email      = "testint@university.ac.jp"
    phone      = "090-9999-9999"
    department = "Test Dept"
    grade      = 1
}
Test-API -Category "Users" -Name "Create User" -Method POST -Endpoint "/api/users" -Body $newUserBody

# ===== 7. COUPON MANAGEMENT =====
Write-Host "`n[7. COUPON MANAGEMENT]" -ForegroundColor Magenta

$null = Test-API -Category "Coupons" -Name "Get Coupon List" -Method GET -Endpoint "/api/coupons"

$newCouponBody = @{
    code       = "TESTINT2026"
    type       = "fixed"
    value      = 100
    validFrom  = (Get-Date).ToString("yyyy-MM-dd")
    validTo    = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    usageLimit = 5
    active     = $true
}
Test-API -Category "Coupons" -Name "Create Coupon" -Method POST -Endpoint "/api/coupons" -Body $newCouponBody

# ===== 8. INVENTORY =====
Write-Host "`n[8. INVENTORY MANAGEMENT]" -ForegroundColor Magenta

Test-API -Category "Inventory" -Name "Get Inventory List" -Method GET -Endpoint "/api/inventory/list"

$setInventoryBody = @{
    menuId    = "M002"
    date      = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
    total     = 100
    available = 100
    reserved  = 0
}
Test-API -Category "Inventory" -Name "Set Inventory" -Method POST -Endpoint "/api/inventory" -Body $setInventoryBody

# ===== 9. SYSTEM SETTINGS =====
Write-Host "`n[9. SYSTEM SETTINGS]" -ForegroundColor Magenta

Test-API -Category "Settings" -Name "Get System Settings" -Method GET -Endpoint "/api/settings"

$updateSettingsBody = @{orderTimeLimit = "15:00"; maintenanceMode = $false }
Test-API -Category "Settings" -Name "Update Settings" -Method PUT -Endpoint "/api/settings" -Body $updateSettingsBody

# ===== TEST SUMMARY =====
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "                    TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$okCount = ($testResults | Where-Object { $_.Status -eq "OK" }).Count
$warnCount = ($testResults | Where-Object { $_.Status -eq "WARN" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $testResults.Count

Write-Host "`nOverall Results:" -ForegroundColor White
Write-Host "  Total Tests: $totalCount" -ForegroundColor White
Write-Host "  [OK] Success: $okCount" -ForegroundColor Green
Write-Host "  [WARN] Warning: $warnCount" -ForegroundColor Yellow
Write-Host "  [FAIL] Failed: $failCount" -ForegroundColor Red

$successRate = if ($totalCount -gt 0) { [math]::Round(($okCount / $totalCount) * 100, 1) } else { 0 }
$color = if ($successRate -ge 90) { "Green" }elseif ($successRate -ge 75) { "Yellow" }else { "Red" }
Write-Host "`nSuccess Rate: $successRate%" -ForegroundColor $color

Write-Host "`nResults by Category:" -ForegroundColor Cyan
foreach ($category in $testCategories.Keys | Sort-Object) {
    $cat = $testCategories[$category]
    $total = $cat.OK + $cat.WARN + $cat.FAIL
    $rate = if ($total -gt 0) { [math]::Round(($cat.OK / $total) * 100, 0) } else { 0 }
    $bar = "#" * [math]::Floor($rate / 5)
    $color = if ($rate -ge 90) { "Green" }elseif ($rate -ge 75) { "Yellow" }else { "Red" }
    
    Write-Host ("  {0,-15} {1,3}% [{2,-20}] OK:{3} WARN:{4} FAIL:{5}" -f $category, $rate, $bar, $cat.OK, $cat.WARN, $cat.FAIL) -ForegroundColor $color
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "              Test completed successfully!" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan
