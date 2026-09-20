@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0migration\recon-open-bal.ps1"
if errorlevel 1 pause
