@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File tools\ensure-runtime.ps1
if errorlevel 1 pause & exit /b 1
for /f "usebackq delims=" %%i in (".runtime\node-exe.txt") do set "NODE_EXE=%%i"
for %%i in ("%NODE_EXE%") do set "PATH=%%~dpi;%PATH%"
if not exist "node_modules\pg\package.json" call npm.cmd install --no-fund --no-audit
echo engine tests...
node --experimental-strip-types --test tests/engines.test.ts
if errorlevel 1 pause
echo load 2026 if needed...
node --experimental-strip-types migration/load-2026.ts
echo API 127.0.0.1:8787
node --experimental-strip-types src/presentation/http-server.ts
pause