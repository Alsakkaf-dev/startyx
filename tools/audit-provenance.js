/* ============================================================================
   مُدقِّق الأصل — يفرض قاعدة «شجرة بتروسبيشل فقط»
   ----------------------------------------------------------------------------
   التشغيل:  node tools/audit-provenance.js

   القاعدة: كل ما يعرضه البرنامج يجب أن يعود لأحد مصدرين لا ثالث لهما:
     ① مستخرَج من  tree-viewer.html   (op.* / acc.* / cfg.*)
     ② مُشتقّ صراحةً من الدليل المحاسبي، وموسوم بأنه مُشتقّ (prop.*)

   أي شيء آخر — رقم مُختلَق، شاشة من إصدار أونيكس مختلف، مفهوم ERP عام
   لا أثر له في شجرتكم — يُرفع هنا كمخالفة.

   شغّله بعد أي تعديل. إن رجع بخطأ فقد تسرّب شيء لا يخصّ بتروسبيشل.
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

["util.js", "store.js", "data.js", "mock.js", "links.js", "proposed.js", "index-data.js",
 "spec-model.js", "spec-docs.js", "spec-rules.js", "settings-schema.js"].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(APP, "assets/js", f), "utf8"), ctx, { filename: f }));

win.OnyxIndex.build();
const I = win.OnyxIndex, S = win.ONYX_SPEC, L = win.ONYX_LINKS,
      M = win.ONYX_MOCK, PR = win.ONYX_PROPOSED;

let violations = [], notes = [], checks = 0;
const bad  = m => violations.push(m);
const note = m => notes.push(m);
const chk  = () => checks++;

/* من الشجرة الفعلية؟ */
const fromTree = r => /^(op|acc|cfg)\./.test(String(r)) && !!I.resolve(r);
/* مُشتقّ موسوم؟ */
const derived  = r => /^prop\./.test(String(r));

console.log("═══ مُدقِّق الأصل: شجرة بتروسبيشل فقط ═══\n");

/* ── ١) الأنظمة المعروضة ── */
console.log("① الأشجار المعروضة");
I.modules.forEach(m => {
  chk();
  if (m.variant === "proposed") {
    if (!m.gapFor || !m.gapFor.length)
      bad(`النظام المقترح «${m.label}» بلا gapFor — لا يثبت اشتقاقه من الدليل`);
    else {
      const okAll = m.gapFor.every(a => fromTree(a));
      if (!okAll) bad(`النظام المقترح «${m.label}»: gapFor يشير لحساب ليس في دليلكم`);
      else console.log(`   ◇ مُشتقّ  ${m.label}  ← ${m.gapFor.join(" · ")}`);
    }
    if (!m.why) bad(`النظام المقترح «${m.label}» بلا why — لا يوضّح لماذا وُجد`);
  } else if (m.variant === "operations" || m.variant === "accounts" || m.variant === "config") {
    console.log(`   ✓ من الشجرة  ${m.label}`);
  } else {
    bad(`الشجرة «${m.label}» بلا variant معروف — أصلها غير محدَّد`);
  }
});

/* ── ٢) لا أرقام مُختلَقة في اللوحة ── */
console.log("\n② اللوحة الرئيسية");
chk();
if (M.kpis)          bad("mock.js يحوي kpis — أرقام مُختلَقة، احذفها");
if (M.activity)      bad("mock.js يحوي activity — أحداث مُختلَقة، احذفها");
if (M.notifications) bad("mock.js يحوي notifications — تنبيهات مُختلَقة، احذفها");
if (!violations.length) console.log("   ✓ لا أرقام مُختلَقة");

(M.structureStats || []).forEach(st => {
  chk();
  if (st.value != null) bad(`المؤشر «${st.label}» يحمل قيمة مخزّنة — يجب أن يُحسب فقط`);
});
(M.quickAccess || []).forEach(r => {
  chk();
  if (!fromTree(r)) bad(`الوصول السريع يشير لمرجع ليس من الشجرة: ${r}`);
});
console.log(`   ✓ ${(M.structureStats||[]).length} مؤشر محسوب · ${(M.quickAccess||[]).length} اختصار من cfg.4`);

/* الخصائص المفعّلة/المعطّلة يجب أن تطابق cfg الفعلية */
const cfgLabels = new Set();
I.flat.forEach(n => { if (/^cfg\./.test(n.ref || "")) cfgLabels.add(n.label); });
["on", "off"].forEach(k => {
  ((M.features || {})[k] || []).forEach(t => {
    chk();
    const hit = [...cfgLabels].some(l => l.indexOf(t) >= 0 || t.indexOf(l) >= 0);
    if (!hit) note(`الخاصية «${t}» لا تطابق أي بند في cfg — تحقق من نصها`);
  });
});

