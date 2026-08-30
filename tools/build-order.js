/* ============================================================================
   مولّد ترتيب البناء — أي شاشة أولاً ولماذا
   ----------------------------------------------------------------------------
   التشغيل:  node tools/build-order.js            ← عرض مقروء
             node tools/build-order.js --json     ← إخراج JSON

   المنهج (لا حدس فيه):
     ١) يبني رسماً بيانياً للتبعيات من طبقة المواصفات:
          كيان → الكيانات التي يشير إليها بحقول ref
          وثيقة → dependsOn (كيانات ووثائق)
          + حواف إجبارية: كل ما يحتاج ترحيلاً يعتمد على خدمات الطبقة ١
     ٢) ترتيب طوبولوجي (Kahn) — يضمن ألّا تُبنى شاشة قبل ما تعتمد عليه
     ٣) عند التساوي يرجّح: الطبقة الأدنى ← الأكثر فتحاً لغيره ← الوثائق المحورية
     ٤) يتحقق أن الترتيب النهائي بلا تبعية أمامية (خطأ صريح إن وُجدت)

   لكل شاشة يُخرج: المرجع · الاسم · لماذا الآن · يعتمد على · يفتح · جداول القاعدة
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
const I = win.OnyxIndex, S = win.ONYX_SPEC, L = win.ONYX_LINKS;

/* ══════════════════════════════════════════════════════════════════════════
   ١) خدمات مشتركة — ليست شاشات، لكن لا شيء يعمل قبلها
   ══════════════════════════════════════════════════════════════════════════ */
const SERVICES = [
  { id: "svc.schema", label: "مخطط قاعدة البيانات الأساسي",
    why: "الجداول التي لا تتغيّر لاحقاً: الحسابات، الفترات، العملات، الفروع، الأبعاد.",
    tables: ["account", "currency", "exchange_rate", "fiscal_period", "branch",
             "cost_center", "project", "activity"],
    note: "غيّر عمود هنا لاحقاً = ترحيل بيانات مؤلم. اضبطه أولاً." },
  { id: "svc.numbering", label: "خدمة الترقيم",
    why: "كل وثيقة تحتاج رقماً فريداً محجوزاً ذرّياً عند الحفظ.",
    tables: ["number_series"], invariants: ["INV-10"] },
  { id: "svc.accountResolver", label: "خدمة حلّ الحسابات",
    why: "تترجم مفتاح الربط إلى حساب وقت الترحيل. بدونها كل وثيقة ستخزّن رقم حساب — وهو الخطأ الذي لا يُصلَح لاحقاً.",
    tables: ["account_mapping"], invariants: ["INV-7", "INV-8"] },
  { id: "svc.posting", label: "خدمة الترحيل",
    why: "نقطة واحدة تكتب القيد وحركة المخزون في معاملة ذرّية وتطبّق الثوابت. كرّرها في الشاشات = ستنكسر.",
    tables: ["journal_entry", "journal_line", "stock_movement"],
    invariants: ["INV-1", "INV-2", "INV-3", "INV-4", "INV-5", "INV-6", "INV-9"] },
  { id: "svc.periodGuard", label: "حارس الفترة والصلاحيات",
    why: "يمنع أي كتابة في فترة موقوفة أو مقفلة، ويفرض صلاحية الشاشة.",
    tables: [], invariants: ["INV-4"] }
];

/* ══════════════════════════════════════════════════════════════════════════
   ٢) جمع الشاشات من المواصفات + الشجرة
   ══════════════════════════════════════════════════════════════════════════ */
const nodes = new Map();   // id -> node

function add(n) {
  if (nodes.has(n.id)) { Object.assign(nodes.get(n.id), n); return nodes.get(n.id); }
  nodes.set(n.id, n);
  return n;
}

/* الخدمات أولاً */
SERVICES.forEach((s, i) => add({
  id: s.id, kind: "service", label: s.label, layer: -1, order: i,
  why: s.why, tables: s.tables || [], invariants: s.invariants || [], deps: []
}));

/* كل خدمة تعتمد على التي قبلها (سلسلة) */
for (let i = 1; i < SERVICES.length; i++) nodes.get(SERVICES[i].id).deps.push(SERVICES[i - 1].id);

/* كيانات المواصفة → شاشات */
const entityScreen = new Map();   // entityKey -> screenRef
Object.keys(S.entities).forEach(k => {
  const e = S.entities[k];
  const ref = e.screen;
  if (!ref || /\.x$/.test(ref)) return;
  const n = I.resolve(ref);
  if (!n) return;
  entityScreen.set(k, ref);
});

