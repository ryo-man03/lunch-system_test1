@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo ========================================
echo   Lunch System - TEST Server Start
echo ========================================
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0start-test-server.ps1"

pause
