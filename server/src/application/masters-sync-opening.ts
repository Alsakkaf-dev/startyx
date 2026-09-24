import type { Db } from "../infrastructure/db.ts";
import { castSql, featuresSql, type ColSpec } from "./masters-sync-layer2b.ts";

/**
 * 37 · op.4.1.2.10 — الأرصدة الافتتاحية · OPEN_BAL (40 عموداً · 3,396) [GO/04-general-ledger.md §op.4.1.2.10]
 * `erp.opening_balance_line` يعبّئه load-2026.ts بالحساب والتحليلي والمبلغ والفرع؛ يُكمَّل هنا بقية أعمدة أونيكس مرة
 * واحدة (السطر الذي لم يُكمَّل: `created_at IS NULL AND update_count = 0`) بالمطابقة على DOC_SEQUENCE — لا يُداس تعديل مستخدم.
 * بعد هذا البند الجدول الحيّ هو مصدر القيد الافتتاحي (نوع 0) في كل كشف — لا نسخة `IAS_POST_DTL` المستخرجة.
 */

async function has(db: Db, table: string): Promise<boolean> {
  const r = await db.query(
    `SELECT count(*) c FROM information_schema.tables WHERE table_schema = 'extract' AND table_name = $1`,
    [table],
  );
  return Number(r.rows[0]?.c ?? 0) > 0;
}

/** كل أعمدة OPEN_BAL غير التدقيق — ما لا حقل له في الشاشة يُحفظ عموداً كما هو (DIR_CODE1..5 · VERIFY · OB_PY …) */
export const OPENING_COLS: ColSpec[] = [
  ["DOC_SEQUENCE", "doc_sequence", "text"], ["A_CODE", "account_code", "text"], ["AC_CODE_DTL", "analytic_code", "text"],
  ["AC_CODE_DTL_SUB", "analytic_sub", "text"], ["AC_DTL_TYP", "analytic_type", "text"], ["A_CY", "currency", "text"],
  ["CC_CODE", "cost_center", "text"], ["FROM_CC_CODE", "from_cost_center", "text"], ["LC_NO", "lc_no", "text"],
  ["PJ_NO", "project_no", "text"], ["ACTV_NO", "activity_no", "text"], ["REP_CODE", "rep_code", "text"],
  ["J_AMT", "amount", "num"], ["J_AMT_F", "amount_fc", "num"], ["AC_RATE", "fx_rate", "num"],
  ["DIR_CODE1", "dir_code1", "text"], ["DIR_CODE2", "dir_code2", "text"], ["DIR_CODE3", "dir_code3", "text"],
  ["DIR_CODE4", "dir_code4", "text"], ["DIR_CODE5", "dir_code5", "text"], ["VERIFY", "verified", "text"],
  ["OB_PY", "ob_py", "int"], ["COL_NO", "collector_no", "text"], ["REF_NO", "ref_no", "text"],
  ["AC_DSC", "description", "text"], ["EXTERNAL_POST", "external_post", "int"], ["F_BRN_NO", "from_branch_no", "int"],
  ["VALUE_DATE", "value_date", "date"], ["CMP_NO", "company_id", "int"], ["BRN_NO", "branch_id", "int"],
  ["BRN_YEAR", "fiscal_year", "int"], ["BRN_USR", "branch_user", "int"],
];

export const OPENING_AUDIT = ["AD_U_ID", "AD_DATE", "UP_U_ID", "UP_DATE", "UP_CNT", "PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"] as const;

export async function syncOpening(db: Db): Promise<Record<string, number>> {
  if (await has(db, "OPEN_BAL")) {
    await db.exec(`CREATE INDEX IF NOT EXISTS x_open_bal_seq ON extract."OPEN_BAL" ("DOC_SEQUENCE")`);
    const sets = OPENING_COLS.filter(([o]) => o !== "DOC_SEQUENCE").map(([o, e, k]) => `${e} = ${castSql(o, k, "x.")}`);
    await db.exec(`
      UPDATE erp.opening_balance_line o SET ${sets.join(", ")},
        legacy = ${featuresSql(["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"], "x.")},
        created_by = NULLIF(x."AD_U_ID",''), created_at = CAST(NULLIF(x."AD_DATE",'') AS timestamptz),
        updated_by = NULLIF(x."UP_U_ID",''), updated_at = CAST(NULLIF(x."UP_DATE",'') AS timestamptz),
        update_count = COALESCE(CAST(NULLIF(x."UP_CNT",'') AS integer), 0)
      FROM extract."OPEN_BAL" x
      WHERE o.doc_sequence = x."DOC_SEQUENCE" AND o.created_at IS NULL AND o.update_count = 0`);
  }
  await openingViews(db);
  return { opening_balance: Number((await db.query(`SELECT count(*) c FROM erp.opening_balance_line`)).rows[0]?.c ?? 0) };
}

