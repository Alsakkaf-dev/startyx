import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

/**
 * رسم شاشة مستند حيّ (الطبقة ٤ · قيود اليومية op.4.1.3.14) في DOM حقيقي:
 * تبدأ بآخر مستند من الخادم لا بمثال · «إضافة» فاضية · «إضافة من» تنسخ السطور برقم التسلسل ·
 * الحفظ يرسل الفرع والتاريخ والنوع من الشاشة بلا افتراضي صامت · التعديل/الحذف لا يدّعيان سلوكاً غير مبني.
 */
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../assets/js");
const read = (f: string) => fs.readFileSync(path.join(WEB, f), "utf8");

const SUMMARY = { docs: 2, lines: "4", jv1: 1, jv11: 1, posted_onyx: 0, live: 0,
  jvTypes: [{ no: "1", name: "قيد يومية", seq: "1" }, { no: "11", name: "قيود بنكية", seq: "4" }] };
const LIST = [
  { doc_key: "onyx:A", source: "onyx", doc_no: 1, jv_type: 1, doc_date: "2026-01-01", branch_no: 1, description: "أول", debit: "10", credit: "10", line_count: 2, status: "saved" },
  { doc_key: "onyx:B", source: "onyx", doc_no: 5, jv_type: 11, doc_date: "2026-01-02", branch_no: 3, description: "حوالة", debit: "90", credit: "90", line_count: 2, status: "saved",
    created_by: "7", created_at: "05/01/2026 08:53:27", updated_by: "7", update_count: 5 },
];
const DOC_B = {
  header: LIST[1],
  lines: [
    { line_no: 1, account_code: "2202020001", account_name: "موردون محليون", analytic_type: "4", analytic_code: "20022", analytic_name: "مورد", description: "حوالة", debit: "90", credit: "0", cost_center: null, is_generated: false },
    { line_no: 2, account_code: "1201020001", account_name: "الراجحي", analytic_type: "2", analytic_code: "200", analytic_name: "بنك", description: "حوالة", debit: "0", credit: "90", cost_center: null, is_generated: false },
  ],
};

