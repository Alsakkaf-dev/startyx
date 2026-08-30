/* ============================================================================
   مُتحقِّق المواصفات — يثبت أن الطبقة متسقة داخلياً قبل كتابة أي كود
   ----------------------------------------------------------------------------
   التشغيل:  node tools/validate-spec.js
   يفحص:
     ١) كل مرجع شاشة (op.* / prop.* / cfg.*) موجود في البيانات الفعلية
     ٢) كل ref كيان (to:) يشير لكيان معرَّف
     ٣) كل وثيقة لها قاعدة ترحيل، وأطرافها متوازنة منطقياً
     ٤) كل مبلغ مستخدَم معرَّف في AMOUNTS
     ٥) كل dependsOn يشير لكيان أو وثيقة موجودة
     ٦) طبقات البناء متسقة: لا كيان يعتمد على طبقة أعلى منه
     ٧) كل شاشة في خطة البناء موجودة فعلاً
   ========================================================================== */
"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const APP = path.join(__dirname, "..");
const win = { console };
win.window = win;
win.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const ctx = vm.createContext(win);

["util.js", "store.js", "data.js", "links.js", "proposed.js", "index-data.js",
 "spec-model.js", "spec-docs.js", "spec-rules.js"].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(APP, "assets/js", f), "utf8"), ctx, { filename: f }));

win.OnyxIndex.build();
const I = win.OnyxIndex;
const S = win.ONYX_SPEC;

let errors = [], warns = [], checks = 0;
const err  = (m) => { errors.push(m); };
const warn = (m) => { warns.push(m); };
const chk  = () => { checks++; };

/* أنماط مراجع الشاشات — بعضها عام مثل op.5.1.2.x */
function screenExists(ref) {
  if (!ref) return true;
  if (/\.x$/.test(ref)) {                     // نمط عام: op.5.1.2.x
    const prefix = ref.replace(/\.x$/, ".");
    return I.flat.some(n => n.ref && n.ref.indexOf(prefix) === 0);
  }
  if (/\bop\.\d+\.\d+\.\d+\.x\b/.test(ref)) return true;
  return !!I.resolve(ref);
}

/* ═════ ١) مراجع الشاشات في الكيانات ═════ */
console.log("── ١) مراجع الشاشات في الكيانات");
Object.keys(S.entities).forEach(k => {
  const e = S.entities[k];
  chk();
  if (e.screen && !screenExists(e.screen))
    err(`الكيان «${e.label}»: شاشة غير موجودة ${e.screen}`);
  (e.screens || []).forEach(s => {
    chk();
    if (!screenExists(s)) err(`الكيان «${e.label}»: شاشة غير موجودة ${s}`);
  });
});

/* ═════ ٢) مراجع الكيانات (to:) ═════ */
console.log("── ٢) مراجع الكيانات");
Object.keys(S.entities).forEach(k => {
  const e = S.entities[k];
  (e.fields || []).forEach(f => {
    if (f.type === "ref" || f.type === "list") {
      const target = f.to || f.of;
      chk();
      if (target && !S.entities[target] && !/^item(Unit)$/.test(target))
        err(`الكيان «${e.label}» الحقل «${f.name}»: يشير لكيان غير معرَّف «${target}»`);
    }
  });
});

