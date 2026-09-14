/* ============================================================================
   مولّد بيانات أونكس — بتروسبيشل
   ----------------------------------------------------------------------------
   يقرأ ملف المرجع  tree-viewer.html  (المُلتقط من النظام المثبَّت فعلياً)
   ويولّد  assets/js/data.js  بالصيغة التي يستهلكها التطبيق.

   التشغيل:
     node tools/build-data.js  [مسار tree-viewer.html]

   المصادر الثلاثة داخل ملف المرجع:
     • operationsTree  → شجرة العمليات (٩ أنظمة)
     • chartOfAccounts → الدليل المحاسبي
     • activeConfig    → الإعدادات الفعّالة (بحالات تحقّق)
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = process.argv[2] ||
  "C:/Users/MOHAMMEDMOHSENMOHAMM/Desktop/tree-viewer.html";
const OUT = path.join(__dirname, "..", "assets", "js", "data.js");

/* ── استخراج المصفوفات الثلاث من ملف المرجع ─────────────────────────────── */
function extract(html, name) {
  const line = html.split(/\r?\n/).find(l => l.trimStart().startsWith("const " + name));
  if (!line) throw new Error("لم يُعثر على «" + name + "» في ملف المرجع");
  const i = line.indexOf("["), j = line.lastIndexOf("]");
  return JSON.parse(line.slice(i, j + 1));
}

/* ── هوية الأنظمة الثمانية: الأيقونة ولون التمييز والوصف ─────────────────── */
const SYSTEM_META = {
  "تهيئة النظام":            { icon: "sliders",  accent: "slate",   note: "الشركة والفروع والفترات والعملات والمتغيرات العامة." },
  "إدارة النظام":            { icon: "shield",   accent: "indigo",  note: "المستخدمون والصلاحيات والإقفالات والنسخ الاحتياطي وقاعدة البيانات." },
  "نظام الضرائب":            { icon: "receipt",  accent: "amber",   note: "ضريبة القيمة المضافة والفاتورة الإلكترونية وربط الحسابات والأصناف بالأنواع الضريبية." },
  "أنظمة الحسابات":          { icon: "landmark", accent: "blue",    note: "الأستاذ العام والموازنات." },
  "أنظمة المخازن":           { icon: "package",  accent: "teal",    note: "المخازن والأصناف والتوريد والصرف والتحويل والتسوية." },
  "أنظمة الموردين":          { icon: "truck",    accent: "orange",  note: "الموردون والمشتريات والاعتمادات المستندية." },
  "أنظمة العملاء":           { icon: "cart",     accent: "green",   note: "العملاء والمبيعات." },
  "نظام إدارة المعلومات":    { icon: "chart",    accent: "sky",     note: "التقارير التحليلية والإدارية لكل الأنظمة." }
};

/* ── نطاق الشاشات: ما يبقى في البرنامج، ولا شيء غيره ─────────────────────
   كل شاشة تشغيلية ليست هنا تُحذف من الشجرة عند التوليد، ويُحذف معها كل فرع
   يفرغ من شاشاته. فإن ظهرت في ملف المرجع شاشة جديدة فلن تدخل البرنامج إلا
   بإضافة رقمها هنا صراحةً.                                                */

/* أنظمة تبقى كاملة بكل ما تحتها — لا تُمَسّ */
const KEEP_WHOLE = ["op.6"];                       // أنظمة الموردين

