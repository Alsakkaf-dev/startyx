import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

/**
 * رسم شاشات الطبقة ٠ في DOM حقيقي (jsdom): الجدول يتعبّى من الخادم،
 * اللوحة تُربط بالسجل المعروض، والأوامر تعمل على بيانات حقيقية لا أمثلة.
 */
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../assets/js");
const read = (f: string) => fs.readFileSync(path.join(WEB, f), "utf8");

const CURRENCIES = [
  {
    no: 1, code: "SAR", iso_code: "SAR", name_ar: "ريال سعودي", name_en: null, fraction_ar: null,
    is_local: true, is_stock_currency: true, rate: "1.0000000000", rate_min: null, rate_max: null,
    operator: "mul", decimals: 2, inactive: false,
    created_by: "1", created_at: "2022-12-17T16:50:56.000Z", updated_by: "1", updated_at: "2022-12-20T10:44:50.000Z", update_count: 0,
  },
  {
    no: 2, code: "USD", iso_code: "USD", name_ar: "دولار أمريكي", name_en: null, fraction_ar: null,
    is_local: false, is_stock_currency: false, rate: "3.7500000000", rate_min: "3.7", rate_max: "3.8",
    operator: "mul", decimals: 2, inactive: false,
    created_by: "1 · محسن السقاف", created_at: "2026-09-23T00:00:00.000Z", updated_by: null, updated_at: null, update_count: 0,
  },
];

type Call = { url: string; body: Record<string, unknown> | null };

function boot(reply?: (url: string, body: Record<string, unknown> | null) => unknown) {
  const dom = new JSDOM('<!doctype html><html dir="rtl"><body><main id="host"></main></body></html>', {
    runScripts: "outside-only",
    url: "http://localhost:8777/",
  });
  const w = dom.window as unknown as Record<string, unknown> & { eval: (s: string) => void; document: Document };
  const calls: Call[] = [];
  (w as { fetch?: unknown }).fetch = (url: string, init?: { body?: string }) => {
    const body = init && init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    calls.push({ url, body });
    const payload = reply ? reply(url, body) : { rows: CURRENCIES, total: CURRENCIES.length };
    const status = (payload as { __status?: number }).__status ?? 200;
    return Promise.resolve({
      ok: status < 400,
      text: () => Promise.resolve(JSON.stringify(payload)),
    });
  };
  w.eval(read("screen-data.js"));
  w.eval(read("api-client.js"));
  w.eval(read("masters-ui.js"));
  w.eval(read("screen-ui.js"));
  return { dom, w, calls, doc: w.document };
}