/* ═════ ٣) الوثائق: مرجع الشاشة + قاعدة الترحيل ═════ */
console.log("── ٣) الوثائق وقواعد الترحيل");
const docRefs = new Set();
S.documents.forEach(d => {
  chk();
  if (!screenExists(d.ref)) err(`الوثيقة «${d.label}»: شاشة غير موجودة ${d.ref}`);
  docRefs.add(d.ref);

  const n = I.resolve(d.ref);
  if (n && n.label !== d.label && !/\(/.test(d.label))
    warn(`الوثيقة ${d.ref}: الاسم عندي «${d.label}» وفي البيانات «${n.label}»`);

  chk();
  if (!d.posting || !d.posting.legs || !d.posting.legs.length)
    err(`الوثيقة «${d.label}»: بلا قاعدة ترحيل`);
  else {
    /* توازن منطقي: يوجد طرف مدين وطرف دائن (أو both) */
    const sides = new Set(d.posting.legs.map(l => l.side));
    chk();
    const balanced = (sides.has("debit") && sides.has("credit")) || sides.has("both");
    if (!balanced) err(`الوثيقة «${d.label}»: أطراف غير متوازنة — ${[...sides].join("/")}`);

    /* كل مبلغ معرَّف */
    d.posting.legs.forEach(l => {
      chk();
      const a = String(l.amount || "");
      const known = Object.keys(S.amounts).some(k => a.indexOf(k) !== -1);
      const isLineExpr = /^line\./.test(a) || /line\.(debit|credit|amount)/.test(a);
      const isDerived = /accumDep|gainOrLoss/.test(a);
      if (!known && !isLineExpr && !isDerived)
        warn(`الوثيقة «${d.label}»: مبلغ غير معرَّف في AMOUNTS «${a}»`);
    });

    /* كل حساب له طريقة حلّ */
    d.posting.legs.forEach(l => {
      chk();
      const acc = l.account || {};
      if (!acc.from && !acc.map && !acc.fixed)
        err(`الوثيقة «${d.label}»: طرف بلا طريقة لحلّ الحساب`);
      if (acc.fixed && !I.resolve("acc." + acc.fixed))
        err(`الوثيقة «${d.label}»: حساب ثابت غير موجود في الدليل «${acc.fixed}»`);
    });
  }

  /* التبعيات */
  (d.dependsOn || []).forEach(dep => {
    chk();
    const isEntity = !!S.entities[dep];
    const isDoc = docRefs.has(dep) || S.documents.some(x => x.ref === dep);
    if (!isEntity && !isDoc) err(`الوثيقة «${d.label}»: تبعية غير معروفة «${dep}»`);
  });

  /* feeds تشير لكيانات */
  (d.feeds || []).forEach(f => {
    chk();
    if (!S.entities[f]) err(`الوثيقة «${d.label}»: feeds يشير لكيان غير معرَّف «${f}»`);
  });

  /* القرارات المعلّقة تشير لبند إعدادات حقيقي */
  if (d.posting && d.posting.pendingDecision) {
    chk();
    const b = d.posting.pendingDecision.blockedBy;
    if (b && !I.resolve(b)) err(`الوثيقة «${d.label}»: blockedBy غير موجود «${b}»`);
  }
});

/* ═════ ٤) الثوابت ═════ */
console.log("── ٤) الثوابت");
const seenInv = new Set();
S.invariants.forEach(v => {
  chk();
  if (seenInv.has(v.id)) err(`ثابت مكرر: ${v.id}`);
  seenInv.add(v.id);
  if (!v.rule || !v.test) err(`الثابت ${v.id}: ينقصه rule أو test`);
});

/* ═════ ٥) خطة البناء ═════ */
console.log("── ٥) خطة البناء");
S.phases.forEach(p => {
  chk();
  (p.screens || []).forEach(s => {
    chk();
    if (!screenExists(s)) err(`المرحلة ${p.n} «${p.title}»: شاشة غير موجودة ${s}`);
  });
  if (p.blockedBy) {
    chk();
    const ok = S.blockers.some(b => p.blockedBy.indexOf(b.source) !== -1) ||
               /cfg\./.test(p.blockedBy);
    if (!ok) warn(`المرحلة ${p.n}: blockedBy لا يطابق أي عائق معرَّف`);
  }
});

/* ═════ ٦) العوائق ═════ */
console.log("── ٦) العوائق");
S.blockers.forEach(b => {
  chk();
  const m = String(b.source).match(/((op|cfg|acc|prop)\.[\w.]+)/);
  if (m && !I.resolve(m[1])) err(`العائق ${b.id}: مصدر غير موجود «${m[1]}»`);
});

/* ═════ ٧) الطبقات ═════ */
console.log("── ٧) اتساق الطبقات");
Object.keys(S.entities).forEach(k => {
  const e = S.entities[k];
  if (e.layer == null) { warn(`الكيان «${e.label}»: بلا layer`); return; }
  (e.fields || []).forEach(f => {
    const target = f.to;
    if (!target || !S.entities[target]) return;
    chk();
    const t = S.entities[target];
    if (t.layer != null && t.layer > e.layer)
      err(`الكيان «${e.label}» (طبقة ${e.layer}) يشير إلى «${t.label}» (طبقة ${t.layer}) — تبعية معكوسة`);
  });
});

/* ═════ ٨) التغطية ═════ */
console.log("── ٨) التغطية");
const postingScreens = I.flat.filter(n =>
  n._isLeaf && n.ref && /^op\./.test(n.ref) &&
  n._parent && /عمليات|حركة/.test(n._parent.label) &&
  /فاتورة|سند|قيد|إشعار|اشعار|أمر |امر |إذن|اذن|تحويل|تسوي|مردود/.test(n.label));
const specced = new Set(S.documents.map(d => d.ref));
const nonPost = new Set((S.nonPosting || []).map(d => d.ref));
const pending = new Set((S.pendingSpec || []).map(d => d.ref));
const missing = postingScreens.filter(n => !specced.has(n.ref) && !nonPost.has(n.ref) && !pending.has(n.ref));

console.log(`   وثائق بقاعدة ترحيل كاملة : ${S.documents.length}`);
console.log(`   وثائق إجرائية (لا تُرحَّل) : ${nonPost.size}`);
console.log(`   بانتظار كتابة المواصفة    : ${pending.size}`);
console.log(`   شاشات ترحيل في البيانات   : ${postingScreens.length}`);
console.log(`   غير مصنَّفة               : ${missing.length}`);
if (missing.length) missing.forEach(n => console.log(`     · ${n.ref.padEnd(14)} ${n.label}`));

/* صحة التصنيف: لا تداخل */
[...nonPost].forEach(r => { chk(); if (specced.has(r)) err(`${r} مصنَّف إجرائياً وله قاعدة ترحيل معاً`); });
[...pending].forEach(r => { chk(); if (specced.has(r)) err(`${r} مصنَّف معلّقاً وله قاعدة ترحيل معاً`); });
[...nonPost, ...pending].forEach(r => { chk(); if (!screenExists(r)) err(`تصنيف يشير لشاشة غير موجودة ${r}`); });
(S.nonPosting || []).forEach(d => { chk();
  if (d.becomes) { const first = d.becomes.split(" ")[0];
    if (!screenExists(first)) err(`${d.ref}: becomes يشير لشاشة غير موجودة ${first}`); } });

/* ═════ النتيجة ═════ */
console.log("\n" + "═".repeat(60));
console.log(`فحوصات: ${checks}   |   أخطاء: ${errors.length}   |   تنبيهات: ${warns.length}`);
if (errors.length) { console.log("\n✗ أخطاء:"); errors.forEach(e => console.log("   " + e)); }
if (warns.length)  { console.log("\n⚠ تنبيهات:"); warns.forEach(w => console.log("   " + w)); }
if (!errors.length) console.log("\n✔ المواصفات متسقة داخلياً");
process.exit(errors.length ? 1 : 0);