/* الشاشات المعتمدة */
const KEEP_SCREENS = [
  /* تهيئة النظام */
  "op.1.1.1", "op.1.1.2", "op.1.1.3", "op.1.1.5", "op.1.1.6", "op.1.1.7", "op.1.1.8",
  "op.1.1.9", "op.1.1.10", "op.1.1.11", "op.1.1.12", "op.1.1.13", "op.1.1.14",
  "op.1.1.18", "op.1.1.19", "op.1.1.22",
  "op.1.2.1", "op.1.2.2", "op.1.2.3", "op.1.2.4", "op.1.2.5", "op.1.2.7", "op.1.2.8",
  "op.1.2.9", "op.1.2.10", "op.1.2.11", "op.1.2.12", "op.1.2.13", "op.1.2.14",

  /* إدارة النظام */
  "op.2.1.1", "op.2.1.2", "op.2.1.3", "op.2.1.4",
  "op.2.2.1", "op.2.2.3", "op.2.2.4", "op.2.2.5", "op.2.2.7",
  "op.2.3.1", "op.2.3.2", "op.2.3.3", "op.2.3.4",
  "op.2.4.1", "op.2.4.2", "op.2.4.3",
  "op.2.5.1", "op.2.5.2", "op.2.5.3",
  "op.2.6.2", "op.2.6.3", "op.2.6.4", "op.2.6.6", "op.2.6.7", "op.2.6.8", "op.2.6.9",
  "op.2.7.1", "op.2.7.2",

  /* نظام الضرائب */
  "op.3.1", "op.3.2", "op.3.3", "op.3.4", "op.3.5", "op.3.6", "op.3.8", "op.3.9", "op.3.10",

  /* أنظمة الحسابات */
  "op.4.1.1.1", "op.4.1.1.2", "op.4.1.1.3", "op.4.1.1.6", "op.4.1.1.7", "op.4.1.1.8",
  "op.4.1.2.1", "op.4.1.2.2", "op.4.1.2.3", "op.4.1.2.4", "op.4.1.2.8", "op.4.1.2.9", "op.4.1.2.10",
  "op.4.1.3.4", "op.4.1.3.6", "op.4.1.3.8", "op.4.1.3.9", "op.4.1.3.10", "op.4.1.3.11",
  "op.4.1.3.12", "op.4.1.3.14", "op.4.1.3.20",
  "op.4.1.4.1", "op.4.1.4.2", "op.4.1.4.3", "op.4.1.4.4", "op.4.1.4.5", "op.4.1.4.6",
  "op.4.1.4.7", "op.4.1.4.8", "op.4.1.4.9", "op.4.1.4.11", "op.4.1.4.13", "op.4.1.4.15",
  "op.4.1.4.16", "op.4.1.4.17", "op.4.1.4.18", "op.4.1.4.19", "op.4.1.4.20", "op.4.1.4.22",
  "op.4.1.4.23", "op.4.1.4.25", "op.4.1.4.26", "op.4.1.4.29", "op.4.1.4.30", "op.4.1.4.31",
  "op.4.1.4.32", "op.4.1.4.34",
  "op.4.3",

  /* أنظمة المخازن */
  "op.5.1.1.1", "op.5.1.1.3", "op.5.1.1.4", "op.5.1.1.6", "op.5.1.1.8", "op.5.1.1.9",
  "op.5.1.1.10", "op.5.1.1.11", "op.5.1.1.13",
  "op.5.1.2.1", "op.5.1.2.8", "op.5.1.2.9", "op.5.1.2.10", "op.5.1.2.14", "op.5.1.2.15",
  "op.5.1.2.16", "op.5.1.2.19",
  "op.5.1.3.3", "op.5.1.3.4", "op.5.1.3.5", "op.5.1.3.6", "op.5.1.3.8", "op.5.1.3.10",
  "op.5.1.3.13", "op.5.1.3.14", "op.5.1.3.15",
  "op.5.1.4.1", "op.5.1.4.2", "op.5.1.4.4", "op.5.1.4.7", "op.5.1.4.8", "op.5.1.4.9",
  "op.5.1.4.12", "op.5.1.4.13", "op.5.1.4.14", "op.5.1.4.15", "op.5.1.4.16", "op.5.1.4.17",
  "op.5.1.4.18", "op.5.1.4.19", "op.5.1.4.25",

  /* أنظمة العملاء */
  "op.7.1.1.2", "op.7.1.1.3", "op.7.1.1.4", "op.7.1.1.5", "op.7.1.1.6", "op.7.1.1.8",
  "op.7.1.2.2", "op.7.1.2.4", "op.7.1.2.5", "op.7.1.2.6", "op.7.1.2.7", "op.7.1.2.8",
  "op.7.1.2.9", "op.7.1.2.10", "op.7.1.2.14",
  "op.7.1.3.2", "op.7.1.3.4", "op.7.1.3.5", "op.7.1.3.6", "op.7.1.3.8", "op.7.1.3.15",
  "op.7.1.4.1", "op.7.1.4.3", "op.7.1.4.4", "op.7.1.4.5", "op.7.1.4.6", "op.7.1.4.7",
  "op.7.1.4.8", "op.7.1.4.11", "op.7.1.4.12", "op.7.1.4.18",
  "op.7.5.1.1", "op.7.5.1.2", "op.7.5.1.3", "op.7.5.1.4", "op.7.5.1.5",
  "op.7.5.2.1", "op.7.5.2.2", "op.7.5.2.3", "op.7.5.2.4",
  "op.7.5.3.2", "op.7.5.3.6", "op.7.5.3.7", "op.7.5.3.8",
  "op.7.5.4.2", "op.7.5.4.6", "op.7.5.4.7", "op.7.5.4.8", "op.7.5.4.9",

  /* نظام إدارة المعلومات */
  "op.8.1.2", "op.8.1.4",
  "op.8.2.1", "op.8.2.2", "op.8.2.3", "op.8.2.4",
  "op.8.3.1", "op.8.3.2", "op.8.3.3", "op.8.3.4", "op.8.3.5",
  "op.8.4.1", "op.8.4.2",
  "op.8.5.1", "op.8.5.2", "op.8.5.3", "op.8.5.4", "op.8.5.5"
];

