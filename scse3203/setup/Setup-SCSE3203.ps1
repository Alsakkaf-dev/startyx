<#
.SYNOPSIS
  SCSE3203 Week 02 - one-shot Windows setup: JDK 21 + VS Code extensions + Git + week02-demo project.

.DESCRIPTION
  Mirrors the Week 02 Guided Lab (sections A-H) and is safe to re-run: every step checks
  before it installs. Ends by writing an evidence log for the Section J checklist.

.EXAMPLE
  .\Setup-SCSE3203.ps1 -GitName "Your Name" -GitEmail "you@graduate.utm.my"
  .\Setup-SCSE3203.ps1 -GitName "Your Name" -GitEmail "you@graduate.utm.my" -RepoUrl https://github.com/<you>/week02-demo.git
#>
[CmdletBinding()]
param(
    [string]$Workspace = 'C:\Users\GIGIABYTE\Desktop\Storage',
    [string]$GitName,
    [string]$GitEmail,
    [string]$RepoUrl,
    [switch]$Force,
    [switch]$SkipBuild
)

# 'Continue', not 'Stop': Windows PowerShell 5.1 turns any stderr from native tools (java, git, mvnw) into
# terminating errors under 'Stop'. Hard failures below use explicit `throw`.
$ErrorActionPreference = 'Continue'
$ProjectSource = Join-Path (Split-Path $PSScriptRoot -Parent) 'week02-demo'
$ProjectDir    = Join-Path $Workspace 'week02-demo'
$EvidenceDir   = Join-Path $Workspace 'evidence'

function Step($text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Ok($text)   { Write-Host "  [OK]   $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  [WARN] $text" -ForegroundColor Yellow }
function Fail($text) { Write-Host "  [FAIL] $text" -ForegroundColor Red }

# Pull fresh Machine+User PATH into this session so newly installed tools resolve without reopening the terminal.
function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user"
    $jh = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
    if (-not $jh) { $jh = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'Machine') }
    if ($jh) { $env:JAVA_HOME = $jh }
}

function Test-Command($name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }

function Install-WithWinget($id, $label) {
    Write-Host "  Installing $label via winget ($id)..."
    winget install --id $id --exact --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189) {   # -1978335189 = already installed
        throw "winget failed to install $label (exit $LASTEXITCODE)."
    }
    Update-SessionPath
}

function Get-JavacMajor {
    if (-not (Test-Command 'javac')) { return 0 }
    $v = (& javac -version 2>&1 | Out-String).Trim()          # e.g. "javac 21.0.12"
    if ($v -match 'javac\s+(\d+)') { return [int]$Matches[1] }
    return 0
}

# ---------------------------------------------------------------- A. Preflight
Step 'A. Preflight'
if ([Environment]::OSVersion.Version.Major -lt 10) { throw 'Windows 10/11 is required.' }
Ok "Windows $([Environment]::OSVersion.Version)"
if (-not (Test-Command 'winget')) {
    throw 'winget is missing. Install "App Installer" from the Microsoft Store, then re-run this script.'
}
Ok 'winget available'
New-Item -ItemType Directory -Force -Path $Workspace, $EvidenceDir | Out-Null
Ok "Workspace: $Workspace"
$free = (Get-PSDrive ($Workspace.Substring(0,1))).Free / 1GB
if ($free -lt 3) { Warn ("Only {0:N1} GB free; JDK + Maven cache + build need ~2-3 GB." -f $free) } else { Ok ("{0:N1} GB free" -f $free) }

# ---------------------------------------------------------------- B. JDK 21
Step 'B. Eclipse Temurin JDK 21'
Update-SessionPath
if ((Get-JavacMajor) -eq 21) {
    Ok 'JDK 21 already on PATH'
} else {
    if ((Get-JavacMajor) -gt 0) { Warn "Another JDK is first on PATH (javac $(Get-JavacMajor)). Installing 21 alongside it - nothing is removed." }
    Install-WithWinget 'EclipseAdoptium.Temurin.21.JDK' 'Temurin JDK 21'
}

