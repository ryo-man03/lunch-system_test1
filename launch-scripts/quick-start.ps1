# Quick Start (No confirmation)
$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Lunch System - Quick Start" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Move to parent directory
try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $rootDir = Split-Path -Parent $scriptDir
    Set-Location $rootDir
    Write-Host "Current directory: $rootDir" -ForegroundColor Green
}
catch {
    Write-Host "Error: Failed to change directory" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host ""
Write-Host "Quick check..." -ForegroundColor Cyan

# Node.js check
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js not found" -ForegroundColor Red
    Write-Host "Please install Node.js: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit 1
}

# Server file check
if (-not (Test-Path "run_server_only.js")) {
    Write-Host "Error: run_server_only.js not found" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

# Auto-install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    try {
        npm install | Out-Null
        Write-Host "Installation complete" -ForegroundColor Green
    }
    catch {
        Write-Host "Error: npm install failed" -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
}

# Create data directory
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" -Force | Out-Null
}

Write-Host ""
Write-Host "Starting server..." -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""
Write-Host "Access: http://localhost:8080" -ForegroundColor Cyan
Write-Host ""

try {
    node run_server_only.js
}
catch {
    Write-Host ""
    Write-Host "An error occurred" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check if port 8080 is available"
    Write-Host "2. Run npm install"
    Write-Host "3. Check Node.js version"
    Write-Host ""
    Read-Host "Press Enter to exit..."
    exit 1
}