Object.keys(S.entities).forEach(k => {
  const e = S.entities[k];
  const ref = entityScreen.get(k);
  if (!ref) return;
  const n = I.resolve(ref);
  const deps = [];
  (e.fields || []).forEach(f => {
    const t = f.to;
    if (!t || t === k) return;
    const tr = entityScreen.get(t);
    if (tr) deps.push(tr);
  });
  /* كل شاشة بيانات تعتمد على المخطط الأساسي */
  deps.push("svc.schema");
  add({
    id: ref, kind: e.kind === "config" ? "config" : "master",
    label: n.label, ref: ref, layer: e.layer != null ? e.layer : 2,
    entity: k, why: e.note || null, rules: e.rules || [],
    tables: [snake(k)], deps: uniq(deps),
    system: n._module ? n._module.label : null
  });
});

/* وثائق المواصفة */
S.documents.forEach(d => {
  const n = I.resolve(d.ref);
  if (!n) return;
  const deps = ["svc.posting"];
  (d.dependsOn || []).forEach(dep => {
    const tr = entityScreen.get(dep);
    if (tr) { deps.push(tr); return; }
    if (I.resolve(dep)) deps.push(dep);
  });
  /* أي وثيقة تستخدم جدول الربط تعتمد على شاشات الربط */
  ((d.posting || {}).legs || []).forEach(l => {
    if (l.account && l.account.map) deps.push("svc.accountResolver");
  });
  if ((d.dependsOn || []).indexOf("accountMapping") !== -1) {
    (S.entities.accountMapping.screens || []).forEach(r => { if (I.resolve(r)) deps.push(r); });
  }
  add({
    id: d.ref, kind: "document", label: n.label, ref: d.ref,
    layer: d.layer != null ? d.layer : 4,
    family: d.family, keyDoc: !!d.keyDoc, proposed: !!d.proposed,
    why: d.role, rules: d.validations || [],
    legs: ((d.posting || {}).legs || []).length,
    pending: (d.posting || {}).pendingDecision || null,
    tables: [snake(d.ref.replace(/^op\./, "doc_").replace(/\./g, "_"))],
    deps: uniq(deps),
    system: n._module ? n._module.label : null
  });
});

/* شاشات الربط الصريحة (الجسور) — طبقة ١ */
(L.bridges || []).forEach(b => {
  const n = I.resolve(b.ref);
  if (!n) return;
  if (nodes.has(b.ref)) { nodes.get(b.ref).bridge = b.role; return; }
  add({
    id: b.ref, kind: "bridge", label: n.label, ref: b.ref, layer: 1,
    why: b.role, bridge: b.role, tables: ["account_mapping"],
    deps: ["svc.accountResolver", "svc.schema"],
    system: n._module ? n._module.label : null
  });
});

/* الأرصدة الافتتاحية — طبقة ٣ */
[["op.4.1.2.10", "الأرصدة الافتتاحية للحسابات", ["account"], "نقطة البداية. كل خطأ هنا يتضاعف في كل تقرير لاحق."],
 ["op.5.1.2.15", "المخزون الإفتتاحي", ["item", "warehouse"], "كمية × تكلفة لكل صنف في كل مخزن — يجب أن يساوي رصيد 1202."]
].forEach(([ref, lbl, dep, why]) => {
  const n = I.resolve(ref);
  if (!n) return;
  const deps = ["svc.posting"];
  dep.forEach(k => { const r = entityScreen.get(k); if (r) deps.push(r); });
  add({ id: ref, kind: "opening", label: n.label, ref: ref, layer: 3,
        why: why, tables: ["opening_balance"], deps: uniq(deps),
        system: n._module ? n._module.label : null });
});

