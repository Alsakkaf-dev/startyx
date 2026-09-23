import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { serverRoot } from "../src/infrastructure/db.ts";
import { LAYER1 as ENTITIES } from "../src/application/masters-layer1.ts";

/**
 * يولّد تعريفات شاشات الطبقة ١ في `assets/js/screen-data.js` من ربطها في `masters-ui.js`:
 * حقول فاضية (يملؤها الخادم) · الإلزامي من تعريف الكيان في الخادم · القوائم من خرائط الربط.
 * يستبدل تعريف الشاشة إن وُجد (كان بقيم أمثلة) أو يضيفه — يُعاد تشغيله بأمان.
 *   node --experimental-strip-types tools/gen-layer1-screens.ts
 */
const root = path.resolve(serverRoot(), "..");
const uiFile = path.join(root, "assets/js/masters-ui.js");
const defsFile = path.join(root, "assets/js/screen-data.js");

type Fc = { f: string; ro?: boolean; bool?: boolean; map?: Record<string, string> };
type Cfg = { entity: string; panel?: string; title: string; fields: Record<string, Fc>; noAdd?: string };
const sandbox: { window: { StartyxMasters?: { MAP: Record<string, Cfg & { sets?: Cfg[] }> } } } = { window: {} };
vm.runInNewContext(fs.readFileSync(uiFile, "utf8"), sandbox);
const MAP = sandbox.window.StartyxMasters!.MAP;

/* عنوان لوحة الشاشة ذات الجدول الواحد + ملاحظة جانبية بالواقع المتحقَّق (verify-layer1-records) */
const SCREENS: Record<string, { panel?: string; note: string }> = {
  "op.3.2": { note: "أونيكس: نوع واحد VAT (الكل) · جهة واحدة: مبيعات 2202070001 / مشتريات 1207030001 · شريحة واحدة 15%. الرمز لا يتكرر (TX-R5) · حساب الجهة فرعي (TX-R2) · لا حذف لنوع له جهات أو أصناف أو حسابات." },
  "op.5.1.1.2": { note: "أونيكس: 8 وحدات عددية «كلي» · 13 سطر تحويل خلف «نظام الأوزان» المطفأ (IV-R28). الرمز فريد بلا تمييز حالة (IV-R21) · النوع والارتباط يُقفلان بعد استخدام الوحدة في صنف (IV-R25)." },
  "op.5.1.2.1": { panel: "المجموعة الرئيسية", note: "أونيكس: 14 مجموعة. نسبة الضريبة لازم تكون شريحة معرّفة (IV-R74) · لا حذف لمجموعة عليها أصناف أو ربط محاسبي (IV-R71)." },
  "op.5.1.2.8": { panel: "مجموعة المخازن", note: "أونيكس: 4 مجموعات. لا حذف لمجموعة مستخدمة في مخزن أو في ربط حسابات المخزون (نوع 2) [مساعدة: INVI004]." },
  "op.1.2.11": { panel: "الربط", note: "أونيكس: ربط واحد. الحساب فرعي ونوعه «مدينة أخرى/دائنة أخرى» (4544) عند الإضافة أو تغيير الحساب [مساعدة: GENI025]." },
  "op.1.2.4": { note: "ربط فقط — لا إضافة ولا حذف. 147 حساباً عاماً · 289 حساب حركة. نوع التدفق في حساب الدليل يُشتق من حسابه العام، و«تحديث دليل الحسابات» ينزله على الحسابات المربوطة [مساعدة: GENI006]." },
  "op.3.4": { panel: "الربط", note: "أونيكس: 199 حساباً × VAT 15%. الحساب فرعي (TX-R8) · النسبة من الشرائح (TX-R11) · لا حذف لربط عليه حركة ضريبية (TX-R7)." },
  "op.3.5": { panel: "الربط", note: "أونيكس: 2,228 صنفاً = الكل · فئة S. الفئة E/Z/O تستلزم رمز ونص سبب الإعفاء (TX-R12) · لا حذف لربط عليه حركة ضريبية." },
  "op.5.1.2.16": { panel: "الربط", note: "أونيكس: 12 ربطاً. الحسابات الخمسة الأساسية إلزامية (IV-R130) · كلها فرعية (IV-R132) · حساب المخزون لا يُغيَّر بعد الحركة (IV-R131, 5798)." },
  "op.7.1.2.2": { note: "أونيكس: 29 مجموعة · حدّا دين. الحساب فرعي تحليليه «عميل» (CG-R2) · لا حذف لمجموعة لها عملاء (CG-R9) · «اعلى حد متاح» محسوب." },
  "op.6.1.2.1": { panel: "المجموعة", note: "أونيكس: 6 مجموعات. الحساب من نوع «مورد» (AP-R11) · تغييره ممنوع إذا على القديم حركة (AP-R14, 5798)." },
  "op.1.1.13": { note: "أونيكس: نوعا حساب (رئيسي/فرعي) · نوعا تقرير (ميزانية/أرباح وخسائر) · المجموعات والتصنيفات فارغة. نوع واحد فقط «يتأثر بالحركة» [مساعدة: GENS021]." },
  "op.1.2.1": { panel: "الحساب العام", note: "أونيكس: 147 حساباً عاماً على 4 مستويات (1 · 11 · 111 · 11101). المستوى آلي من طول الرقم ويجب أن يكون أعلى من الأب بواحد (6039) · لا حذف لحساب له أبناء أو حسابات دليل مربوطة." },
  "op.1.2.9": { panel: "حسابات الفرع الوسيطة", note: "أونيكس: 5 فروع (الفرع 6 بلا صف). الحساب فرعي (SY-R33) · تغيير حساب عليه حركة ممنوع (5798). بقية الأعمدة الـ53 محفوظة في الخادم وفارغة في أونيكس." },
  "op.4.1.2.8": { panel: "الربط", note: "أونيكس: 0 ربط — الشاشة فاضية كما هي. الحساب فرعي والمشروع موجود · لا حذف لربط مشروع عليه حركة [مساعدة: GLSI009]." },
};

