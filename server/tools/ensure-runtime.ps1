$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$server = (Resolve-Path (Join-Path $here "..")).Path
$runtime = Join-Path $server ".runtime"
$nodeHome = Join-Path $runtime "node"
$marker = Join-Path $runtime "node-exe.txt"
function Test-Node22([string]$exe) {
  if (-not $exe -or -not (Test-Path $exe)) { return $false }
  try {
    $v = & $exe -v 2>$null
    if ($v -match '^v(\d+)\.') { return ([int]$Matches[1] -ge 22) }
  } catch {}
  return $false
}
$found = $null
if (Test-Path $marker) {
  $p = (Get-Content -LiteralPath $marker -TotalCount 1).Trim()
  if (Test-Node22 $p) { $found = $p }
}
if (-not $found) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd -and (Test-Node22 $cmd.Source)) { $found = $cmd.Source }
}
if (-not $found -and (Test-Path $nodeHome)) {
  $exe = Get-ChildItem -LiteralPath $nodeHome -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($exe -and (Test-Node22 $exe.FullName)) { $found = $exe.FullName }
}
if (-not $found) { throw "Node 22+ missing. Re-run portable install into .runtime\node" }
$dir = Split-Path -Parent $found
$env:PATH = $dir + ";" + $env:PATH
if (-not (Test-Path $runtime)) { New-Item -ItemType Directory -Force $runtime | Out-Null }
Set-Content -LiteralPath $marker -Value $found -Encoding ASCII
Write-Output ("NODE_OK " + (& $found -v) + " " + $found)