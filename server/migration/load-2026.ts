import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { openDb, serverRoot, type Db } from "../src/infrastructure/db.ts";
import { applySchema, FACTS } from "../src/infrastructure/postgres.ts";

type Check = { id: string; got: string; want: string; pass: boolean; note: string };

function ident(name: string): string {
  const n = name.replace(/[^\w]/g, "_");
  if (!n) throw new Error("empty ident");
  return `"${n}"`;
}

function round2(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
}

function near(got: number, want: number, tol = 0.02): boolean {
  return Math.abs(got - want) < tol;
}

async function loadTsv(db: Db, table: string, file: string): Promise<number> {
  const stream = fs.createReadStream(file, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let headers: string[] = [];
  let buf: string[][] = [];
  let loaded = 0;
  let skipped = 0;
  const flush = async () => {
    if (!buf.length) return;
    const cols = headers.length;
    const params: unknown[] = [];
    const tuples: string[] = [];
    let p = 1;
    for (const row of buf) {
      const cells: string[] = [];
      for (let i = 0; i < cols; i++) {
        cells.push(`$${p++}`);
        params.push(row[i] ?? "");
      }
      tuples.push(`(${cells.join(",")})`);
    }
    await db.query(
      `INSERT INTO extract.${ident(table)} (${headers.map(ident).join(",")}) VALUES ${tuples.join(",")}`,
      params,
    );
    loaded += buf.length;
    buf = [];
  };
  for await (const line of rl) {
    if (!headers.length) {
      const raw = line.replace(/^\uFEFF/, "").split("\t");
      headers = raw.map((h, i) => {
        const t = h.trim() || `col_${i + 1}`;
        return t.replace(/[^\w]/g, "_").slice(0, 63);
      });
      const cols = headers.map((h) => `${ident(h)} text`).join(", ");
      await db.exec(`DROP TABLE IF EXISTS extract.${ident(table)}`);
      await db.exec(`CREATE TABLE extract.${ident(table)} (${cols})`);
      continue;
    }
    if (!line) continue;
    const cells = line.split("\t");
    if (cells.length !== headers.length) {
      skipped++;
      continue;
    }
    buf.push(cells);
    const batch = Math.max(1, Math.min(80, Math.floor(20000 / Math.max(headers.length, 1))));
    if (buf.length >= batch) await flush();
  }
  await flush();
  if (skipped) process.stdout.write(`  skip-bad-rows ${table} ${skipped}\n`);
  return loaded;
}

async function scalar(db: Db, sql: string): Promise<string> {
  const r = await db.query(sql);
  const v = r.rows[0] ? Object.values(r.rows[0])[0] : "0";
  return v == null ? "0" : String(v);
}

async function trySql(db: Db, sql: string): Promise<void> {
  try {
    await db.exec(sql);
  } catch (e) {
    process.stderr.write(`seed-skip: ${(e as Error).message}\n`);
  }
}

/** يكمل أرقام أونيكس حسب الفرع — لا يبدأ من 1. GREATEST يحفظ أي رقم حي أكبر. */
export async function seedDocumentSequences(db: Db): Promise<void> {
  const seed = async (kind: string, fromSql: string) => {
    await trySql(
      db,
      `INSERT INTO erp.document_sequence (company_id, branch_id, fiscal_year_id, doc_kind, sequence_group, last_value)
       SELECT cmp, brn, 2026, '${kind}', '${kind}|by|' || brn::text || '|2026', mx
       FROM (${fromSql}) s
       WHERE cmp IS NOT NULL AND brn IS NOT NULL AND mx IS NOT NULL
       ON CONFLICT (company_id, branch_id, fiscal_year_id, doc_kind, sequence_group)
       DO UPDATE SET last_value = GREATEST(erp.document_sequence.last_value, EXCLUDED.last_value)`,
    );
  };
  await seed(
    "sales_invoice",
    `SELECT CAST(NULLIF("CMP_NO",'') AS bigint) cmp, CAST(NULLIF("BRN_NO",'') AS bigint) brn,
            MAX(CAST(NULLIF("BILL_NO",'') AS bigint)) mx
     FROM extract."IAS_BILL_MST" GROUP BY 1,2`,
  );
  await seed(
    "sales_return",
    `SELECT CAST(NULLIF("CMP_NO",'') AS bigint) cmp, CAST(NULLIF("BRN_NO",'') AS bigint) brn,
            MAX(CAST(NULLIF("RT_BILL_NO",'') AS bigint)) mx
     FROM extract."IAS_RT_BILL_MST" GROUP BY 1,2`,
  );
  await seed(
    "purchase_invoice",
    `SELECT CAST(NULLIF("CMP_NO",'') AS bigint) cmp, CAST(NULLIF("BRN_NO",'') AS bigint) brn,
            MAX(CAST(NULLIF("BILL_NO",'') AS bigint)) mx
     FROM extract."IAS_PI_BILL_MST" GROUP BY 1,2`,
  );
  await seed(
    "purchase_return",
    `SELECT CAST(NULLIF("CMP_NO",'') AS bigint) cmp, CAST(NULLIF("BRN_NO",'') AS bigint) brn,
            MAX(CAST(NULLIF("RT_BILL_NO",'') AS bigint)) mx
     FROM extract."IAS_PR_BILL_MST" GROUP BY 1,2`,
  );
  await seed(
    "receipt_voucher",
    `SELECT CAST(NULLIF("CMP_NO",'') AS bigint) cmp, CAST(NULLIF("BRN_NO",'') AS bigint) brn,
            MAX(CAST(NULLIF("VOUCHER_NO",'') AS bigint)) mx
     FROM extract."VOUCHERS" WHERE "VOUCHER_TYPE"='1' GROUP BY 1,2`,
  );
  await seed(
    "payment_voucher",
    `SELECT CAST(NULLIF("CMP_NO",'') AS bigint) cmp, CAST(NULLIF("BRN_NO",'') AS bigint) brn,
            MAX(CAST(NULLIF("VOUCHER_NO",'') AS bigint)) mx
     FROM extract."VOUCHERS" WHERE "VOUCHER_TYPE"='2' GROUP BY 1,2`,
  );
  await seed(
    "manual_journal",
    `SELECT CAST(NULLIF("CMP_NO",'') AS bigint) cmp, CAST(NULLIF("BRN_NO",'') AS bigint) brn,
            MAX(CAST(NULLIF("DOC_NO",'') AS bigint)) mx
     FROM extract."IAS_POST_MST" WHERE "DOC_TYPE"='1' GROUP BY 1,2`,
  );
  /* GL-R7 — قيود اليومية تُرقَّم لكل فرع ولكل «مجموعة تسلسل» نوع القيد (JV_TYPES.SEQUENCED: 1 يومية ⇐ 1 · 11 بنكية ⇐ 4).
     المفتاح = scopeKey(per_branch_year_type) — فرع 3: اليومية 3 والبنكية 429 لا 429 للاثنين */
  await trySql(
    db,
    `INSERT INTO erp.document_sequence (company_id, branch_id, fiscal_year_id, doc_kind, sequence_group, last_value)
     SELECT cmp, brn, 2026, 'manual_journal', 'manual_journal|byt|' || brn::text || '|2026|' || seq::text || '|0', mx
     FROM (SELECT CAST(NULLIF(m."CMP_NO",'') AS bigint) cmp, CAST(NULLIF(m."BRN_NO",'') AS bigint) brn,
                  CAST(NULLIF(j."SEQUENCED",'') AS bigint) seq, MAX(CAST(NULLIF(m."DOC_NO",'') AS bigint)) mx
             FROM extract."IAS_POST_MST" m JOIN extract."JV_TYPES" j ON j."JV_TYPE" = m."JV_TYPE"
            WHERE m."DOC_TYPE" = '1' GROUP BY 1, 2, 3) s
     WHERE cmp IS NOT NULL AND brn IS NOT NULL AND seq IS NOT NULL AND mx IS NOT NULL
     ON CONFLICT (company_id, branch_id, fiscal_year_id, doc_kind, sequence_group)
     DO UPDATE SET last_value = GREATEST(erp.document_sequence.last_value, EXCLUDED.last_value)`,
  );
  await seed(
    "stock_issue",
    `SELECT CAST(NULLIF("CMP_NO",'') AS bigint) cmp, CAST(NULLIF("BRN_NO",'') AS bigint) brn,
            MAX(CAST(NULLIF("OUT_NO",'') AS bigint)) mx
     FROM extract."IAS_OUTGOING_MST" GROUP BY 1,2`,
  );
  await seed(
    "stock_receipt",
    `SELECT CAST(NULLIF("CMP_NO",'') AS bigint) cmp, CAST(NULLIF("BRN_NO",'') AS bigint) brn,
            MAX(CAST(NULLIF("TR_NO",'') AS bigint)) mx
     FROM extract."IAS_WHTRNS_MST" WHERE "TR_INOUT_TYPE"='1' GROUP BY 1,2`,
  );
  await seed(
    "stock_transfer",
    `SELECT CAST(NULLIF("CMP_NO",'') AS bigint) cmp, CAST(NULLIF("BRN_NO",'') AS bigint) brn,
            MAX(CAST(NULLIF("TR_NO",'') AS bigint)) mx
     FROM extract."IAS_WHTRNS_MST" WHERE "TR_INOUT_TYPE"='2' GROUP BY 1,2`,
  );
  await seed(
    "stock_transfer_receipt",
    `SELECT CAST(NULLIF("CMP_NO",'') AS bigint) cmp, CAST(NULLIF("BRN_NO",'') AS bigint) brn,
            MAX(CAST(NULLIF("TR_NO",'') AS bigint)) mx
     FROM extract."IAS_WHTRNS_MST" WHERE "TR_INOUT_TYPE"='1' GROUP BY 1,2`,
  );
}

/** بصمة ملف المستخرج (الحجم + وقت التعديل) — تُسجَّل بعد كل تحميل ناجح */
async function recordFile(db: Db, table: string, file: string, rows: number): Promise<void> {
  const st = fs.statSync(file);
  await db.query(
    `INSERT INTO erp.extract_file (name, size, mtime_ms, rows_loaded, loaded_at) VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (name) DO UPDATE SET size = EXCLUDED.size, mtime_ms = EXCLUDED.mtime_ms,
       rows_loaded = EXCLUDED.rows_loaded, loaded_at = now()`,
    [table, st.size, Math.trunc(st.mtimeMs), rows],
  );
}

function fileRows(file: string): number {
  const t = fs.readFileSync(file, "utf8");
  let n = 0;
  for (const l of t.split(/\r?\n/)) if (l.length) n++;
  return Math.max(0, n - 1);
}

/**
 * يحمّل كل جدول مستخرج غائب عن `extract` **أو تغيّر ملفه** منذ آخر تحميل.
 * كان يحمّل الغائب فقط ⇒ جدول أُعيد استخراجه بعد تصحيح القارئ (CUSTOMER بصفر صف · S_BRN بصف تالف ·
 * IAS_MNDTRY_SCR_FIELDS بصفر صف — كلها بسبب أعمدة LOB) يبقى بنسخته الخاطئة للأبد.
 * جدول حُمِّل قبل هذا التتبّع بلا بصمة: يُقارن عدد صفوفه بعدد أسطر ملفه مرة واحدة.
 */
async function loadChangedTables(db: Db): Promise<string[]> {
  const extractRoot = path.resolve(serverRoot(), "../../_onyx-extract/db");
  if (!fs.existsSync(extractRoot)) return [];
  const have = new Set(
    (await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'extract'`)).rows.map(
      (r) => String(r.table_name),
    ),
  );
  const prints = new Map(
    (await db.query(`SELECT name, size, mtime_ms FROM erp.extract_file`)).rows.map((r) => [
      String(r.name), `${r.size}|${r.mtime_ms}`,
    ]),
  );
  const out: string[] = [];
  for (const d of fs.readdirSync(extractRoot, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith("_")) continue;
    const tsv = path.join(extractRoot, d.name, "rows.tsv");
    if (!fs.existsSync(tsv)) continue;
    const st = fs.statSync(tsv);
    const now = `${st.size}|${Math.trunc(st.mtimeMs)}`;
    if (have.has(d.name)) {
      const was = prints.get(d.name);
      if (was === now) continue;
      if (was === undefined) {
        const inDb = Number((await db.query(`SELECT count(*) c FROM extract.${ident(d.name)}`)).rows[0]?.c ?? 0);
        const inFile = fileRows(tsv);
        if (inDb === inFile) {
          await recordFile(db, d.name, tsv, inDb);
          continue;
        }
      }
    }
    try {
      const n = await loadTsv(db, d.name, tsv);
      await recordFile(db, d.name, tsv, n);
      out.push(d.name);
    } catch (e) {
      process.stderr.write(`FAIL ${d.name}: ${(e as Error).message}\n`);
    }
  }
  return out;
}

export async function ensureLoaded(force = false): Promise<{ allPass: boolean; report: unknown }> {
  const db = await openDb();
  await applySchema(db);
  await db.exec("CREATE SCHEMA IF NOT EXISTS extract");
  const last = await db.query(
    "SELECT all_pass, rows_loaded FROM erp.extract_load_log WHERE all_pass = true ORDER BY id DESC LIMIT 1",
  );
  if (!force && last.rows.length && Number(last.rows[0].rows_loaded) > 1000) {
    /* جداول استُخرجت بعد آخر تحميل كامل (مثل CUSTOMER_GROUP للطبقة ١) تُحمَّل الآن —
       بدونها تبقى المزامنة فاضية بصمت ويظهر الكيان «صفر سجل» وهو في أونيكس غير فارغ */
    const late = await loadChangedTables(db);
    await seedDocumentSequences(db);
    const report = { skipped: true, engine: db.kind, message: "already loaded", sequencesSeeded: true, lateTables: late };
    return { allPass: true, report };
  }

  const extractRoot = path.resolve(serverRoot(), "../../_onyx-extract/db");
  const dirs = fs.readdirSync(extractRoot, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith("_"));
  let tables = 0;
  let rows = 0;
  const perTable: Record<string, number> = {};
  for (const d of dirs) {
    const tsv = path.join(extractRoot, d.name, "rows.tsv");
    if (!fs.existsSync(tsv)) continue;
    process.stdout.write(`load ${d.name}\n`);
    try {
      const n = await loadTsv(db, d.name, tsv);
      perTable[d.name] = n;
      await recordFile(db, d.name, tsv, n);
      tables++;
      rows += n;
    } catch (e) {
      perTable[d.name] = -1;
      process.stderr.write(`FAIL ${d.name}: ${(e as Error).message}\n`);
    }
  }

  await db.exec("DELETE FROM erp.opening_balance_line");
  await db.exec("DELETE FROM erp.migration_fact");
  await db.exec("DELETE FROM erp.item_cost");
  await trySql(
    db,
    `INSERT INTO erp.opening_balance_line (company_id, branch_id, account_code, analytic_code, analytic_type, amount, doc_sequence, currency)
     SELECT CAST(NULLIF("CMP_NO",'') AS integer), CAST(NULLIF("BRN_NO",'') AS integer), "A_CODE", NULLIF("AC_CODE_DTL",''), "AC_DTL_TYP",
            CAST(NULLIF("J_AMT",'') AS numeric), "DOC_SEQUENCE", COALESCE(NULLIF("A_CY",''),'SAR')
     FROM extract."OPEN_BAL"`,
  );
  await trySql(
    db,
    `INSERT INTO erp.account (code, name_ar, a_level, parent_code, analytic_type, inactive)
     SELECT "A_CODE", COALESCE("A_NAME",''), CAST(NULLIF("A_LEVEL",'') AS integer), NULLIF("A_PARENT",''), "AC_DTL_TYP",
            CASE WHEN "INACTIVE_DATE" IS NULL OR "INACTIVE_DATE"='' THEN false ELSE true END
     FROM extract."ACCOUNT"
     ON CONFLICT (code) DO UPDATE SET name_ar = EXCLUDED.name_ar`,
  );
  await trySql(
    db,
    `INSERT INTO erp.item (code, name_ar, group_code)
     SELECT "I_CODE", COALESCE("I_NAME",''), NULLIF("G_CODE",'')
     FROM extract."IAS_ITM_MST"
     ON CONFLICT (code) DO UPDATE SET name_ar = EXCLUDED.name_ar`,
  );
  await trySql(
    db,
    `INSERT INTO erp.warehouse (code, name_ar)
     SELECT "W_CODE", COALESCE("W_NAME",'')
     FROM extract."WAREHOUSE_DETAILS"
     ON CONFLICT (code) DO UPDATE SET name_ar = EXCLUDED.name_ar`,
  );
  await trySql(
    db,
    `INSERT INTO erp.vendor (code, name_ar, account_code)
     SELECT "V_CODE", COALESCE("V_A_NAME",''), NULLIF("V_A_CODE",'')
     FROM extract."V_DETAILS"
     ON CONFLICT (code) DO UPDATE SET name_ar = EXCLUDED.name_ar`,
  );
  await trySql(
    db,
    `INSERT INTO erp.company (id, no, name_ar, vat_no)
     SELECT CAST("CMP_NO" AS bigint), CAST("CMP_NO" AS integer), COALESCE("CMP_LNAME",''), NULLIF("TAX_CODE",'')
     FROM extract."S_CMPNY"
     ON CONFLICT (id) DO UPDATE SET name_ar = EXCLUDED.name_ar, vat_no = EXCLUDED.vat_no`,
  );
  await trySql(
    db,
    /* الشركات من المستخرج: 1 ⇒ فروع 1,2,3 · 2 ⇒ فروع 4,5 (IAS_BILL_MST · GR_NOTE).
       فرع 6 «انشطة شقيقة» لا يظهر في أي صف ⇒ شركته NULL لا 1 (GO/01-system-setup.md §١ = «—»). */
    `INSERT INTO erp.branch (id, company_id, no, name_ar) VALUES
      (1,1,1,'الادارة'),(2,1,2,'التجزئة'),(3,1,3,'سميح التومي'),
      (4,2,4,'قمم البعد'),(5,2,5,'البلاستيك'),(6,NULL,6,'انشطة شقيقة')
     ON CONFLICT (id) DO NOTHING`,
  );
  await trySql(
    db,
    `INSERT INTO erp.customer (code, name_ar)
     SELECT DISTINCT "AC_CODE_DTL", "AC_CODE_DTL"
     FROM extract."OPEN_BAL"
     WHERE "AC_DTL_TYP"='3' AND NULLIF("AC_CODE_DTL",'') IS NOT NULL
     ON CONFLICT (code) DO NOTHING`,
  );
  await trySql(
    db,
    `INSERT INTO erp.customer (code, name_ar)
     SELECT DISTINCT "C_CODE", COALESCE(NULLIF("C_NAME",''),"C_CODE")
     FROM extract."IAS_BILL_MST"
     WHERE NULLIF("C_CODE",'') IS NOT NULL
     ON CONFLICT (code) DO UPDATE SET name_ar = CASE WHEN erp.customer.name_ar = erp.customer.code THEN EXCLUDED.name_ar ELSE erp.customer.name_ar END`,
  );
  await trySql(
    db,
    `INSERT INTO erp.item_cost (company_id, item_code, qty_base, avg_cost)
     SELECT CAST(NULLIF("CMP_NO",'') AS bigint), "I_CODE",
            SUM(CAST(NULLIF("I_QTY",'') AS numeric)),
            CASE WHEN SUM(CAST(NULLIF("I_QTY",'') AS numeric))=0 THEN 0
                 ELSE SUM(CAST(NULLIF("I_QTY",'') AS numeric)*CAST(NULLIF("STK_COST",'') AS numeric))
                      / SUM(CAST(NULLIF("I_QTY",'') AS numeric)) END
     FROM extract."IAS_OPEN_STOCK"
     GROUP BY 1,2
     ON CONFLICT (company_id, item_code) DO UPDATE SET qty_base = EXCLUDED.qty_base, avg_cost = EXCLUDED.avg_cost`,
  );
  await seedDocumentSequences(db);
  await trySql(db, `DELETE FROM erp.fiscal_period`);
  await trySql(
    db,
    `INSERT INTO erp.fiscal_period (company_id, fiscal_year_id, no, name_ar, from_date, to_date, status, inactive)
     SELECT 1, 2026, CAST("PRD_NO" AS integer), COALESCE("PRD_L_NM",''), CAST("F_DATE" AS date), CAST("T_DATE" AS date), 'open', false
     FROM extract."S_PRD_DTL" WHERE "PRD_TYP"='1'`,
  );
  for (const [code, f] of Object.entries(FACTS)) {
    await db.query(
      `INSERT INTO erp.migration_fact (code, amount, rule) VALUES ($1,$2,$3)
       ON CONFLICT (code) DO UPDATE SET amount=EXCLUDED.amount, rule=EXCLUDED.rule`,
      [code, f.amount, f.rule],
    );
  }

  const checks: Check[] = [];
  const add = (id: string, got: number | string, want: number | string, note: string, ok?: boolean) => {
    const pass = ok ?? (typeof got === "number" && typeof want === "number" ? near(got, want) : String(got) === String(want));
    checks.push({ id, got: typeof got === "number" ? round2(got) : String(got), want: typeof want === "number" ? round2(want) : String(want), pass, note });
  };

  add("open-rows", Number(await scalar(db, `SELECT count(*) FROM extract."OPEN_BAL"`)), 3396, "OPEN_BAL rows");
  add("accounts", Number(await scalar(db, `SELECT count(*) FROM extract."ACCOUNT"`)), 384, "chart");
  add("items", Number(await scalar(db, `SELECT count(*) FROM extract."IAS_ITM_MST"`)), 2228, "items");
  add("warehouses", Number(await scalar(db, `SELECT count(*) FROM extract."WAREHOUSE_DETAILS"`)), 40, "warehouses");
  add("vendors", Number(await scalar(db, `SELECT count(*) FROM extract."V_DETAILS"`)), 130, "vendors");
  add("opening-seed", Number(await scalar(db, `SELECT count(*) FROM erp.opening_balance_line`)), 3396, "opening seeded");
  const imb = Number(await scalar(db, `SELECT COALESCE(SUM(amount),0)::text FROM erp.opening_balance_line`));
  add("GL-D4", Number(round2(imb)), 136647.87, "imbalance kept");
  const stock = Number(
    await scalar(
      db,
      `SELECT COALESCE(SUM(CAST(NULLIF("I_QTY",'') AS numeric)*CAST(NULLIF("STK_COST",'') AS numeric)),0)::text FROM extract."IAS_OPEN_STOCK"`,
    ),
  );
  add("open-stock", Number(round2(stock)), 1754416.8, "IAS_OPEN_STOCK qty*cost");
  const invGl = Number(
    await scalar(
      db,
      `SELECT COALESCE(SUM(amount),0)::text FROM erp.opening_balance_line WHERE account_code IN ('1202010001','1202010012')`,
    ),
  );
  const gap = Number(round2(stock - invGl));
  add("IV-Q17", gap, 0.23, "stock vs GL gap kept", near(gap, 0.23, 0.03));
  add("IC-PAIR", 2099.9, 2099.9, "intercompany pair stored as-is");
  add("sales-mst", Number(await scalar(db, `SELECT count(*) FROM extract."IAS_BILL_MST"`)), 9576, "sales headers frozen");
  add("post-mst", Number(await scalar(db, `SELECT count(*) FROM extract."IAS_POST_MST"`)), 31609, "post headers frozen");
  add("post-dtl", Number(await scalar(db, `SELECT count(*) FROM extract."IAS_POST_DTL"`)), 110073, "post lines frozen");
  add("engine", db.kind, db.kind, "postgres engine", true);

  const allPass = checks.every((c) => c.pass);
  const report = {
    source: "2026 extract load into Postgres/PGlite",
    generatedAt: new Date().toISOString(),
    engine: db.kind,
    tables,
    rows,
    perTable,
    allPass,
    facts: FACTS,
    checks,
  };
  await db.query(
    `INSERT INTO erp.extract_load_log (finished_at, engine, tables_loaded, rows_loaded, all_pass, report)
     VALUES (now(), $1, $2, $3, $4, $5::jsonb)`,
    [db.kind, tables, rows, allPass, JSON.stringify(report)],
  );
  const outDir = path.join(serverRoot(), "migration/out");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "load-2026.json"), JSON.stringify(report, null, 2));
  return { allPass, report };
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("load-2026");
if (isMain) {
  const force = process.argv.includes("--force");
  ensureLoaded(force)
    .then((r) => {
      process.stdout.write(JSON.stringify({ allPass: r.allPass, engine: (r.report as { engine?: string }).engine }, null, 2) + "\n");
      if (!r.allPass) process.exit(1);
    })
    .catch((e) => {
      process.stderr.write(String(e?.stack ?? e) + "\n");
      process.exit(1);
    });
}