function boot() {
  const dom = new JSDOM('<!doctype html><html dir="rtl"><body><main id="host"></main></body></html>', { runScripts: "outside-only", url: "http://localhost:8777/" });
  const w = dom.window as unknown as Record<string, unknown> & { eval: (s: string) => void; document: Document };
  const calls: { url: string; body: Record<string, unknown> | null }[] = [];
  const notes: string[] = [];
  (w as { OnyxUI?: unknown }).OnyxUI = { toast: (m: string) => { notes.push(m); } };
  (w as { fetch?: unknown }).fetch = (url: string, init?: { body?: string }) => {
    const body = init && init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    calls.push({ url, body });
    let payload: unknown = {};
    if (url.includes("/summary")) payload = SUMMARY;
    else if (url.includes("/next")) payload = { next: 430 };
    else if (url.includes("/api/docs/op.4.1.3.14/onyx%3AB")) payload = DOC_B;
    else if (url.includes("/api/docs/op.4.1.3.14/onyx%3AA")) payload = { header: LIST[0], lines: [] };
    else if (url.includes("/api/docs/op.4.1.3.14")) payload = { rows: LIST, total: LIST.length };
    else if (url.includes("/api/documents/post")) payload = { status: "posted", documentNumber: 430, liveDocumentId: 9 };
    else if (url.includes("/api/masters/account/")) payload = { code: "2101030001", name_ar: "جاري الشريك" };
    return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(payload)) });
  };
  w.eval(read("screen-data.js"));
  w.eval(read("api-client.js"));
  w.eval(read("masters-ui.js"));
  w.eval(read("docs-ui.js"));
  w.eval(read("screen-ui.js"));
  const host = w.document.getElementById("host") as HTMLElement;
  const ok = (w as unknown as { OnyxScreen: { render: Function } }).OnyxScreen.render(host, { ref: "op.4.1.3.14", label: "قيود اليومية", code: "op.4.1.3.14" }, {});
  assert.equal(ok, true);
  return { w, host, calls, notes };
}
const tick = () => new Promise((r) => setTimeout(r, 0));
async function settle() { for (let i = 0; i < 8; i++) await tick(); }
function cmd(host: HTMLElement, name: string): HTMLButtonElement {
  const b = Array.from(host.querySelectorAll(".scr__bar button")).find((x) => (x.getAttribute("aria-label") || "").indexOf(name) === 0) as HTMLButtonElement | undefined;
  assert.ok(b, "الأمر «" + name + "» غير موجود");
  return b;
}
const val = (host: HTMLElement, label: string) => {
  const c = host.querySelector('.fld[data-k="' + label + '"]')?.querySelector("input, select") as HTMLInputElement | null;
  return c ? c.value : "__missing__";
};
const set = (host: HTMLElement, label: string, v: string) => {
  const c = host.querySelector('.fld[data-k="' + label + '"]')?.querySelector("input, select") as HTMLInputElement;
  c.value = v;
  c.dispatchEvent(new (c.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event("change"));
};
const bodyRows = (host: HTMLElement) => Array.from(host.querySelectorAll(".scr__col table tbody tr"));

test("docs ui: opens on the latest real journal — header, lines, types from JV_TYPES, audit", async () => {
  const { host } = boot();
  await settle();
  assert.equal(val(host, "رقم القيد"), "5");
  assert.equal(val(host, "الفرع"), "3");
  assert.equal(val(host, "التاريخ"), "02/01/2026");
  assert.equal(val(host, "نوع القيد"), "11");
  assert.equal(val(host, "البيان"), "حوالة");
  const opts = Array.from(host.querySelectorAll('.fld[data-k="نوع القيد"] option')).map((o) => o.textContent);
  assert.deepEqual(opts, ["", "1 قيد يومية", "11 قيود بنكية"]);
  const rows = bodyRows(host);
  assert.equal(rows.length, 2);
  assert.match(rows[0]!.textContent || "", /2202020001.*موردون محليون.*20022/);
  assert.match(host.querySelector(".scr__col table tfoot")?.textContent || "", /90\.00.*90\.00/);
  assert.doesNotMatch(host.textContent || "", /90,000\.00|مثال ثابت/);
});

test("docs ui: add is blank; number appears only after branch + type (GL-R7); save posts what the screen holds", async () => {
  const { host, calls } = boot();
  await settle();
  cmd(host, "إضافة  ·").click();
  await settle();
  assert.equal(val(host, "رقم القيد"), "");
  assert.equal(val(host, "الفرع"), "");
  assert.equal(val(host, "البيان"), "");
  set(host, "الفرع", "3");
  set(host, "نوع القيد", "11");
  await settle();
  assert.equal(val(host, "رقم القيد"), "430");
  set(host, "البيان", "قيد اختبار");
  const cells = Array.from(host.querySelectorAll(".scr__col table tbody input.cell")) as HTMLInputElement[];
  const put = (k: string, row: number, v: string) => {
    const inp = cells.filter((c) => c.getAttribute("data-k") === k)[row]!;
    inp.value = v;
    inp.dispatchEvent(new (inp.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event("change"));
  };
  put("debit", 0, "25");
  const again = () => Array.from(host.querySelectorAll(".scr__col table tbody input.cell")) as HTMLInputElement[];
  const put2 = (k: string, row: number, v: string) => {
    const inp = again().filter((c) => c.getAttribute("data-k") === k)[row]!;
    inp.value = v;
    inp.dispatchEvent(new (inp.ownerDocument.defaultView as unknown as { Event: typeof Event }).Event("change"));
  };
  put2("account_code", 0, "2101030001");
  await settle();
  put2("account_code", 1, "3101060001");
  await settle();
  put2("credit", 1, "25");
  cmd(host, "حفظ").click();
  await settle();
  const post = calls.find((c) => c.url.includes("/api/documents/post"))!;
  assert.ok(post, "لم يُرسل الحفظ");
  assert.equal(post.body!.branchId, "3");
  assert.equal(post.body!.jvType, "11");
  assert.equal(post.body!.description, "قيد اختبار");
  assert.match(String(post.body!.docDate), /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual((post.body!.lines as { accountCode: string; side: string; amount: string }[]).map((l) => l.accountCode + ":" + l.side + ":" + l.amount),
    ["2101030001:debit:25", "3101060001:credit:25"]);
});

test("docs ui: add-from copies the lines into a new document number; edit/delete say they are not built", async () => {
  const { host, notes } = boot();
  await settle();
  cmd(host, "إضافة من").click();
  await settle();
  assert.equal(val(host, "رقم القيد"), "430");
  const accs = (Array.from(host.querySelectorAll('.scr__col table tbody input.cell[data-k="account_code"]')) as HTMLInputElement[]).map((i) => i.value);
  assert.deepEqual(accs, ["2202020001", "1201020001"]);
  cmd(host, "تراجع").click();
  await settle();
  cmd(host, "تعديل").click();
  await settle();
  assert.match(notes[notes.length - 1] || "", /غير مبني بعد/);
});
