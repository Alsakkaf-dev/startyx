@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File tools\backup.ps1
pause