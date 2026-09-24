import fs from "node:fs";
import path from "node:path";
import { serverRoot } from "../src/infrastructure/db.ts";
import { ONYX_MSG } from "../src/application/master-kit.ts";

/**
 * قبول الطبقة ٤ على الخادم الحي — البند 39 قيود اليومية op.4.1.3.14 [GO/04 §op.4.1.3.14]:
 * ١) الأعداد والمجاميع = أونيكس (IAS_POST_MST/DTL نوع 1، تُعدّ من الملفات) · كل قيد متوازن.
 * ٢) الترقيم لكل فرع ومجموعة تسلسل نوع القيد (GL-R7) يكمل من آخر رقم أونيكس.
 * ٣) كل قاعدة ترجع رسالة أونيكس برقمها · الحفظ يُقرأ كما أُدخل (الرأس والسطور وبياناتها).
 * PHASE=reload: بعد إعادة تشغيل الخادم على نفس النسخة — القيد والرقم باقيان.
 * شغّله على نسخة من القاعدة (PGLITE_DIR) لا على دفتر الشركة.
 */
const BASE = process.env.STARTYX_API ?? "http://127.0.0.1:8787";
const EXTRACT = path.resolve(serverRoot(), "../../_onyx-extract/db");
const PHASE = process.env.PHASE ?? "main";
const STAMP = path.join(serverRoot(), "migration/out/accept-layer4-posted.json");

type Check = { id: string; screen: string; pass: boolean; got: string; want: string };
const checks: Check[] = [];
const add = (id: string, screen: string, got: string, want: string): void => {
  checks.push({ id, screen, pass: got === want, got, want });
};
type J = Record<string, unknown>;
async function call(p: string, body?: unknown): Promise<{ status: number; json: J }> {
  const r = body
    ? await fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    : await fetch(BASE + p);
  const t = await r.text();
  return { status: r.status, json: (t ? JSON.parse(t) : {}) as J };
}
function tsv(table: string): Record<string, string>[] {
  const lines = fs.readFileSync(path.join(EXTRACT, table, "rows.tsv"), "utf8").split(/\r?\n/).filter((l) => l.length);
  const h = lines[0]!.split("\t");
  return lines.slice(1).map((l) => {
    const c = l.split("\t");
    return Object.fromEntries(h.map((k, i) => [k, c[i] ?? ""]));
  });
}
const msg = (no: keyof typeof ONYX_MSG, arg = ""): string => "ONYX-" + no + " · " + ONYX_MSG[no].replace("@1", arg);
const err = (j: J): string => String(j.error ?? "") + " · " + String(j.message ?? "");
const money = (x: unknown): string => (Math.round(Number(x) * 100) / 100).toFixed(2);
const J39 = "op.4.1.3.14";
const docs = async (q = ""): Promise<J[]> => (await call(`/api/docs/${J39}?limit=5000${q}`)).json.rows as J[];
const next = async (b: number, t: number): Promise<number> => Number((await call(`/api/docs/${J39}/next?branch=${b}&jvType=${t}`)).json.next);
const post = async (body: J): Promise<J> => (await call("/api/documents/post", { docKind: "manual_journal", screenRef: J39, docDate: "2026-09-20", user: "7", ...body })).json;

