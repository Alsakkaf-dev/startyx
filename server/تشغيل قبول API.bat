@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File tools\ensure-runtime.ps1
if errorlevel 1 pause & exit /b 1
for /f "usebackq delims=" %%i in (".runtime\node-exe.txt") do set "NODE_EXE=%%i"
for %%i in ("%NODE_EXE%") do set "PATH=%%~dpi;%PATH%"
node --experimental-strip-types migration/accept-live-api.ts
pause