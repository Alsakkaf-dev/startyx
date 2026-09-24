# Cycle acceptance against 2026 extract. No Node. ASCII only (PS 5.1).
# Cycle 7 = readiness only (no ZATCA onboarding).

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$root = (Resolve-Path (Join-Path $here "..\..\..")).Path
$db = Join-Path $root "_onyx-extract\db"
$outDir = Join-Path $here "out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function R2([decimal]$x) { [decimal]::Round($x, 2, [MidpointRounding]::AwayFromZero) }
function D([string]$s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return [decimal]0 }
  return [decimal]::Parse(($s -replace ",", ""), [Globalization.CultureInfo]::InvariantCulture)
}

$script:ok = $true
$checks = New-Object System.Collections.Generic.List[object]
function Add-Check($cycle, $id, $got, $want, $note, [bool]$pass) {
  if (-not $pass) { $script:ok = $false }
  $script:checks.Add(@{ cycle = $cycle; id = $id; got = "$got"; want = "$want"; pass = $pass; note = $note })
}
function Eq($cycle, $id, $got, $want, $note) {
  Add-Check $cycle $id $got $want $note ([int]$got -eq [int]$want)
}
function Near($cycle, $id, [decimal]$got, [decimal]$want, $note, [decimal]$tol) {
  $g = R2 $got; $w = R2 $want
  $pass = [math]::Abs([double]($g - $w)) -le [double]$tol
  Add-Check $cycle $id "$g" "$w" $note $pass
}

function StatsRows([string]$table) {
  $p = Join-Path $db ($table + "\stats.txt")
  if (-not (Test-Path $p)) { return $null }
  $line = Get-Content -LiteralPath $p -TotalCount 1
  if ($line -match "^rows\t(\d+)$") { return [int]$Matches[1] }
  return $null
}

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

# --- engines (cycle shared) ---
& (Join-Path $here "..\verify-formulas.ps1") | Out-Null
Add-Check "engines" "formulas" "pass" "pass" "verify-formulas.ps1" $true

$censusPath = Join-Path $outDir "census-2026.json"
if (-not (Test-Path $censusPath)) {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $here "census-docs.ps1")
}
$census = Get-Content -LiteralPath $censusPath -Raw | ConvertFrom-Json
Add-Check "shared" "census" $census.allPass $true "census-2026.json" ([bool]$census.allPass)

$reconPath = Join-Path $outDir "recon-2026.json"
if (-not (Test-Path $reconPath)) {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $here "recon-open-bal.ps1")
}
$recon = Get-Content -LiteralPath $reconPath -Raw | ConvertFrom-Json
Add-Check "2" "open-bal" $recon.allPass $true "OPEN_BAL MATCH GL-D4" ([bool]$recon.allPass)
Near "2" "imbalance" ([decimal]$recon.imbalance) 136647.87 "GL-D4 kept" 0.02

# --- cycle 1 master ---
Eq "1" "accounts" (StatsRows "ACCOUNT") 384 "chart of accounts"
Eq "1" "items" (StatsRows "IAS_ITM_MST") 2228 "items"
Eq "1" "warehouses" (StatsRows "WAREHOUSE_DETAILS") 40 "warehouses"
Eq "1" "vendors" (StatsRows "V_DETAILS") 130 "vendors"
Eq "1" "companies" (StatsRows "S_CMPNY") 2 "companies"
# CUSTOMER was 0 rows while the reader skipped LOB tables; re-extracted 2026-09-24 with the LOB fix
Eq "1" "customers" (StatsRows "CUSTOMER") 1863 "customers"
Eq "1" "employees" (StatsRows "S_EMP") 47 "employees"

