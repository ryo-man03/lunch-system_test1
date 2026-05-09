# Lunch System - Quick Start Script
# Usage: .\start-server.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Lunch Reservation System" -ForegroundColor Green
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
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "`nPress Enter to exit"
    exit 1
}

$nodeVersion = node --version
Write-Host "[2] Node.js version: $nodeVersion" -ForegroundColor Gray

# Check if server file exists
if (-not (Test-Path "run_server_only.js")) {
    Write-Host "[ERROR] run_server_only.js not found" -ForegroundColor Red
    Read-Host "`nPress Enter to exit"
    exit 1
}

Write-Host "[3] Server file: OK" -ForegroundColor Gray

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "`n[4] Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed" -ForegroundColor Red
        Read-Host "`nPress Enter to exit"
        exit 1
    }
    Write-Host "    Dependencies installed" -ForegroundColor Green
}
else {
    Write-Host "[4] Dependencies: OK" -ForegroundColor Gray
}

# Create data directory
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" -Force | Out-Null
    Write-Host "[5] Created data directory" -ForegroundColor Gray
}
else {
    Write-Host "[5] Data directory: OK" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting server on http://localhost:8080" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start server
try {
    node run_server_only.js
}
catch {
    Write-Host ""
    Write-Host "[ERROR] Server failed to start" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check if port 8080 is already in use" -ForegroundColor White
    Write-Host "  2. Run: npm install" -ForegroundColor White
    Write-Host "  3. Check Node.js version (v14 or higher recommended)" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
