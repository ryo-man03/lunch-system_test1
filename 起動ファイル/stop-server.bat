@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo ========================================
echo   Stop All Servers
echo ========================================
echo.

powershell.exe -ExecutionPolicy Bypass -Command "& { Stop-Process -Name node -Force -ErrorAction SilentlyContinue; Write-Host ''; Write-Host '[OK] All servers stopped' -ForegroundColor Green; Write-Host '' }"

echo.
pause
