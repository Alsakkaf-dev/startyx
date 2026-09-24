import fs from "node:fs";
import path from "node:path";
import { openDb, serverRoot } from "../src/infrastructure/db.ts";
import { applySchema } from "../src/infrastructure/postgres.ts";
import { LAYER3 } from "../src/application/masters-layer3.ts";
import { syncLayer2b } from "../src/application/masters-sync-layer2b.ts";
import { syncVendors } from "../src/application/masters-sync-vendors.ts";
import { syncEmployees } from "../src/application/masters-sync-employees.ts";
import { OPENING_AUDIT, OPENING_COLS, OPENING_STOCK_COLS, syncOpening, syncOpeningStock } from "../src/application/masters-sync-opening.ts";
import { s } from "../src/application/master-kit.ts";

/**
 * الطبقة ٣ (BUILD-ORDER 37) على كل سطر أونيكس — نفس عقد verify-layer2-records.ts:
 * ١) لا عمود من OPEN_BAL ضاع (40 = 32 + 8 تدقيق) وكل خانة = أونيكس.
 * ٢) المجاميع = GO §op.4.1.2.10 (بالنوع · بالشركة · GL-D4) = القيد نوع 0 في IAS_POST_DTL سطراً بسطر.
 * ٣) الكشوف (عميل/مورد/موظف) تقرأ الافتتاحي من الجدول الحيّ بنفس المجموع.
 * ٤) كل سطر أونيكس يمر على قواعد الشاشة كما هو.
 * يعمل داخل معاملة تُلغى. شغّله والخادم متوقف، وبعد `npm run load` إن تغيّر مستخرج.
 */
const EXTRACT = path.resolve(serverRoot(), "../../_onyx-extract/db");
function tsv(table: string): Record<string, string>[] {
  const lines = fs.readFileSync(path.join(EXTRACT, table, "rows.tsv"), "utf8").split(/\r?\n/).filter((l) => l.length);
  const h = lines[0]!.split("\t");
  return lines.slice(1).map((l) => {
    const c = l.split("\t");
    return Object.fromEntries(h.map((k, i) => [k, c[i] ?? ""]));
  });
}
let bad = 0;
const line = (ok: boolean, text: string): void => {
  if (!ok) bad++;
  process.stdout.write((ok ? "PASS " : "FAIL ") + text + "\n");
};
const money = (x: number): string => (Math.round(x * 100) / 100).toFixed(2);
/** رقم أونيكس كنص عشري دقيق (بلا عدد عائم — J_AMT فيه 17 رقماً معنوياً) بشكل trim_scale */
function decimalText(raw: string): string {
  if (raw === "") return "";
  let x = raw.startsWith(".") ? "0" + raw : raw.startsWith("-.") ? "-0" + raw.slice(1) : raw;
  if (x.includes(".")) x = x.replace(/0+$/, "").replace(/\.$/, "");
  return x === "-0" ? "0" : x;
}

const onyx = tsv("OPEN_BAL");
const header = fs.readFileSync(path.join(EXTRACT, "OPEN_BAL", "rows.tsv"), "utf8").split(/\r?\n/)[0]!.split("\t");
{
  const mapped = OPENING_COLS.map(([o]) => o);
  const all = [...mapped, ...OPENING_AUDIT];
  const missing = header.filter((c) => !all.includes(c));
  const extra = all.filter((c) => !header.includes(c));
  line(header.length === 40 && !missing.length && !extra.length && new Set(all).size === all.length,
    `OPEN_BAL ${header.length} عموداً = mapped ${mapped.length} + audit ${OPENING_AUDIT.length}` +
      (missing.length ? " · ناقص: " + missing.join(",") : "") + (extra.length ? " · زائد: " + extra.join(",") : ""));
}

