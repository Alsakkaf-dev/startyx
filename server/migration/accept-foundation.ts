/**
 * قبول الطبقة ٠ · الخدمات المشتركة ١–٥ على القاعدة الحقيقية — على نسخة منها،
 * فلا يدخل قيد تجريبي دفتر الشركة. يُشغَّل: npm run accept:foundation
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, ".pgdata", "pglite");
const COPY = fs.mkdtempSync(path.join(os.tmpdir(), "startyx-accept-"));
fs.cpSync(SRC, COPY, { recursive: true });
process.env.PGLITE_DIR = COPY;
process.env.DATABASE_URL = "postgresql://none:none@127.0.0.1:1/none";

const { openDb } = await import("../src/infrastructure/db.ts");
const { applySchema, hydrateFromDb } = await import("../src/infrastructure/postgres.ts");
const { liveStore, MemoryTx } = await import("../src/infrastructure/memory.ts");
const { postLive } = await import("../src/application/post-live.ts");
const { loadPeriods } = await import("../src/application/posting-context.ts");

const db = await openDb();
await applySchema(db);
await hydrateFromDb(db, liveStore, []);
const ledger: never[] = [];

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
const ok = (name: string, pass: boolean, detail = "") => {
  checks.push({ name, pass, detail });
  process.stdout.write(`${pass ? "✔" : "✖"} ${name}${detail ? " — " + detail : ""}\n`);
};
async function rejects(name: string, fn: () => Promise<unknown>, expect: RegExp) {
  try {
    await fn();
    ok(name, false, "قُبل ولم يُرفض");
  } catch (e) {
    const m = (e as Error).message;
    ok(name, expect.test(m), m);
  }
}
const scalar = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows[0] ?? {};

const mj = (over: Record<string, unknown> = {}) => ({
  docKind: "manual_journal",
  branchId: 1,
  docDate: "2026-09-20",
  screenRef: "op.4.1.3.14",
  user: "accept",
  costCenter: "031",
  lines: [
    { accountCode: "3101060001", side: "debit", amount: "10" },
    { accountCode: "3201010032", side: "credit", amount: "10" },
  ],
  ...over,
});

/* ١ · المخطط */
const tables = ["account", "currency", "fiscal_period", "branch", "cost_center", "project", "activity", "document_sequence", "branch_posting_accounts", "inventory_gl_link", "gl_entry", "gl_entry_line", "stock_movement"];
for (const t of tables) {
  const r = await scalar(`SELECT to_regclass('erp.${t}') IS NOT NULL AS x`);
  ok(`مخطط: erp.${t}`, r.x === true);
}
const trig = await scalar(`SELECT count(*)::int c FROM pg_trigger WHERE tgname IN ('gl_line_account_guard','gl_entry_balance_check','gl_line_immutable','gl_entry_immutable','stock_movement_immutable')`);
ok("مخطط: ٥ مشغّلات حماية", Number(trig.c) === 5, String(trig.c));

/* ٢–٥ · ترحيل حيّ من البداية للنهاية */
const before = await scalar(`SELECT count(*)::int c FROM erp.gl_entry`);
const seqKey = "manual_journal|by|1|2026";
const seq0 = liveStore.sequences.get(seqKey) ?? 0;
const r1 = (await postLive(db, mj(), ledger)) as { status: string; documentNumber: number; glEntryId: number };
ok("ترحيل قيد يومية بمركز تكلفة", r1.status === "posted", `رقم ${r1.documentNumber} · قيد ${r1.glEntryId}`);
ok("الترقيم يكمل من آخر رقم أونيكس", r1.documentNumber === seq0 + 1, `${seq0} ⇒ ${r1.documentNumber}`);
const e1 = await scalar(`SELECT e.fiscal_year_id, e.currency_id, e.fx_rate::text r, e.live_document_id, l.cost_center_code, l.branch_id
                           FROM erp.gl_entry e JOIN erp.gl_entry_line l ON l.entry_id = e.id WHERE e.id = $1 AND l.line_no = 1`, [r1.glEntryId]);