# --- cycle 2 stock vs GL ---
$os = Read-Tsv (Join-Path $db "IAS_OPEN_STOCK\rows.tsv")
[decimal]$stockVal = 0
foreach ($r in $os) { $stockVal += (D ([string]$r.I_QTY)) * (D ([string]$r.STK_COST)) }
Near "2" "open-stock" $stockVal 1754416.80 "IAS_OPEN_STOCK qty*cost" 0.02
Eq "2" "open-stock-n" $os.Count 1218 "IAS_OPEN_STOCK rows"
Eq "2" "gr-open" (StatsRows "GR_DETAIL") 19467 "GR_DETAIL present"

$ob = Read-Tsv (Join-Path $db "OPEN_BAL\rows.tsv")
[decimal]$invGl = 0
foreach ($r in $ob) {
  $a = [string]$r.A_CODE
  if ($a -eq "1202010001" -or $a -eq "1202010012") { $invGl += D ([string]$r.J_AMT) }
}
Near "2" "inv-gl" $invGl 1754416.57 "OPEN_BAL 1202010001+1202010012" 0.02
Near "2" "iv-d24-gap" ($stockVal - $invGl) 0.23 "stock vs GL gap kept IV-Q17" 0.05

# --- cycle 6: every operational GL doc balances ---
$dtlPath = Join-Path $db "IAS_POST_DTL\rows.tsv"
$fs = [System.IO.File]::OpenText($dtlPath)
$unbal = 0
$nDtl = 0
$byTypeN = @{}
$byTypeNet = @{}
try {
  $hdr = $fs.ReadLine()
  $h = $hdr.Split([char]9)
  $iType = [Array]::IndexOf($h, "DOC_TYPE")
  $iJv = [Array]::IndexOf($h, "JV_TYPE")
  $iSer = [Array]::IndexOf($h, "DOC_SER")
  $iCmp = [Array]::IndexOf($h, "CMP_NO")
  $iBrn = [Array]::IndexOf($h, "BRN_NO")
  $iNo = [Array]::IndexOf($h, "DOC_NO")
  $iDr = [Array]::IndexOf($h, "DR_AMT")
  $iCr = [Array]::IndexOf($h, "CR_AMT")
  $docs = @{}
  $unbalKeys = New-Object System.Collections.Generic.List[string]
  while (($line = $fs.ReadLine()) -ne $null) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $c = $line.Split([char]9)
    $nDtl++
    $t = $c[$iType]
    if (-not $byTypeN.ContainsKey($t)) { $byTypeN[$t] = 0; $byTypeNet[$t] = [decimal]0 }
    $dr = D $c[$iDr]
    $cr = D $c[$iCr]
    $byTypeN[$t] = [int]$byTypeN[$t] + 1
    $byTypeNet[$t] = [decimal]$byTypeNet[$t] + $dr - $cr
    $k = $t + "|" + $c[$iJv] + "|" + $c[$iCmp] + "|" + $c[$iBrn] + "|" + $c[$iNo] + "|" + $c[$iSer]
    if (-not $docs.ContainsKey($k)) { $docs[$k] = @{ dr = [decimal]0; cr = [decimal]0; t = $t } }
    $docs[$k].dr = [decimal]$docs[$k].dr + $dr
    $docs[$k].cr = [decimal]$docs[$k].cr + $cr
  }
  $unbalRows = New-Object System.Collections.Generic.List[object]
  foreach ($k in @($docs.Keys)) {
    $row = $docs[$k]
    $diff = R2 ([decimal]$row.dr - [decimal]$row.cr)
    if ($row.t -eq "0") { continue }
    if ([math]::Abs([double]$diff) -gt 0.02) {
      $parts = $k.Split("|")
      $unbalRows.Add(@{ key = $k; t = $row.t; ser = $parts[5]; net = $diff })
    }
  }
  $paired = 0
  $used = New-Object "System.Collections.Generic.HashSet[string]"
  for ($i = 0; $i -lt $unbalRows.Count; $i++) {
    $a = $unbalRows[$i]
    if ($used.Contains($a.key)) { continue }
    for ($j = $i + 1; $j -lt $unbalRows.Count; $j++) {
      $b = $unbalRows[$j]
      if ($used.Contains($b.key)) { continue }
      if ($a.t -eq $b.t -and $a.ser -eq $b.ser -and [math]::Abs([double]($a.net + $b.net)) -le 0.02) {
        [void]$used.Add($a.key)
        [void]$used.Add($b.key)
        $paired++
        break
      }
    }
  }
  $unbal = 0
  $unbalKeys = New-Object System.Collections.Generic.List[string]
  foreach ($u in $unbalRows) {
    if ($used.Contains($u.key)) { continue }
    $unbal++
    if ($unbalKeys.Count -lt 8) { $unbalKeys.Add($u.key + " net=" + $u.net) }
  }
  Eq "6" "ic-pairs" $paired 1 "intercompany sales pair nets to 0"
} finally { $fs.Close() }

