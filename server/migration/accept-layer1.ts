import fs from "node:fs";
import path from "node:path";
import { serverRoot } from "../src/infrastructure/db.ts";
import { ONYX_MSG } from "../src/application/master-kit.ts";

/**
 * قبول الطبقة ١ (BUILD-ORDER بنود 13–27) على الخادم الحي — نفس نداءات الواجهة.
 * ١) أعداد كل كيان = أعداد جدول أونيكس المصدر في `_onyx-extract` (تُعدّ من الملف لا تُكتب يدوياً).
 * ٢) مخالفة كل قاعدة موثّقة ترجع نص رسالة أونيكس الأصلي برقمها.
 * ٣) دورة إضافة ← قراءة ← تعديل ← حذف على كل شاشة تقبل الإضافة، والأعداد تعود كما كانت.
 */
const BASE = process.env.STARTYX_API ?? "http://127.0.0.1:8787";
const EXTRACT = path.resolve(serverRoot(), "../../_onyx-extract/db");

type Check = { id: string; screen: string; pass: boolean; got: string; want: string };
const checks: Check[] = [];
const add = (id: string, screen: string, got: string, want: string): void => {
  checks.push({ id, screen, pass: got === want, got, want });
};

async function call(p: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const r = body
    ? await fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    : await fetch(BASE + p);
  const t = await r.text();
  return { status: r.status, json: (t ? JSON.parse(t) : {}) as Record<string, unknown> };
}
async function total(entity: string): Promise<number> {
  return Number((await call("/api/masters/" + entity)).json.total);
}
async function rows(entity: string, q = ""): Promise<Record<string, unknown>[]> {
  return (await call("/api/masters/" + entity + "?limit=5000" + (q ? "&q=" + encodeURIComponent(q) : ""))).json.rows as Record<string, unknown>[];
}
function onyxRows(table: string): number {
  const f = path.join(EXTRACT, table, "rows.tsv");
  if (!fs.existsSync(f)) return -1;
  return fs.readFileSync(f, "utf8").split(/\r?\n/).filter((l) => l.length).length - 1;
}
const msg = (no: keyof typeof ONYX_MSG, arg = ""): string => "ONYX-" + no + " · " + ONYX_MSG[no].replace("@1", arg);

async function expectOnyx(id: string, screen: string, entityPath: string, body: unknown, want: string): Promise<void> {
  const r = await call("/api/masters/" + entityPath, body);
  add(id, screen, String(r.json.error ?? "") + " · " + String(r.json.message ?? ""), want);
}
async function save(entity: string, mode: "add" | "edit", values: Record<string, unknown>): Promise<Record<string, unknown>> {
  return (await call("/api/masters/" + entity, { mode, values })).json;
}
async function del(entity: string, key: string): Promise<Record<string, unknown>> {
  return (await call("/api/masters/" + entity + "/delete", { key })).json;
}

