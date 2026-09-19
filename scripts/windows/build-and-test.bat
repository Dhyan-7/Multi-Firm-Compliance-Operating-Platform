@echo off
:: ==============================================================================
:: CompliCal — Windows Production Build & Verification Suite
:: ==============================================================================

cd /d "%~dp0\..\.."

echo [1/3] Installing Dependencies...
call npm install
if %errorLevel% neq 0 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)

echo [2/3] Building Next.js Production Bundle...
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] npm run build failed!
    pause
    exit /b 1
)

echo [3/3] Running CompliCal 26-Point Verification Suite...
call npx tsx scripts/verify-local-server.ts
if %errorLevel% neq 0 (
    echo [ERROR] Verification suite detected errors!
    pause
    exit /b 1
)

echo.
echo ==============================================================================
echo [SUCCESS] CompliCal is built and 100% verified on this Windows machine!
echo ==============================================================================
pause
