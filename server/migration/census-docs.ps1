# Document census vs GO 2026 counts. No Node. ASCII only (PS 5.1).
# Operational load is later (Postgres/Node). This step proves source volumes.

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$root = (Resolve-Path (Join-Path $here "..\..\..")).Path
$db = Join-Path $root "_onyx-extract\db"

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

function StatsRows([string]$table) {
  $p = Join-Path $db ($table + "\stats.txt")
  if (-not (Test-Path $p)) { return $null }
  $line = Get-Content -LiteralPath $p -TotalCount 1
  if ($line -match "^rows\t(\d+)$") { return [int]$Matches[1] }
  return $null
}

$script:ok = $true
$checks = New-Object System.Collections.Generic.List[object]
function Add-Check($id, $got, $want, $note) {
  $pass = ([int]$got -eq [int]$want)
  if (-not $pass) { $script:ok = $false }
  $script:checks.Add(@{ id = $id; got = "$got"; want = "$want"; pass = $pass; note = $note })
}

$postPath = Join-Path $db "IAS_POST_MST\rows.tsv"
if (-not (Test-Path $postPath)) { throw "IAS_POST_MST missing: $postPath" }
$post = Read-Tsv $postPath

$byType = @{}
$posted = 0
foreach ($r in $post) {
  $t = [string]$r.DOC_TYPE
  if (-not $byType.ContainsKey($t)) { $byType[$t] = 0 }
  $byType[$t] = [int]$byType[$t] + 1
  if ([string]$r.DOC_POST -eq "1") { $posted++ }
}

$typeName = @{
  "0" = "opening"
  "1" = "journal"
  "2" = "receipt"
  "3" = "payment"
  "4" = "sales_invoice"
  "5" = "sales_return"
  "6" = "purchase_invoice"
  "7" = "purchase_return"
  "8" = "other_8"
  "9" = "outgoing"
  "10" = "other_10"
  "11" = "wh_in"
  "12" = "wh_out"
}

function Count-ByCol([string]$path, [string]$col) {
  $fs = [System.IO.File]::OpenText($path)
  try {
    $hdr = $fs.ReadLine()
    $h = $hdr.Split([char]9)
    $ix = [Array]::IndexOf($h, $col)
    if ($ix -lt 0) { throw ("col missing " + $col) }
    $map = @{}
    $n = 0
    while (($line = $fs.ReadLine()) -ne $null) {
      if ([string]::IsNullOrWhiteSpace($line)) { continue }
      $c = $line.Split([char]9)
      $v = if ($ix -lt $c.Length) { $c[$ix] } else { "" }
      if (-not $map.ContainsKey($v)) { $map[$v] = 0 }
      $map[$v] = [int]$map[$v] + 1
      $n++
    }
    return @{ n = $n; by = $map }
  } finally { $fs.Close() }
}

function SerSetFromPost([object[]]$rows, [string]$docType) {
  $set = New-Object "System.Collections.Generic.HashSet[string]"
  foreach ($r in $rows) {
    if ([string]$r.DOC_TYPE -eq $docType) { [void]$set.Add([string]$r.DOC_SER) }
  }
  return $set
}

function Match-Ser([object[]]$docs, [string]$serCol, $set) {
  $hit = 0
  $miss = 0
  foreach ($r in $docs) {
    $s = [string]$r[$serCol]
    if ($set.Contains($s)) { $hit++ } else { $miss++ }
  }
  return @{ hit = $hit; miss = $miss }
}