const db = await openDb();
await applySchema(db);
await db.exec("BEGIN");
try {
  await syncLayer2b(db);
  await syncVendors(db);
  await syncEmployees(db);
  await syncOpening(db);

  /* ═══ ١ · كل خانة ═══ */
  {
    const sel = OPENING_COLS.map(([, e, k]) =>
      k === "num" ? `trim_scale(${e})::text ${e}` : k === "date" ? `to_char(${e},'YYYY-MM-DD') ${e}` : `${e}::text ${e}`).join(", ");
    const r = await db.query(`SELECT doc_sequence k__, ${sel}, created_by, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') created_at,
                                     legacy FROM erp.opening_balance_line`);
    const byKey = new Map(r.rows.map((x) => [s(x.k__), x]));
    let total = 0;
    let diff = 0;
    const samples: string[] = [];
    for (const o of onyx) {
      const row = byKey.get(o.DOC_SEQUENCE!);
      const cmp: [string, string, string][] = OPENING_COLS.map(([oc, e, k]) => {
        const raw = o[oc] ?? "";
        const want = k === "num" ? decimalText(raw) : k === "int" ? (raw === "" ? "" : String(Number(raw))) : k === "date" ? raw.slice(0, 10) : raw;
        return [oc, want, row ? s(row[e]) : "∅"];
      });
      cmp.push(["AD_U_ID", o.AD_U_ID ?? "", row ? s(row.created_by) : "∅"], ["AD_DATE", (o.AD_DATE ?? "").slice(0, 19), row ? s(row.created_at) : "∅"]);
      for (const [oc, want, got] of cmp) {
        total++;
        if (got !== want) {
          diff++;
          if (samples.length < 4) samples.push(o.DOC_SEQUENCE + "." + oc + " أونيكس=" + want + " محفوظ=" + got);
        }
      }
    }
    line(diff === 0 && byKey.size === onyx.length,
      `الأرصدة الافتتاحية: ${total - diff}/${total} خانة = أونيكس (${byKey.size}/${onyx.length} سطراً)` + (samples.length ? " · " + samples.join(" · ") : ""));
  }

  /* ═══ ٢ · المجاميع = GO = القيد نوع 0 ═══ */
  {
    const r = await db.query(`SELECT count(*) n, sum(debit)::text dr, sum(credit)::text cr, count(*) FILTER (WHERE debit - credit <> amount
                                OR debit < 0 OR credit < 0 OR (debit > 0 AND credit > 0)) broken FROM erp.opening_balance_line`);
    const x = r.rows[0]!;
    const post = tsv("IAS_POST_DTL").filter((p) => p.DOC_TYPE === "0");
    const pdr = post.reduce((a, p) => a + Number(p.DR_AMT || 0), 0);
    const pcr = post.reduce((a, p) => a + Number(p.CR_AMT || 0), 0);
    line(Number(x.broken) === 0, `مدين/دائن يطابقان المبلغ الموقَّع (J_AMT) في كل السطور — مخالف: ${x.broken}`);
    line(money(Number(x.dr)) === money(pdr) && money(Number(x.cr)) === money(pcr) && Number(x.n) === post.length,
      `القيد الافتتاحي = IAS_POST_DTL نوع 0: ${x.n}/${post.length} سطراً · مدين ${money(Number(x.dr))} (أونيكس ${money(pdr)}) · دائن ${money(Number(x.cr))} (أونيكس ${money(pcr)})`);
    const diffAll = money(Number(x.dr) - Number(x.cr));
    line(diffAll === "136647.87", `GL-D4: الفرق ${diffAll} = 136,647.87`);
    const byCmp = await db.query(`SELECT company_id, sum(amount)::text d FROM erp.opening_balance_line GROUP BY 1 ORDER BY 1`);
    const cmp = byCmp.rows.map((y) => y.company_id + ":" + money(Number(y.d))).join(" ");
    line(cmp === "1:-28139.59 2:164787.46", `GL-D6 بالشركة: ${cmp} (GO: 1:−28,139.59 · 2:+164,787.46)`);
    /* GO §١ «البيانات 2026» — جدول الأنواع (الصافي) */
    const want: Record<string, string> = { "0": "-1147911.16", "1": "49826.14", "2": "843770.34", "3": "1818124.72", "4": "-1439277.44", "7": "12115.26" };
    const byType = await db.query(`SELECT analytic_type t, count(*) n, sum(amount)::text d FROM erp.opening_balance_line GROUP BY 1 ORDER BY 1`);
    const got = byType.rows.map((y) => y.t + ":" + money(Number(y.d))).join(" ");
    line(got === Object.entries(want).map(([t, d]) => t + ":" + d).join(" "), `بالنوع: ${got}`);
    /* سطراً بسطر: (حساب · تحليلي · مركز · فرع) ⇒ مجموع أونيكس نوع 0 */
    const agg = new Map<string, number>();
    for (const p of post) {
      const k = [p.A_CODE, p.AC_CODE_DTL, p.CC_CODE, p.BRN_NO].join("|");
      agg.set(k, (agg.get(k) ?? 0) + Number(p.DR_AMT || 0) - Number(p.CR_AMT || 0));
    }
    const live = await db.query(`SELECT concat_ws('|', account_code, COALESCE(analytic_code,''), COALESCE(cost_center,''), branch_id) k,
                                        sum(amount)::text d FROM erp.opening_balance_line GROUP BY 1`);
    let off = 0;
    for (const y of live.rows) if (money(Number(y.d)) !== money(agg.get(s(y.k)) ?? 0)) off++;
    line(off === 0 && live.rows.length === agg.size, `مجموعات (حساب·تحليلي·مركز·فرع): ${live.rows.length - off}/${agg.size} = القيد نوع 0`);
  }

  /* ═══ ٣ · الكشوف تقرأ الجدول الحيّ ═══ */
  for (const [view, type, code] of [["customer_ledger", "3", "customer_code"], ["vendor_ledger", "4", "vendor_code"],
    ["employee_ledger", "7", "employee_code"]] as const) {
    const a = await db.query(`SELECT count(*) n, COALESCE(sum(debit - credit),0)::text d FROM erp.${view} WHERE doc_type = 0`);
    const b = await db.query(`SELECT count(*) n, COALESCE(sum(amount),0)::text d FROM erp.opening_balance_line WHERE analytic_type = '${type}'`);
    const src = await db.query(`SELECT count(*) n FROM erp.${view} WHERE doc_type = 0 AND source <> 'opening'`);
    line(Number(a.rows[0]!.n) === Number(b.rows[0]!.n) && money(Number(a.rows[0]!.d)) === money(Number(b.rows[0]!.d)) && Number(src.rows[0]!.n) === 0,
      `${view}: الافتتاحي ${a.rows[0]!.n} سطراً · ${money(Number(a.rows[0]!.d))} من الجدول الحيّ (${code})`);
  }

  /* ═══ 38 · op.5.1.2.15 — المخزون الافتتاحي: IAS_OPEN_STOCK 41 = 33 + 8 تدقيق ═══ */
  await syncOpeningStock(db);
  {
    const h = fs.readFileSync(path.join(EXTRACT, "IAS_OPEN_STOCK", "rows.tsv"), "utf8").split(/\r?\n/)[0]!.split("\t");
    const all = [...OPENING_STOCK_COLS.map(([o]) => o), ...OPENING_AUDIT];
    const missing = h.filter((c) => !all.includes(c));
    line(h.length === 41 && !missing.length && all.every((c) => h.includes(c)) && new Set(all).size === all.length,
      `IAS_OPEN_STOCK ${h.length} عموداً = mapped ${OPENING_STOCK_COLS.length} + audit ${OPENING_AUDIT.length}` + (missing.length ? " · ناقص: " + missing.join(",") : ""));
    const os = tsv("IAS_OPEN_STOCK");
    const sel = OPENING_STOCK_COLS.map(([, e, k]) =>
      k === "num" ? `trim_scale(${e})::text ${e}` : k === "date" ? `to_char(${e},'YYYY-MM-DD') ${e}`
        : k === "bool" ? `CASE WHEN ${e} THEN '1' ELSE '0' END ${e}` : `${e}::text ${e}`).join(", ");
    const r = await db.query(`SELECT doc_sequence k__, ${sel} FROM erp.opening_stock`);
    const byKey = new Map(r.rows.map((x) => [s(x.k__), x]));
    let total = 0;
    let diff = 0;
    const samples: string[] = [];
    for (const o of os) {
      const row = byKey.get(o.DOC_SEQUENCE!);
      for (const [oc, e, k] of OPENING_STOCK_COLS) {
        total++;
        const raw = o[oc] ?? "";
        /* «لا شيء» ⇒ NULL (GO §٣): الانتهاء 1900-01-01 · الدفعة 0 */
        const want = oc === "EXPIRE_DATE" && raw.startsWith("1900-01-01") ? "" : oc === "BATCH_NO" && raw === "0" ? ""
          : k === "num" ? decimalText(raw) : k === "int" ? (raw === "" ? "" : String(Number(raw)))
            : k === "bool" ? (raw === "1" ? "1" : "0") : k === "date" ? raw.slice(0, 10) : raw;
        const got = row ? s(row[e]) : "∅";
        if (got !== want) {
          diff++;
          if (samples.length < 4) samples.push(o.DOC_SEQUENCE + "." + oc + " أونيكس=" + want + " محفوظ=" + got);
        }
      }
    }
    line(diff === 0 && byKey.size === os.length,
      `المخزون الافتتاحي: ${total - diff}/${total} خانة = أونيكس (${byKey.size}/${os.length} سطراً)` + (samples.length ? " · " + samples.join(" · ") : ""));
    const none = os.filter((o) => !o.EXPIRE_DATE.startsWith("1900-01-01") || o.BATCH_NO !== "0").length;
    line(none === 0, `«لا شيء» في كل السطور (الانتهاء 1900-01-01 · الدفعة 0) ⇒ NULL — مخالف: ${none}`);
    /* GO §٢ — القيمة والمطابقة بالفرع (IV-R120 · IV-Q17) */
    const rec = await db.query(`SELECT branch_key, round(stock_value, 2)::text sv, round(gl_value, 2)::text gv, round(difference, 2)::text d
                                  FROM erp.opening_stock_recon ORDER BY branch_id NULLS LAST`);
    const got = rec.rows.map((x) => x.branch_key + ":" + money(Number(x.sv)) + "/" + money(Number(x.gv))).join(" ");
    /* GO §٢ جمع 1202010001 + 1202010012 فقط وعدّ بقية حسابات 120201 صفراً؛ فيها بواقٍ كسرية (009 · 010 · 011 · 013: ±0.09 للفرعين 1 و4)
       والمطابقة هنا على كل حسابات المخزن تحت 120201 ⇒ الأستاذ 1,754,416.58 والفرق 0.22 (GO: 0.23 بالتقريب) */
    line(got === "1:1268623.66/1282731.94 2:45349.03/44892.95 3:134456.53/134457.06 4:305987.58/292334.63 الإجمالي:1754416.80/1754416.58",
      `IV-R120 المطابقة بالفرع (مخزون/أستاذ): ${got}`);
    line(money(Number(rec.rows.at(-1)?.d)) === "0.22", `IV-Q17: الفرق الكلي ${money(Number(rec.rows.at(-1)?.d))} (GO 0.23 = نفس الفرق بلا البواقي الكسرية)`);
    const carried = await db.query(`SELECT count(*) FILTER (WHERE carried_forward AND source = 'carried_forward') c FROM erp.opening_stock`);
    line(Number(carried.rows[0]?.c) === os.length, `مرحّل من 2025: ${carried.rows[0]?.c}/${os.length} (MOV_PY_FLG = 1 ⇒ source = carried_forward)`);
  }

  /* ═══ ٤ · كل سطر يمر على قواعد شاشته ═══ */
  let total = 0;
  for (const [name, def] of Object.entries(LAYER3)) {
    if (name === "opening_balance_summary" || name === "opening_stock_recon") continue;
    const scope = Object.entries(def.scope ?? {}).map(([c, val]) => `${c} = ${typeof val === "number" ? val : "'" + val + "'"}`);
    const { rows } = await db.query(`${def.listSql}${scope.length ? " WHERE " + scope.join(" AND ") : ""}`);
    let fail = 0;
    const samples: string[] = [];
    for (const row of rows) {
      total++;
      try {
        for (const [fname, f] of Object.entries(def.fields)) {
          if (!f.required || f.inheritedWhen) continue;
          if (s(row[fname]) === "") throw new Error("ONYX-4048 حقل إجباري فارغ: " + fname);
        }
        const v = { ...row };
        await def.validate(db, "edit", v, row, "verify");
        /* القاعدة لا تغيّر مبلغ سطر أونيكس ولا كميته ولا تكلفته */
        if (name === "opening_stock") {
          if (Number(v.base_qty) !== Number(row.base_qty) || Number(v.unit_cost) !== Number(row.unit_cost)) throw new Error("غيّرت القاعدة الكمية أو التكلفة");
        } else if (Number(v.debit) - Number(v.credit) !== Number(row.debit) - Number(row.credit)) throw new Error("غيّرت القاعدة المبلغ");
      } catch (e) {
        fail++;
        if (samples.length < 3) samples.push(s(row.doc_sequence) + " ⇒ " + ((e as { code?: string }).code ?? "") + " " + (e as Error).message);
      }
    }
    line(fail === 0, `${name.padEnd(26)} ${String(rows.length - fail).padStart(5)}/${rows.length} سطر أونيكس يمر على قواعده` +
      (samples.length ? "\n       " + samples.join("\n       ") : ""));
  }
  process.stdout.write((bad ? "FAILURES " : "ALL PASS ") + total + " سطراً · " + bad + " إخفاق\n");
} finally {
  await db.exec("ROLLBACK");
  await db.close();
}
if (bad) process.exit(1);