# Temurin's MSI does not set JAVA_HOME by default - set it for the current user and put its bin first.
$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue |
       Sort-Object Name -Descending | Select-Object -First 1
if (-not $jdk) {
    # Fall back to whatever JDK 21 javac resolves to (e.g. Oracle JDK installed by the lab PC image).
    $javac = (Get-Command javac -ErrorAction SilentlyContinue).Source
    if ($javac -and (Get-JavacMajor) -eq 21) { $jdk = Get-Item (Split-Path (Split-Path $javac -Parent) -Parent) }
}
if ($jdk) {
    [Environment]::SetEnvironmentVariable('JAVA_HOME', $jdk.FullName, 'User')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $bin = Join-Path $jdk.FullName 'bin'
    if (($userPath -split ';') -notcontains $bin) {
        [Environment]::SetEnvironmentVariable('Path', "$bin;$userPath", 'User')
    }
    Update-SessionPath
    $env:Path = "$bin;$env:Path"     # user PATH comes after machine PATH; force 21 first in this session
    Ok "JAVA_HOME = $($jdk.FullName)"
} else {
    Fail 'Could not locate the JDK 21 folder. Install manually from https://adoptium.net/ and re-run.'
}

if ((Get-JavacMajor) -eq 21) { Ok "javac 21 verified: $((& javac -version 2>&1 | Out-String).Trim())" }
else { Fail "javac is not 21. Check: where.exe javac  (PATH ordering)." }

# ---------------------------------------------------------------- C. VS Code + extensions
Step 'C. VS Code + Java/Spring extensions'
$codeCmd = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'
if (-not (Test-Path $codeCmd)) { $codeCmd = 'C:\Program Files\Microsoft VS Code\bin\code.cmd' }
if (-not (Test-Path $codeCmd) -and -not (Test-Command 'code')) {
    Install-WithWinget 'Microsoft.VisualStudioCode' 'VS Code'
    $codeCmd = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'
}
if (-not (Test-Path $codeCmd)) { $codeCmd = (Get-Command code -ErrorAction SilentlyContinue).Source }

if ($codeCmd) {
    $installed = & $codeCmd --list-extensions 2>$null
    foreach ($ext in 'vscjava.vscode-java-pack', 'vmware.vscode-boot-dev-pack') {
        if ($installed -contains $ext) { Ok "$ext already installed" }
        else { & $codeCmd --install-extension $ext --force | Out-Null; Ok "$ext installed" }
    }
} else {
    Fail 'VS Code CLI not found. Install the two extension packs manually (Ctrl+Shift+X).'
}

# ---------------------------------------------------------------- H1. Git
Step 'H1. Git'
if (Test-Command 'git') { Ok "$(git --version)" }
else { Install-WithWinget 'Git.Git' 'Git for Windows'; Ok "$(git --version)" }

if ($GitName)  { git config --global user.name  $GitName;  Ok "user.name  = $GitName" }
if ($GitEmail) { git config --global user.email $GitEmail; Ok "user.email = $GitEmail" }
if (-not (git config --global user.name)) { Warn 'git user.name not set. Re-run with -GitName "Your Name" -GitEmail "you@..."' }
git config --global init.defaultBranch main
git config --global core.autocrlf true

# ---------------------------------------------------------------- E. Project
Step 'E. week02-demo project'
if (-not (Test-Path $ProjectSource)) { throw "Project source not found next to this script: $ProjectSource" }
if ((Test-Path $ProjectDir) -and -not $Force) {
    Ok "Keeping existing $ProjectDir (use -Force to overwrite)"
} else {
    if (Test-Path $ProjectDir) { Remove-Item $ProjectDir -Recurse -Force }
    Copy-Item $ProjectSource $ProjectDir -Recurse
    Remove-Item (Join-Path $ProjectDir 'target') -Recurse -Force -ErrorAction SilentlyContinue
    Ok "Copied to $ProjectDir"
}

