# Opening-balance recon for 2026 extract. No Node. ASCII only (PS 5.1).
# Rule GL-D4: imbalance is migrated as-is, never zeroed.

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$root = (Resolve-Path (Join-Path $here "..\..\..")).Path
$obPath = Join-Path $root "_onyx-extract\db\OPEN_BAL\rows.tsv"
if (-not (Test-Path $obPath)) { throw "OPEN_BAL missing: $obPath" }

function Read-Tsv([string]$path) {
  $raw = [System.IO.File]::ReadAllLines($path)
  $h = $raw[0].Split([char]9)
  $out = New-Object System.Collections.Generic.List[object]
  for ($i = 1; $i -lt $raw.Count; $i++) {
    if ([string]::IsNullOrWhiteSpace($raw[$i])) { continue }
    $c = $raw[$i].Split([char]9)
    $o = @{}
    for ($j = 0; $j -lt $h.Length; $j++) {
      $o[$h[$j]] = if ($j -lt $c.Length) { $c[$j] } else { "" }
    }
    $out.Add($o)
  }
  return ,$out.ToArray()
}

function D([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return [decimal]0 }
  return [decimal]::Parse(($s -replace ",", ""), [Globalization.CultureInfo]::InvariantCulture)
}
function R2([decimal]$x) { [decimal]::Round($x, 2, [MidpointRounding]::AwayFromZero) }

$ob = Read-Tsv $obPath
$typeName = @{ "0" = "general"; "1" = "cash"; "2" = "bank"; "3" = "customer"; "4" = "vendor"; "7" = "employee" }
$expectN = @{ "0" = 286; "1" = 65; "2" = 77; "3" = 2711; "4" = 135; "7" = 122 }
$expectNet = @{
  "0" = [decimal]-1147911.16
  "1" = [decimal]49826.14
  "2" = [decimal]843770.34
  "3" = [decimal]1818124.72
  "4" = [decimal]-1439277.44
  "7" = [decimal]12115.26
}

$byType = @{}
$byCmp = @{}
$byAcc = @{}
[decimal]$dr = 0
[decimal]$cr = 0
[decimal]$assets = 0
[decimal]$liab = 0
$accounts = New-Object "System.Collections.Generic.HashSet[string]"

foreach ($r in $ob) {
  $t = [string]$r.AC_DTL_TYP
  if (-not $byType.ContainsKey($t)) { $byType[$t] = @{ n = 0; net = [decimal]0 } }
  $amt = D ([string]$r.J_AMT)
  $byType[$t].n = [int]$byType[$t].n + 1
  $byType[$t].net = [decimal]$byType[$t].net + $amt
  $cmp = [string]$r.CMP_NO
  if (-not $byCmp.ContainsKey($cmp)) { $byCmp[$cmp] = [decimal]0 }
  $byCmp[$cmp] = [decimal]$byCmp[$cmp] + $amt
  $code = [string]$r.A_CODE
  [void]$accounts.Add($code)
  if (-not $byAcc.ContainsKey($code)) { $byAcc[$code] = [decimal]0 }
  $byAcc[$code] = [decimal]$byAcc[$code] + $amt
  if ($amt -ge 0) { $dr += $amt } else { $cr += (-$amt) }
  if ($code.Length -gt 0 -and $code.Substring(0,1) -eq "1") { $assets += $amt } else { $liab += $amt }
}

$script:ok = $true
$checks = New-Object System.Collections.Generic.List[object]
function Add-Check($id, $got, $want, $note) {
  $g = R2 ([decimal]$got)
  $w = R2 ([decimal]$want)
  $pass = [math]::Abs([double]($g - $w)) -lt 0.02
  if (-not $pass) { $script:ok = $false }
  $script:checks.Add(@{ id = $id; got = "$g"; want = "$w"; pass = $pass; note = $note })
}

Add-Check "rows" $ob.Count 3396 "OPEN_BAL rows"
Add-Check "accounts" $accounts.Count 137 "distinct A_CODE"
Add-Check "net" ($dr - $cr) 136647.87 "imbalance kept GL-D4"
Add-Check "debit" $dr 101472211.70 "opening debit"
Add-Check "credit" $cr 101335563.83 "opening credit"
$c1 = if ($byCmp.ContainsKey("1")) { $byCmp["1"] } else { [decimal]0 }
$c2 = if ($byCmp.ContainsKey("2")) { $byCmp["2"] } else { [decimal]0 }
Add-Check "cmp1" $c1 -28139.59 "company 1 net"
Add-Check "cmp2" $c2 164787.46 "company 2 net"
Add-Check "assets" $assets 5226966.23 "A_CODE 1*"
Add-Check "equity_liab" $liab -5090318.36 "A_CODE not 1*"