ok("INV-2/INV-9: القيد يحمل مصدره وسنته وعملته وسعره", e1.fiscal_year_id != null && e1.live_document_id != null && Number(e1.currency_id) === 1 && Number(e1.fx_rate ?? e1.r) === 1, JSON.stringify(e1));
ok("SY-R39: مركز التكلفة محفوظ على السطر", e1.cost_center_code === "031");

await rejects("SY-R39: حساب مركزه إجباري بلا مركز يُرفض", () => postLive(db, mj({ costCenter: "" }), ledger), /مركز التكلفة/);
await rejects("INV-5: حساب رئيسي يُرفض", () => postLive(db, mj({ lines: [{ accountCode: "3101", side: "debit", amount: "1" }, { accountCode: "3201010032", side: "credit", amount: "1" }] }), ledger), /رقم الحساب غير صحيح/);
await rejects("GL-R37: حساب عملاء بلا عميل يُرفض", () => postLive(db, mj({ lines: [{ accountCode: "1203010001", side: "debit", amount: "1" }, { accountCode: "3201010032", side: "credit", amount: "1" }] }), ledger), /ادخل الحساب التحليلي|غير متوافق/);
await rejects("INV-8: فاتورة مبيعات لعميل بلا مجموعة مربوطة تتوقف وتسمّي الشاشة", async () => {
  const c = await scalar(`SELECT code FROM erp.customer WHERE code ~ '^[0-9]+$' LIMIT 1`);
  const it = await scalar(`SELECT code FROM erp.item WHERE group_code = '001' LIMIT 1`);
  const wh = await scalar(`SELECT code FROM erp.warehouse LIMIT 1`);
  return postLive(db, { docKind: "sales_invoice", branchId: 1, docDate: "2026-09-20", partyAnalyticId: c.code, costCenter: "031", lines: [{ itemCode: it.code, warehouseCode: wh.code, qty: "1", price: "100", currentAvg: "40" }] }, ledger);
}, /op\.7\.1\.2\.2/);
await rejects("FX: العملة المحلية بسعر ≠ 1 تُرفض", () => postLive(db, mj({ fxRate: "3.75" }), ledger), /سعر صرف العملة المحلية/);
await rejects("بلا فرع يُرفض (لا افتراضي صامت)", () => postLive(db, mj({ branchId: undefined }), ledger), /الفرع/);

const seqAfterRejects = liveStore.sequences.get(seqKey);
ok("INV-10: الرفض لا يستهلك رقماً", seqAfterRejects === r1.documentNumber, `${seqAfterRejects}`);

/* معلّق: الرقم محجوز ومحفوظ في القاعدة */
const r2 = (await postLive(db, mj({ lines: [{ accountCode: "3101060001", side: "debit", amount: "10" }, { accountCode: "3201010032", side: "credit", amount: "7" }] }), ledger)) as { status: string; documentNumber: number };
ok("قيد غير متوازن ⇒ معلّق بلا قيد", r2.status === "pending");
const s2 = await scalar(`SELECT last_value::int v FROM erp.document_sequence WHERE sequence_group = $1`, [seqKey]);
ok("INV-10: رقم المعلّق محفوظ في التسلسل", Number(s2.v) === r2.documentNumber, `${s2.v}`);

/* إعادة تشغيل: الذاكرة من القاعدة، الرقم التالي لا يتكرر */
const fresh = new MemoryTx();
await hydrateFromDb(db, fresh, []);
ok("إعادة التشغيل: التسلسل يُقرأ من القاعدة", fresh.sequences.get(seqKey) === r2.documentNumber);

