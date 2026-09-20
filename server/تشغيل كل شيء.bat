@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File tools\ensure-runtime.ps1
if errorlevel 1 pause & exit /b 1
for /f "usebackq delims=" %%i in (".runtime\node-exe.txt") do set "NODE_EXE=%%i"
for %%i in ("%NODE_EXE%") do set "PATH=%%~dpi;%PATH%"
if not exist "node_modules\pg\package.json" call npm.cmd install --no-fund --no-audit
node --experimental-strip-types --test tests/engines.test.ts
if errorlevel 1 pause & exit /b 1
node --experimental-strip-types migration/load-2026.ts
if errorlevel 1 pause & exit /b 1
start "startyx-api" cmd /k "cd /d "%~dp0" & set PATH=%PATH% & node --experimental-strip-types src/presentation/http-server.ts"
timeout /t 8 /nobreak >nul
node --experimental-strip-types migration/accept-live-api.ts
echo UI http://localhost:8777/  API http://127.0.0.1:8787/api/health
pause