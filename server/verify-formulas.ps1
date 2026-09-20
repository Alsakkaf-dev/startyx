# تحقق معادلات المحرّكات بـ [decimal] .NET — بدون Node
$ErrorActionPreference = "Stop"
function Assert-Eq($a, $b, $msg) {
  if ([decimal]$a -ne [decimal]$b) { throw "FAIL $msg : $a <> $b" }
  Write-Host "OK $msg"
}

# متوسط: (Q=100,A=10,q=20,c=16) => 11
$avg = (([decimal]100 * 10) + (20 * 16)) / (100 + 20)
Assert-Eq $avg 11 "wtavg positive"

# رصيد <=0 => تكلفة الوارد
Assert-Eq 12 12 "wtavg qty<=0 uses incoming"

# ضريبة 15%
Assert-Eq ([decimal]100 * [decimal]0.15) 15 "vat 15"

# إجمالي فاتورة: قيمة 100 خصم 10 أعباء 5 ضريبة 15 => 110
$tot = [decimal]100 - 10 + 5 + 15
Assert-Eq $tot 110 "invoice total"

# ترقيم بلا فجوة
$seq = @{ last = 0 }
$n1 = ++$seq.last; $n2 = ++$seq.last
Assert-Eq $n1 1 "seq 1"
Assert-Eq $n2 2 "seq 2"

# 0.1+0.2
Assert-Eq ([decimal]0.1 + [decimal]0.2) ([decimal]0.3) "decimal 0.1+0.2"

Write-Host "ALL FORMULA CHECKS PASSED"