# Keep the group-project plan and the kit README alongside the lab project.
$KitRoot = Split-Path $PSScriptRoot -Parent
$PlanDir = Join-Path $Workspace 'project'
New-Item -ItemType Directory -Force -Path $PlanDir | Out-Null      # copy contents, so re-runs don't nest project\project
Copy-Item (Join-Path $KitRoot 'project\*') $PlanDir -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $KitRoot 'README.md') $Workspace -Force -ErrorAction SilentlyContinue
Ok "Project plan + README copied to $Workspace"

Push-Location $ProjectDir
try {
    foreach ($p in 'pom.xml', 'mvnw.cmd', '.mvn', 'src\main\java', 'src\main\resources') {
        if (Test-Path $p) { Ok "found $p" } else { Fail "missing $p" }
    }

    Step 'E2. Maven Wrapper (first run downloads Maven 3.9.11)'
    & .\mvnw.cmd -version
    if ($LASTEXITCODE -eq 0) { Ok 'mvnw.cmd -version works' } else { Fail 'mvnw.cmd -version failed (check internet/proxy).' }

    if (-not $SkipBuild) {
        Step 'G3. Build + test + package'
        & .\mvnw.cmd -B clean package
        if ($LASTEXITCODE -eq 0) { Ok 'BUILD SUCCESS - target\week02-demo-0.0.1-SNAPSHOT.jar' } else { Fail 'Build failed - read the first [ERROR] line above.' }
    }

    # ------------------------------------------------------------ H2. Local repository
    Step 'H2. Local Git repository'
    if (-not (Test-Path '.git')) {
        git init -q
        git add .
        git commit -q -m 'Create Spring Boot server-rendered course website'
        Ok 'Initial commit created (target/ excluded by .gitignore)'
    } else { Ok 'Repository already initialised' }

    if ($RepoUrl) {
        if (-not (git remote 2>$null | Select-String -Quiet '^origin$')) { git remote add origin $RepoUrl }
        git branch -M main
        git push -u origin main
        if ($LASTEXITCODE -eq 0) { Ok "Pushed to $RepoUrl" } else { Fail 'Push failed - sign in via the browser prompt, and make sure the remote repo is EMPTY.' }
    } else {
        Warn 'No -RepoUrl given: create an EMPTY repo on GitHub, then run inside the project folder:'
        Write-Host '         git remote add origin <URL>; git push -u origin main'
    }
} finally { Pop-Location }

# ---------------------------------------------------------------- J. Evidence log
Step 'J. Evidence log'
$log = Join-Path $EvidenceDir ("week02-evidence-{0:yyyyMMdd-HHmm}.txt" -f (Get-Date))
& {
    "SCSE3203 Week 02 evidence - $(Get-Date)"
    "`n> java -version";   cmd /c "java -version 2>&1"
    "`n> javac -version";  cmd /c "javac -version 2>&1"
    "`n> where.exe java";  where.exe java
    "`n> where.exe javac"; where.exe javac
    "`n> JAVA_HOME";       $env:JAVA_HOME
    "`n> mvnw.cmd -version"; Push-Location $ProjectDir; cmd /c ".\mvnw.cmd -version 2>&1"; Pop-Location
    "`n> git --version";   git --version
    "`n> git config --global --list"; git config --global --list
    if ($codeCmd) { "`n> code --list-extensions"; & $codeCmd --list-extensions }
} *> $log
Ok "Saved: $log"

Write-Host "`nNext:" -ForegroundColor Cyan
Write-Host "  1. code `"$ProjectDir`"            (open the ROOT folder that contains pom.xml)"
Write-Host "  2. .\mvnw.cmd spring-boot:run     then open http://localhost:8080/  /about  /profile"
Write-Host "  3. Ctrl+C to stop. Or: java -jar target\week02-demo-0.0.1-SNAPSHOT.jar"
Write-Host "  NOTE: open a NEW terminal so PATH/JAVA_HOME changes are picked up everywhere." -ForegroundColor Yellow
