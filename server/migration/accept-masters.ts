import fs from "node:fs";
import path from "node:path";
import { serverRoot } from "../src/infrastructure/db.ts";

/**
 * قبول الطبقة ٠ كاملة: op.1.1.3 · op.1.2.3 · op.1.1.12 · op.1.1.2 · op.1.2.5 · op.1.2.6 · op.4.1.2.9
 * يشغّل نفس نداءات الواجهة (قراءة · إضافة · تعديل · حذف · مخالفة قاعدة) على الخادم الحي.
 */
const BASE = process.env.STARTYX_API ?? "http://127.0.0.1:8787";

type Check = { id: string; screen: string; pass: boolean; got: string; want: string; note: string };
const checks: Check[] = [];

function add(id: string, screen: string, got: string, want: string, note: string, pass = got === want): void {
  checks.push({ id, screen, pass, got, want, note });
}

async function call(p: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const r = body
    ? await fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    : await fetch(BASE + p);
  const t = await r.text();
  return { status: r.status, json: (t ? JSON.parse(t) : {}) as Record<string, unknown> };
}

async function list(entity: string): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const r = await call("/api/masters/" + entity);
  return r.json as unknown as { rows: Record<string, unknown>[]; total: number };
}

/** مخالفة قاعدة: النص يجب أن يطابق رسالة أونيكس الأصلية حرفياً */
async function expectOnyx(id: string, screen: string, entity: string, body: unknown, code: string, text: string): Promise<void> {
  const r = await call("/api/masters/" + entity, body);
  const got = String(r.json.error ?? "") + " · " + String(r.json.message ?? "");
  add(id, screen, got, code + " · " + text, "رسالة أونيكس الأصلية");
}