/* شاشات أُبقيت لأن شاشة معتمدة لا تعمل بدونها */
const KEEP_REQUIRED = {
  "op.1.2.6":   "بيانات المشاريع — تربطها «ربط الحسابات بالمشاريع»",
  "op.4.1.2.6": "تهيئة الحدود — مصدر «تقارير حدود الحسابات والأرصدة»",
  "op.4.1.2.7": "مصمم التقارير الختامية — تُبنى منه القوائم المالية و«تقارير القوائم والدفقات الختامية»",
  "op.4.1.3.16": "طلب صرف عملة — مصدر «تقارير طلبات صرف العملة»",
  "op.4.1.3.17": "صرف عملة — مصدر «تقارير صرف العملة»",
  "op.4.1.3.18": "توزيع المصروفات المقدمة — مصدر تقاريرها",
  "op.5.1.1.2": "وحدات القياس — لا صنف بلا وحدة",
  "op.5.1.1.12": "معايير التقييم — طريقة تسعير المخزون (BLK-1)",
  "op.5.1.3.2": "إذن التوريد المخزني — مستند الاستلام الذي تقوم عليه قاعدة الترحيل والقرار BLK-3، ويستخدم «أنواع التوريد»",
  "op.5.1.3.7": "طلب تسوية مخزون — مصدر «تقارير طلب تسوية مخزون»",
  "op.7.1.1.1": "متغيرات نظام العملاء — ضبط نظام العملاء كله",
  "op.7.1.1.14": "أنواع الإشعارات — تحتاجها «إشعارات العملاء»",
  "op.7.5.1.6": "المبالغ الإضافية والخصومات — مصدر تقريريها وتدخل في فاتورة المبيعات",
  "op.7.5.3.4": "فاتورة دفعة مقدمة — مصدر «تقارير فاتورة دفعة مقدمة»",
  "op.7.5.3.5": "مرتجع فاتورة دفعة مقدمة — مصدر تقاريره"
};

/* شاشات موجودة في أونيكس عندكم وغائبة عن ملف المرجع — أُضيفت بطلبكم.
   كل واحدة تُدرج بعد الشاشة المذكورة في after داخل فرعها نفسه، وأرقامها
   تكمل تسلسل الفرع. إن ظهرت الشاشة في ملف المرجع لاحقاً فلا تُكرَّر.       */
const ADD_SCREENS = [
  { ref: "op.4.1.3.21", label: "قيود بنكية",             after: "op.4.1.3.14" },  // عمليات الاستاذ العام ‹ بعد قيود اليومية
  { ref: "op.5.1.3.16", label: "أمر التوريد المخزني",    after: "op.5.1.3.2" },   // عمليات المخزون ‹ بعد إذن التوريد المخزني
  { ref: "op.7.5.4.10", label: "تقارير فاتورة المبيعات", after: "op.7.5.4.6" },   // نظام إدارة المبيعات ‹ التقارير
  { ref: "op.8.5.6",    label: "تقارير صافي المبيعات",   after: "op.8.5.2" }      // نظام إدارة المعلومات ‹ تقارير إدارة المبيعات
];

/* بنود إعدادات تخصّ شاشات حُذفت */
const DROP_CONFIG = [
  "cfg.6.1.11",   // متغيرات التوزيع
  "cfg.6.4.3"     // مستويات الإعتماد
];

const KEEP = new Set(KEEP_SCREENS.concat(Object.keys(KEEP_REQUIRED), ADD_SCREENS.map(a => a.ref)));