/* التقارير الجوهرية — طبقة ٥ */
const CORE_REPORTS = [
  ["op.4.1.4.5",  "⛔ الاختبار الأول لكل ما بنيته: إن لم يتوازن فهناك خلل في الترحيل. ابنِه فور أول قيد.", 0],
  ["op.4.1.4.1",  "يثبت أن القيود وصلت للحساب الصحيح — أول ما يفتحه المحاسب.", 1],
  ["op.4.1.4.4",  "سجل كل القيود بمصادرها — أداة التدقيق الأولى (يفحص INV-2).", 2],
  ["op.4.1.4.23", "طباعة شجرة الدليل — بسيط، ويكشف أخطاء البنية مبكراً.", 3],
  ["op.4.1.4.9",  "يثبت صحة نقطة البداية قبل أي وثيقة تشغيلية.", 4],
  ["op.5.1.4.1",  "⛔ يجب أن يطابق رصيد 1202 في الأستاذ — أهم مطابقة في النظام.", 5],
  ["op.5.1.4.2",  "يكشف أي حركة كمية بلا قيمة (يفحص INV-3).", 6],
  ["op.4.1.4.11", "تقارير سند القبض — تحقق من دورة النقدية.", 7],
  ["op.4.1.4.13", "تقارير سند الصرف — مثبَّت باختصارات شاشتكم الرئيسية.", 8],
  ["op.4.1.4.15", "تقارير قيود اليومية.", 9],
  ["op.4.1.4.7",  "المركز المالي — يعتمد على توازن الميزان.", 10],
  ["op.4.1.4.6",  "قائمة الدخل — آخر التقارير الختامية.", 11],
  ["op.4.1.4.8",  "التدفقات النقدية — يحتاج ربط الحسابات بالتدفقات (op.1.2.4).", 12]
];
/* ⛔ ثلاثة تقارير تحقّق تُبنى فور أول وثيقة، لا في النهاية:
      بدونها تبني الوثائق على العمياء ولا تعرف أن الترحيل يعمل.
      لذلك تُثبَّت في الطبقة ٤ مباشرة بعد «قيود اليومية».             */
const CHECKPOINT_REPORTS = new Set(["op.4.1.4.5", "op.4.1.4.1", "op.4.1.4.4"]);

CORE_REPORTS.forEach(([ref, why, ord]) => {
  const n = I.resolve(ref);
  if (!n) { console.error("تقرير غير موجود: " + ref); return; }
  const isCheck = CHECKPOINT_REPORTS.has(ref);
  add({ id: ref, kind: "report", label: n.label, ref: ref,
        layer: isCheck ? 4 : 5,
        checkpoint: isCheck,
        why: why, order: ord,
        cx: isCheck ? 2.5 : 0,          /* بعد قيود اليومية (cx=2) وقبل باقي الوثائق */
        tables: [],
        deps: isCheck ? ["svc.posting", "op.4.1.3.14"] : ["svc.posting"],
        system: n._module ? n._module.label : null });
});

/* ══════════════════════════════════════════════════════════════════════════
   ٣) ترتيب طوبولوجي مرجَّح
   ══════════════════════════════════════════════════════════════════════════ */
const all = [...nodes.values()];
all.forEach(n => { n.deps = (n.deps || []).filter(d => nodes.has(d) && d !== n.id); });

/* من يفتح الطريق لمن */
const unlocks = new Map();
all.forEach(n => unlocks.set(n.id, []));
all.forEach(n => n.deps.forEach(d => unlocks.get(d).push(n.id)));
all.forEach(n => { n.unlocks = unlocks.get(n.id); });

/* وزن: الطبقة ثم عدد ما يفتحه (تعدّياً) ثم المحورية */
function reach(id, seen) {
  seen = seen || new Set();
  (unlocks.get(id) || []).forEach(u => { if (!seen.has(u)) { seen.add(u); reach(u, seen); } });
  return seen.size;
}
all.forEach(n => { n.impact = reach(n.id); });

/* درجة التعقيد — كلما قلّت وجب بناؤها أبكر داخل الطبقة نفسها.
   السبب: أول وثيقة تبنيها تختبر خدمة الترحيل. اختبرها بأبسط حالة،
   لا بفاتورة تمسّ خمسة حسابات ولها قرار معلّق.                        */
all.forEach(n => {
  if (n.checkpoint) return;                 /* cx مثبَّت مسبقاً */
  if (n.kind !== "document") { n.cx = 0; return; }
  const d = S.documents.filter(x => x.ref === n.id)[0] || {};
  const legs = ((d.posting || {}).legs || []).length;
  const touchesStock = (d.feeds || []).indexOf("stockMovement") !== -1;
  const blocked = !!(d.posting || {}).pendingDecision;
  const condLegs = ((d.posting || {}).legs || []).filter(l => l.when).length;
  n.cx = legs                       /* عدد الأطراف */
       + condLegs * 2               /* أطراف مشروطة = فروع منطق */
       + (touchesStock ? 4 : 0)     /* يمسّ المخزون = دفتران بدل واحد */
       + (blocked ? 8 : 0)          /* قرار معلّق = لا تبدأه أصلاً */
       + Math.floor((n.deps || []).length / 3)
       + ((d.validations || []).length > 5 ? 2 : 0);
  n.cxParts = { legs: legs, condLegs: condLegs, stock: touchesStock, blocked: blocked };
});