/**
 * لوحة التوازن (GL-R30/R34 · OB-R6): مدين/دائن/فرق لكل شركة ونوع تحليلي، ومطابقة كل حساب رقابة (عميل/مورد/…) بمجموع تحليليه.
 * الحفظ غير المتوازن مسموح؛ إقفال الفترة الأولى ممنوع ما دام فرق الشركة ≠ 0.
 */
async function openingViews(db: Db): Promise<void> {
  await db.exec(`DROP VIEW IF EXISTS erp.opening_balance_summary`);
  await db.exec(`CREATE VIEW erp.opening_balance_summary AS
    SELECT o.company_id, o.analytic_type, count(*) line_count, sum(o.debit) debit, sum(o.credit) credit, sum(o.amount) net
      FROM erp.opening_balance_line o GROUP BY o.company_id, o.analytic_type
    UNION ALL
    SELECT o.company_id, 'all', count(*), sum(o.debit), sum(o.credit), sum(o.amount)
      FROM erp.opening_balance_line o GROUP BY o.company_id`);
}

/** سطور القيد الافتتاحي بنوع التحليلي — لكشوف العميل/المورد/الموظف (نفس شكل IAS_POST_DTL نوع 0: رقم 0 · أول السنة · «الرصيد الإفتتاحي») */
export function openingLedgerSql(analyticType: string, cols: "customer" | "vendor" | "employee"): string {
  const base = `o.analytic_code, 'opening'`;
  const date = `make_date(COALESCE(o.fiscal_year, 2026), 1, 1)`;
  const desc = `COALESCE(NULLIF(o.description,''), 'الرصيد الإفتتاحي')`;
  const from = `FROM erp.opening_balance_line o WHERE o.analytic_type = '${analyticType}' AND o.analytic_code IS NOT NULL`;
  if (cols === "customer") {
    return `SELECT ${base}, 0, '0', ${date}, NULL::date, ${desc}, o.debit, o.credit, o.currency, o.branch_id, NULL::text ${from}`;
  }
  if (cols === "vendor") {
    return `SELECT ${base}, 0, '0', ${date}, ${desc}, o.debit, o.credit, o.currency, o.branch_id ${from}`;
  }
  return `SELECT ${base}, o.account_code, 0, '0', ${date}, ${desc}, o.debit, o.credit, o.currency, o.branch_id ${from}`;
}

/* ═══════════ 38 · op.5.1.2.15 — المخزون الافتتاحي · IAS_OPEN_STOCK (41 = 33 + 8 تدقيق · 1,218) [GO/05-warehouse.md] ═══════════ */

export const OPENING_STOCK_COLS: ColSpec[] = [
  ["DOC_SEQUENCE", "doc_sequence", "text"], ["I_CODE", "item_code", "text"], ["I_QTY", "qty", "num"],
  ["ITM_UNT", "unit_code", "text"], ["P_SIZE", "pack_size", "num"], ["P_QTY", "base_qty", "num"],
  ["BARCODE", "barcode", "text"], ["W_CODE", "warehouse_code", "text"], ["WHG_CODE", "warehouse_group", "text"],
  ["STK_COST", "unit_cost", "num"], ["EXPIRE_DATE", "expire_date", "date"], ["BATCH_NO", "batch_no", "text"],
  ["USE_SERIALNO", "uses_serials", "bool"], ["V_CODE", "vendor_code", "text"], ["C_CODE", "customer_code", "text"],
  ["RCRD_NO", "line_no", "int"], ["USE_ATTCH", "uses_attachments", "bool"], ["REC_ATTCH", "attachment_rec", "text"],
  ["I_LENGTH", "length", "num"], ["I_WIDTH", "width", "num"], ["I_HEIGHT", "height", "num"],
  ["I_NUMBER", "piece_count", "num"], ["WT_QTY", "wt_qty", "num"], ["WT_UNT", "wt_unit", "text"],
  ["ARGMNT_NO", "wt_factor", "num"], ["MOV_PY_FLG", "carried_forward", "bool"], ["ITM_AGE", "stock_age", "int"],
  ["LEV_NO", "price_level", "int"], ["I_PRICE", "price", "num"], ["CMP_NO", "company_id", "int"],
  ["BRN_NO", "branch_id", "int"], ["BRN_YEAR", "fiscal_year", "int"], ["BRN_USR", "branch_user", "int"],
];

