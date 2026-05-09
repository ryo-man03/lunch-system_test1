# 24 Hour Production Monitoring Script
# Usage: .\monitor_24h.ps1
# Recommended: Schedule to run every 1 hour

$ErrorActionPreference = "Stop"

function Write-ColorHost {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

$dbPath = "data\database.json"
if (-not (Test-Path $dbPath)) {
    Write-ColorHost "[ERROR] Database not found: $dbPath" "Red"
    exit 1
}

$db = Get-Content $dbPath -Encoding UTF8 | ConvertFrom-Json

$reportDir = "monitoring"
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportFile = "$reportDir\report_$timestamp.txt"

# Metric 1: Order Creation Success Rate
$totalOrders = $db.orders.Count
$orderCreateLogs = $db.logs | Where-Object { $_.type -eq "order" -and $_.action -eq "create" }
$successRate = if ($totalOrders -gt 0) { 
    [math]::Round(($orderCreateLogs.Count / $totalOrders) * 100, 1) 
}
else { 
    0 
}

$metric1Status = if ($successRate -ge 95) { "[OK]" } 
elseif ($successRate -ge 90) { "[WARNING]" } 
else { "[ERROR]" }

# Metric 2: Status Transition Integrity
$invalidOrders = $db.orders | Where-Object {
    ($_.status -eq "PICKED" -and $_.paidAt -eq $null) -or
    ($_.paidAt -ne $null -and $_.status -eq "PENDING") -or
    ($_.pickedAt -ne $null -and $_.status -ne "PICKED")
}

$metric2Status = if ($invalidOrders.Count -eq 0) { "[OK]" } else { "[ERROR]" }

# Metric 3: Average Logs Per Order
$avgLogsPerOrder = if ($totalOrders -gt 0) { 
    [math]::Round($db.logs.Count / $totalOrders, 2) 
}
else { 
    0 
}

$metric3Status = if ($avgLogsPerOrder -ge 3.0 -and $avgLogsPerOrder -le 5.0) { "[OK]" }
elseif ($avgLogsPerOrder -ge 2.0) { "[WARNING]" }
else { "[ERROR]" }

# Order Status Breakdown
$statusCounts = @{
    PENDING   = ($db.orders | Where-Object { $_.status -eq "PENDING" }).Count
    PAID      = ($db.orders | Where-Object { $_.status -eq "PAID" }).Count
    PICKED    = ($db.orders | Where-Object { $_.status -eq "PICKED" }).Count
    CANCELLED = ($db.orders | Where-Object { $_.status -eq "CANCELLED" }).Count
}

# Recent Orders (Last 24 hours)
$now = Get-Date
$last24h = $now.AddDays(-1)
$recentOrders = $db.orders | Where-Object {
    $createdAt = [DateTime]::Parse($_.createdAt)
    $createdAt -ge $last24h
}

# Build report content
$reportContent = @"
============================================================
24-Hour Production Monitoring Report
============================================================
Generated: $(Get-Date -Format "yyyy/MM/dd HH:mm:ss")
Database: $dbPath

============================================================
Key Metrics
============================================================

[Metric 1] Order Creation Success Rate
  Current: $successRate% $metric1Status
  Target:  >= 95%
  Total Orders: $totalOrders
  Creation Logs: $($orderCreateLogs.Count)

[Metric 2] Status Transition Integrity
  Current: $($invalidOrders.Count) inconsistencies $metric2Status
  Target:  0 inconsistencies

[Metric 3] Average Logs Per Order
  Current: $avgLogsPerOrder logs/order $metric3Status
  Target:  3-5 logs/order
  Total Logs: $($db.logs.Count)

============================================================
Order Data
============================================================

Status Breakdown:
  PENDING   (Unpaid):    $($statusCounts.PENDING)
  PAID      (Paid):      $($statusCounts.PAID)
  PICKED    (Completed): $($statusCounts.PICKED)
  CANCELLED (Cancelled): $($statusCounts.CANCELLED)
  ----------------------------------------
  TOTAL:                 $totalOrders

Recent Orders (Last 24h): $($recentOrders.Count)

============================================================
Alerts
============================================================

"@

$hasAlert = $false

if ($successRate -lt 95) {
    $reportContent += "[WARNING] Order creation success rate below 95% ($successRate%)`n"
    $hasAlert = $true
}

if ($invalidOrders.Count -gt 0) {
    $reportContent += "[CRITICAL] Status transition inconsistencies detected ($($invalidOrders.Count))`n"
    $reportContent += "Inconsistent orders:`n"
    foreach ($order in $invalidOrders) {
        $reportContent += "  - $($order.orderCode): status=$($order.status), paidAt=$($order.paidAt), pickedAt=$($order.pickedAt)`n"
    }
    $hasAlert = $true
}

if ($avgLogsPerOrder -lt 2.0 -or $avgLogsPerOrder -gt 6.0) {
    $reportContent += "[WARNING] Abnormal log generation rate ($avgLogsPerOrder logs/order)`n"
    $hasAlert = $true
}

if (-not $hasAlert) {
    $reportContent += "[OK] No alerts - System is operating normally`n"
}

$reportContent += @"

============================================================
Recommended Actions
============================================================

"@

if ($successRate -lt 90) {
    $reportContent += "1. Check server logs for errors`n"
    $reportContent += "2. Consider rollback from database backup`n"
} 
elseif ($successRate -lt 95) {
    $reportContent += "1. Check server logs for warnings`n"
}

if ($invalidOrders.Count -gt 0) {
    $reportContent += "1. Manually fix inconsistent data`n"
    $reportContent += "2. Investigate root cause of inconsistency`n"
}

if ($avgLogsPerOrder -lt 2.0) {
    $reportContent += "1. Verify log recording functionality`n"
}
elseif ($avgLogsPerOrder -gt 6.0) {
    $reportContent += "1. Check for duplicate log entries`n"
}

if (-not $hasAlert) {
    $reportContent += "No action required. Continue monitoring.`n"
}

$reportContent += @"

============================================================
Next Check: $(Get-Date -Date $now.AddHours(1) -Format "yyyy/MM/dd HH:mm:ss")
============================================================
"@

Write-ColorHost $reportContent "Cyan"
$reportContent | Out-File -FilePath $reportFile -Encoding UTF8

Write-ColorHost "`n[OK] Report saved: $reportFile" "Green"

if ($hasAlert) {
    Write-ColorHost "`n[WARNING] Alerts detected!" "Yellow"
}

exit $(if ($hasAlert) { 1 } else { 0 })

