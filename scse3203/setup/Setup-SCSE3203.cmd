@echo off
REM Double-click launcher: runs the PowerShell setup without changing the machine's execution policy.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Setup-SCSE3203.ps1" %*
echo.
pause
