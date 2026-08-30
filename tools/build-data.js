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

/* ── هوية الأنظمة التسعة: الأيقونة ولون التمييز والوصف ──────────────────── */
const SYSTEM_META = {
  "تهيئة النظام":            { icon: "sliders",  accent: "slate",   note: "الشركة والفروع والفترات والعملات والمتغيرات العامة." },
  "إدارة النظام":            { icon: "shield",   accent: "indigo",  note: "المستخدمون والصلاحيات والإقفالات والنسخ الاحتياطي وقاعدة البيانات." },
  "نظام الضرائب":            { icon: "receipt",  accent: "amber",   note: "ضريبة القيمة المضافة والفاتورة الإلكترونية وربط الحسابات والأصناف بالأنواع الضريبية." },
  "أنظمة الحسابات":          { icon: "landmark", accent: "blue",    note: "الأستاذ العام والمراجعة والترحيلات والموازنات والضمانات." },
  "أنظمة المخازن":           { icon: "package",  accent: "teal",    note: "المخازن والأصناف والتوريد والصرف والتحويل والجرد." },
  "أنظمة الموردين":          { icon: "truck",    accent: "orange",  note: "الموردون والمشتريات والاعتمادات المستندية." },
  "أنظمة العملاء":           { icon: "cart",     accent: "green",   note: "العملاء والمبيعات والتوزيع والعمولات والعروض." },
  "نظام إدارة المعلومات":    { icon: "chart",    accent: "sky",     note: "التقارير التحليلية والإدارية لكل الأنظمة." },
  "الأنظمة المساعدة":        { icon: "wrench",   accent: "slate",   note: "التنبيهات والشاشات المساعدة." }
};

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
  "الغاء الاقفالات":              ["إلغاء الإقفال الشهري", "إلغاء إقفال الأرباح والخسائر"],
  "الصناديق":                     ["البيانات الرئيسية", "العملات"],
  "البنوك":                       ["البيانات الرئيسية", "العملات", "عمولات بطاقات الائتمان"],
  "دفاتر الشيكات":                ["البيانات الرئيسية", "البيانات التفصيلية"],
  "الارصده الافتتاحيه":           ["البيانات الرئيسية", "البيانات التفصيلية"],
  "تسويه البنوك":                 ["البيانات الرئيسية", "البيانات التفصيلية"],
  "صرف عمله":                     ["البيانات الرئيسية", "البيانات التفصيلية"],
  "طلبات قيود اليوميه":           ["البيانات الرئيسية", "البيانات التفصيلية"],
  "طلبات سندات الصرف":            ["البيانات الرئيسية", "البيانات التفصيلية", "الحسابات"],
  "طلبات سندات القبض":            ["البيانات الرئيسية", "البيانات التفصيلية", "الحسابات"],
  "اذن التوريد المخزني":          ["البيانات الرئيسية", "بيانات إضافية", "استيراد من ملف إكسل"],
  "جرد الالات":                   ["البيانات الرئيسية", "إنزال البيانات", "استيراد من ملف إكسل", "استيراد من ملف نصي"],
  "الجرد اليدوي":                 ["البيانات الرئيسية", "إنزال البيانات", "استيراد من ملف إكسل", "استيراد من ملف نصي"],
  "الضمانات البنكيه":             ["البيانات الرئيسية", "بيانات إضافية", "البيانات التفصيلية"],
  "تمديد الضمانات البنكيه":       ["البيانات الرئيسية", "بيانات إضافية", "البيانات التفصيلية"],
  "ضمانات اخرى":                  ["البيانات الرئيسية", "الحسابات"],
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

  const modules = convertOps(ops)
    .concat([convertAccounts(coa), convertConfig(cfg)]);

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
      المصدر : ${path.basename(SRC)}  (مُلتقط من النظام المثبَّت فعلياً)
      التوليد: node tools/build-data.js
      المحتوى: ${modules.length} شجرة · ${groups} مجموعة · ${screens} عنصر نهائي

   الأشجار:
     • ٩ أنظمة تشغيلية (variant: "operations") — بأرقام مرجعية من النظام
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
    source: path.basename(SRC)
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

main();
