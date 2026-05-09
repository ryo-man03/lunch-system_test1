# Dummy Data Generator for Testing
# Creates realistic test data for the lunch system

param(
    [int]$OrderCount = 20,
    [int]$UserCount = 10
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DUMMY DATA GENERATOR" -ForegroundColor Cyan
Write-Host "Orders: $OrderCount, Users: $UserCount" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:8081"

# Menu items (based on existing data)
$menuItems = @(
    @{ id = "M001"; name = "Karaage Bento"; price = 650 }
    @{ id = "M002"; name = "Nori Bento"; price = 500 }
    @{ id = "M003"; name = "Hamburg Bento"; price = 700 }
    @{ id = "M004"; name = "Salmon Bento"; price = 750 }
    @{ id = "M005"; name = "Curry Rice"; price = 600 }
)

# Japanese name samples
$firstNames = @("Taro", "Hanako", "Jiro", "Misaki", "Kenta", "Sakura", "Daisuke", "Ai", "Takuya", "Yui", "Shota", "Aya", "Yu", "Nana", "Ryosuke")
$lastNames = @("Tanaka", "Suzuki", "Sato", "Takahashi", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Yoshida", "Yamada", "Sasaki", "Yamaguchi", "Matsumoto")

# Departments
$departments = @("Engineering", "Literature", "Science", "Law", "Economics", "Medicine", "Agriculture", "Education")

# Login first
try {
    $loginBody = @{
        email    = "admin@example.com"
        password = "admin123"
    } | ConvertTo-Json
    
    # Login and store session
    $null = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST `
        -Body $loginBody -ContentType "application/json" -SessionVariable session
    
    Write-Host "[OK] Logged in as admin" -ForegroundColor Green
}
catch {
    Write-Host "[FAIL] Login failed: $_" -ForegroundColor Red
    exit
}

# Create users
Write-Host "`n--- Creating Users ---" -ForegroundColor Yellow
$createdUsers = @()

for ($i = 1; $i -le $UserCount; $i++) {
    $studentId = "S2026" + $i.ToString().PadLeft(3, '0')
    $firstName = $firstNames | Get-Random
    $lastName = $lastNames | Get-Random
    $name = "$lastName $firstName"
    $email = "student$i@university.ac.jp"
    $department = $departments | Get-Random
    $grade = Get-Random -Minimum 1 -Maximum 5
    
    $userBody = @{
        studentId  = $studentId
        name       = $name
        email      = $email
        phone      = "090-" + (Get-Random -Minimum 1000 -Maximum 9999) + "-" + (Get-Random -Minimum 1000 -Maximum 9999)
        department = $department
        grade      = $grade
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST `
            -Body $userBody -ContentType "application/json" -WebSession $session
        
        if ($response.success) {
            Write-Host "  [OK] Created user: $name ($studentId)" -ForegroundColor Green
            $createdUsers += @{ studentId = $studentId; name = $name }
        }
        else {
            Write-Host "  [SKIP] User already exists: $studentId" -ForegroundColor Yellow
            $createdUsers += @{ studentId = $studentId; name = $name }
        }
    }
    catch {
        Write-Host "  [WARN] Failed to create user $studentId" -ForegroundColor Yellow
        $createdUsers += @{ studentId = $studentId; name = $name }
    }
    
    Start-Sleep -Milliseconds 100
}

# Create orders
Write-Host "`n--- Creating Orders ---" -ForegroundColor Yellow
$successCount = 0
$failCount = 0

for ($i = 1; $i -le $OrderCount; $i++) {
    $user = $createdUsers | Get-Random
    $pickupDate = (Get-Date).AddDays((Get-Random -Minimum 1 -Maximum 4))
    $pickupDateStr = $pickupDate.ToString("yyyy-MM-dd")
    
    # Random cart (1-3 items)
    $cartSize = Get-Random -Minimum 1 -Maximum 4
    $cart = @()
    
    for ($j = 0; $j -lt $cartSize; $j++) {
        $item = $menuItems | Get-Random
        $quantity = Get-Random -Minimum 1 -Maximum 3
        
        $cart += @{
            id       = $item.id
            menuId   = $item.id
            name     = $item.name
            price    = $item.price
            quantity = $quantity
        }
    }
    
    $orderBody = @{
        cart       = $cart
        pickupDate = $pickupDateStr
        userId     = $user.studentId
    } | ConvertTo-Json -Depth 10
    
    try {
        $orderResponse = Invoke-RestMethod -Uri "$baseUrl/api/order" -Method POST `
            -Body $orderBody -ContentType "application/json" -WebSession $session
        
        if ($orderResponse.success) {
            $orderCode = $orderResponse.orderCode
            Write-Host "  [OK] Order created: $orderCode (User: $($user.name))" -ForegroundColor Green
            $successCount++
            
            # Randomly process payment (70% chance)
            if ((Get-Random -Minimum 1 -Maximum 100) -le 70) {
                Start-Sleep -Milliseconds 200
                
                $paymentBody = @{
                    orderCode     = $orderCode
                    paymentMethod = "creditcard"
                } | ConvertTo-Json
                
                try {
                    $paymentResponse = Invoke-RestMethod -Uri "$baseUrl/api/orders/$orderCode/payment" -Method POST `
                        -Body $paymentBody -ContentType "application/json" -WebSession $session
                    
                    if ($paymentResponse.success) {
                        Write-Host "    [PAID] Payment processed" -ForegroundColor Cyan
                        
                        # Randomly complete pickup (50% chance if paid)
                        if ((Get-Random -Minimum 1 -Maximum 100) -le 50) {
                            Start-Sleep -Milliseconds 200
                            
                            try {
                                $pickupResponse = Invoke-RestMethod -Uri "$baseUrl/api/orders/$orderCode/pickup" -Method POST `
                                    -ContentType "application/json" -WebSession $session
                                
                                if ($pickupResponse.success) {
                                    Write-Host "    [COMPLETED] Order picked up" -ForegroundColor Green
                                }
                            }
                            catch {
                                Write-Host "    [WARN] Pickup failed" -ForegroundColor Yellow
                            }
                        }
                    }
                }
                catch {
                    Write-Host "    [WARN] Payment failed" -ForegroundColor Yellow
                }
            }
        }
        else {
            Write-Host "  [FAIL] Order creation failed" -ForegroundColor Red
            $failCount++
        }
    }
    catch {
        Write-Host "  [FAIL] Order creation error: $_" -ForegroundColor Red
        $failCount++
    }
    
    Start-Sleep -Milliseconds 300
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "GENERATION COMPLETED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Users Created:    $UserCount" -ForegroundColor White
Write-Host "Orders Attempted: $OrderCount" -ForegroundColor White
Write-Host "Orders Success:   $successCount" -ForegroundColor Green
Write-Host "Orders Failed:    $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "========================================`n" -ForegroundColor Cyan