function inScope(ref) {
  return KEEP.has(ref) || KEEP_WHOLE.some(w => ref === w || ref.indexOf(w + ".") === 0);
}

function addScreens(modules) {
  const at = new Map();   // ref -> { node, parent }
  (function walk(list, parent) {
    list.forEach(n => { at.set(n.ref, { node: n, parent }); if (n.children) walk(n.children, n); });
  })(modules, null);

  ADD_SCREENS.forEach(a => {
    const hit = at.get(a.ref);
    if (hit) {
      if (norm(hit.node.label) !== norm(a.label))
        throw new Error("الرقم " + a.ref + " محجوز لـ«" + hit.node.label + "» — اختر رقماً آخر لـ«" + a.label + "»");
      return;
    }
    const anchor = at.get(a.after);
    if (!anchor || !anchor.parent)
      throw new Error("لم يُعثر على موضع الإضافة " + a.after + " لـ«" + a.label + "»");
    const kids = anchor.parent.children;
    if (kids.some(k => norm(k.label) === norm(a.label))) return;
    const node = { id: a.ref, ref: a.ref, label: a.label, status: "ready", kind: "screen" };
    kids.splice(kids.indexOf(anchor.node) + 1, 0, node);
    at.set(a.ref, { node, parent: anchor.parent });
  });
  return modules;
}

/* يُبقي الورقة إن كانت في النطاق، والفرع إن بقي تحته شيء */
function pruneNode(node, keepLeaf) {
  if (!node.children || !node.children.length) return keepLeaf(node) ? node : null;
  const kids = node.children.map(c => pruneNode(c, keepLeaf)).filter(Boolean);
  if (!kids.length) return null;
  node.children = kids;
  return node;
}

function pruneModules(modules) {
  return modules.map(m => {
    if (m.variant === "operations")
      return inScope(m.ref) ? m : pruneNode(m, n => inScope(n.ref));
    if (m.variant === "config")
      return pruneNode(m, n => DROP_CONFIG.indexOf(n.ref) === -1);
    return m;
  }).filter(Boolean);
}

/* أيقونات المجموعات حسب نوعها */
function groupIcon(name) {
  const n = name.replace(/[أإآ]/g, "ا");
  if (/تهيئه|تهيئة|متغيرات|ترميز/.test(n)) return "settings";
  if (/مدخلات|بيانات/.test(n))              return "file";
  if (/عمليات|حركه|حركة/.test(n))           return "layers";
  if (/تقارير/.test(n))                      return "chart";
  if (/صلاحيات|امان|مستخدم/.test(n))        return "shield";
  if (/جرد/.test(n))                         return "list";
  return "folder";
}

/* ── تبويبات الشاشات — معطّلة ────────────────────────────────────────────
   ⛔ مصدر هذه التبويبات أدلة المستخدم PDF لـ«الإصدار الثاني» من أونيكس،
      بينما بتروسبيشل على V8.1.27-10-2024. أي أنها **ليست من شجرتكم**
      وقد تكون تبويباتها مختلفة في إصداركم.

   لذلك أُوقف تطبيقها (ENABLE_TABS = false) التزاماً بقاعدة «شجرة بتروسبيشل فقط».
   الجدول محفوظ هنا كمرجع: عند فتح الشاشة في أونيكس المثبَّت وتأكيد تبويباتها،
   انقلها إلى VERIFIED_TABS أدناه وستظهر في البرنامج.                      */
const ENABLE_TABS = false;

/* تبويبات مؤكَّدة من شاشات V8.1.27 نفسها — أضِف هنا بعد التحقق البصري */
const VERIFIED_TABS = {
  /* مثال بعد التحقق:
     "قيود اليوميه": ["البيانات الرئيسية", "البيانات التفصيلية"], */
};

