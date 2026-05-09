# Lunch System - Test Server Start Script
# Usage: .\start-test-server.ps1
# Starts server on port 8081 with test database

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Lunch System - TEST MODE" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory's parent (lunch-system)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentPath = Split-Path -Parent $scriptPath
Set-Location $parentPath
Write-Host "[1] Current directory: $parentPath" -ForegroundColor Gray

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found" -ForegroundColor Red
    Read-Host "`nPress Enter to exit"
    exit 1
}

Write-Host "[2] Node.js: OK" -ForegroundColor Gray

# Create test database
if (Test-Path "data\database.json") {
    Copy-Item -Path "data\database.json" -Destination "data\test_database.json" -Force
    Write-Host "[3] Test database created" -ForegroundColor Gray
}
else {
    Write-Host "[3] No production database found, creating empty test database" -ForegroundColor Yellow
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "`n[4] Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "    Dependencies installed" -ForegroundColor Green
}
else {
    Write-Host "[4] Dependencies: OK" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting TEST server on port 8081" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  URL: http://localhost:8081" -ForegroundColor Cyan
Write-Host "  Database: data\test_database.json" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Set environment variables and start server
$env:PORT = "8081"
$env:TEST_MODE = "true"

try {
    node run_server_only.js
}
catch {
    Write-Host ""
    Write-Host "[ERROR] Test server failed to start" -ForegroundColor Red
    Read-Host "`nPress Enter to exit"
    exit 1
}