/* ── ٣) التبويبات ── */
console.log("\n③ تبويبات الشاشات");
let tabbed = 0;
I.flat.forEach(n => { if (n.tabs) tabbed++; });
chk();
console.log(`   ${tabbed} شاشة لها تبويبات` +
  (tabbed === 0 ? "  ✓ (لا ادّعاء غير مؤكَّد)" : "  — تأكّد أنها من V8.1.27 لا من أدلة إصدار آخر"));

/* ── ٤) مراجع المواصفة ── */
console.log("\n④ طبقة المواصفات");
Object.keys(S.entities).forEach(k => {
  const e = S.entities[k];
  chk();
  const refs = [e.screen].concat(e.screens || []).filter(Boolean);
  const hasReal = refs.some(r => fromTree(r) || /\.x$/.test(r));
  const hasDerived = refs.some(r => derived(r));
  if (!refs.length) {
    if (!e.noScreen && e.kind !== "ledger")
      bad(`الكيان «${e.label}» بلا شاشة وبلا noScreen — أصله غير موثَّق`);
  } else if (!hasReal && !hasDerived) {
    bad(`الكيان «${e.label}»: شاشاته ليست من الشجرة (${refs.join(", ")})`);
  }
  if (e.proposed && !hasDerived)
    bad(`الكيان «${e.label}» موسوم proposed لكن شاشته ليست prop.*`);
});

S.documents.forEach(d => {
  chk();
  if (!fromTree(d.ref) && !derived(d.ref))
    bad(`الوثيقة «${d.label}» (${d.ref}): ليست من الشجرة ولا مُشتقّة`);
  if (derived(d.ref) && !d.proposed)
    bad(`الوثيقة «${d.label}» مرجعها prop.* لكنها غير موسومة proposed`);
  /* الحسابات الثابتة يجب أن تكون في دليلكم */
  ((d.posting || {}).legs || []).forEach(l => {
    chk();
    if (l.account && l.account.fixed && !I.resolve("acc." + l.account.fixed))
      bad(`الوثيقة «${d.label}»: حساب ثابت ${l.account.fixed} ليس في دليلكم`);
  });
});

(S.nonPosting || []).concat(S.pendingSpec || []).forEach(d => {
  chk();
  if (!fromTree(d.ref)) bad(`تصنيف وثيقة يشير لمرجع ليس من الشجرة: ${d.ref}`);
});

/* مراحل البناء وعوائقها */
(S.phases || []).forEach(p => {
  (p.screens || []).forEach(r => {
    chk();
    if (!fromTree(r) && !derived(r) && !/\.x$/.test(r))
      bad(`المرحلة ${p.n}: شاشة ليست من الشجرة ${r}`);
  });
});
(S.blockers || []).forEach(b => {
  chk();
  const m = String(b.source).match(/((op|cfg|acc|prop)\.[\w.]+)/);
  if (!m) note(`العائق ${b.id}: مصدره غير مرتبط بمرجع من الشجرة`);
  else if (!I.resolve(m[1])) bad(`العائق ${b.id}: مصدر غير موجود ${m[1]}`);
});
console.log(`   ✓ ${Object.keys(S.entities).length} كيان · ${S.documents.length} وثيقة · ` +
  `${(S.phases||[]).length} مرحلة · ${(S.blockers||[]).length} عائق`);

/* ── ٥) خريطة الربط ── */
console.log("\n⑤ الربط المحاسبي");
(L.map || []).forEach(m => {
  chk();
  if (!I.resolve("acc." + m.code)) bad(`الربط: حساب ${m.code} ليس في دليلكم`);
  (m.systems || []).forEach(r => { chk(); if (!fromTree(r)) bad(`الربط ${m.code}: نظام ليس من الشجرة ${r}`); });
  if (m.bridge) { chk(); if (!fromTree(m.bridge)) bad(`الربط ${m.code}: جسر ليس من الشجرة ${m.bridge}`); }
  (m.screens || []).forEach(r => { chk(); if (!fromTree(r)) bad(`الربط ${m.code}: شاشة ليست من الشجرة ${r}`); });
  if (!m.evidence) bad(`الربط ${m.code}: بلا evidence — لا سند له`);
  if (m.confidence !== "verified" && m.confidence !== "inferred")
    bad(`الربط ${m.code}: confidence غير محدَّد`);
});
(L.bridges || []).forEach(b => { chk(); if (!fromTree(b.ref)) bad(`جسر ليس من الشجرة: ${b.ref}`); });
(L.gaps || []).forEach(g => {
  (g.accounts || []).forEach(a => { chk(); if (!fromTree(a)) bad(`الفجوة «${g.title}»: حساب ليس من الدليل ${a}`); });
});
console.log(`   ✓ ${(L.map||[]).length} ربط · ${(L.bridges||[]).length} جسر · ${(L.gaps||[]).length} فجوة`);