/* غير مؤكَّدة — من أدلة الإصدار الثاني */
const TABS_FROM_OLD_MANUALS = {
  "متغيرات الاستاذ العام":       ["خيارات الأستاذ العام", "خيارات متقدمة"],
  "بيانات المستخدمين":            ["البيانات الأساسية", "الأجهزة الكلية", "إثبات البصمة", "نقاط بيع", "إحصائيات", "معلمات الرقابة"],
  "صلاحيات العمليات":             ["صلاحيات العمليات", "صلاحيات أخرى", "صلاحيات السماح", "الشئون الإدارية"],
  "تنبيهات النظام":               ["البيانات الرئيسية", "الصلاحيات"],
  "الاقفال السنوي":               ["فتح سنة جديدة", "نقل البيانات", "الإقفال المخزني", "إقفال الأرباح والخسائر", "نقل أرصدة الأصول", "إقفال الحسابات", "الشئون الإدارية"],
  "الصناديق":                     ["البيانات الرئيسية", "العملات"],
  "البنوك":                       ["البيانات الرئيسية", "العملات", "عمولات بطاقات الائتمان"],
  "دفاتر الشيكات":                ["البيانات الرئيسية", "البيانات التفصيلية"],
  "الارصده الافتتاحيه":           ["البيانات الرئيسية", "البيانات التفصيلية"],
  "تسويه البنوك":                 ["البيانات الرئيسية", "البيانات التفصيلية"],
  "صرف عمله":                     ["البيانات الرئيسية", "البيانات التفصيلية"],
  "اذن التوريد المخزني":          ["البيانات الرئيسية", "بيانات إضافية", "استيراد من ملف إكسل"],
  "نقل البيانات بين الوحدات المحاسبيه": ["نقل البيانات", "عرض الأصناف"]
};

/* الأرقام المرجعية تتكرر بين الأشجار الثلاث (كلها تبدأ بـ 1)،
   لذا نضيف بادئة شجرة لضمان التفرّد عالمياً وصلاحيتها كروابط. */
function mkRef(prefix, id) { return id ? prefix + "." + id : null; }

function norm(s) {
  return String(s || "")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, "")
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي").replace(/ة/g, "ه")
    .replace(/\s+/g, " ").trim().toLowerCase();
}

/* ── تحويل شجرة العمليات ─────────────────────────────────────────────────── */
function convertOps(tree) {
  return tree.map(sys => {
    const meta = SYSTEM_META[sys.name] || { icon: "grid", accent: "slate" };
    return {
      id: mkRef("op", sys.id) || null,
      ref: mkRef("op", sys.id),
      label: sys.name,
      kind: "module",
      variant: "operations",
      icon: meta.icon,
      accent: meta.accent,
      note: meta.note,
      status: "ready",
      children: (sys.children || []).map(c => convertOpsNode(c, 2))
    };
  });
}

function convertOpsNode(node, depth) {
  const kids = node.children && node.children.length
    ? node.children.map(c => convertOpsNode(c, depth + 1)) : null;
  const out = {
    id: mkRef("op", node.id) || null,
    ref: mkRef("op", node.id),
    label: node.name,
    status: "ready"
  };
  if (node.note) out.note = node.note;
  if (kids) {
    out.kind = depth === 2 ? "submodule" : "group";
    out.icon = groupIcon(node.name);
    out.children = kids;
  } else {
    out.kind = "screen";
    const t = VERIFIED_TABS[norm(node.name)] ||
              (ENABLE_TABS ? TABS_FROM_OLD_MANUALS[norm(node.name)] : null);
    if (t) out.tabs = t;
  }
  return out;
}

/* ── تحويل الدليل المحاسبي ───────────────────────────────────────────────── */
function convertAccounts(tree) {
  return {
    id: "chart-of-accounts",
    label: "الدليل المحاسبي",
    labelEn: "Chart of Accounts",
    kind: "module",
    variant: "accounts",
    icon: "book",
    accent: "violet",
    status: "ready",
    note: "الدليل المحاسبي الفعلي لشركة بتروسبيشل — الحسابات الرئيسية والتفصيلية بأرقامها.",
    children: tree.map(n => convertAccount(n, 2))
  };
}

function convertAccount(node, depth) {
  const kids = node.children && node.children.length
    ? node.children.map(c => convertAccount(c, depth + 1)) : null;
  const out = {
    id: mkRef("acc", node.code),
    ref: mkRef("acc", node.code),
    code: node.code,
    label: node.name,
    status: "ready"
  };
  if (kids) {
    out.kind = depth <= 3 ? "submodule" : "group";
    out.icon = "folder";
    out.children = kids;
  } else {
    out.kind = "screen";      /* حساب تفصيلي نهائي */
  }
  return out;
}

/* ── تحويل الإعدادات الفعّالة ────────────────────────────────────────────── */
const CFG_STATUS_ICON = {
  verified_on: "check", verified_off: "close", verified_info: "info",
  inferred: "sparkle", pending: "clock"
};