# GO 04 / GL-Q4 2026 header counts
Add-Check "post-mst" $post.Count 31609 "IAS_POST_MST"
Add-Check "sales" $(if ($byType.ContainsKey("4")) { $byType["4"] } else { 0 }) 9576 "DOC_TYPE 4"
Add-Check "purchases" $(if ($byType.ContainsKey("6")) { $byType["6"] } else { 0 }) 936 "DOC_TYPE 6"
$vouchers = 0
if ($byType.ContainsKey("2")) { $vouchers += [int]$byType["2"] }
if ($byType.ContainsKey("3")) { $vouchers += [int]$byType["3"] }
Add-Check "vouchers" $vouchers 11238 "DOC_TYPE 2+3"
Add-Check "journal" $(if ($byType.ContainsKey("1")) { $byType["1"] } else { 0 }) 2012 "DOC_TYPE 1"
Add-Check "posted-flag" $posted 1 "DOC_POST=1 (2026 unposted practice)"

$pi = StatsRows "IAS_PI_BILL_MST"
if ($null -ne $pi) { Add-Check "pi-mst" $pi 936 "IAS_PI_BILL_MST vs purchases" }

$wh = StatsRows "IAS_WHTRNS_MST"
$w11 = if ($byType.ContainsKey("11")) { [int]$byType["11"] } else { 0 }
$w12 = if ($byType.ContainsKey("12")) { [int]$byType["12"] } else { 0 }
if ($null -ne $wh) { Add-Check "whtrns" $wh ($w11 + $w12) "IAS_WHTRNS_MST vs DOC_TYPE 11+12" }

$missing = New-Object System.Collections.Generic.List[string]
foreach ($t in @("IAS_BILL_MST","IAS_RT_BILL_MST","IAS_POST_DTL","VOUCHERS")) {
  if (-not (Test-Path (Join-Path $db ($t + "\rows.tsv")))) { $missing.Add($t) }
}

$rt = StatsRows "IAS_RT_BILL_MST"
$grPath = Join-Path $db "GR_NOTE\rows.tsv"
if (Test-Path $grPath) {
  $gr = Read-Tsv $grPath
  $n3 = 0
  foreach ($r in $gr) { if ([string]$r.PI_TYPE -eq "3") { $n3++ } }
  Add-Check "sales-return-gr" $n3 180 "GR_NOTE PI_TYPE=3"
}
if ($null -ne $rt) { Add-Check "rt-mst" $rt 180 "IAS_RT_BILL_MST" }

$billN = StatsRows "IAS_BILL_MST"
if ($null -ne $billN) { Add-Check "bill-mst" $billN 9576 "IAS_BILL_MST" }
$vchN = StatsRows "VOUCHERS"
if ($null -ne $vchN) { Add-Check "vouchers-tbl" $vchN 11238 "VOUCHERS" }
$prN = StatsRows "IAS_PR_BILL_MST"
if ($null -ne $prN) { Add-Check "pr-mst" $prN 16 "IAS_PR_BILL_MST vs DOC_TYPE 7" }
$outN = StatsRows "IAS_OUTGOING_MST"
if ($null -ne $outN) { Add-Check "outgoing" $outN 356 "IAS_OUTGOING_MST vs DOC_TYPE 9" }

$dtlPath = Join-Path $db "IAS_POST_DTL\rows.tsv"
if (Test-Path $dtlPath) {
  $dtl = Count-ByCol $dtlPath "DOC_TYPE"
  Add-Check "post-dtl" $dtl.n 110073 "IAS_POST_DTL"
  $wantDtl = @{
    "1" = 18790
    "2" = 21595
    "3" = 891
    "4" = 46282
    "6" = 2814
  }
  foreach ($k in @($wantDtl.Keys)) {
    $got = if ($dtl.by.ContainsKey($k)) { [int]$dtl.by[$k] } else { 0 }
    Add-Check ("dtl-" + $k) $got $wantDtl[$k] ("POST_DTL DOC_TYPE " + $k)
  }
  $whDtl = 0
  if ($dtl.by.ContainsKey("11")) { $whDtl += [int]$dtl.by["11"] }
  if ($dtl.by.ContainsKey("12")) { $whDtl += [int]$dtl.by["12"] }
  Add-Check "dtl-wh" $whDtl 13704 "POST_DTL 11+12"
}