$typesOut = @()
foreach ($k in @("0","1","2","3","4","7")) {
  $gotN = 0
  $gotNet = [decimal]0
  if ($byType.ContainsKey($k)) { $gotN = $byType[$k].n; $gotNet = [decimal]$byType[$k].net }
  Add-Check ("type-$k-n") $gotN $expectN[$k] $typeName[$k]
  Add-Check ("type-$k-net") $gotNet $expectNet[$k] $typeName[$k]
  $typesOut += @{ type = $k; name = $typeName[$k]; rows = $gotN; net = ("{0}" -f $gotNet) }
}

$ctrlCust = if ($byAcc.ContainsKey("1203010001")) { [decimal]$byAcc["1203010001"] } else { [decimal]0 }
$ctrlVend = [decimal]0
foreach ($k in @($byAcc.Keys)) {
  if ($k.Length -ge 6 -and $k.Substring(0,6) -eq "220202") { $ctrlVend += [decimal]$byAcc[$k] }
}
Add-Check "ar-control" $ctrlCust $expectNet["3"] "1203010001 vs type 3"
Add-Check "ap-control" $ctrlVend $expectNet["4"] "220202* vs type 4"

$outDir = Join-Path $here "out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function JStr([string]$s) {
  if ($null -eq $s) { return "" }
  return $s.Replace("\","\\").Replace('"','\"')
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.Append("{")
[void]$sb.Append('"source":"OPEN_BAL 2026-07-23 carry-forward",')
[void]$sb.Append('"rule":"GL-D4 imbalance migrated as-is; not zeroed",')
[void]$sb.Append('"generatedAt":"' + (Get-Date).ToString("s") + '",')
[void]$sb.Append('"rows":' + $ob.Count + ",")
[void]$sb.Append('"imbalance":"' + ($dr - $cr) + '",')
[void]$sb.Append('"debit":"' + $dr + '",')
[void]$sb.Append('"credit":"' + $cr + '",')
[void]$sb.Append('"companies":{"1":"' + $c1 + '","2":"' + $c2 + '"},')
[void]$sb.Append('"allPass":' + $(if ($script:ok) { "true" } else { "false" }) + ",")
[void]$sb.Append('"types":[')
$ti = 0
foreach ($row in $typesOut) {
  if ($ti -gt 0) { [void]$sb.Append(",") }
  $ti++
  [void]$sb.Append("{")
  [void]$sb.Append('"type":"' + $row["type"] + '",')
  [void]$sb.Append('"name":"' + $row["name"] + '",')
  [void]$sb.Append('"rows":' + $row["rows"] + ",")
  [void]$sb.Append('"net":"' + $row["net"] + '"')
  [void]$sb.Append("}")
}
[void]$sb.Append("],")
[void]$sb.Append('"checks":[')
$ci = 0
foreach ($ch in $checks) {
  if ($ci -gt 0) { [void]$sb.Append(",") }
  $ci++
  $ps = if ($ch.pass) { "true" } else { "false" }
  [void]$sb.Append("{")
  [void]$sb.Append('"id":"' + (JStr $ch.id) + '",')
  [void]$sb.Append('"got":"' + (JStr $ch.got) + '",')
  [void]$sb.Append('"want":"' + (JStr $ch.want) + '",')
  [void]$sb.Append('"pass":' + $ps + ",")
  [void]$sb.Append('"note":"' + (JStr $ch.note) + '"')
  [void]$sb.Append("}")
}
[void]$sb.Append("]}")
[IO.File]::WriteAllText((Join-Path $outDir "recon-2026.json"), $sb.ToString())

$fail = @($checks | Where-Object { -not $_.pass })
Write-Output ("OPEN_BAL {0} rows net {1} {2}" -f $ob.Count, ($dr-$cr), $(if ($script:ok) { "MATCH" } else { "DRIFT" }))
foreach ($f in $fail) { Write-Output ("  FAIL {0} got={1} want={2}" -f $f.id, $f.got, $f.want) }
if (-not $script:ok) { exit 1 }
exit 0