const WIDE = /name|reason|text|notes/;
const MONO = /code|_no$|^no$|acc|account|pct|amount|min|max|factor|level|order|size|fx_diff|vat_|rounding|diff|branch/;

function q(s: string): string {
  return JSON.stringify(s);
}

function fieldSrc(label: string, fc: Fc, required: boolean): string {
  const o: string[] = [];
  const opts = fc.bool ? ["لا", "نعم"] : fc.map ? Object.keys(fc.map) : null;
  o.push("span: " + (opts ? 3 : WIDE.test(fc.f) ? 5 : 3));
  if (required && !fc.ro) o.push("req: true");
  if (fc.ro) o.push("ro: true");
  if (opts) o.push('type: "select"', "options: [" + opts.map(q).join(", ") + "]");
  else if (MONO.test(fc.f)) o.push("mono: true");
  return "F(" + q(label) + ", { " + o.join(", ") + " })";
}

function panelSrc(title: string, cfg: Cfg): string {
  const ent = ENTITIES[cfg.entity];
  if (!ent) throw new Error("كيان مجهول " + cfg.entity);
  const grid = Object.entries(cfg.fields).map(([label, fc]) => "          " + fieldSrc(label, fc, !!ent.fields[fc.f]?.required));
  return `        { kind: "panel", title: ${q(title)}, grid: [\n${grid.join(",\n")}\n        ]}`;
}

function screenSrc(ref: string): string {
  const e = MAP[ref]!;
  const meta = SCREENS[ref]!;
  const sets = e.sets ?? [{ ...e, panel: meta.panel }];
  const readOnly = sets.every((s) => s.noAdd);
  const cmds = readOnly
    ? `["edit", "save", "cancelEntry", "search", "quick",
             "navFirst", "navPrev", "navNext", "navLast", "print", "allScreens", "lockSession", "exit"]`
    : `["add", "edit", "delete", "save", "cancelEntry", "search", "quick",
             "navFirst", "navPrev", "navNext", "navLast", "print", "allScreens", "lockSession", "exit"]`;
  const panels = sets.map((s) => panelSrc(s.panel!, s));
  return `    ${q(ref)}: {
      state: { label: "نشط", cls: "s-posted" },
      rec: { i: 0, n: 0 },
      cmds: ${cmds},
      audit: { by: "—", at: "—", dev: "—", prints: "—", upd: "—", updc: 0, ver: "V8.1.14" },
      blocks: [
${panels.join(",\n")},
        { kind: "table", title: ${q(sets[0]!.title)}, max: "32vh", cols: [], rows: [] }
      ],
      side: [
        { kind: "note", text: ${q(meta.note)} }
      ]
    }`;
}

let src = fs.readFileSync(defsFile, "utf8");
const added: string[] = [];
const replaced: string[] = [];
for (const ref of Object.keys(SCREENS)) {
  const gen = screenSrc(ref);
  const start = src.indexOf(`    ${q(ref)}: {`);
  if (start >= 0) {
    const lines = src.slice(start).split("\n");
    let end = 1;
    while (end < lines.length && !/^    \},?\r?$/.test(lines[end]!)) end++;
    const closing = lines[end]!.replace(/\r$/, "");
    const block = lines.slice(0, end + 1).join("\n");
    src = src.slice(0, start) + gen + (closing.endsWith(",") ? "," : "") + src.slice(start + block.length);
    replaced.push(ref);
  } else {
    const anchor = `    "op.1.2.5": {`;
    const at = src.indexOf(anchor);
    if (at < 0) throw new Error("anchor op.1.2.5");
    src = src.slice(0, at) + `    /* ═══ ${ref} — حيّة من الخادم (الطبقة ١) ═══ */\n` + gen + ",\n\n" + src.slice(at);
    added.push(ref);
  }
}
fs.writeFileSync(defsFile, src);
process.stdout.write(`replaced ${replaced.length}: ${replaced.join(" ")}\nadded ${added.length}: ${added.join(" ")}\n`);
