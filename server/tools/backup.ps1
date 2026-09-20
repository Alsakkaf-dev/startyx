$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$server = (Resolve-Path (Join-Path $here "..")).Path
$destRoot = Join-Path $server "backups"
New-Item -ItemType Directory -Force $destRoot | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$dest = Join-Path $destRoot ("startyx-" + $stamp)
New-Item -ItemType Directory -Force $dest | Out-Null
foreach ($name in @(".pgdata", ".env", "migration\out")) {
  $src = Join-Path $server $name
  if (Test-Path $src) {
    Copy-Item -LiteralPath $src -Destination (Join-Path $dest (Split-Path $name -Leaf)) -Recurse -Force
  }
}
Write-Output ("BACKUP_OK " + $dest)