async function main(): Promise<void> {
  const health = await call("/api/health");
  add("health", "—", String(health.json.ok), "true", "الخادم حي");

  /* أعداد أونيكس المعروفة من GO/01-system-setup.md */
  const cur = await list("currency");
  add("currency-rows", "op.1.1.3", String(cur.total), "1", "EX_RATE — صف واحد");
  add("currency-sar", "op.1.1.3", String(cur.rows[0]?.iso_code), "SAR", "الرمز الدولي");
  add("currency-audit", "op.1.1.3", String(cur.rows[0]?.created_by ?? ""), "1", "مدخل السجل الحقيقي من أونيكس");

  const acc = await list("account");
  add("account-rows", "op.1.2.3", String(acc.total), "384", "ACCOUNT — 384 حساباً");
  const headers = acc.rows.filter((r) => r.kind === "header").length;
  const posting = acc.rows.filter((r) => r.kind === "posting").length;
  add("account-kinds", "op.1.2.3", headers + "/" + posting, "95/289", "رئيسي/فرعي");
  const debit = acc.rows.filter((r) => r.nature === "debit").length;
  add("account-nature", "op.1.2.3", debit + "/" + (acc.total - debit), "248/136", "مدين/دائن");
  const inactive = acc.rows.filter((r) => r.inactive === true).length;
  add("account-inactive", "op.1.2.3", String(inactive), "6", "حسابات موقوفة");

  const brn = await list("branch");
  add("branch-rows", "op.1.1.12", String(brn.total), "6", "الفروع");

  const prd = await list("fiscal_period");
  add("period-rows", "op.1.1.2", String(prd.total), "12", "S_PRD_DTL — 12 فترة شهرية");
  add("period-shift", "op.1.1.2", String(prd.rows[0]?.name_ar), "اكتوبر", "الأسماء مزاحة كما في أونيكس (SY-Q2)");

  /* دورة كاملة: إضافة ← إعادة قراءة ← تعديل ← حذف (op.1.1.3) */
  const addRes = await call("/api/masters/currency", {
    mode: "add",
    values: { no: 99, code: "TST", iso_code: "TST", name_ar: "عملة فحص", rate: "1", decimals: 2 },
  });
  add("currency-add", "op.1.1.3", String((addRes.json.saved as Record<string, unknown>)?.no ?? addRes.json.error), "99", "إضافة سجل جديد");
  const reread = await call("/api/masters/currency/99");
  add("currency-persist", "op.1.1.3", String(reread.json.name_ar), "عملة فحص", "يبقى بعد إعادة القراءة");
  const upd = await call("/api/masters/currency", {
    mode: "edit",
    values: { no: 99, code: "TST", iso_code: "TST", name_ar: "عملة فحص ٢", rate: "2" },
  });
  add("currency-edit", "op.1.1.3", String((upd.json.saved as Record<string, unknown>)?.update_count ?? "?"), "1", "عدّاد التعديل يزيد");

  await expectOnyx("currency-dup", "op.1.1.3", "currency",
    { mode: "add", values: { no: 99, code: "X", iso_code: "X", name_ar: "x", rate: "1" } },
    "ONYX-2143", "هذا الكود موجود مسبقا...لا يسمح بتكرار السجل");
  await expectOnyx("currency-local", "op.1.1.3", "currency",
    { mode: "edit", values: { no: 99, code: "TST", iso_code: "TST", name_ar: "x", rate: "1", is_local: true } },
    "ONYX-3620", "لايمكن ان يكون اكثر من عملة محلية");
  await expectOnyx("currency-bounds", "op.1.1.3", "currency",
    { mode: "edit", values: { no: 99, code: "TST", iso_code: "TST", name_ar: "x", rate: "9", rate_min: "1", rate_max: "2" } },
    "ONYX-4243", "يجب أن تكون القيمة الافتراضية اصغر من او يساوي الحد الاعلى");

  const del = await call("/api/masters/currency/delete", { key: "99" });
  add("currency-delete", "op.1.1.3", String(del.json.deleted), "99", "حذف سجل بلا ارتباط");
  const gone = await call("/api/masters/currency/99");
  add("currency-gone", "op.1.1.3", String(gone.status), "404", "اختفى بعد الحذف");

  /* قواعد الدليل المحاسبي */
  await expectOnyx("account-child-delete", "op.1.2.3", "account/delete", { key: "120301" },
    "ONYX-4050", "لايمكن الحذف لوجود أبناء لهذا السجل بمكان ما");
  await expectOnyx("account-moved-delete", "op.1.2.3", "account/delete", { key: "1203010001" },
    "ONYX-3618", "لايمكن الحذف وذلك لارتباط السجل بحركة مالية");
  await expectOnyx("account-moved-edit", "op.1.2.3", "account",
    { mode: "edit", values: { code: "1203010001", name_ar: "x", parent_code: "120301", kind: "header", nature: "debit", report_type: "balance_sheet" } },
    "ONYX-5798", "لا يمكن تغير الحساب نظرا لوجود حركة أرصدة فيه");
  await expectOnyx("account-level", "op.1.2.3", "account",
    { mode: "add", values: { code: "99999", name_ar: "x", parent_code: "120301", kind: "posting", nature: "debit", report_type: "balance_sheet" } },
    "ONYX-6039", "رتبة الحساب الرئيسي للحساب يجب ان تكون اقل برتبه واحدة فقط من الحساب الفرعي");

  /* قواعد الفروع والفترات */
  await expectOnyx("branch-moved-delete", "op.1.1.12", "branch/delete", { key: "1" },
    "ONYX-4921", "لا يمكن الإضافة أو الحذف لوجود حركة لهذا الفرع");
  /* الفرع 5 (الفاتورة الإلكترونية غير مفعّلة في أونيكس): تفعيلها مع مسح الرقم الضريبي ⇒ 6272 */
  await expectOnyx("branch-einvoice-vat", "op.1.1.12", "branch",
    { mode: "edit", values: { no: 5, einvoice_enabled: true, vat_no: "" } },
    "ONYX-6272", "يجب ادخال الرقم الضريبي للفرع في بيانات الفروع");
  /* S_BRN مقروء الآن: الشركة لكل فرع من CMP_NO (6 «انشطة شقيقة» ⇒ 1) والفاتورة الإلكترونية USE_E_INVOICE */
  add("branch-companies", "op.1.1.12",
    brn.rows.slice().sort((a, b) => Number(a.no) - Number(b.no)).map((r) => r.no + ":" + r.company_id).join(" "),
    "1:1 2:1 3:1 4:2 5:2 6:1", "S_BRN.CMP_NO");
  add("branch-einvoice", "op.1.1.12",
    brn.rows.filter((r) => r.einvoice_enabled).map((r) => String(r.no)).sort().join(","), "1,2,3,4", "S_BRN.USE_E_INVOICE");
  add("branch-1-national-address", "op.1.1.12",
    (() => { const b1 = brn.rows.find((r) => Number(r.no) === 1)!; return [b1.vat_no, b1.cr_no, b1.building_no, b1.street, b1.district, b1.city, b1.postal_code].join("|"); })(),
    "311300283900003|4030399323|5050|طريق مكة القديم|حي الفاروق|جدة|22349", "S_BRN");
  await expectOnyx("period-overlap", "op.1.1.2", "fiscal_period",
    { mode: "add", values: { no: 13, name_ar: "x", from_date: "2026-03-01", to_date: "2026-03-31", fiscal_year_id: 2026 } },
    "ONYX-3462", "يوجد تداخل فى الفترات الرجاء مراجعة الفترات");

  /* op.1.2.5 — مراكز التكلفة */
  const cc = await list("cost_center");
  add("cc-rows", "op.1.2.5", String(cc.total), "40", "COST_CENTERS");
  const ccMain = cc.rows.filter((r) => r.kind === "main").length;
  add("cc-kinds", "op.1.2.5", ccMain + "/" + (cc.total - ccMain), "4/36", "رئيسي/فرعي");
  await expectOnyx("cc-moved-delete", "op.1.2.5", "cost_center/delete", { key: "10000" },
    "ONYX-3618", "لايمكن الحذف وذلك لارتباط السجل بحركة مالية");
  await expectOnyx("cc-parent-delete", "op.1.2.5", "cost_center/delete", { key: "1" },
    "ONYX-4050", "لايمكن الحذف لوجود أبناء لهذا السجل بمكان ما");
  await expectOnyx("cc-prefix", "op.1.2.5", "cost_center",
    { mode: "add", values: { no: 901, code: "77777", name_ar: "x", parent_code: "1", kind: "sub" } },
    "ONYX-6039", "رتبة الحساب الرئيسي للحساب يجب ان تكون اقل برتبه واحدة فقط من الحساب الفرعي");
  const ccAdd = await call("/api/masters/cost_center", {
    mode: "add",
    values: { no: 901, code: "19999", name_ar: "مركز فحص", parent_code: "1", kind: "sub" },
  });
  add("cc-level-auto", "op.1.2.5", String((ccAdd.json.saved as Record<string, unknown>)?.level ?? ccAdd.json.error), "2", "المستوى آلي من الأب (SY-R41)");
  const ccDel = await call("/api/masters/cost_center/delete", { key: "19999" });
  add("cc-delete", "op.1.2.5", String(ccDel.json.deleted), "19999", "حذف مركز بلا حركة");

  /* op.1.2.6 — المشاريع */
  const pj = await list("project");
  add("pj-rows", "op.1.2.6", String(pj.total), "10", "IAS_PROJECTS");
  const pjSub = pj.rows.filter((r) => r.is_sub === true).length;
  add("pj-sub", "op.1.2.6", String(pjSub), "7", "مشاريع الحركة (المستوى الأخير)");
  await expectOnyx("pj-parent-delete", "op.1.2.6", "project/delete", { key: "101" },
    "ONYX-4050", "لايمكن الحذف لوجود أبناء لهذا السجل بمكان ما");

  /* op.4.1.2.9 — ربط الحسابات بالأنشطة (فارغ في أونيكس) */
  const av = await list("activity");
  const link = await list("account_activity");
  add("actv-rows", "op.4.1.2.9", String(av.total), "0", "IAS_ACTVTY فارغ كما في أونيكس");
  add("link-rows", "op.4.1.2.9", String(link.total), "0", "IAS_ACCOUNT_ACTV فارغ");
  await expectOnyx("link-no-activity", "op.4.1.2.9", "account_activity",
    { mode: "add", values: { account_code: "1203010001", activity_no: 5 } },
    "ONYX-4048", "يوجد حقول إجبارية لم يتم إدخالها");
  await expectOnyx("link-header-account", "op.4.1.2.9", "account_activity",
    { mode: "add", values: { account_code: "1", activity_no: 5 } },
    "ONYX-6039", "رتبة الحساب الرئيسي للحساب يجب ان تكون اقل برتبه واحدة فقط من الحساب الفرعي");

  /* ═══ إصلاحات تدقيق 2026-09-23 — كل واحد كان عيباً مثبتاً بالتشغيل ═══ */

  /* op.1.1.12: «إضافة فرع» كانت تفشل 500 (NOT NULL على id) */
  const brnAdd = await call("/api/masters/branch", {
    mode: "add",
    values: { no: 97, company_id: 1, name_ar: "فرع فحص", seq_no: 97 },
  });
  add("branch-add", "op.1.1.12", String((brnAdd.json.saved as Record<string, unknown>)?.no ?? brnAdd.json.error), "97", "إضافة فرع جديد تعمل");
  const brnDel = await call("/api/masters/branch/delete", { key: "97" });
  add("branch-add-delete", "op.1.1.12", String(brnDel.json.deleted ?? brnDel.json.error), "97", "حذف فرع بلا حركة");

  /* تعديل جزئي: إرسال حقل واحد لا يُعامَل كنقص حقول إجبارية */
  const partial = await call("/api/masters/branch", { mode: "edit", values: { no: 2, name_ar: "التجزئة" } });
  add("partial-edit", "op.1.1.12", String((partial.json.saved as Record<string, unknown>)?.name_ar ?? partial.json.error), "التجزئة", "تعديل جزئي يحتفظ بالباقي");
  const kept = await call("/api/masters/branch/2");
  add("partial-edit-keeps", "op.1.1.12", String(kept.json.company_id), "1", "الحقول غير المرسلة لم تُمسح");

  /* SY-R26: الحساب الفرعي يرث الطبيعة ونوع التقرير ⇒ لا يُطلب إدخالهما */
  const inh = await call("/api/masters/account", {
    mode: "add",
    values: { code: "1203019999", name_ar: "حساب فحص", parent_code: "120301", kind: "posting" },
  });
  const inhRow = inh.json.saved as Record<string, unknown> | undefined;
  add("account-inherit", "op.1.2.3", String(inhRow ? inhRow.nature + "/" + inhRow.report_type : inh.json.error),
    "debit/balance_sheet", "الطبيعة والتقرير من الأب بلا إدخال (SY-R26)");
  add("account-inherit-level", "op.1.2.3", String(inhRow?.a_level ?? ""), "5", "المستوى آلي من طول الرقم (SY-R25)");

  /* GL-R44: حذف حساب مربوط بنشاط كان يترك سطر ربط يتيم */
  await call("/api/masters/activity", { mode: "add", values: { no: 8888, name_ar: "نشاط فحص" } });
  await call("/api/masters/account_activity", { mode: "add", values: { account_code: "1203019999", activity_no: 8888 } });
  await expectOnyx("account-linked-delete", "op.1.2.3", "account/delete", { key: "1203019999" },
    "ONYX-3618", "لايمكن الحذف وذلك لارتباط السجل بنشاط");
  await call("/api/masters/account_activity/delete", { key: "1203019999|8888" });
  await call("/api/masters/activity/delete", { key: "8888" });
  const accDel = await call("/api/masters/account/delete", { key: "1203019999" });
  add("account-unlinked-delete", "op.1.2.3", String(accDel.json.deleted ?? accDel.json.error), "1203019999", "الحذف يمرّ بعد رفع الربط");

  /* op.1.1.3: رمز عملة مكرر برقم مختلف كان يُقبل · وسعر تحويل صفري كان يُقبل */
  await expectOnyx("currency-dup-code", "op.1.1.3", "currency",
    { mode: "add", values: { no: 98, code: "SAR", iso_code: "SAR", name_ar: "مكرر", rate: "1", decimals: 2 } },
    "ONYX-2143", "هذا الكود موجود مسبقا...لا يسمح بتكرار السجل");
  await expectOnyx("currency-zero-rate", "op.1.1.3", "currency",
    { mode: "add", values: { no: 97, code: "ZRO", iso_code: "ZRO", name_ar: "صفر", rate: "0", decimals: 2 } },
    "ONYX-7438", "المبلغ اصغر او يساوي صفراً");
  const curFields = await call("/api/masters/currency/1");
  add("currency-operator", "op.1.1.3", String(curFields.json.operator ?? ""), "mul", "المعامل (× / ÷) مقروء من الخادم");
  add("currency-fraction-en", "op.1.1.3", "fraction_en" in curFields.json ? "yes" : "no", "yes", "الكسر الأجنبي لم يعد حقلاً مُسقَطاً");

  /* لا أثر جانبي: الأعداد كما كانت */
  const after = {
    currency: (await list("currency")).total,
    account: (await list("account")).total,
    branch: (await list("branch")).total,
    fiscal_period: (await list("fiscal_period")).total,
    cost_center: (await list("cost_center")).total,
    project: (await list("project")).total,
    activity: (await list("activity")).total,
    account_activity: (await list("account_activity")).total,
  };
  add("no-side-effects", "—", Object.values(after).join("/"), "1/384/6/12/40/10/0/0", "الأعداد بعد كل الفحوص");

  const allPass = checks.every((c) => c.pass);
  const out = path.join(serverRoot(), "migration/out");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, "accept-masters.json"),
    JSON.stringify({ source: "layer 0 masters screens", generatedAt: new Date().toISOString(), base: BASE, allPass, checks }, null, 2),
  );
  for (const c of checks) {
    process.stdout.write((c.pass ? "PASS " : "FAIL ") + c.screen.padEnd(11) + c.id.padEnd(22) + " got=" + c.got + (c.pass ? "" : "  want=" + c.want) + "\n");
  }
  process.stdout.write((allPass ? "ALL PASS" : "FAILURES") + " " + checks.filter((c) => c.pass).length + "/" + checks.length + "\n");
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  process.stderr.write(String((e as Error)?.stack ?? e) + "\n");
  process.exit(1);
});