function convertConfig(tree) {
  return {
    id: "active-config",
    label: "الإعدادات الفعّالة",
    labelEn: "Active Configuration",
    kind: "module",
    variant: "config",
    icon: "settings",
    accent: "emerald",
    status: "ready",
    note: "ما هو مفعَّل ومعطَّل فعلياً في نظام بتروسبيشل، وما يحتاج تحققاً.",
    children: tree.map(n => convertCfg(n, 2))
  };
}

function convertCfg(node, depth) {
  const kids = node.children && node.children.length
    ? node.children.map(c => convertCfg(c, depth + 1)) : null;
  const out = {
    id: mkRef("cfg", node.id) || null,
    ref: mkRef("cfg", node.id),
    label: node.name,
    status: node.status === "pending" || node.status === "inferred" ? "wip" : "ready"
  };
  if (node.status) out.cfgStatus = node.status;
  if (node.detail) out.detail = node.detail;
  if (node.source) out.source = node.source;
  if (kids) {
    out.kind = depth === 2 ? "submodule" : "group";
    out.icon = node.status && CFG_STATUS_ICON[node.status] || "folder";
    out.children = kids;
  } else {
    out.kind = "screen";
  }
  return out;
}

/* ── الكتابة ─────────────────────────────────────────────────────────────── */
function main() {
  const html = fs.readFileSync(SRC, "utf8");

  const ops = extract(html, "operationsTree");
  const coa = extract(html, "chartOfAccounts");
  const cfg = extract(html, "activeConfig");

  writeData(pruneModules(addScreens(convertOps(ops))
    .concat([convertAccounts(coa), convertConfig(cfg)])), path.basename(SRC));
}

function writeData(modules, srcName) {
  /* إحصاء */
  let screens = 0, groups = 0;
  (function walk(ns) {
    ns.forEach(n => {
      if (n.children && n.children.length) { groups++; walk(n.children); }
      else screens++;
    });
  })(modules);

  const banner =
`/* ============================================================================
   ONYX ERP — شجرة أنظمة شركة بتروسبيشل لزيوت التشحيم
   ----------------------------------------------------------------------------
   ⚠  ملف مُولَّد آلياً — لا تعدّله يدوياً.
      المصدر : ${srcName}  (مُلتقط من النظام المثبَّت فعلياً)
      التوليد: node tools/build-data.js
      المحتوى: ${modules.length} شجرة · ${groups} مجموعة · ${screens} عنصر نهائي

   الأشجار:
     • ٨ أنظمة تشغيلية (variant: "operations") — بأرقام مرجعية من النظام
     • الدليل المحاسبي  (variant: "accounts")  — بأرقام الحسابات
     • الإعدادات الفعّالة (variant: "config")   — بحالات التحقق
   ========================================================================== */

(function (root) {
  "use strict";

  root.ONYX_DATA = `;

  const meta = {
    brand: "ONYX ERP",
    brandAr: "أونيكس",
    company: "شركة بتروسبيشل لزيوت التشحيم",
    companyShort: "بتروسبيشل",
    unit: "الإدارة",
    fiscalPeriod: "2026 / 1",
    version: "V8.1.27-10-2024",
    calendar: "ميلادي",
    language: "عربي (1)",
    tagline: "إدارة وتخطيط موارد المؤسسات",
    note: "مرجع تصفّح — لا تُنفَّذ أي عمليات فعلية",
    source: srcName
  };

  const body = JSON.stringify({ meta, modules }, null, 2);

  fs.writeFileSync(OUT, banner + body + ";\n\n})(window);\n", "utf8");

  const tabCount = Object.keys(VERIFIED_TABS).length;
  console.log("✔ تم توليد " + path.relative(path.join(__dirname, ".."), OUT));
  console.log("  تبويبات مؤكَّدة من V8.1.27: " + tabCount +
    (tabCount ? "" : "  (لا شيء بعد — أضِفها في VERIFIED_TABS بعد التحقق البصري)"));
  console.log("  " + modules.length + " شجرة · " + groups + " مجموعة · " + screens + " عنصر نهائي");
  modules.forEach(m => {
    let c = 0;
    (function w(ns) { ns.forEach(n => n.children && n.children.length ? w(n.children) : c++); })(m.children || []);
    console.log("    " + String(c).padStart(4) + "  " + m.label);
  });
}

if (require.main === module) main();

module.exports = { addScreens, pruneModules, writeData, SYSTEM_META, TABS_FROM_OLD_MANUALS };
