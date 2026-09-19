@echo off
:: ==============================================================================
:: CompliCal — Automated Windows Database Backup Script
:: Can be run manually or scheduled in Windows Task Scheduler
:: ==============================================================================

setlocal enabledelayedexpansion

set ROOT_DIR=%~dp0\..\..
set BACKUP_DIR=C:\CompliCal_Backups

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Format timestamp YYYY-MM-DD_HHMM
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%%datetime:~10,2%

echo Creating backup of compliance.db to %BACKUP_DIR%...
copy "%ROOT_DIR%\data\compliance.db" "%BACKUP_DIR%\compliance_%TIMESTAMP%.db" /Y

if %errorLevel% equ 0 (
    echo [SUCCESS] Backup created: %BACKUP_DIR%\compliance_%TIMESTAMP%.db
) else (
    echo [ERROR] Backup failed!
)
