@echo off
chcp 65001 >nul
title أونكس برو ERP — متصفح الأنظمة
set "DIR=%~dp0"
set "APP=%DIR%index.html"

if not exist "%APP%" (
    echo.
    echo   [خطأ] لم يتم العثور على الملف: index.html
    echo   تأكد أن ملف التشغيل موجود داخل مجلد البرنامج.
    echo.
    pause
    exit /b 1
)

REM ── تشغيل كنافذة تطبيق مستقلة عبر Edge (بدون شريط عنوان المتصفح) ──
set "EDGE1=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set "EDGE2=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "CHROME1=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME2=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

if exist "%EDGE1%" (
    start "" "%EDGE1%" --app="file:///%APP%" --window-size=1440,900
    goto :eof
)
if exist "%EDGE2%" (
    start "" "%EDGE2%" --app="file:///%APP%" --window-size=1440,900
    goto :eof
)
if exist "%CHROME1%" (
    start "" "%CHROME1%" --app="file:///%APP%" --window-size=1440,900
    goto :eof
)
if exist "%CHROME2%" (
    start "" "%CHROME2%" --app="file:///%APP%" --window-size=1440,900
    goto :eof
)

REM ── بديل: المتصفح الافتراضي ──
start "" "%APP%"