/* ── ٦) لوحة الإعدادات: كل حقل يعود لشاشة أو بند حقيقي ── */
console.log("\n⑥ لوحة الإعدادات");
const CP = win.ONYX_SETTINGS_SCHEMA;
if (!CP) {
  bad("مخطّط الإعدادات غير محمّل");
} else {
  const seenTabs = new Set();
  CP.tabs.forEach(t => {
    chk();
    if (seenTabs.has(t.id)) bad(`تبويب إعدادات مكرر: ${t.id}`);
    seenTabs.add(t.id);
    if (!t.groups || !t.groups.length) bad(`تبويب «${t.label}» بلا مجموعات`);
  });

  const seenIds = new Set();
  CP.allFields().forEach(f => {
    chk();
    if (seenIds.has(f.id)) bad(`حقل إعدادات مكرر: ${f.id}`);
    seenIds.add(f.id);

    /* ⛔ لا حقل بلا مصدر من شجرة بتروسبيشل */
    if (!f.src) bad(`الحقل «${f.label}» بلا src — بند إعدادات بلا مصدر`);
    else if (!fromTree(f.src)) bad(`الحقل «${f.label}»: src=${f.src} ليس في شجرتكم`);

    if (f.screen && !fromTree(f.screen))
      bad(`الحقل «${f.label}»: screen=${f.screen} ليس في شجرتكم`);

    /* ⛔ لا قيمة افتراضية لبند لم يُقرأ بعد — وإلا تسلّل رقم بلا مصدر */
    if (f.state === "pending" && f.value !== undefined)
      bad(`الحقل «${f.label}» حالته «يحتاج قراءة» لكنه يحمل قيمة مسبقة`);
    if (f.state === "decision" && f.value !== undefined)
      bad(`الحقل «${f.label}» قرار حاجب لكنه محسوم مسبقاً — القرار لكم لا للبرنامج`);

    if (f.state === "decision" && !f.blocker)
      bad(`الحقل «${f.label}» قرار حاجب بلا رقم عائق (BLK)`);
    if (f.blocker && !(S.blockers || []).some(b => b.id === f.blocker))
      bad(`الحقل «${f.label}»: العائق ${f.blocker} غير معرَّف في المواصفات`);
  });

  /* كل عائق في المواصفات له بند يُضبَط في اللوحة */
  (S.blockers || []).forEach(b => {
    chk();
    if (!CP.allFields().some(f => f.blocker === b.id))
      bad(`العائق ${b.id} «${b.title}» بلا بند في لوحة الإعدادات — قرار بلا مكان يُسجَّل فيه`);
  });

  const c = st => CP.countBy(st);
  console.log(`   ✓ ${CP.tabs.length} تبويب · ${CP.allFields().length} حقل — كلها بمصدر من شجرتكم`);
  console.log(`   ✓ ${c("locked")} مقفل · ${c("set")} مضبوط · ${c("pending")} يحتاج قراءة · ${c("decision")} قرار حاجب`);
}

/* ── ٧) ملفات دخيلة ── */
console.log("\n⑦ ملفات المشروع");
const strayPatterns = [/pdf/i, /manual/i, /\.bak$/];
function scan(dir, rel) {
  fs.readdirSync(path.join(APP, dir), { withFileTypes: true }).forEach(e => {
    const r = rel + e.name;
    if (e.isDirectory()) { if (e.name !== "node_modules") scan(path.join(dir, e.name), r + "/"); return; }
    chk();
    if (strayPatterns.some(p => p.test(e.name)))
      bad(`ملف مشبوه الأصل: ${r}`);
  });
}
scan(".", "");
console.log("   ✓ لا ملفات من مصادر خارج بتروسبيشل");

/* ── النتيجة ── */
console.log("\n" + "═".repeat(62));
console.log(`فحوصات: ${checks}   |   مخالفات: ${violations.length}   |   ملاحظات: ${notes.length}`);
if (violations.length) { console.log("\n✗ مخالفات قاعدة «شجرة بتروسبيشل فقط»:"); violations.forEach(v => console.log("   " + v)); }
if (notes.length) { console.log("\n· ملاحظات:"); notes.forEach(n => console.log("   " + n)); }
if (!violations.length) console.log("\n✔ كل ما يعرضه البرنامج يعود لشجرة بتروسبيشل أو مُشتقّ منها بوسم صريح");
process.exit(violations.length ? 1 : 0);