async function main(): Promise<void> {
  const mst = tsv("IAS_POST_MST").filter((m) => m.DOC_TYPE === "1");
  const dtl = tsv("IAS_POST_DTL").filter((d) => d.DOC_TYPE === "1");
  const maxNo = (b: string, t: string): number => Math.max(0, ...mst.filter((m) => m.BRN_NO === b && m.JV_TYPE === t).map((m) => Number(m.DOC_NO)));

  if (PHASE === "reload") {
    /* بعد إعادة التشغيل: ما حُفظ باقٍ ويُقرأ كما هو، والتسلسل لا يعيد رقماً */
    const stamp = JSON.parse(fs.readFileSync(STAMP, "utf8")) as { key: string; no: number };
    const d = (await call(`/api/docs/${J39}/${encodeURIComponent(stamp.key)}`)).json;
    const h = (d.header ?? {}) as J;
    add("reload-doc", J39, [h.doc_no, h.description, (d.lines as J[] | undefined)?.length].join("|"), [stamp.no, "قيد قبول آلي", 2].join("|"));
    add("reload-sequence", J39, String(await next(1, 1)), String(stamp.no + 1));
  } else {
    /* ═══ ١ · أونيكس ═══ */
    const s = (await call(`/api/docs/${J39}/summary`)).json;
    add("count-docs", J39, [s.docs, s.lines, s.jv1, s.jv11, s.posted_onyx].join("|"),
      [mst.length, dtl.length, mst.filter((m) => m.JV_TYPE === "1").length, mst.filter((m) => m.JV_TYPE === "11").length,
        mst.filter((m) => m.DOC_POST === "1").length].join("|"));
    const all = await docs();
    add("list-total", J39, String(all.length), String(mst.length));
    add("all-balanced", J39, String(all.filter((r) => money(r.debit) !== money(r.credit)).length), "0");
    const byBr: Record<string, number> = {};
    for (const r of all) byBr[String(r.branch_no)] = (byBr[String(r.branch_no)] ?? 0) + 1;
    add("by-branch", J39, JSON.stringify(byBr), JSON.stringify(Object.fromEntries(["1", "2", "3", "4", "5"].map((b) => [b, mst.filter((m) => m.BRN_NO === b).length]))));
    /* قيد بعينه: سطوره ومجاميعه = ملف أونيكس */
    const pick = mst.find((m) => m.BRN_NO === "3" && m.JV_TYPE === "11")!;
    const pl = dtl.filter((x) => x.DOC_SER === pick.DOC_SER);
    const one = (await call(`/api/docs/${J39}/${encodeURIComponent("onyx:" + pick.DOC_SER)}`)).json;
    const lines = (one.lines ?? []) as J[];
    add("onyx-doc-lines", J39, [lines.length, money(lines.reduce((a, l) => a + Number(l.debit), 0)), lines.map((l) => l.account_code).join(",")].join("|"),
      [pl.length, money(pl.reduce((a, l) => a + Number(l.DR_AMT || 0), 0)),
        pl.sort((a, b) => Number(a.RCRD_NO) - Number(b.RCRD_NO)).map((l) => l.A_CODE).join(",")].join("|"));
    add("onyx-doc-analytic-name", J39, String(lines.every((l) => l.analytic_type === "0" || !!l.analytic_name)), "true");

    /* ═══ ٢ · الترقيم GL-R7 ═══ */
    for (const [b, t] of [[1, 1], [1, 11], [3, 1], [3, 11]] as const) {
      add(`next-br${b}-jv${t}`, J39, String(await next(b, t)), String(maxNo(String(b), String(t)) + 1));
    }

    /* ═══ ٣ · القواعد ═══ */
    const cust = { accountCode: "1203010001", analyticId: "15", side: "debit", amount: "100", costCenter: "1202" };
    const cash = { accountCode: "1201010001", analyticId: "900", side: "credit", amount: "100" };
    add("jv-type-required", J39, err(await post({ branchId: 1, description: "x", lines: [cust, cash] })), msg(4048) + " — نوع القيد");
    add("jv-type-unknown", J39, err(await post({ branchId: 1, jvType: 99, description: "x", lines: [cust, cash] })), msg(5093) + " — نوع القيد 99 (op.4.1.1.6)");
    add("desc-required", J39, err(await post({ branchId: 1, jvType: 1, lines: [cust, cash] })), msg(4048) + " — البيان");
    add("GL-R37-unknown-customer", J39, err(await post({ branchId: 1, jvType: 1, description: "x", lines: [{ ...cust, analyticId: "88888888" }, cash] })),
      msg(5093) + " — العميل 88888888 (op.7.1.2.8)");
    add("GL-R37-analytic-missing", J39, String(err(await post({ branchId: 1, jvType: 1, description: "x", lines: [{ ...cust, analyticId: null }, cash] })).startsWith("ANALYTIC_REQUIRED · " + ONYX_MSG[4559])), "true");
    add("AP-R28-vendor-card", J39, err(await post({ branchId: 1, jvType: 1, description: "x",
      lines: [{ accountCode: "2202020001", analyticId: "30011", side: "debit", amount: "5" }, { accountCode: "2101030001", side: "credit", amount: "5" }] })),
    msg(5114) + " — 2202020001 ≠ حساب المورد 30011 (2202020002)");
    add("general-with-analytic", J39, err(await post({ branchId: 1, jvType: 1, description: "x",
      lines: [{ accountCode: "2101030001", analyticId: "15", side: "debit", amount: "5" }, { accountCode: "2101030001", side: "credit", amount: "5" }] })), msg(5114));
    add("GL-R37-cash-branch", J39, err(await post({ branchId: 3, jvType: 1, description: "x", lines: [cust, cash] })), msg(4902));
    add("INV-5-header-account", J39, String(err(await post({ branchId: 1, jvType: 1, description: "x",
      lines: [{ accountCode: "2101", side: "debit", amount: "5" }, { accountCode: "2101030001", side: "credit", amount: "5" }] })).startsWith("ONYX-497")), "true");
    add("SY-R39-cc", J39, String(err(await post({ branchId: 1, jvType: 1, description: "x",
      lines: [{ accountCode: "3101060001", side: "debit", amount: "5" }, { accountCode: "2101030001", side: "credit", amount: "5" }] })).startsWith("ONYX-4048")), "true");
    const after0 = await next(1, 1);
    add("rejects-consume-no-number", J39, String(after0), String(maxNo("1", "1") + 1));

    /* ═══ ٤ · حفظ وقراءة ═══ */
    const ok = await post({ branchId: 1, jvType: 1, description: "قيد قبول آلي", refNo: "ACC-39",
      lines: [{ ...cust, description: "سطر العميل" }, cash] });
    add("post", J39, [ok.status, ok.documentNumber].join("|"), "posted|" + (maxNo("1", "1") + 1));
    const key = "live:" + String(ok.liveDocumentId);
    const back = (await call(`/api/docs/${J39}/${encodeURIComponent(key)}`)).json;
    const bh = (back.header ?? {}) as J;
    const bl = (back.lines ?? []) as J[];
    add("read-header", J39, [bh.doc_no, bh.jv_type, bh.branch_no, bh.ref_no, bh.description, bh.status, money(bh.debit)].join("|"),
      [ok.documentNumber, 1, 1, "ACC-39", "قيد قبول آلي", "posted", "100.00"].join("|"));
    add("read-lines", J39, bl.map((l) => [l.account_code, l.analytic_type, l.analytic_code, l.analytic_name, l.description, money(l.debit), money(l.credit)].join("/")).join(" ; "),
      "1203010001/3/15/" + String((await call("/api/masters/customer/15")).json.name_ar) + "/سطر العميل/100.00/0.00 ; 1201010001/1/900/" +
      String((await call("/api/masters/cashbox/900")).json.name_ar) + "/قيد قبول آلي/0.00/100.00");
    add("listed", J39, String((await docs("&q=" + encodeURIComponent("قيد قبول آلي"))).map((r) => r.doc_key).join(",")), key);
    add("seq-after-post", J39, [await next(1, 1), await next(1, 11)].join("|"), [maxNo("1", "1") + 2, maxNo("1", "11") + 1].join("|"));
    /* J_STAND_BY ☑ — غير المتوازن يُحفظ معلّقاً بلا قيد في الدفتر */
    const pend = await post({ branchId: 3, jvType: 11, description: "قيد معلّق آلي",
      lines: [{ accountCode: "2101030001", side: "debit", amount: "10" }, { accountCode: "2101030001", side: "credit", amount: "7" }] });
    add("J_STAND_BY-pending", J39, [pend.status, pend.documentNumber].join("|"), "pending|" + (maxNo("3", "11") + 1));
    const pdoc = (await call(`/api/docs/${J39}/${encodeURIComponent("live:" + String(pend.liveDocumentId))}`)).json;
    add("pending-no-ledger-lines", J39, [((pdoc.header ?? {}) as J).status, (pdoc.lines as J[] | undefined)?.length].join("|"), "pending|0");
    /* «إضافة من»: نسخة القيد برقم جديد (الواجهة تنسخ السطور — الخادم يعطي رقماً جديداً لا يعيد القديم) */
    const copy = await post({ branchId: 1, jvType: 1, description: "قيد قبول آلي — نسخة", lines: [cust, cash] });
    add("add-from-new-number", J39, String(copy.documentNumber), String(Number(ok.documentNumber) + 1));
    fs.mkdirSync(path.dirname(STAMP), { recursive: true });
    fs.writeFileSync(STAMP, JSON.stringify({ key, no: Number(copy.documentNumber) }));
    /* reload يتحقق من آخر رقم محفوظ: النسخة ⇒ التالي بعدها */
    fs.writeFileSync(STAMP, JSON.stringify({ key, no: Number(ok.documentNumber), last: Number(copy.documentNumber) }));
  }

  const allPass = checks.every((c) => c.pass);
  for (const c of checks) {
    process.stdout.write((c.pass ? "PASS " : "FAIL ") + c.screen.padEnd(12) + c.id.padEnd(30) + " got=" + c.got + (c.pass ? "" : "  want=" + c.want) + "\n");
  }
  process.stdout.write((allPass ? "ALL PASS" : "FAILURES") + " " + checks.filter((c) => c.pass).length + "/" + checks.length + "\n");
  if (!allPass) process.exit(1);
}

main().catch((e) => {
  process.stderr.write(String((e as Error)?.stack ?? e) + "\n");
  process.exit(1);
});
