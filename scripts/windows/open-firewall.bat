@echo off
:: ==============================================================================
:: CompliCal — Windows Defender Firewall Port 3000 Opener
:: Right-click this file and select "Run as Administrator"
:: ==============================================================================

echo [1/2] Checking Administrator Privileges...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Please right-click this file and select "Run as Administrator".
    pause
    exit /b 1
)

echo [2/2] Adding Inbound Firewall Rule for CompliCal (TCP Port 3000)...
netsh advfirewall firewall delete rule name="CompliCal Web Server" >nul 2>&1
netsh advfirewall firewall add rule name="CompliCal Web Server" dir=in action=allow protocol=TCP localport=3000

echo.
echo ==============================================================================
echo [SUCCESS] Port 3000 is now open! 
echo Other computers on the office Wi-Fi/LAN can now access CompliCal.
echo ==============================================================================
pause
