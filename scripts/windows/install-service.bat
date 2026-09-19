@echo off
:: ==============================================================================
:: CompliCal — Windows 24/7 Service Installer (PM2)
:: Right-click this file and select "Run as Administrator"
:: ==============================================================================

echo ==============================================================================
echo Installing CompliCal as a 24/7 Windows Background Service...
echo ==============================================================================
echo.

cd /d "%~dp0\..\.."

echo [1/5] Installing PM2 and Windows Startup Service globally...
call npm install -g pm2 pm2-windows-startup

echo [2/5] Registering Windows Startup Service...
call pm2-startup install

echo [3/5] Starting CompliCal Web Server in Background...
call pm2 delete complical-web >nul 2>&1
call pm2 start npm --name "complical-web" -- start

echo [4/5] Starting CompliCal Notification Worker in Background...
call pm2 delete complical-worker >nul 2>&1
call pm2 start npm --name "complical-worker" -- run worker

echo [5/5] Saving PM2 state for Windows Reboots...
call pm2 save

echo.
echo ==============================================================================
echo [SUCCESS] CompliCal is now running in the background!
echo - You CAN safely close any Command Prompt windows.
echo - The server will automatically restart whenever this Windows PC reboots.
echo ==============================================================================
echo.
call pm2 status
pause