const indeg = new Map();
all.forEach(n => indeg.set(n.id, n.deps.length));
const ready = all.filter(n => indeg.get(n.id) === 0);
const out = [];
const done = new Set();

function pick(list) {
  return list.sort((a, b) =>
    (a.layer - b.layer) ||
    /* المقترح دائماً بعد الحقيقي داخل الطبقة نفسها */
    ((a.proposed ? 1 : 0) - (b.proposed ? 1 : 0)) ||
    /* الأبسط أولاً — تختبر خدمة الترحيل بأقل مخاطرة */
    (a.cx - b.cx) ||
    /* ترتيب صريح إن وُجد (الخدمات والتقارير) */
    ((a.order != null ? a.order : 99) - (b.order != null ? b.order : 99)) ||
    /* ثم الأكثر فتحاً لغيره */
    (b.impact - a.impact) ||
    String(a.id).localeCompare(String(b.id))
  )[0];
}

let pool = ready.slice();
while (pool.length) {
  const n = pick(pool);
  pool = pool.filter(x => x.id !== n.id);
  out.push(n); done.add(n.id);
  (unlocks.get(n.id) || []).forEach(u => {
    indeg.set(u, indeg.get(u) - 1);
    if (indeg.get(u) === 0) pool.push(nodes.get(u));
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   ٤) التحقق: لا تبعية أمامية
   ══════════════════════════════════════════════════════════════════════════ */
const pos = new Map();
out.forEach((n, i) => pos.set(n.id, i));
const violations = [];
out.forEach(n => n.deps.forEach(d => {
  if (!pos.has(d)) violations.push(`${n.id} يعتمد على ${d} غير المرتَّب`);
  else if (pos.get(d) > pos.get(n.id))
    violations.push(`${n.id} (#${pos.get(n.id) + 1}) يعتمد على ${d} (#${pos.get(d) + 1}) — تبعية أمامية`);
}));
const cyclic = all.filter(n => !done.has(n.id));
cyclic.forEach(n => violations.push(`دورة تبعية تمنع ترتيب ${n.id}`));

/* ══════════════════════════════════════════════════════════════════════════
   الإخراج
   ══════════════════════════════════════════════════════════════════════════ */
function snake(s) {
  return String(s).replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}
function uniq(a) { return [...new Set(a)]; }

const KIND_AR = {
  service: "خدمة", master: "بيانات أساسية", config: "تهيئة",
  bridge: "ربط حسابات", opening: "رصيد افتتاحي", document: "وثيقة", report: "تقرير"
};

const AS_MD = process.argv.indexOf("--md") !== -1;
if (process.argv.indexOf("--json") !== -1) {
  console.log(JSON.stringify({ order: out.map((n, i) => ({ seq: i + 1, ...n })), violations }, null, 2));
} else if (!AS_MD) {
  console.log("═".repeat(74));
  console.log("  ترتيب بناء شاشات بتروسبيشل — محسوب من رسم التبعيات");
  console.log("═".repeat(74));
  let lastLayer = null;
  out.forEach((n, i) => {
    if (n.layer !== lastLayer) {
      lastLayer = n.layer;
      const lay = (S.layers || []).filter(l => l.n === n.layer)[0];
      console.log("\n" + "─".repeat(74));
      console.log("  طبقة " + (n.layer < 0 ? "٠ — الخدمات المشتركة" : n.layer + " — " + (lay ? lay.label : "")));
      console.log("─".repeat(74));
    }
    console.log(`\n${String(i + 1).padStart(3)}. ${n.label}` +
      (n.ref ? `   [${n.ref}]` : "") + `   (${KIND_AR[n.kind] || n.kind})` +
      (n.keyDoc ? "  ★محورية" : "") + (n.proposed ? "  ◇مقترحة" : "") +
      (n.checkpoint ? "  ⚑نقطة تحقق" : ""));
    if (n.why) console.log(`     لماذا الآن: ${n.why}`);
    if (n.deps && n.deps.length)
      console.log(`     يعتمد على: ${n.deps.map(d => (nodes.get(d) || {}).label || d).join(" · ")}`);
    if (n.impact) console.log(`     يفتح الطريق لـ: ${n.impact} شاشة`);
    if (n.kind === "document") {
      const c = n.cxParts || {};
      console.log(`     تعقيد: ${n.cx}  (${c.legs} طرف` +
        (c.condLegs ? `، ${c.condLegs} مشروط` : "") +
        (c.stock ? "، يمسّ المخزون" : "") + (c.blocked ? "، قرار معلّق" : "") + ")");
    }
    if (n.tables && n.tables.length) console.log(`     جداول: ${n.tables.join(", ")}`);
    if (n.invariants && n.invariants.length) console.log(`     ثوابت: ${n.invariants.join(", ")}`);
    if (n.pending) console.log(`     ⛔ قرار معلّق: ${n.pending.question}`);
  });
  console.log("\n" + "═".repeat(74));
  console.log(`  المجموع: ${out.length} خطوة`);
  console.log(`  مخالفات الترتيب: ${violations.length}`);
  if (violations.length) violations.forEach(v => console.log("   ✗ " + v));
  else console.log("  ✔ لا تبعية أمامية — الترتيب صالح للتنفيذ");
}

/* ══════════════════════════════════════════════════════════════════════════
   ٥) ما تبقّى — الشاشات خارج الترتيب الحرج، مصنّفة بأثرها
   ══════════════════════════════════════════════════════════════════════════ */
const inOrder = new Set(out.map(n => n.id));
const rest = I.flat.filter(n =>
  n._isLeaf && /^op\./.test(n.ref || "") && !inOrder.has(n.ref));

function bucketOf(n) {
  const g = (n._parent && n._parent.label) || "";
  const s = n.label;
  if ((S.nonPosting || []).some(x => x.ref === n.ref)) return "procedural";
  if ((S.pendingSpec || []).some(x => x.ref === n.ref)) return "needsSpec";
  if (/تقارير/.test(g) || /^تقارير/.test(s)) return "reports";
  if (/تهيئ|متغيرات|ترميز|أنواع/.test(g)) return "config";
  if (/مدخلات|بيانات/.test(g)) return "master";
  if (/عمليات|حركة|جرد/.test(g)) return "ops";
  return "other";
}
const BUCKETS = {
  needsSpec:  { t: "وثائق تُرحَّل لكن مواصفتها لم تُكتب", w: "⛔ لا تبرمجها قبل كتابة قاعدة ترحيلها" },
  ops:        { t: "عمليات أخرى",                        w: "بعد استقرار الدورات الأساسية" },
  procedural: { t: "وثائق إجرائية (لا تُرحَّل)",          w: "سهلة — لا أثر محاسبي، ابنِها متى شئت" },
  master:     { t: "بيانات أساسية إضافية",                w: "أضِفها عند الحاجة إليها فعلاً" },
  config:     { t: "تهيئة إضافية",                        w: "معظمها اختياري لبتروسبيشل" },
  reports:    { t: "تقارير",                              w: "الأقل خطراً — تُقرأ فقط ولا تكتب شيئاً" },
  other:      { t: "أخرى",                                w: "" }
};
const grouped = {};
rest.forEach(n => { const b = bucketOf(n); (grouped[b] = grouped[b] || []).push(n); });

/* ══ إخراج ماركداون ══ */
if (process.argv.indexOf("--md") !== -1) {
  const L2 = [];
  const P2 = x => L2.push(x);
  P2("# ترتيب بناء شاشات بتروسبيشل");
  P2("");
  P2("> مُولَّد آلياً: `node tools/build-order.js --md > BUILD-ORDER.md`");
  P2("> ترتيب طوبولوجي على رسم التبعيات، مرجَّح بالتعقيد. **صفر تبعية أمامية.**");
  P2("");
  P2("## كيف تقرأ هذا الملف");
  P2("");
  P2("ابنِ بالترتيب. لا تقفز. كل خطوة تفترض أن ما قبلها **مكتمل ويعمل** (واجهة + قاعدة بيانات).");
  P2("");
  P2("| العمود | معناه |");
  P2("|---|---|");
  P2("| **يعتمد على** | يجب أن يكون مكتملاً قبل أن تبدأ |");
  P2("| **يفتح** | كم شاشة تنتظر هذه |");
  P2("| **تعقيد** | كلما زاد زاد احتمال الخطأ — لذلك رُتّبت الأبسط أولاً |");
  P2("| **جداول** | ما تُنشئه في قاعدة البيانات |");
  P2("| ★ | وثيقة محورية |");
  P2("| ◇ | مقترحة — ليست في شجرة أونيكس عندكم |");
  P2("");
  let lastL = null;
  out.forEach((n, i) => {
    if (n.layer !== lastL) {
      lastL = n.layer;
      const lay = (S.layers || []).filter(l => l.n === n.layer)[0];
      P2("");
      P2("---");
      P2("");
      P2("## " + (n.layer < 0 ? "الطبقة ٠ — الخدمات المشتركة (ليست شاشات)"
                              : "الطبقة " + n.layer + " — " + (lay ? lay.label : "")));
      if (n.layer === -1) P2("\n> هذه ليست شاشات بل **أساس الكود**. ابنِها مرة واحدة واستدعِها من كل شاشة.\n> تكرار منطق الترحيل داخل الشاشات هو أسرع طريق للانهيار.");
      if (n.layer === 3)  P2("\n> ⛔ **لا تتجاوز هذه الطبقة قبل أن يتوازن ميزان المراجعة الافتتاحي.** كل خطأ هنا يتضاعف في كل تقرير لاحق.");
      if (n.layer === 4)  P2("\n> رُتّبت بالتعقيد لا بالأهمية: أول وثيقة تبنيها تختبر خدمة الترحيل، فاختبرها بأبسط حالة.");
      P2("");
    }
    P2("### " + (i + 1) + ". " + n.label + (n.ref ? "  `" + n.ref + "`" : "") +
       (n.keyDoc ? "  ★" : "") + (n.proposed ? "  ◇" : "") + (n.checkpoint ? "  ⚑" : ""));
    P2("");
    P2("- **النوع:** " + (KIND_AR[n.kind] || n.kind) + (n.system ? "  ·  " + n.system : ""));
    if (n.why) P2("- **لماذا الآن:** " + n.why);
    if (n.deps && n.deps.length)
      P2("- **يعتمد على:** " + n.deps.map(d => {
        const t = nodes.get(d);
        return t ? (t.ref ? "`" + t.ref + "` " + t.label : t.label) : d;
      }).join("  ·  "));
    if (n.impact) P2("- **يفتح الطريق لـ:** " + n.impact + " شاشة");
    if (n.kind === "document") {
      const c = n.cxParts || {};
      P2("- **تعقيد:** " + n.cx + "  (" + c.legs + " طرف" +
        (c.condLegs ? "، " + c.condLegs + " مشروط" : "") +
        (c.stock ? "، يمسّ المخزون" : "") + (c.blocked ? "، **قرار معلّق**" : "") + ")");
    }
    if (n.tables && n.tables.length) P2("- **جداول:** `" + n.tables.join("`, `") + "`");
    if (n.invariants && n.invariants.length) P2("- **ثوابت يفرضها:** " + n.invariants.join(", "));
    if (n.pending) P2("- ⛔ **قرار معلّق:** " + n.pending.question + "  — " + (n.pending.why || ""));
    if (n.rules && n.rules.length) {
      P2("- **قواعد لا تُكسر:**");
      n.rules.forEach(r => P2("  - " + r));
    }
    P2("");
  });

  P2("");
  P2("---");
  P2("");
  P2("## ما بعد الخطوة " + out.length + " — أثره أقل");
  P2("");
  P2("هذه " + rest.length + " شاشة خارج المسار الحرج. لا تبدأ أياً منها قبل إنهاء ما فوق.");
  P2("");
  ["needsSpec", "ops", "procedural", "master", "config", "reports", "other"].forEach(k => {
    const g = grouped[k];
    if (!g || !g.length) return;
    const b = BUCKETS[k];
    P2("### " + b.t + "  (" + g.length + ")");
    P2("");
    if (b.w) P2("> " + b.w);
    P2("");
    g.slice(0, 40).forEach(n => P2("- `" + n.ref + "`  " + n.label +
      (n._module ? "  —  " + n._module.label : "")));
    if (g.length > 40) P2("- … و" + (g.length - 40) + " أخرى");
    P2("");
  });
  console.log(L2.join("\n"));
  process.exit(violations.length ? 1 : 0);
}

if (process.argv.indexOf("--json") === -1) {
  console.log("\n" + "═".repeat(74));
  console.log("  ما بعد الترتيب الحرج: " + rest.length + " شاشة أثرها أقل");
  console.log("═".repeat(74));
  ["needsSpec", "ops", "procedural", "master", "config", "reports", "other"].forEach(k => {
    const g = grouped[k];
    if (!g || !g.length) return;
    console.log("\n  " + BUCKETS[k].t + ": " + g.length +
      (BUCKETS[k].w ? "\n     " + BUCKETS[k].w : ""));
  });
}

process.exit(violations.length ? 1 : 0);
