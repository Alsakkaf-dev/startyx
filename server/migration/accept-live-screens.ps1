# Live startyx screen presence for the seven cycles. No Node.
# Renders are checked in the browser after this file lists defs.

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$root = (Resolve-Path (Join-Path $here "..\..\..")).Path
$sy = Join-Path $root "startyx"
$data = Join-Path $sy "assets\js\screen-data.js"
$tree = Join-Path $sy "assets\js\data.js"
$outDir = Join-Path $here "out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$script:ok = $true
$checks = New-Object System.Collections.Generic.List[object]
function Add-Check($cycle, $id, $got, $want, $note, [bool]$pass) {
  if (-not $pass) { $script:ok = $false }
  $script:checks.Add(@{ cycle = $cycle; id = $id; got = "$got"; want = "$want"; pass = $pass; note = $note })
}

$sd = [IO.File]::ReadAllText($data)
$tr = [IO.File]::ReadAllText($tree)
$defs = [regex]::Matches($sd, '"op\.[0-9.]+"\s*:') | ForEach-Object {
  if ($_.Value -match '"([^"]+)"') { $Matches[1] }
} | Select-Object -Unique
$defSet = New-Object "System.Collections.Generic.HashSet[string]"
foreach ($d in $defs) { [void]$defSet.Add($d) }

Add-Check "live" "defs" $defSet.Count 62 "SCREENS in screen-data.js (56 MVP + later live)" ($defSet.Count -eq 62)

$need = @{
  "1" = @("op.1.1.1","op.1.1.2","op.1.1.3","op.1.1.11","op.1.1.12","op.1.2.3","op.1.2.9","op.2.1.2","op.3.2","op.7.1.2.8","op.5.1.2.1","op.6.1.2.2")
  "2" = @("op.4.1.2.10","op.5.1.2.15","op.6.1.2.4","op.7.1.2.10")
  "3" = @("op.6.2.3.8","op.6.2.3.12","op.6.1.3.3")
  "4" = @("op.5.1.3.16","op.5.1.3.4","op.5.1.3.5","op.5.1.3.6")
  "5" = @("op.7.5.3.6","op.7.5.3.7","op.7.1.3.4","op.7.1.4.7")
  "6" = @("op.4.1.2.2","op.4.1.3.14","op.1.1.2")
  "7" = @("op.7.5.3.6","op.7.5.3.7","op.3.2","op.3.4","op.3.5")
}

foreach ($c in @("1","2","3","4","5","6","7")) {
  $miss = New-Object System.Collections.Generic.List[string]
  foreach ($r in $need[$c]) {
    $inDef = $defSet.Contains($r)
    $inTree = $tr.Contains('"' + $r + '"')
    if (-not $inDef) { $miss.Add($r + "/def") }
    if (-not $inTree) { $miss.Add($r + "/tree") }
  }
  Add-Check $c "screens" $(if ($miss.Count -eq 0) { "ok" } else { ($miss -join ",") }) "ok" ("cycle " + $c + " live defs+tree") ($miss.Count -eq 0)
}

# Invoice must mention ZATCA readiness without live send
$inv = $sd.Contains("UUID")
Add-Check "7" "zatca-copy" $(if ($inv) { "ok" } else { "missing" }) "ok" "invoice screen has UUID field" $inv

# Opening screens wired for recon API
$ui = [IO.File]::ReadAllText((Join-Path $sy "assets\js\screen-ui.js"))
$reconHook = $ui.Contains("4.1.2.10") -and $ui.Contains("StartyxApi.recon")
Add-Check "2" "recon-hook" $(if ($reconHook) { "ok" } else { "missing" }) "ok" "opening screens call recon API when server up" $reconHook

function JStr([string]$s) {
  if ($null -eq $s) { return "" }
  return $s.Replace("\","\\").Replace('"','\"')
}
$sb = New-Object System.Text.StringBuilder
[void]$sb.Append("{")
[void]$sb.Append('"source":"startyx live screen defs vs seven cycles",')
[void]$sb.Append('"generatedAt":"' + (Get-Date).ToString("s") + '",')
[void]$sb.Append('"defs":' + $defSet.Count + ",")
[void]$sb.Append('"allPass":' + $(if ($script:ok) { "true" } else { "false" }) + ",")
[void]$sb.Append('"checks":[')
$ci = 0
foreach ($ch in $checks) {
  if ($ci -gt 0) { [void]$sb.Append(",") }
  $ci++
  $ps = if ($ch.pass) { "true" } else { "false" }
  [void]$sb.Append("{")
  [void]$sb.Append('"cycle":"' + (JStr $ch.cycle) + '",')
  [void]$sb.Append('"id":"' + (JStr $ch.id) + '",')
  [void]$sb.Append('"got":"' + (JStr $ch.got) + '",')
  [void]$sb.Append('"want":"' + (JStr $ch.want) + '",')
  [void]$sb.Append('"pass":' + $ps + ",")
  [void]$sb.Append('"note":"' + (JStr $ch.note) + '"')
  [void]$sb.Append("}")
}
[void]$sb.Append("]}")
[IO.File]::WriteAllText((Join-Path $outDir "accept-live.json"), $sb.ToString())

$fail = @($checks | Where-Object { -not $_.pass })
Write-Output ("LIVE-DEFS {0} defs={1} fail={2}" -f $(if ($script:ok) { "PASS" } else { "FAIL" }), $defSet.Count, $fail.Count)
foreach ($f in $fail) { Write-Output ("  FAIL c{0} {1} got={2}" -f $f.cycle, $f.id, $f.got) }
if (-not $script:ok) { exit 1 }
exit 0