/** قيمتا «لا شيء» في مفتاح أونيكس ⇒ NULL (GO §٣) */
function openingStockCast(o: string, k: ColSpec[2]): string {
  if (o === "EXPIRE_DATE") return `CASE WHEN left("EXPIRE_DATE", 10) = '1900-01-01' THEN NULL ELSE CAST(NULLIF("EXPIRE_DATE",'') AS date) END`;
  if (o === "BATCH_NO") return `NULLIF(NULLIF("BATCH_NO",''),'0')`;
  return castSql(o, k);
}

export async function syncOpeningStock(db: Db): Promise<Record<string, number>> {
  const n0 = Number((await db.query(`SELECT count(*) c FROM erp.opening_stock`)).rows[0]?.c ?? 0);
  if (n0 === 0 && (await has(db, "IAS_OPEN_STOCK"))) {
    await db.exec(`
      INSERT INTO erp.opening_stock (${OPENING_STOCK_COLS.map(([, e]) => e).join(", ")}, source, legacy,
                                     created_by, created_at, updated_by, updated_at, update_count)
      SELECT ${OPENING_STOCK_COLS.map(([o, , k]) => openingStockCast(o, k)).join(", ")},
             CASE WHEN "MOV_PY_FLG" = '1' THEN 'carried_forward' ELSE 'manual' END,
             ${featuresSql(["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"])},
             NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz), NULLIF("UP_U_ID",''),
             CAST(NULLIF("UP_DATE",'') AS timestamptz), COALESCE(CAST(NULLIF("UP_CNT",'') AS integer), 0)
      FROM extract."IAS_OPEN_STOCK"`);
  }
  await openingStockViews(db);
  return { opening_stock: Number((await db.query(`SELECT count(*) c FROM erp.opening_stock`)).rows[0]?.c ?? 0) };
}

/**
 * IV-R120 / IV-D24 — مطابقة إلزامية بالفرع: قيمة المخزون الافتتاحي (كمية × تكلفة) ↔ الرصيد الافتتاحي لحسابات المخزون
 * في الأستاذ = كل حسابات الحركة تحت أب حساب المخزون المربوط في op.5.1.2.16 (120201 «المخزون السلعي»: 1202010001 + 1202010012 …).
 */
async function openingStockViews(db: Db): Promise<void> {
  await db.exec(`DROP VIEW IF EXISTS erp.opening_stock_recon`);
  await db.exec(`CREATE VIEW erp.opening_stock_recon AS
    WITH inv AS (
      SELECT a.code FROM erp.account a
       WHERE a.kind = 'posting' AND a.parent_code IN (
         SELECT p.parent_code FROM erp.account p WHERE p.code IN (SELECT DISTINCT inventory_acc FROM erp.inventory_gl_link WHERE inventory_acc IS NOT NULL))
    ), stock AS (
      SELECT branch_id, count(*) line_count, sum(qty * unit_cost) value FROM erp.opening_stock GROUP BY branch_id
    ), gl AS (
      SELECT branch_id, sum(amount) value FROM erp.opening_balance_line WHERE account_code IN (SELECT code FROM inv) GROUP BY branch_id
    )
    SELECT CAST(COALESCE(s.branch_id, g.branch_id) AS text) branch_key, COALESCE(s.branch_id, g.branch_id) branch_id,
           COALESCE(s.line_count, 0) line_count,
           COALESCE(s.value, 0) stock_value, COALESCE(g.value, 0) gl_value, COALESCE(s.value, 0) - COALESCE(g.value, 0) difference
      FROM stock s FULL JOIN gl g ON g.branch_id = s.branch_id
    UNION ALL
    SELECT 'الإجمالي', NULL, (SELECT count(*) FROM erp.opening_stock), (SELECT COALESCE(sum(qty * unit_cost), 0) FROM erp.opening_stock),
           (SELECT COALESCE(sum(amount), 0) FROM erp.opening_balance_line WHERE account_code IN (SELECT code FROM inv)),
           (SELECT COALESCE(sum(qty * unit_cost), 0) FROM erp.opening_stock)
             - (SELECT COALESCE(sum(amount), 0) FROM erp.opening_balance_line WHERE account_code IN (SELECT code FROM inv))`);
}