$billPath = Join-Path $db "IAS_BILL_MST\rows.tsv"
if (Test-Path $billPath) {
  $bills = Read-Tsv $billPath
  $set4 = SerSetFromPost $post "4"
  $m = Match-Ser $bills "BILL_SER" $set4
  Add-Check "bill-to-gl" $m.hit $bills.Count "IAS_BILL_MST.BILL_SER in POST_MST type 4"
  Add-Check "bill-to-gl-miss" $m.miss 0 "unmatched sales headers"
}

$vchPath = Join-Path $db "VOUCHERS\rows.tsv"
if (Test-Path $vchPath) {
  $vch = Read-Tsv $vchPath
  $setV = New-Object "System.Collections.Generic.HashSet[string]"
  foreach ($r in $post) {
    $t = [string]$r.DOC_TYPE
    if ($t -eq "2" -or $t -eq "3") { [void]$setV.Add([string]$r.DOC_SER) }
  }
  $serCol = "V_SER"
  $mv = Match-Ser $vch $serCol $setV
  Add-Check "voucher-to-gl" $mv.hit $vch.Count "VOUCHERS ser in POST_MST type 2+3"
  Add-Check "voucher-to-gl-miss" $mv.miss 0 "unmatched vouchers"
}

$piPath = Join-Path $db "IAS_PI_BILL_MST\rows.tsv"
if (Test-Path $piPath) {
  $pis = Read-Tsv $piPath
  $set6 = SerSetFromPost $post "6"
  $mp = Match-Ser $pis "BILL_SER" $set6
  Add-Check "pi-to-gl" $mp.hit $pis.Count "IAS_PI_BILL_MST.BILL_SER in POST_MST type 6"
  Add-Check "pi-to-gl-miss" $mp.miss 0 "unmatched purchase headers"
}

$typesOut = @()
foreach ($k in @($byType.Keys | Sort-Object { [int]$_ })) {
  $nm = if ($typeName.ContainsKey($k)) { $typeName[$k] } else { "type-$k" }
  $typesOut += @{ type = $k; name = $nm; rows = [int]$byType[$k] }
}

$outDir = Join-Path $here "out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function JStr([string]$s) {
  if ($null -eq $s) { return "" }
  return $s.Replace("\","\\").Replace('"','\"')
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.Append("{")
[void]$sb.Append('"source":"IAS_POST_MST 2026 census vs GO",')
[void]$sb.Append('"generatedAt":"' + (Get-Date).ToString("s") + '",')
[void]$sb.Append('"headers":' + $post.Count + ",")
[void]$sb.Append('"allPass":' + $(if ($script:ok) { "true" } else { "false" }) + ",")
[void]$sb.Append('"missingExtracts":[')
$mi = 0
foreach ($m in $missing) {
  if ($mi -gt 0) { [void]$sb.Append(",") }
  $mi++
  [void]$sb.Append('"' + (JStr $m) + '"')
}
[void]$sb.Append("],")
[void]$sb.Append('"types":[')
$ti = 0
foreach ($row in $typesOut) {
  if ($ti -gt 0) { [void]$sb.Append(",") }
  $ti++
  [void]$sb.Append("{")
  [void]$sb.Append('"type":"' + $row["type"] + '",')
  [void]$sb.Append('"name":"' + $row["name"] + '",')
  [void]$sb.Append('"rows":' + $row["rows"])
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
[IO.File]::WriteAllText((Join-Path $outDir "census-2026.json"), $sb.ToString())

$fail = @($checks | Where-Object { -not $_.pass })
Write-Output ("CENSUS headers {0} {1}" -f $post.Count, $(if ($script:ok) { "MATCH" } else { "DRIFT" }))
foreach ($f in $fail) { Write-Output ("  FAIL {0} got={1} want={2}" -f $f.id, $f.got, $f.want) }
if ($missing.Count -gt 0) { Write-Output ("  MISSING " + ($missing -join ",")) }
if (-not $script:ok) { exit 1 }
exit 0
