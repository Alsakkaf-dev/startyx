@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0migration\accept-live-screens.ps1"
if errorlevel 1 pause