function render(ctx: ReturnType<typeof boot>, ref: string, label: string) {
  const screen = (ctx.w as { OnyxScreen: { render: Function } }).OnyxScreen;
  const host = ctx.doc.getElementById("host") as HTMLElement;
  host.innerHTML = "";
  const ok = screen.render(host, { ref, label, code: ref }, {});
  assert.equal(ok, true, ref + " لم تُرسم");
  return host;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/** الشريط يُعاد بناؤه مع كل تبديل وضع — تُقرأ الأزرار من جديد في كل نقرة */
function cmd(host: HTMLElement, name: string): HTMLButtonElement {
  const b = Array.from(host.querySelectorAll(".scr__bar button")).find(
    (x) => (x.getAttribute("aria-label") || "").indexOf(name) === 0,
  ) as HTMLButtonElement | undefined;
  assert.ok(b, "الأمر «" + name + "» غير موجود في الشريط");
  return b;
}

function fieldValue(host: HTMLElement, label: string): string {
  const box = host.querySelector('.fld[data-k="' + label + '"]');
  const ctl = box && (box.querySelector("input, select") as HTMLInputElement | HTMLSelectElement | null);
  return ctl ? ctl.value : "__missing__";
}

test("op.1.1.3: الجدول يتعبّى من الخادم لا من قيم أمثلة", async () => {
  const ctx = boot();
  const host = render(ctx, "op.1.1.3", "تهيئة العملات");
  await tick();
  await tick();
  assert.ok(ctx.calls.some((c) => c.url.indexOf("/api/masters/currency") >= 0), "لم تُطلب بيانات العملات");
  const rows = host.querySelectorAll(".scr__col .tblwrap tbody tr[data-i]");
  assert.equal(rows.length, 2);
  assert.match(host.querySelector(".scr__col .tblwrap thead")!.textContent!, /الرمز الدولي/);
  assert.match(rows[0]!.textContent!, /ريال سعودي/);
  assert.equal(fieldValue(host, "الاسم"), "ريال سعودي");
  assert.equal(fieldValue(host, "الرمز الدولي"), "SAR");
  assert.equal(fieldValue(host, "محلية"), "نعم");
  assert.equal(fieldValue(host, "سعر التحويل"), "1");
});

test("op.1.1.3: تذييل التدقيق من بيانات السجل الحقيقية", async () => {
  const ctx = boot();
  const host = render(ctx, "op.1.1.3", "تهيئة العملات");
  await tick();
  await tick();
  const audit = host.querySelector(".scr__audit")!.textContent!;
  assert.match(audit, /مدخل السجل/);
  assert.match(audit, /17\/12\/2022/, "تاريخ الإدخال الحقيقي من أونيكس");
  assert.doesNotMatch(audit, /عرض توضيحي/);
});

test("op.1.1.3: التنقّل بين السجلات يبدّل اللوحة", async () => {
  const ctx = boot();
  const host = render(ctx, "op.1.1.3", "تهيئة العملات");
  await tick();
  await tick();
  assert.match(host.querySelector(".scr__rec")!.textContent!, /1/);
  cmd(host, "التالي").click();
  await tick();
  assert.equal(fieldValue(host, "الاسم"), "دولار أمريكي");
  assert.equal(fieldValue(host, "الرمز"), "USD");
});

test("op.1.1.3: «إضافة» تفتح سجلاً فاضياً برقم تالٍ", async () => {
  const ctx = boot();
  const host = render(ctx, "op.1.1.3", "تهيئة العملات");
  await tick();
  await tick();
  cmd(host, "إضافة").click();
  await tick();
  assert.equal(fieldValue(host, "الرقم"), "3", "الرقم التالي بعد 1 و2");
  assert.equal(fieldValue(host, "الاسم"), "", "الحقول فاضية في الإضافة");
  assert.match(host.querySelector(".scr__state")!.textContent!, /غير محفوظ/);
});

test("op.1.1.3: الحفظ يرسل الحقول للخادم ويعيد التحميل", async () => {
  const posts: Call[] = [];
  const ctx = boot((url, body) => {
    if (body) {
      posts.push({ url, body });
      return { saved: { ...CURRENCIES[0], no: 3, name_ar: "درهم" } };
    }
    return { rows: CURRENCIES, total: CURRENCIES.length };
  });
  const host = render(ctx, "op.1.1.3", "تهيئة العملات");
  await tick();
  await tick();
  cmd(host, "إضافة").click();
  await tick();
  (host.querySelector('.fld[data-k="الاسم"] input') as HTMLInputElement).value = "درهم";
  (host.querySelector('.fld[data-k="الرمز"] input') as HTMLInputElement).value = "AED";
  (host.querySelector('.fld[data-k="الرمز الدولي"] input') as HTMLInputElement).value = "AED";
  (host.querySelector('.fld[data-k="سعر التحويل"] input') as HTMLInputElement).value = "1.02";
  cmd(host, "حفظ").click();
  await tick();
  await tick();
  assert.equal(posts.length, 1, "نداء حفظ واحد");
  assert.match(posts[0]!.url, /\/api\/masters\/currency$/);
  const sent = posts[0]!.body as { mode: string; values: Record<string, unknown> };
  assert.equal(sent.mode, "add");
  assert.equal(sent.values.name_ar, "درهم");
  assert.equal(sent.values.iso_code, "AED");
  assert.equal(sent.values.rate, "1.02");
  assert.equal(sent.values.is_local, false);
});

test("op.1.1.3: رفض الخادم يظهر بنص أونيكس الأصلي", async () => {
  const ctx = boot((_url, body) =>
    body ? { __status: 400, error: "ONYX-2143", message: "هذا الكود موجود مسبقا...لا يسمح بتكرار السجل" } : { rows: CURRENCIES, total: 2 },
  );
  let toast = "";
  (ctx.w as { OnyxUI?: unknown }).OnyxUI = { toast: (m: string) => { toast = m; } };
  const host = render(ctx, "op.1.1.3", "تهيئة العملات");
  await tick();
  await tick();
  cmd(host, "تعديل").click();
  await tick();
  cmd(host, "حفظ").click();
  await tick();
  await tick();
  assert.equal(toast, "هذا الكود موجود مسبقا...لا يسمح بتكرار السجل");
});

test("باقي شاشات الطبقة ٠ ترسم وتطلب كيانها", async () => {
  for (const [ref, entity, label] of [
    ["op.1.2.3", "account", "الدليل المحاسبي"],
    ["op.1.1.12", "branch", "بيانات الفروع"],
    ["op.1.1.2", "fiscal_period", "إعداد فترات النظام"],
    ["op.1.2.5", "cost_center", "مراكز التكلفة"],
    ["op.1.2.6", "project", "بيانات المشاريع"],
    ["op.4.1.2.9", "account_activity", "ربط الحسابات بالأنشطة"],
  ] as const) {
    const ctx = boot(() => ({ rows: [], total: 0 }));
    const host = render(ctx, ref, label);
    await tick();
    await tick();
    assert.ok(ctx.calls.some((c) => c.url.indexOf("/api/masters/" + entity) >= 0), ref + " لم تطلب " + entity);
    const empty = host.querySelector(".scr__col .tblwrap tbody")!.textContent!;
    assert.match(empty, ref === "op.4.1.2.9" ? /لا أنشطة معرّفة/ : /لا سجلات/, ref + " لا تعرض حالة الفراغ");
    assert.equal(host.querySelectorAll(".scr__col .tblwrap tbody tr[data-i]").length, 0);
  }
});

test("op.4.1.2.9: مفتاح مركّب (حساب|نشاط) في الحفظ والحذف", async () => {
  const link = { account_code: "1203010001", activity_no: 7, created_by: "1", created_at: "23/09/2026 00:00:00", updated_by: null, updated_at: null, update_count: 0 };
  const sent: Call[] = [];
  const ctx = boot((url, body) => {
    if (body) {
      sent.push({ url, body });
      return url.indexOf("/delete") >= 0 ? { deleted: "1203010001|7" } : { saved: link };
    }
    return { rows: [link], total: 1 };
  });
  (ctx.w as { confirm?: unknown }).confirm = () => true;
  const host = render(ctx, "op.4.1.2.9", "ربط الحسابات بالأنشطة");
  await tick();
  await tick();
  assert.equal(fieldValue(host, "رقم الحساب"), "1203010001");
  assert.equal(fieldValue(host, "رقم النشاط"), "7");
  cmd(host, "حذف").click();
  await tick();
  await tick();
  assert.equal(sent.length, 1);
  assert.match(sent[0]!.url, /\/api\/masters\/account_activity\/delete$/);
  assert.equal((sent[0]!.body as { key: string }).key, "1203010001|7", "المفتاح المركّب يُرسل كما يفهمه الخادم");
});

/* ═══════════ الطبقة ١ ═══════════ */

test("شاشات الطبقة ١ الخمس عشرة ترسم وتطلب كيانها الأول", async () => {
  for (const [ref, entity] of [
    ["op.3.2", "tax_type"], ["op.5.1.1.2", "unit"], ["op.5.1.2.1", "item_group"], ["op.5.1.2.8", "warehouse_group"],
    ["op.1.2.11", "account_detail_link"], ["op.1.2.4", "general_flow"], ["op.3.4", "account_tax"], ["op.3.5", "item_tax"],
    ["op.5.1.2.16", "inventory_gl_link"], ["op.7.1.2.2", "customer_group"], ["op.6.1.2.1", "supplier_group"],
    ["op.1.1.13", "account_type"], ["op.1.2.1", "general_account"], ["op.1.2.9", "branch_posting_accounts"],
    ["op.4.1.2.8", "account_project"],
  ] as const) {
    const ctx = boot(() => ({ rows: [], total: 0 }));
    const host = render(ctx, ref, ref);
    await tick();
    await tick();
    assert.ok(ctx.calls.some((c) => c.url.indexOf("/api/masters/" + entity) >= 0), ref + " لم تطلب " + entity);
    assert.equal(host.querySelectorAll(".scr__col .tblwrap tbody tr[data-i]").length, 0, ref + " فيها صفوف أمثلة");
  }
});

test("op.3.2: التبويب يبدّل الجدول واللوحة، والحقول تُقرأ من لوحة الجدول النشط", async () => {
  const TYPE = { no: 1, name_ar: "ضريبة القيمة المضافة", code: "VAT", applies_to: 3, agency_count: 1, is_default: true, created_by: "1", created_at: null, update_count: 0 };
  const AGENCY = { tax_no: 1, agency_no: 1, name_ar: "الضريبه", sales_account: "2202070001", purchase_account: "1207030001", created_by: "1", created_at: null, update_count: 0 };
  const ctx = boot((url) => {
    if (url.indexOf("/api/masters/tax_agency") >= 0) return { rows: [AGENCY], total: 1 };
    if (url.indexOf("/api/masters/tax_type") >= 0) return { rows: [TYPE], total: 1 };
    return { rows: [], total: 0 };
  });
  const host = render(ctx, "op.3.2", "أنواع الضرائب");
  await tick();
  await tick();
  const visible = (title: string) => {
    const p = Array.from(host.querySelectorAll(".scr__col .pnl")).find((x) => x.querySelector("header h2")?.textContent === title) as HTMLElement;
    return p && p.style.display !== "none";
  };
  assert.equal(visible("نوع الضريبة"), true);
  assert.equal(visible("الجهة"), false, "لوحة الجهة مخفية في تبويب الأنواع");
  assert.equal(fieldValue(host, "رمز النوع"), "VAT");
  assert.equal(fieldValue(host, "طريقة الاحتساب"), "الكل");

  const tabs = Array.from(host.querySelectorAll(".msets button")) as HTMLButtonElement[];
  assert.deepEqual(tabs.map((b) => b.textContent), ["الأنواع", "الجهات", "الشرائح"]);
  tabs[1]!.click();
  await tick();
  await tick();
  assert.equal(visible("الجهة"), true);
  assert.equal(visible("نوع الضريبة"), false);
  const agencyPanel = Array.from(host.querySelectorAll(".scr__col .pnl")).find((x) => x.querySelector("header h2")?.textContent === "الجهة")!;
  const sales = agencyPanel.querySelector('.fld[data-k="حساب المبيعات"] input') as HTMLInputElement;
  assert.equal(sales.value, "2202070001", "الحقل يُملأ داخل لوحة الجدول النشط");
  assert.equal(host.querySelectorAll(".scr__col .tblwrap tbody tr[data-i]").length, 1);
});

test("op.1.2.4: شاشة ربط — لا إضافة ولا حذف، والتعديل متاح", async () => {
  const GA = { no: 11101, name_ar: "أراضي", level: 4, flow_type: 2, update_accounts: false, created_by: "1", created_at: null, update_count: 0 };
  const sent: Call[] = [];
  const ctx = boot((url, body) => {
    if (body) { sent.push({ url, body }); return { saved: GA }; }
    return { rows: [GA], total: 1 };
  });
  (ctx.w as { confirm?: unknown }).confirm = () => true;
  const host = render(ctx, "op.1.2.4", "ربط الحسابات بالحسابات العامة");
  await tick();
  await tick();
  assert.equal(fieldValue(host, "نوع التدفق"), "استثماري");
  for (const name of ["إضافة", "حذف"]) {
    assert.equal(
      Array.from(host.querySelectorAll(".scr__bar button")).some((x) => (x.getAttribute("aria-label") || "").indexOf(name) === 0),
      false,
      "زر «" + name + "» غير معروض في شاشة ربط",
    );
  }
  cmd(host, "تعديل").click();
  cmd(host, "حفظ").click();
  await tick();
  await tick();
  assert.equal(sent.length, 1);
  assert.match(sent[0]!.url, /\/api\/masters\/general_flow$/);
  assert.equal((sent[0]!.body as { mode: string }).mode, "edit");
});

/* ═══ الطبقة ٢ — op.5.1.2.10 بيانات الأصناف: رأس + تفاصيل الصنف المعروض ═══ */
const ITEMS = [
  { code: "04001", name_ar: "زيت فحص", group_code: "004", main_unit: "حبة", units: "حبة ← كرتون × 12", is_kit: false, inactive: false, created_by: "1", created_at: null, update_count: 0 },
  { code: "04002", name_ar: "زيت فحص ٢", group_code: "004", main_unit: "حبة", units: "حبة", is_kit: false, inactive: false, created_by: "1", created_at: null, update_count: 0 },
];
const GROUPS = [{ code: "004", name_ar: "زيوت", item_code_prefix: "04" }];
const UNITS = [
  { item_code: "04001", unit_code: "حبة", pack_size: "1", level_no: 1, is_main: true, is_sale: true, created_by: "1", created_at: null, update_count: 0 },
  { item_code: "04001", unit_code: "كرتون", pack_size: "12", level_no: 2, is_main: false, is_sale: false, created_by: "1", created_at: null, update_count: 0 },
];

function itemCtx(sent: Call[]) {
  return boot((url, body) => {
    if (body) { sent.push({ url, body }); return { saved: { ...ITEMS[0], ...(body.values as object) }, warnings: [] }; }
    if (url.indexOf("/api/masters/item_group") >= 0) return { rows: GROUPS, total: 1 };
    if (url.indexOf("/api/masters/item_unit") >= 0) return { rows: UNITS, total: UNITS.length };
    if (url.indexOf("/api/masters/item?") >= 0 || /\/api\/masters\/item$/.test(url)) return { rows: ITEMS, total: ITEMS.length };
    return { rows: [], total: 0 };
  });
}

test("op.5.1.2.10: تبويب الوحدات يطلب وحدات الصنف المعروض فقط، والإضافة تثبّت رقمه", async () => {
  const sent: Call[] = [];
  const ctx = itemCtx(sent);
  const host = render(ctx, "op.5.1.2.10", "بيانات الأصناف");
  await tick();
  await tick();
  assert.equal(fieldValue(host, "رقم الصنف"), "04001");
  assert.ok(ctx.calls.some((c) => /\/api\/masters\/item\?limit=5000/.test(c.url)), "الأصناف تُقرأ كاملة (2,228 > 500)");
  const tabs = Array.from(host.querySelectorAll(".msets button")) as HTMLButtonElement[];
  assert.deepEqual(tabs.map((b) => b.textContent), ["الأصناف", "الوحدات", "الموردون", "المكونات", "الأرقام المرجعية", "المخازن"]);
  tabs[1]!.click();
  await tick();
  await tick();
  const unitCall = ctx.calls.filter((c) => c.url.indexOf("/api/masters/item_unit") >= 0).pop()!;
  assert.match(decodeURIComponent(unitCall.url), /eq\.item_code=04001/);
  assert.equal(host.querySelectorAll(".scr__col .tblwrap tbody tr[data-i]").length, 2);
  cmd(host, "إضافة").click();
  const unitPanel = Array.from(host.querySelectorAll(".scr__col .pnl")).find((x) => x.querySelector("header h2")?.textContent === "وحدة الصنف")!;
  const key = unitPanel.querySelector('.fld[data-k="رقم الصنف"] input') as HTMLInputElement;
  assert.equal(key.value, "04001", "رقم الصنف من الرأس");
  assert.equal(key.readOnly, true, "رقم الرأس لا يُعدَّل في التفصيل");
});

test("op.5.1.2.10: «إضافة من» تنسخ الصنف برقم جديد من بادئة المجموعة وترسل copy_from", async () => {
  const sent: Call[] = [];
  const ctx = itemCtx(sent);
  const host = render(ctx, "op.5.1.2.10", "بيانات الأصناف");
  await tick();
  await tick();
  cmd(host, "إضافة من").click();
  assert.equal(fieldValue(host, "رقم الصنف"), "04003", "IV-R95: البادئة 04 + (أكبر + 1) بالطول الغالب");
  assert.equal(fieldValue(host, "اسم الصنف"), "زيت فحص", "الحقول منسوخة وقابلة للتعديل");
  assert.equal(fieldValue(host, "الوحدة الرئيسية"), "حبة");
  cmd(host, "حفظ").click();
  await tick();
  await tick();
  assert.equal(sent.length, 1);
  const b = sent[0]!.body as { mode: string; values: Record<string, unknown> };
  assert.equal(b.mode, "add");
  assert.equal(b.values.copy_from, "04001");
  assert.equal(b.values.code, "04003");
  assert.equal(b.values.main_unit, "حبة");
});

test("op.5.1.2.10: الوحدة الرئيسية تُرسل عند الإضافة فقط", async () => {
  const sent: Call[] = [];
  const ctx = itemCtx(sent);
  const host = render(ctx, "op.5.1.2.10", "بيانات الأصناف");
  await tick();
  await tick();
  cmd(host, "تعديل").click();
  const mu = host.querySelector('.fld[data-k="الوحدة الرئيسية"] input') as HTMLInputElement;
  assert.equal(mu.readOnly, true, "لا تُعدَّل من الرأس بعد الإضافة — من تبويب الوحدات");
  cmd(host, "حفظ").click();
  await tick();
  await tick();
  const v = (sent[0]!.body as { values: Record<string, unknown> }).values;
  assert.equal("main_unit" in v, false);
});

/* ═══ الطبقة ٢ — op.7.1.2.4 بيانات مندوبي المبيعات: ٧ تبويبات، الضمانات والتوزيع على سجل المندوب نفسه ═══ */
const REPS = [
  { code: "10004", name_ar: "يونس ابوفارس", parent_code: "10001", classification: 0, warehouse_code: "101", g_status: null,
    g_type: null, cheque_post_type: 0, visit_open_type: 1, inactive: false, created_by: "1", created_at: null, update_count: 0 },
];

test("op.7.1.2.4: تبويب الضمانات يقرأ المندوب المعروض ويحفظ حقوله فقط برقمه، والعمليات لا تُضاف", async () => {
  const sent: Call[] = [];
  const ctx = boot((url, body) => {
    if (body) { sent.push({ url, body }); return { saved: { ...REPS[0], ...(body.values as object) }, warnings: [] }; }
    if (url.indexOf("/api/masters/salesman?") >= 0) return { rows: REPS, total: REPS.length };
    return { rows: [], total: 0 };
  });
  const host = render(ctx, "op.7.1.2.4", "بيانات مندوبي المبيعات");
  await tick();
  await tick();
  assert.equal(fieldValue(host, "رقم مندوب المبيعات"), "10004");
  assert.equal(fieldValue(host, "التصنيف"), "مندوب مبيعات", "CONN_SP_SMAN 0 ⇐ S_FLAGS");
  const tabs = Array.from(host.querySelectorAll(".msets button")) as HTMLButtonElement[];
  assert.deepEqual(tabs.map((b) => b.textContent),
    ["البيانات الرئيسية", "بيانات الضمانات", "نظام التوزيع", "ربط العملاء بالمندوبين", "المواقع الجغرافية", "الصلاحيات", "العمليات"]);
  tabs[1]!.click();
  await tick();
  await tick();
  const call = ctx.calls.filter((c) => c.url.indexOf("/api/masters/salesman?") >= 0).pop()!;
  assert.match(decodeURIComponent(call.url), /eq\.code=10004/);
  cmd(host, "تعديل").click();
  const panel = Array.from(host.querySelectorAll(".scr__col .pnl")).find((x) => x.querySelector("header h2")?.textContent === "الضمانة")!;
  const key = panel.querySelector('.fld[data-k="رقم المندوب"] input') as HTMLInputElement;
  assert.equal(key.readOnly, true, "رقم المندوب لا يُعدَّل من تبويب الضمانات");
  const status = panel.querySelector('.fld[data-k="حالة الضمانة"] select') as HTMLSelectElement;
  status.value = Array.from(status.options).find((o) => o.text === "فعال")!.value;
  cmd(host, "حفظ").click();
  await tick();
  await tick();
  assert.equal(sent.length, 1);
  const b = sent[0]!.body as { mode: string; values: Record<string, unknown> };
  assert.match(sent[0]!.url, /\/api\/masters\/salesman$/);
  assert.equal(b.mode, "edit");
  assert.equal(b.values.code, "10004");
  assert.equal(String(b.values.g_status), "1");
  assert.equal("name_ar" in b.values, false, "تعديل جزئي — الرئيسية لا تُرسل من تبويب الضمانات");
  tabs[6]!.click();
  await tick();
  await tick();
  const opsCall = ctx.calls.filter((c) => c.url.indexOf("/api/masters/salesman_operation") >= 0).pop()!;
  assert.match(decodeURIComponent(opsCall.url), /eq\.rep_code=10004/);
  cmd(host, "إضافة").click();
  assert.equal(sent.length, 1, "العمليات استعلام — «إضافة» لا ترسل شيئاً");
});
