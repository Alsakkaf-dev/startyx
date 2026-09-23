import type { Db } from "../infrastructure/db.ts";

/**
 * مزامنة البيانات الأساسية من مستخرج أونيكس (schema `extract`) إلى جداول `erp`.
 * تعمل عند كل إقلاع، وتملأ الناقص فقط — لا تدوس تعديلات المستخدم.
 */

async function has(db: Db, table: string): Promise<boolean> {
  const r = await db.query(
    `SELECT count(*) c FROM information_schema.tables WHERE table_schema = 'extract' AND table_name = $1`,
    [table],
  );
  return Number(r.rows[0]?.c ?? 0) > 0;
}

async function scalar(db: Db, sql: string): Promise<number> {
  const r = await db.query(sql);
  return Number(r.rows[0]?.c ?? 0);
}

export async function syncMasters(db: Db): Promise<Record<string, number>> {
  const out: Record<string, number> = {};

  /* op.1.1.3 — العملات من EX_RATE */
  if ((await scalar(db, `SELECT count(*) c FROM erp.currency`)) === 0 && (await has(db, "EX_RATE"))) {
    await db.exec(
      `INSERT INTO erp.currency (no, code, iso_code, name_ar, name_en, fraction_ar, fraction_en,
                                 is_local, is_stock_currency, rate, rate_min, rate_max, decimals,
                                 created_by, created_at, updated_by, updated_at, update_count)
       SELECT CAST("CUR_NO" AS integer), "CUR_CODE", NULLIF("CUR_CODE_STNDR",''), COALESCE("CUR_NAME",''), NULLIF("CUR_E_NAME",''),
              NULLIF("CUR_FRACTION",''), NULLIF("CUR_E_FRACTION",''),
              "L_F" = '1', "STOCK_CUR" = '1',
              COALESCE(CAST(NULLIF("CUR_RATE",'') AS numeric), 1),
              CAST(NULLIF("MIN_CUR_RATE",'') AS numeric), CAST(NULLIF("MAX_CUR_RATE",'') AS numeric),
              COALESCE(CAST(NULLIF("CUR_FRC_NO",'') AS integer), 2),
              NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
              NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz),
              COALESCE(CAST(NULLIF("UP_CNT",'') AS integer), 0)
       FROM extract."EX_RATE"
       ON CONFLICT (no) DO NOTHING`,
    );
  }
  out.currency = await scalar(db, `SELECT count(*) c FROM erp.currency`);

  /* op.1.2.3 — تفاصيل الدليل المحاسبي من ACCOUNT */
  if ((await has(db, "ACCOUNT")) && (await scalar(db, `SELECT count(*) c FROM erp.account WHERE kind IS NULL`)) > 0) {
    await db.exec(
      `UPDATE erp.account a SET
         name_en         = NULLIF(x."A_NAME_ENG",''),
         kind            = CASE x."A_S_M" WHEN '1' THEN 'header' ELSE 'posting' END,
         nature          = CASE x."DR" WHEN '1' THEN 'debit' ELSE 'credit' END,
         report_type     = CASE x."A_REPORT" WHEN '1' THEN 'balance_sheet' ELSE 'pnl' END,
         use_cc          = CAST(NULLIF(x."USE_CC",'') AS integer),
         use_pj          = CAST(NULLIF(x."USE_PJ",'') AS integer),
         use_actv        = CAST(NULLIF(x."USE_ACTV",'') AS integer),
         inactive_reason = NULLIF(x."INACTIVE_RES",''),
         inactive_date   = CAST(NULLIF(x."INACTIVE_DATE",'') AS date),
         created_by      = NULLIF(x."AD_U_ID",''),
         created_at      = CAST(NULLIF(x."AD_DATE",'') AS timestamptz),
         updated_by      = NULLIF(x."UP_U_ID",''),
         updated_at      = CAST(NULLIF(x."UP_DATE",'') AS timestamptz),
         update_count    = COALESCE(CAST(NULLIF(x."UP_CNT",'') AS integer), 0)
       FROM extract."ACCOUNT" x
       WHERE a.code = x."A_CODE" AND a.kind IS NULL`,
    );
  }
  out.account = await scalar(db, `SELECT count(*) c FROM erp.account`);

  /* op.1.1.2 — تفاصيل الفترات من S_PRD_DTL (الأسماء كما في أونيكس — SY-Q2) */
  if ((await has(db, "S_PRD_DTL")) && (await scalar(db, `SELECT count(*) c FROM erp.fiscal_period WHERE year_no IS NULL`)) > 0) {
    await db.exec(
      `UPDATE erp.fiscal_period p SET
         name_en    = NULLIF(x."PRD_F_NM",''),
         year_no    = CAST(NULLIF(x."YR_NO",'') AS integer),
         vat_period = CAST(NULLIF(x."VAT_PRD_NO",'') AS integer),
         inactive   = COALESCE(x."INACTV" = '1', false)
       FROM extract."S_PRD_DTL" x
       WHERE x."PRD_TYP" = '1' AND p.no = CAST(x."PRD_NO" AS integer) AND p.year_no IS NULL`,
    );
  }
  out.fiscal_period = await scalar(db, `SELECT count(*) c FROM erp.fiscal_period`);

  /* op.1.1.12 — الفروع: صفوف S_BRN غير مقروءة (BLOB) ⇒ الرقم كرمز فقط، وبقية الحقول تبقى فارغة (SY-Q4) */
  await db.exec(`UPDATE erp.branch SET code = CAST(no AS text) WHERE code IS NULL`);
  out.branch = await scalar(db, `SELECT count(*) c FROM erp.branch`);

  /* op.1.2.5 — مراكز التكلفة وأنواعها من COST_CENTERS/COST_CENTER_TYPES */
  if ((await scalar(db, `SELECT count(*) c FROM erp.cost_center_type`)) === 0 && (await has(db, "COST_CENTER_TYPES"))) {
    await db.exec(
      `INSERT INTO erp.cost_center_type (no, name_ar, name_en, affected_by_trans)
       SELECT CAST("CC_TYPE" AS integer), COALESCE("CC_NAME",''), NULLIF("CC_E_NAME",''), "AFFECTED_BY_TRANS" = '1'
       FROM extract."COST_CENTER_TYPES"
       ON CONFLICT (no) DO NOTHING`,
    );
  }
  if ((await scalar(db, `SELECT count(*) c FROM erp.cost_center`)) === 0 && (await has(db, "COST_CENTERS"))) {
    await db.exec(
      `INSERT INTO erp.cost_center (no, code, name_ar, name_en, parent_code, level, kind, sequence_no, group_no,
                                    project_use, inactive, inactive_sales, inactive_reason, inactive_date,
                                    created_by, created_at, updated_by, updated_at, update_count)
       SELECT CAST("CC_NO" AS integer), "CC_CODE", COALESCE("CC_A_NAME",''), NULLIF("CC_E_NAME",''),
              NULLIF("C_PARENT",''), CAST(NULLIF("C_LEVEL",'') AS integer),
              CASE "C_S_M" WHEN '1' THEN 'main' ELSE 'sub' END,
              CAST(NULLIF("C_SR",'') AS integer), CAST(NULLIF("C_GROUPING",'') AS integer),
              CAST(NULLIF("USE_PJ",'') AS integer),
              COALESCE("INACTIVE" = '1', false), COALESCE("INACTIVE_SLS" = '1', false),
              NULLIF("INACTIVE_RES",''), CAST(NULLIF("INACTIVE_DATE",'') AS date),
              NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
              NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz),
              COALESCE(CAST(NULLIF("UP_CNT",'') AS integer), 0)
       FROM extract."COST_CENTERS"
       ON CONFLICT (no) DO NOTHING`,
    );
  }
  out.cost_center = await scalar(db, `SELECT count(*) c FROM erp.cost_center`);

  /* op.1.2.6 — المشاريع من IAS_PROJECTS */
  if ((await scalar(db, `SELECT count(*) c FROM erp.project`)) === 0 && (await has(db, "IAS_PROJECTS"))) {
    await db.exec(
      `INSERT INTO erp.project (no, code, name_ar, name_en, parent_no, level, is_sub, sequence_no, group_no,
                                activity_use, inactive, inactive_reason, inactive_date,
                                created_by, created_at, updated_by, updated_at, update_count)
       SELECT CAST("PJ_NO" AS bigint), NULLIF("PJ_CODE",''), COALESCE("PJ_A_NAME",''), NULLIF("PJ_E_NAME",''),
              CAST(NULLIF("PJ_PARENT",'') AS bigint), CAST(NULLIF("PJ_LEVEL",'') AS integer),
              COALESCE("PJ_SUB" = '1', false), CAST(NULLIF("PJ_SRL",'') AS integer), CAST(NULLIF("GROUP_NO",'') AS integer),
              CAST(NULLIF("USE_ACTV",'') AS integer),
              COALESCE("INACTIVE" = '1', false), NULLIF("INACTIVE_RES",''), CAST(NULLIF("INACTIVE_DATE",'') AS date),
              NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
              NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz),
              COALESCE(CAST(NULLIF("UP_CNT",'') AS integer), 0)
       FROM extract."IAS_PROJECTS"
       ON CONFLICT (no) DO NOTHING`,
    );
  }
  out.project = await scalar(db, `SELECT count(*) c FROM erp.project`);

  /* op.4.1.2.9 — الأنشطة وروابطها: فارغة في أونيكس (0 صف) — تُنقل كما هي بلا اختراع */
  if ((await scalar(db, `SELECT count(*) c FROM erp.activity`)) === 0 && (await has(db, "IAS_ACTVTY"))) {
    await db.exec(
      `INSERT INTO erp.activity (no, code, name_ar, name_en, parent_no, level, is_sub, group_no, project_no, cost_account,
                                 inactive, inactive_reason, inactive_date,
                                 created_by, created_at, updated_by, updated_at, update_count)
       SELECT CAST("ACTV_NO" AS bigint), NULLIF("ACTV_CODE",''), COALESCE("ACTV_A_NAME",''), NULLIF("ACTV_E_NAME",''),
              CAST(NULLIF("ACTV_PARENT",'') AS bigint), CAST(NULLIF("ACTV_LEVEL",'') AS integer),
              COALESCE("ACTV_SUB" = '1', false), CAST(NULLIF("GROUP_NO",'') AS integer),
              CAST(NULLIF("PJ_NO",'') AS bigint), NULLIF("COST_A_CODE",''),
              COALESCE("INACTIVE" = '1', false), NULLIF("INACTIVE_RES",''), CAST(NULLIF("INACTIVE_DATE",'') AS date),
              NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
              NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz),
              COALESCE(CAST(NULLIF("UP_CNT",'') AS integer), 0)
       FROM extract."IAS_ACTVTY"
       ON CONFLICT (no) DO NOTHING`,
    );
  }
  if ((await scalar(db, `SELECT count(*) c FROM erp.account_activity`)) === 0 && (await has(db, "IAS_ACCOUNT_ACTV"))) {
    await db.exec(
      `INSERT INTO erp.account_activity (account_code, activity_no, created_by, created_at, updated_by, updated_at, update_count)
       SELECT "A_CODE", CAST("ACTV_NO" AS bigint),
              NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
              NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz),
              COALESCE(CAST(NULLIF("UP_CNT",'') AS integer), 0)
       FROM extract."IAS_ACCOUNT_ACTV"
       ON CONFLICT (account_code, activity_no) DO NOTHING`,
    );
  }
  out.activity = await scalar(db, `SELECT count(*) c FROM erp.activity`);
  out.account_activity = await scalar(db, `SELECT count(*) c FROM erp.account_activity`);

  return out;
}