async function main(): Promise<void> {
  add("health", "—", String((await call("/api/health")).json.ok), "true");

  /* ═══ ١ · الأعداد مقابل أونيكس ═══ */
  const SOURCE: [string, string, string][] = [
    ["op.3.2", "tax_type", "GNR_TAX_CODE_MST"],
    ["op.3.2", "tax_agency", "GNR_TAX_CODE_DTL"],
    ["op.3.2", "tax_slice", "GNR_TAX_SLICE"],
    ["op.5.1.1.2", "unit", "MEASUREMENT"],
    ["op.5.1.1.2", "unit_conversion", "IAS_UNTS_CONV"],
    ["op.5.1.2.1", "item_group", "GROUP_DETAILS"],
    ["op.5.1.2.8", "warehouse_group", "WAREHOUSE_GROUP"],
    ["op.1.2.11", "account_detail_link", "GLS_AC_CODE_DTL_GRPS"],
    ["op.1.2.4", "general_flow", "IAS_ACCOUNT_ANLSYS"],
    ["op.3.4", "account_tax", "GLS_TAX_ACC"],
    ["op.3.5", "item_tax", "GNR_TAX_ITM"],
    ["op.5.1.2.16", "inventory_gl_link", "IAS_CONN_ACC_INV_BY_GL"],
    ["op.7.1.2.2", "customer_group", "CUSTOMER_GROUP"],
    ["op.7.1.2.2", "customer_group_limit", "IAS_CST_GRP_LMT"],
    ["op.6.1.2.1", "supplier_group", "VENDOR_GROUP"],
    ["op.1.1.13", "account_type", "ACCOUNT_TYPES"],
    ["op.1.1.13", "account_report_type", "ACCOUNT_REPORT_TYPE"],
    ["op.1.1.13", "account_group", "ACCOUNT_GROUPING"],
    ["op.1.1.13", "account_class", "IAS_ACCOUNT_CLASS"],
    ["op.1.2.1", "general_account", "IAS_ACCOUNT_ANLSYS"],
    ["op.1.2.9", "branch_posting_accounts", "INTERFACE_ACC"],
    ["op.4.1.2.8", "account_project", "IAS_ACCOUNT_PJ"],
  ];
  const before: Record<string, number> = {};
  for (const [screen, entity, table] of SOURCE) {
    before[entity] = await total(entity);
    add("count-" + entity, screen, String(before[entity]), String(onyxRows(table)));
  }
  /* حسابات الحركة وحدها في شاشة الربط [مساعدة: GENI006] */
  before.account_flow = await total("account_flow");
  add("count-account_flow", "op.1.2.4", String(before.account_flow), "289");

  /* قيم أونيكس الفعلية الموثقة في GO */
  const agency = (await rows("tax_agency"))[0]!;
  add("tax-agency-accounts", "op.3.2", agency.sales_account + "/" + agency.purchase_account, "2202070001/1207030001");
  add("tax-slice-15", "op.3.2", String(Number((await rows("tax_slice"))[0]!.pct)), "15");
  const cats = new Set((await rows("item_tax")).map((r) => r.vat_category));
  add("item-tax-all-S", "op.3.5", [...cats].join(","), "S");
  add("customer-groups-account", "op.7.1.2.2", String(new Set((await rows("customer_group")).map((r) => r.account_code)).size >= 1), "true");

  /* ═══ ٢ · قواعد بنص أونيكس الأصلي ═══ */
  await expectOnyx("tax-type-dup-code", "op.3.2", "tax_type",
    { mode: "add", values: { no: 99, name_ar: "فحص", code: "vat", applies_to: 3 } }, msg(2143));
  await expectOnyx("tax-type-bad-scope", "op.3.2", "tax_type",
    { mode: "add", values: { no: 99, name_ar: "فحص", code: "TST", applies_to: 7 } }, msg(5020));
  await expectOnyx("tax-type-delete-agencies", "op.3.2", "tax_type/delete", { key: "1" }, msg(4050));
  await expectOnyx("tax-agency-no-sales-acc", "op.3.2", "tax_agency",
    { mode: "add", values: { tax_no: 1, agency_no: 9, name_ar: "فحص", purchase_account: "1207030001" } }, msg(4801));
  await expectOnyx("tax-agency-header-acc", "op.3.2", "tax_agency",
    { mode: "add", values: { tax_no: 1, agency_no: 9, name_ar: "فحص", sales_account: "22", purchase_account: "1207030001" } }, msg(497));
  await expectOnyx("tax-slice-zero", "op.3.2", "tax_slice",
    { mode: "add", values: { no: 9, name_ar: "صفر", pct: "0" } }, msg(7438));
  await expectOnyx("tax-slice-delete-used", "op.3.2", "tax_slice/delete", { key: "1" }, msg(3618, "أصناف"));

  await expectOnyx("unit-dup-case", "op.5.1.1.2", "unit",
    { mode: "add", values: { code: " كرتون ", name_ar: "مكرر", unit_kind: 1 } }, msg(2143));
  await expectOnyx("unit-measured-no-class", "op.5.1.1.2", "unit",
    { mode: "add", values: { code: "TSTU", name_ar: "فحص", unit_kind: 2 } }, msg(4048));
  await expectOnyx("unit-delete-used", "op.5.1.1.2", "unit/delete", { key: "كرتون" }, msg(3618, "أصناف"));
  await expectOnyx("unit-kind-locked", "op.5.1.1.2", "unit",
    { mode: "edit", values: { code: "كرتون", unit_kind: 2, measure_class: 1 } }, msg(5119));
  await expectOnyx("unit-conv-zero", "op.5.1.1.2", "unit_conversion",
    { mode: "add", values: { from_code: "TSTA", to_code: "TSTB", factor: "0" } }, msg(7438));

  await expectOnyx("item-group-bad-pct", "op.5.1.2.1", "item_group",
    { mode: "add", values: { code: "T99", name_ar: "فحص", default_tax_pct: "5" } }, msg(4814));
  await expectOnyx("item-group-delete-items", "op.5.1.2.1", "item_group/delete", { key: "003" }, msg(3618, "أصناف"));

  await expectOnyx("wh-group-delete-used", "op.5.1.2.8", "warehouse_group/delete", { key: "1" }, msg(3618, "مخازن"));

  await expectOnyx("detail-link-wrong-type", "op.1.2.11", "account_detail_link",
    { mode: "add", values: { code: "99", name_ar: "فحص", account_code: "1101010001" } }, msg(4544));
  /* السجل الحقيقي (نوع 5 على حساب نوعه اليوم 0) يبقى قابلاً للتعديل — يُثبت بلا مساس به في
     `npm run verify:layer1` (داخل معاملة تُلغى)، لا هنا: التعديل الحي يغيّر تذييل تدقيق سجل أونيكس */

  await expectOnyx("flow-no-add", "op.1.2.4", "general_flow", { mode: "add", values: { no: 9 } }, msg(3428));
  await expectOnyx("flow-no-delete", "op.1.2.4", "account_flow/delete", { key: "1101010001" }, msg(3428));
  await expectOnyx("flow-bad-type", "op.1.2.4", "general_flow", { mode: "edit", values: { no: 1, flow_type: 9 } }, msg(4048));
  /* الحساب الرئيسي ليس في قائمة الشاشة أصلاً (نطاقها حسابات الحركة) ⇒ لا سجل معروض يُعدَّل */
  await expectOnyx("flow-header-account", "op.1.2.4", "account_flow", { mode: "edit", values: { code: "1101", analysis_no: 11101 } }, msg(3428));

  await expectOnyx("acc-tax-header", "op.3.4", "account_tax",
    { mode: "add", values: { account_code: "1101", tax_no: 1, agency_no: 1, pct: "15" } }, msg(497));
  const linked = new Set((await rows("account_tax")).map((r) => String(r.account_code)));
  const unlinked = String((await rows("account_flow")).find((r) => !linked.has(String(r.code)))!.code);
  await expectOnyx("acc-tax-bad-slice", "op.3.4", "account_tax",
    { mode: "add", values: { account_code: unlinked, tax_no: 1, agency_no: 1, pct: "5" } }, msg(4814));

  const someItem = String((await rows("item_tax"))[0]!.item_code);
  await expectOnyx("item-tax-exempt-no-reason", "op.3.5", "item_tax",
    { mode: "edit", values: { item_code: someItem, vat_category: "E" } }, msg(4048));
  await expectOnyx("item-tax-bad-slice", "op.3.5", "item_tax",
    { mode: "edit", values: { item_code: someItem, pct: "5" } }, msg(4783));
  await expectOnyx("item-tax-unknown-item", "op.3.5", "item_tax",
    { mode: "add", values: { item_code: "NO-SUCH", tax_no: 1, agency_no: 1, pct: "15", vat_category: "S" } }, msg(3319));

  const inv = (await rows("inventory_gl_link"))[0]!;
  await expectOnyx("inv-link-missing-required", "op.5.1.2.16", "inventory_gl_link",
    { mode: "edit", values: { link_type: inv.link_type, group_code: inv.group_code, cogs_acc: "" } }, msg(4048));
  await expectOnyx("inv-link-inventory-moved", "op.5.1.2.16", "inventory_gl_link",
    { mode: "edit", values: { link_type: inv.link_type, group_code: inv.group_code, inventory_acc: "1101010001" } }, msg(5798));

  await expectOnyx("cust-group-not-customer-acc", "op.7.1.2.2", "customer_group",
    { mode: "add", values: { no: 999, name_ar: "فحص", account_code: "1101010001" } }, msg(497));
  await expectOnyx("cust-limit-min-gt-max", "op.7.1.2.2", "customer_group_limit",
    { mode: "add", values: { group_no: 101, currency: "SAR", side: 1, balance_min: "10", balance_max: "5" } }, msg(4244));
  await expectOnyx("cust-limit-no-overrun", "op.7.1.2.2", "customer_group_limit",
    { mode: "add", values: { group_no: 101, currency: "SAR", side: 1, balance_max: "100", overrun_policy: 1, overrun_pct: "10" } }, msg(7181));

  await expectOnyx("supp-group-not-vendor-acc", "op.6.1.2.1", "supplier_group",
    { mode: "add", values: { no: 99, name_ar: "فحص", account_code: "1203010001" } }, msg(497));
  await expectOnyx("supp-group-acc-moved", "op.6.1.2.1", "supplier_group",
    { mode: "edit", values: { no: 2, account_code: "2202010001" } }, msg(5798));

  await expectOnyx("gen-acc-bad-rank", "op.1.2.1", "general_account",
    { mode: "add", values: { no: 11199, parent_no: 1, name_ar: "فحص", report_type: 1 } }, msg(6039));
  await expectOnyx("gen-acc-delete-children", "op.1.2.1", "general_account/delete", { key: "1" }, msg(4050));

  await expectOnyx("interface-header-acc", "op.1.2.9", "branch_posting_accounts",
    { mode: "edit", values: { branch_no: 1, lc: "22" } }, msg(497));
  await expectOnyx("interface-moved-acc", "op.1.2.9", "branch_posting_accounts",
    { mode: "edit", values: { branch_no: 1, vat_output: "2202070002" } }, msg(5798));
  await expectOnyx("interface-delete-moved", "op.1.2.9", "branch_posting_accounts/delete", { key: "1" }, msg(4921));

  await expectOnyx("acc-project-unknown", "op.4.1.2.8", "account_project",
    { mode: "add", values: { account_code: "1101010001", project_no: 999 } }, msg(4048));

  /* ═══ ٣ · دورات كاملة: إضافة ← قراءة بعد الحفظ ← تعديل ← حذف ═══ */
  async function cycle(screen: string, entity: string, key: string, values: Record<string, unknown>, edit: Record<string, unknown>, field: string): Promise<void> {
    const a = await save(entity, "add", values);
    add("cycle-add-" + entity, screen, a.saved ? "saved" : String(a.error) + " " + String(a.message), "saved");
    const reread = (await call("/api/masters/" + entity + "/" + encodeURIComponent(key))).json;
    add("cycle-persist-" + entity, screen, reread && Object.keys(reread).length ? "found" : "missing", "found");
    const e = await save(entity, "edit", edit);
    add("cycle-edit-" + entity, screen, String((e.saved as Record<string, unknown>)?.[field] ?? e.error), String(edit[field]));
    const d = await del(entity, key);
    add("cycle-delete-" + entity, screen, String(d.deleted ?? d.error), key);
  }
  await cycle("op.3.2", "tax_slice", "9", { no: 9, name_ar: "شريحة فحص", pct: "5" }, { no: 9, name_ar: "شريحة فحص ٢" }, "name_ar");
  await cycle("op.5.1.1.2", "unit", "TSTU", { code: "TSTU", name_ar: "وحدة فحص", unit_kind: 1 }, { code: "TSTU", name_ar: "وحدة فحص ٢" }, "name_ar");
  await cycle("op.5.1.2.1", "item_group", "T99", { code: "T99", name_ar: "مجموعة فحص", default_tax_pct: "15" }, { code: "T99", sort_no: 7 }, "sort_no");
  await cycle("op.5.1.2.8", "warehouse_group", "99", { code: "99", name_ar: "مجموعة فحص" }, { code: "99", name_en: "Test" }, "name_en");
  await cycle("op.7.1.2.2", "customer_group", "999", { no: 999, name_ar: "مجموعة فحص", account_code: "1203010001" }, { no: 999, name_en: "Test" }, "name_en");
  await cycle("op.6.1.2.1", "supplier_group", "99", { no: 99, name_ar: "مجموعة فحص", account_code: "2202010001" }, { no: 99, name_en: "Test" }, "name_en");
  await cycle("op.1.1.13", "account_group", "9", { no: 9, name_ar: "مجموعة فحص" }, { no: 9, name_en: "Test" }, "name_en");
  await cycle("op.1.2.1", "general_account", "11199", { no: 11199, parent_no: 111, name_ar: "حساب عام فحص", report_type: 1 }, { no: 11199, notes: "فحص" }, "notes");
  await cycle("op.4.1.2.8", "account_project", "1101010001|1", { account_code: "1101010001", project_no: 1 }, { account_code: "1101010001", project_no: 1 }, "project_no");

  /* المستوى آلي من طول الرقم (op.1.2.1) — يُفحص على الدورة أعلاه قبل الحذف */
  const lvl = await save("general_account", "add", { no: 11198, parent_no: 111, name_ar: "مستوى", report_type: 1 });
  add("gen-acc-level-auto", "op.1.2.1", String((lvl.saved as Record<string, unknown>)?.level ?? lvl.error), "4");
  await del("general_account", "11198");

  /* «اعلى حد متاح» محسوب لا مُدخَل */
  const lim = await save("customer_group_limit", "add", { group_no: 101, currency: "SAR", side: 3, balance_max: "1000", overrun_policy: 2, overrun_pct: "10" });
  add("cust-limit-available", "op.7.1.2.2", String(Number((lim.saved as Record<string, unknown>)?.overrun_possible ?? NaN)), "1100");
  await del("customer_group_limit", "101|SAR|3");

  /* ═══ لا أثر جانبي ═══ */
  const after: string[] = [];
  const want: string[] = [];
  for (const e of Object.keys(before)) {
    after.push(e + "=" + (await total(e)));
    want.push(e + "=" + before[e]);
  }
  add("no-side-effects", "—", after.join(" "), want.join(" "));

  const allPass = checks.every((c) => c.pass);
  const out = path.join(serverRoot(), "migration/out");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, "accept-layer1.json"),
    JSON.stringify({ source: "layer 1 — BUILD-ORDER 13–27", generatedAt: new Date().toISOString(), base: BASE, allPass, checks }, null, 2),
  );
  for (const c of checks) {
    process.stdout.write((c.pass ? "PASS " : "FAIL ") + c.screen.padEnd(12) + c.id.padEnd(34) + " got=" + c.got + (c.pass ? "" : "  want=" + c.want) + "\n");
  }
  process.stdout.write((allPass ? "ALL PASS" : "FAILURES") + " " + checks.filter((c) => c.pass).length + "/" + checks.length + "\n");
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  process.stderr.write(String((e as Error)?.stack ?? e) + "\n");
  process.exit(1);
});
