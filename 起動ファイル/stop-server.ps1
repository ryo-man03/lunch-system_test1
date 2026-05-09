# Lunch System - Stop Server Script
# Usage: .\stop-server.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Stop All Servers" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find all Node.js processes
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es):" -ForegroundColor Yellow
    Write-Host ""
    
    $nodeProcesses | ForEach-Object {
        Write-Host "  PID: $($_.Id) - Memory: $([math]::Round($_.WorkingSet/1MB, 2)) MB" -ForegroundColor White
    }
    
    Write-Host ""
    $confirm = Read-Host "Stop all Node.js processes? (Y/N)"
    
    if ($confirm -eq "Y" -or $confirm -eq "y") {
        Write-Host ""
        Write-Host "Stopping processes..." -ForegroundColor Yellow
        
        try {
            Stop-Process -Name node -Force
            Start-Sleep -Seconds 1
            Write-Host "[OK] All Node.js processes stopped" -ForegroundColor Green
        }
        catch {
            Write-Host "[ERROR] Failed to stop processes: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "Cancelled" -ForegroundColor Yellow
    }
}
else {
    Write-Host "No running Node.js processes found" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