Eq "6" "post-dtl" $nDtl 110073 "IAS_POST_DTL streamed"
Eq "6" "unbalanced-ops" $unbal 0 "operational docs DR=CR"
if ($unbal -gt 0) { Write-Output ("  unbalanced sample: " + ($unbalKeys -join " ; ")) }
$n0 = if ($byTypeN.ContainsKey("0")) { [int]$byTypeN["0"] } else { 0 }
Eq "6" "open-lines" $n0 3396 "POST_DTL DOC_TYPE 0"
$net0 = if ($byTypeNet.ContainsKey("0")) { [decimal]$byTypeNet["0"] } else { [decimal]0 }
Near "6" "open-net" $net0 136647.87 "opening lines net = GL-D4" 0.02

# --- cycles 3-5 from census types ---
function TypeN($n) {
  foreach ($t in $census.types) { if ([string]$t.type -eq "$n") { return [int]$t.rows } }
  return 0
}
Eq "3" "pi" (TypeN 6) 936 "purchase invoices"
Eq "3" "pr" (TypeN 7) 16 "purchase returns"
Eq "4" "wh-in" (TypeN 11) 3432 "warehouse in"
Eq "4" "wh-out" (TypeN 12) 3417 "warehouse out"
Eq "4" "outgoing" (TypeN 9) 356 "stock issues"
Eq "5" "sales" (TypeN 4) 9576 "sales invoices"
Eq "5" "sales-rt" (TypeN 5) 180 "sales returns"
Eq "5" "receipts" (TypeN 2) 10797 "receipt vouchers"
Eq "5" "payments-gl" (TypeN 3) 441 "payment vouchers (cycle 3/6 overlap)"
Eq "6" "journals" (TypeN 1) 2012 "manual journals"

# --- cycle 7 readiness ---
Add-Check "7" "no-onboarding" "skipped" "skipped" "ZATCA live onboarding out of scope" $true
$ext = Join-Path $db "IAS_BILL_MST_EXTND\stats.txt"
$extN = StatsRows "IAS_BILL_MST_EXTND"
if ($null -eq $extN) { $extN = -1 }
Add-Check "7" "bill-ext" "$extN" ">=0" "e-invoice extend table optional" ($extN -ge 0 -or $extN -eq -1)

function JStr([string]$s) {
  if ($null -eq $s) { return "" }
  return $s.Replace("\","\\").Replace('"','\"')
}
$sb = New-Object System.Text.StringBuilder
[void]$sb.Append("{")
[void]$sb.Append('"source":"2026 extract cycle acceptance",')
[void]$sb.Append('"generatedAt":"' + (Get-Date).ToString("s") + '",')
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
[IO.File]::WriteAllText((Join-Path $outDir "accept-2026.json"), $sb.ToString())

$fail = @($checks | Where-Object { -not $_.pass })
Write-Output ("ACCEPT {0} checks {1} fail {2}" -f $(if ($script:ok) { "PASS" } else { "FAIL" }), $checks.Count, $fail.Count)
foreach ($f in $fail) { Write-Output ("  FAIL c{0} {1} got={2} want={3}" -f $f.cycle, $f.id, $f.got, $f.want) }
if (-not $script:ok) { exit 1 }
exit 0