/* INV-4 من op.1.1.2 نفسها */
await db.query(`UPDATE erp.fiscal_period SET inactive = true WHERE company_id = 1 AND fiscal_year_id = 2026 AND DATE '2026-09-20' BETWEEN from_date AND to_date`);
await rejects("INV-4: فترة موقوفة في op.1.1.2 تمنع الترحيل", () => postLive(db, mj(), ledger), /هذه الفترة موقفة/);
await db.query(`UPDATE erp.fiscal_period SET inactive = false, status = 'closed' WHERE company_id = 1 AND fiscal_year_id = 2026 AND DATE '2026-09-20' BETWEEN from_date AND to_date`);
await rejects("INV-4: فترة مغلقة تمنع الترحيل", () => postLive(db, mj(), ledger), /هذه الفترة مغلقة/);
await db.query(`UPDATE erp.fiscal_period SET status = 'open' WHERE company_id = 1 AND fiscal_year_id = 2026`);
await loadPeriods(db, liveStore);
await rejects("INV-4: تاريخ خارج الفترات يُرفض", () => postLive(db, mj({ docDate: "2031-01-01" }), ledger), /ليس ضمن الفترة الفعالة/);

/* ضمانات القاعدة نفسها — لو تجاوز أحد التطبيق */
const tryTx = async (sqls: [string, unknown[]][]) => {
  await db.exec("BEGIN");
  try {
    for (const [s, p] of sqls) await db.query(s, p);
    await db.exec("COMMIT");
    return "committed";
  } catch (e) {
    await db.exec("ROLLBACK");
    return (e as Error).message;
  }
};
const newEntry = `INSERT INTO erp.gl_entry (doc_kind, date, branch_id, status, doc_no, source_kind) VALUES ('manual_journal','2026-09-20',1,'posted','X','test') RETURNING id`;
const unbalanced = await tryTx([
  [newEntry, []],
  [`INSERT INTO erp.gl_entry_line (entry_id, line_no, account_code, debit, credit) VALUES ((SELECT max(id) FROM erp.gl_entry),1,'3101060001',5,0)`, []],
]);
ok("قاعدة INV-1: قيد غير متوازن لا يلتزم", /INV-1/.test(unbalanced), unbalanced);
const header = await tryTx([
  [newEntry, []],
  [`INSERT INTO erp.gl_entry_line (entry_id, line_no, account_code, debit, credit) VALUES ((SELECT max(id) FROM erp.gl_entry),1,'3101',5,0)`, []],
]);
ok("قاعدة INV-5: سطر على حساب رئيسي مرفوض", /INV-5/.test(header), header);
const upd = await tryTx([[`UPDATE erp.gl_entry_line SET debit = debit + 1 WHERE entry_id = $1`, [r1.glEntryId]]]);
ok("قاعدة INV-6: تعديل سطر مرحّل مرفوض", /INV-6/.test(upd), upd);
const del = await tryTx([[`DELETE FROM erp.gl_entry WHERE id = $1`, [r1.glEntryId]]]);
ok("قاعدة INV-6: حذف قيد مرحّل مرفوض", /INV-6/.test(del), del);
const dup = await tryTx([[`INSERT INTO erp.live_document (document_number, doc_kind, status, branch_id, fiscal_year_id) VALUES ($1,'manual_journal','posted',1,2026)`, [r1.documentNumber]]]);
ok("قاعدة INV-10: رقم مكرر في نفس النطاق مرفوض", /duplicate|unique/i.test(dup), dup);

const after = await scalar(`SELECT count(*)::int c FROM erp.gl_entry`);
ok("قيد واحد فقط أُضيف (الرفوض لم تكتب شيئاً)", Number(after.c) === Number(before.c) + 1, `${before.c} ⇒ ${after.c}`);

await db.close();
fs.rmSync(COPY, { recursive: true, force: true });
const failed = checks.filter((c) => !c.pass);
fs.mkdirSync(path.join(ROOT, "migration", "out"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "migration", "out", "accept-foundation.json"), JSON.stringify({ at: new Date().toISOString(), total: checks.length, failed: failed.length, checks }, null, 2));
process.stdout.write(`\n${checks.length} فحصاً · ${failed.length} إخفاق\n`);
process.exit(failed.length ? 1 : 0);
