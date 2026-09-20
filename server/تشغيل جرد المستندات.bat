@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0migration\census-docs.ps1"
if errorlevel 1 pause
