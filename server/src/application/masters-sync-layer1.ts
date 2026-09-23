import type { Db } from "../infrastructure/db.ts";

/**
 * مزامنة الطبقة ١ من مستخرج أونيكس (schema `extract`) إلى جداول `erp`.
 * تعمل عند كل إقلاع وتملأ الناقص فقط — لا تدوس تعديل المستخدم (نفس نمط `masters-sync.ts`).
 * كل كتلة مصدرها جدول أونيكس المذكور بجوارها، والأعداد المتوقعة مثبّتة في `GO/`.
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

/** يعبّئ الجدول من المستخرج مرة واحدة فقط (إن كان فارغاً والمصدر موجوداً) */
async function seed(db: Db, target: string, source: string, sql: string): Promise<void> {
  if ((await scalar(db, `SELECT count(*) c FROM ${target}`)) > 0) return;
  if (!(await has(db, source))) return;
  await db.exec(sql);
}

const AUDIT = `NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
               NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz),
               COALESCE(CAST(NULLIF("UP_CNT",'') AS integer), 0)`;
const AUDIT_COLS = `created_by, created_at, updated_by, updated_at, update_count`;

export async function syncLayer1(db: Db): Promise<Record<string, number>> {
  const out: Record<string, number> = {};

  /* ═══ op.3.2 — نوع الضريبة وجهاتها وشرائحها ═══ */
  await seed(db, "erp.tax_type", "GNR_TAX_CODE_MST", `
    INSERT INTO erp.tax_type (no, name_ar, name_en, code, applies_to, agency_count, is_default, company_id,
                              calc_on_document, tax_kind, tax_class, tds, min_amount, pct_on_prepaid, sync,
                              inactive, inactive_reason, ${AUDIT_COLS})
    SELECT CAST("TAX_NO" AS integer), COALESCE("TAX_L_NM",''), NULLIF("TAX_F_NM",''), COALESCE("TAX_TYP_CODE",'VAT'),
           COALESCE(CAST(NULLIF("CLC_DOC_TYP",'') AS integer), 3),
           COALESCE(CAST(NULLIF("AGNCY_CNT",'') AS integer), 0),
           "DFLT_FLG" = '1', CAST(NULLIF("CONN_CMP_NO",'') AS integer),
           "CLC_TAX_BY_DOC" = '1', CAST(NULLIF("TAX_TYP",'') AS integer), NULLIF("TAX_CLSS",''),
           "TDS_FLG" = '1', CAST(NULLIF("MIN_LMT_AMT",'') AS numeric), CAST(NULLIF("TAX_PER_PRPD_AMT",'') AS numeric),
           "SYNC_FLG" = '1', COALESCE("INACTIVE" = '1', false), NULLIF("INACTIVE_RES",''), ${AUDIT}
    FROM extract."GNR_TAX_CODE_MST"`);
  out.tax_type = await scalar(db, `SELECT count(*) c FROM erp.tax_type`);

  await seed(db, "erp.tax_agency", "GNR_TAX_CODE_DTL", `
    INSERT INTO erp.tax_agency (tax_no, agency_no, name_ar, name_en, sales_account, purchase_account,
                                due_tax_account, pct, ${AUDIT_COLS})
    SELECT CAST("TAX_NO" AS integer), CAST("AGNCY_NO" AS integer), COALESCE("AGNCY_L_NM",''), NULLIF("AGNCY_F_NM",''),
           NULLIF("AC_CODE_AR",''), NULLIF("AC_CODE_AP",''), NULLIF("AC_CODE_DUE_TAX",''),
           CAST(NULLIF("TAX_PRCNT",'') AS numeric), ${AUDIT}
    FROM extract."GNR_TAX_CODE_DTL"`);
  out.tax_agency = await scalar(db, `SELECT count(*) c FROM erp.tax_agency`);

  await seed(db, "erp.tax_slice", "GNR_TAX_SLICE", `
    INSERT INTO erp.tax_slice (no, name_ar, name_en, pct, is_default, inactive, inactive_reason, ${AUDIT_COLS})
    SELECT CAST("SLICE_NO" AS integer), COALESCE("SLICE_L_NM",''), NULLIF("SLICE_F_NM",''),
           CAST(NULLIF("SLICE_PRCNT",'0') AS numeric), "DFLT_FLG" = '1',
           COALESCE("INACTIVE" = '1', false), NULLIF("INACTIVE_RES",''), ${AUDIT}
    FROM extract."GNR_TAX_SLICE"`);
  out.tax_slice = await scalar(db, `SELECT count(*) c FROM erp.tax_slice`);

  /* ═══ op.5.1.1.2 — وحدات القياس ومعاملات التحويل ═══ */
  await seed(db, "erp.unit", "MEASUREMENT", `
    INSERT INTO erp.unit (code, name_ar, name_en, global_code, default_pack_size, lock_pack_size,
                          unit_kind, measure_class, linked_to_counted, sale_scope, ${AUDIT_COLS})
    SELECT "MEASURE_CODE", COALESCE("MEASURE",''), NULLIF("MEASURE_F_NM",''), NULLIF("MEASURE_CODE_GB",''),
           CAST(NULLIF("DFLT_SIZE",'') AS numeric), "ALLOW_UPD" = '1',
           COALESCE(CAST(NULLIF("MEASURE_TYPE",'') AS integer), 1), CAST(NULLIF("MEASURE_WT_TYPE",'') AS integer),
           "MEASURE_WT_CONN" = '1', COALESCE(CAST(NULLIF("UNT_SALE_TYP",'') AS integer), 3), ${AUDIT}
    FROM extract."MEASUREMENT"`);
  out.unit = await scalar(db, `SELECT count(*) c FROM erp.unit`);

  /* IV-D6 — 9 من 13 معاملاً افتراضياً من المورّد خاطئة ⇒ كلها تُنقل بعلامة «تحتاج مراجعة» */
  await seed(db, "erp.unit_conversion", "IAS_UNTS_CONV", `
    INSERT INTO erp.unit_conversion (group_no, from_code, to_code, factor, needs_review, ${AUDIT_COLS})
    SELECT CAST(NULLIF("MSUR_MAN_NO",'') AS integer), "MSUR_MAN_CODE", "MSUR_OBS_CODE",
           CAST(NULLIF("ARGMNT_NO",'0') AS numeric), true, ${AUDIT}
    FROM extract."IAS_UNTS_CONV"
    WHERE "MSUR_MAN_CODE" <> '' AND "MSUR_OBS_CODE" <> ''`);
  out.unit_conversion = await scalar(db, `SELECT count(*) c FROM erp.unit_conversion`);

  /* ═══ op.5.1.2.1 — المجموعات الرئيسية (IV-D13: المجموعة 012 «الخام» المكررة تُعلَّم للمراجعة) ═══ */
  await seed(db, "erp.item_group", "GROUP_DETAILS", `
    INSERT INTO erp.item_group (code, name_ar, name_en, item_code_prefix, default_tax_pct, sort_no, qty_limit,
                                sync_to_web, use_sale_as_purchase_price, allow_disc_sales, allow_disc_purch,
                                min_price_base, min_price_sign, min_price_val_typ, min_price_value, ${AUDIT_COLS})
    SELECT "G_CODE", COALESCE("G_A_NAME",''), NULLIF("G_E_NAME",''), NULLIF("G_I_CODE",''),
           CAST(NULLIF("TAX_PRCNT_DFLT",'') AS numeric), CAST(NULLIF("G_ORDR",'') AS integer),
           CAST(NULLIF("ROL_LMT_QTY",'') AS numeric),
           "SYNCHRNZ_TO_WEB_FLG" = '1', "USE_SAL_PRICE_AS_PUR_PRICE" = '1',
           "ALLOW_DISC_FLG" = '1', "ALLOW_DISC_PI_FLG" = '1',
           CAST(NULLIF("LOW_SAL_PRICE_ALLW_TYP",'') AS integer), NULLIF("LOW_SAL_PRICE_ALLW_SGN",''),
           CAST(NULLIF("LOW_SAL_PRICE_ALLW_VAL_TYP",'') AS integer), CAST(NULLIF("LOW_SAL_PRICE_ALLW_VAL",'') AS numeric),
           ${AUDIT}
    FROM extract."GROUP_DETAILS"`);
  await db.exec(
    `UPDATE erp.item_group g SET needs_review = true
     WHERE update_count = 0 AND needs_review = false
       AND EXISTS (SELECT 1 FROM erp.item_group o WHERE o.name_ar = g.name_ar AND o.code <> g.code)
       AND NOT EXISTS (SELECT 1 FROM erp.item i WHERE i.group_code = g.code)`,
  );
  out.item_group = await scalar(db, `SELECT count(*) c FROM erp.item_group`);

  /* ═══ op.5.1.2.8 — مجموعات المخازن + ربط المخزن بمجموعته ═══ */
  await seed(db, "erp.warehouse_group", "WAREHOUSE_GROUP", `
    INSERT INTO erp.warehouse_group (code, name_ar, name_en, ${AUDIT_COLS})
    SELECT "WHG_CODE", COALESCE("WHG_A_NAME",''), NULLIF("WHG_E_NAME",''), ${AUDIT}
    FROM extract."WAREHOUSE_GROUP"`);
  if (await has(db, "WAREHOUSE_DETAILS")) {
    await db.exec(
      `UPDATE erp.warehouse w SET group_code = x."WHG_CODE"
       FROM extract."WAREHOUSE_DETAILS" x
       WHERE w.code = x."W_CODE" AND w.group_code IS NULL AND NULLIF(x."WHG_CODE",'') IS NOT NULL`,
    );
  }
  out.warehouse_group = await scalar(db, `SELECT count(*) c FROM erp.warehouse_group`);

  /* ═══ op.1.2.11 — ربط الحسابات المدينة/الدائنة الأخرى ومجموعاتها وتفاصيلها ═══ */
  await seed(db, "erp.account_detail_link", "GLS_AC_CODE_DTL_GRPS", `
    INSERT INTO erp.account_detail_link (code, name_ar, name_en, conn_code, account_code, analytic_type, ${AUDIT_COLS})
    SELECT "GRP_CODE", COALESCE("GRP_L_NM",''), NULLIF("GRP_F_NM",''),
           CAST(NULLIF("GRP_CONN_CODE",'') AS integer), COALESCE("AC_CODE",''),
           CAST(NULLIF("AC_DTL_TYP",'') AS integer), ${AUDIT}
    FROM extract."GLS_AC_CODE_DTL_GRPS"`);
  await seed(db, "erp.account_detail_group", "GLS_ACCNT_DTL_GRPS", `
    INSERT INTO erp.account_detail_group (code, name_ar, name_en, account_code, analytic_type, detail_type, ${AUDIT_COLS})
    SELECT "GRP_CODE", COALESCE("GRP_L_NM",''), NULLIF("GRP_F_NM",''), NULLIF("GRP_AC_CODE",''),
           CAST(NULLIF("AC_DTL_TYP",'') AS integer), CAST(NULLIF("AC_DTL_TYP_DTL",'') AS integer), ${AUDIT}
    FROM extract."GLS_ACCNT_DTL_GRPS"`);
  await seed(db, "erp.account_detail", "GLS_ACCNT_DTL", `
    INSERT INTO erp.account_detail (code, name_ar, name_en, group_code, account_code, analytic_type, detail_type,
                                    branch_no, inactive, inactive_reason, ${AUDIT_COLS})
    SELECT "AC_CODE_DTL", COALESCE("AC_CODE_DTL_L_NM",''), NULLIF("AC_CODE_DTL_F_NM",''), NULLIF("GRP_CODE",''),
           NULLIF("AC_CODE",''), CAST(NULLIF("AC_DTL_TYP",'') AS integer), CAST(NULLIF("AC_DTL_TYP_DTL",'') AS integer),
           CAST(NULLIF("CONN_BRN_NO",'') AS integer), COALESCE("INACTV" = '1', false), NULLIF("INACTV_RSON",''), ${AUDIT}
    FROM extract."GLS_ACCNT_DTL"`);
  out.account_detail_link = await scalar(db, `SELECT count(*) c FROM erp.account_detail_link`);

  /* ═══ op.1.2.1 + op.1.2.4 — الدليل العام للوحدات وربطه بالدليل الحقيقي وبالتدفقات ═══ */
  await seed(db, "erp.general_account", "IAS_ACCOUNT_ANLSYS", `
    INSERT INTO erp.general_account (no, name_ar, name_en, parent_no, order_code, notes, order_no, analytic_type,
                                     flow_type, is_main, level, report_type, is_debit, update_accounts, ${AUDIT_COLS})
    SELECT CAST("ANLS_NO" AS bigint), COALESCE("ANLS_L_NM",''), NULLIF("ANLS_F_NM",''),
           CAST(NULLIF("ANLS_PARNT_NO",'') AS bigint), NULLIF("CH_ORDR_NO",''), NULLIF("NOTES",''),
           CAST(NULLIF("ORDR_NO",'') AS bigint), CAST(NULLIF("AC_DTL_TYP",'') AS integer),
           CAST(NULLIF("FLOW_TYPE",'') AS integer), "MN_SUB" = '1', CAST(NULLIF("A_LEVEL",'') AS integer),
           COALESCE(CAST(NULLIF("AC_RPRT_TYP",'') AS integer), 1), "DR" = '1', "UPDT_ACCNTS" = '1', ${AUDIT}
    FROM extract."IAS_ACCOUNT_ANLSYS"`);
  out.general_account = await scalar(db, `SELECT count(*) c FROM erp.general_account`);

  if ((await has(db, "ACCOUNT")) && (await scalar(db, `SELECT count(*) c FROM erp.account WHERE type_no IS NULL`)) > 0) {
    await db.exec(
      `UPDATE erp.account a SET
         analysis_no    = CAST(NULLIF(x."A_ANALYSIS",'') AS bigint),
         flow_type      = CAST(NULLIF(x."FLOW_TYPE",'') AS integer),
         type_no        = CAST(NULLIF(x."A_S_M",'') AS integer),
         report_type_no = CAST(NULLIF(x."A_REPORT",'') AS integer),
         grouping_no    = CAST(NULLIF(x."A_GROUPING",'') AS integer),
         class_no       = CAST(NULLIF(x."CLASS_NO",'') AS integer)
       FROM extract."ACCOUNT" x
       WHERE a.code = x."A_CODE" AND a.type_no IS NULL`,
    );
  }

  /* ═══ op.3.4 · op.3.5 — ربط الحسابات والأصناف بالضريبة ═══ */
  await seed(db, "erp.account_tax", "GLS_TAX_ACC", `
    INSERT INTO erp.account_tax (account_code, tax_no, agency_no, pct, ${AUDIT_COLS})
    SELECT "A_CODE", CAST("TAX_NO" AS integer), COALESCE(CAST(NULLIF("AGNCY_NO",'') AS integer), 1),
           CAST(NULLIF("TAX_PRCNT",'0') AS numeric), ${AUDIT}
    FROM extract."GLS_TAX_ACC"`);
  out.account_tax = await scalar(db, `SELECT count(*) c FROM erp.account_tax`);

  await seed(db, "erp.item_tax", "GNR_TAX_ITM", `
    INSERT INTO erp.item_tax (item_code, tax_no, agency_no, pct, min_amount, exempt_reason_code, exempt_reason_text,
                              tax_code, vat_category, exempt_load_by_nationality, ${AUDIT_COLS})
    SELECT "I_CODE", CAST("TAX_NO" AS integer), COALESCE(CAST(NULLIF("AGNCY_NO",'') AS integer), 1),
           CAST(NULLIF("TAX_PRCNT",'0') AS numeric), CAST(NULLIF("MIN_LMT_AMT",'') AS numeric),
           NULLIF("VAT_EXMPT_RSN_CODE",''), NULLIF("VAT_EXMPT_RSN_TXT",''), NULLIF("TAX_TYP_CODE",''),
           COALESCE(NULLIF("VAT_CAT_CODE",''),'S'), "EXMPT_LOADAMT_TAX_BYNTNLTY_FLG" = '1', ${AUDIT}
    FROM extract."GNR_TAX_ITM"`);
  out.item_tax = await scalar(db, `SELECT count(*) c FROM erp.item_tax`);

  /* ═══ op.5.1.2.16 — ربط حسابات المخزون بالأستاذ ═══ */
  await seed(db, "erp.inventory_gl_link", "IAS_CONN_ACC_INV_BY_GL", `
    INSERT INTO erp.inventory_gl_link (link_type, group_code, inventory_acc, sales_acc, sales_return_acc,
      discount_allowed_acc, discount_earned_acc, cogs_acc, cogs_return_acc, py_sales_return_acc, py_cogs_return_acc,
      free_cogs_acc, free_purchase_cost_acc, free_return_cogs_acc, purchase_acc, prepaid_revenue_acc,
      service_purchase_acc, deferred_sales_acc, deferred_cogs_acc, advance_sales_acc, advance_return_acc,
      compensation_cogs_acc, price_diff_acc, ${AUDIT_COLS})
    SELECT COALESCE(CAST(NULLIF("POST_TYPE",'') AS integer), 1), "POST_CODE",
      NULLIF("INV_A_CODE",''), NULLIF("SI_A_CODE",''), NULLIF("SR_A_CODE",''),
      NULLIF("DSC_SI_A_CODE",''), NULLIF("DSC_PI_A_CODE",''), NULLIF("CST_SI_A_CODE",''), NULLIF("CST_SR_A_CODE",''),
      NULLIF("PY_SR_A_CODE",''), NULLIF("PY_CST_SR_A_CODE",''), NULLIF("CST_FREE_SI_A_CODE",''),
      NULLIF("CST_FREE_PI_A_CODE",''), NULLIF("CST_FREE_SR_A_CODE",''), NULLIF("PURCHASE_A_CODE",''),
      NULLIF("PRE_REV_A_CODE",''), NULLIF("PURCHASE_SRVC_A_CODE",''), NULLIF("DLY_SI_A_CODE",''),
      NULLIF("DLY_CST_SI_A_CODE",''), NULLIF("ADVNC_SI_A_CODE",''), NULLIF("ADVNC_SR_A_CODE",''),
      NULLIF("CST_CMPNS_SI_A_CODE",''), NULLIF("DIFF_PR_A_CODE",''), ${AUDIT}
    FROM extract."IAS_CONN_ACC_INV_BY_GL"`);
  out.inventory_gl_link = await scalar(db, `SELECT count(*) c FROM erp.inventory_gl_link`);

  /* ═══ op.7.1.2.2 — مجموعات العملاء وحدودها ═══ */
  await seed(db, "erp.customer_group", "CUSTOMER_GROUP", `
    INSERT INTO erp.customer_group (no, name_ar, name_en, account_code, extra_account, ${AUDIT_COLS})
    SELECT CAST("C_GROUP_CODE" AS integer), COALESCE("C_GROUP_A_NAME",''), NULLIF("C_GROUP_E_NAME",''),
           COALESCE("C_A_CODE",''), NULLIF("A_CODE",''), ${AUDIT}
    FROM extract."CUSTOMER_GROUP"`);
  await seed(db, "erp.customer_group_limit", "IAS_CST_GRP_LMT", `
    INSERT INTO erp.customer_group_limit (group_no, currency, side, balance_min, balance_max, txn_min, txn_max,
                                          overrun_pct, overrun_possible, overrun_policy, inactive, branch_no, ${AUDIT_COLS})
    SELECT CAST("CST_GRP_CODE" AS integer), COALESCE(NULLIF("A_CY",''),'SAR'),
           COALESCE(CAST(NULLIF("DR_CR",'') AS integer), 1),
           CAST(NULLIF("MIN_AMT",'') AS numeric), CAST(NULLIF("MAX_AMT",'') AS numeric),
           CAST(NULLIF("MIN_TRNS_AMT",'') AS numeric), CAST(NULLIF("MAX_TRNS_AMT",'') AS numeric),
           CAST(NULLIF("MAX_LMT_PER",'') AS numeric), CAST(NULLIF("MAX_LMT_PSBL",'') AS numeric),
           COALESCE(CAST(NULLIF("EXCEED_LMT",'') AS integer), 1), COALESCE("INACTIVE" = '1', false),
           CAST(NULLIF("BRN_NO",'') AS integer), ${AUDIT}
    FROM extract."IAS_CST_GRP_LMT"`);
  out.customer_group = await scalar(db, `SELECT count(*) c FROM erp.customer_group`);

  /* ═══ op.6.1.2.1 — مجموعات الموردين + ربط المورد بمجموعته (بادئة رقم المورد — AP-R13) ═══ */
  await seed(db, "erp.supplier_group", "VENDOR_GROUP", `
    INSERT INTO erp.supplier_group (no, name_ar, name_en, account_code, ${AUDIT_COLS})
    SELECT CAST("V_GROUP_CODE" AS integer), COALESCE("V_GROUP_A_NAME",''), NULLIF("V_GROUP_E_NAME",''),
           COALESCE("V_A_CODE",''), ${AUDIT}
    FROM extract."VENDOR_GROUP"`);
  if (await has(db, "V_DETAILS")) {
    await db.exec(
      `UPDATE erp.vendor v SET group_no = CAST(NULLIF(x."V_GROUP_CODE",'') AS integer)
       FROM extract."V_DETAILS" x
       WHERE v.code = x."V_CODE" AND v.group_no IS NULL AND NULLIF(x."V_GROUP_CODE",'') IS NOT NULL`,
    );
  }
  out.supplier_group = await scalar(db, `SELECT count(*) c FROM erp.supplier_group`);

  /* ═══ op.1.1.13 — أنواع الحسابات وأنواع التقارير (المجموعات والتصنيفات صفر صف في أونيكس) ═══ */
  await seed(db, "erp.account_type", "ACCOUNT_TYPES", `
    INSERT INTO erp.account_type (no, name_ar, name_en, affected_by_trans, ${AUDIT_COLS})
    SELECT CAST("ACCOUNT_TYPE" AS integer), COALESCE("ACCOUNT_NAME",''), NULLIF("ACCOUNT_E_NAME",''),
           "AFFECTED_BY_TRANS" = '1', ${AUDIT}
    FROM extract."ACCOUNT_TYPES"`);
  await seed(db, "erp.account_report_type", "ACCOUNT_REPORT_TYPE", `
    INSERT INTO erp.account_report_type (no, name_ar, name_en, is_balance_sheet, ${AUDIT_COLS})
    SELECT CAST("REPORT_TYPE" AS integer), COALESCE("REPORT_NAME",''), NULLIF("REPORT_E_NAME",''),
           "REPORT_BS" = '1', ${AUDIT}
    FROM extract."ACCOUNT_REPORT_TYPE"`);
  await seed(db, "erp.account_group", "ACCOUNT_GROUPING", `
    INSERT INTO erp.account_group (no, name_ar, name_en, ${AUDIT_COLS})
    SELECT CAST("GROUP_NO" AS integer), COALESCE("GROUP_NAME",''), NULLIF("GROUP_E_NAME",''), ${AUDIT}
    FROM extract."ACCOUNT_GROUPING"`);
  await seed(db, "erp.account_class", "IAS_ACCOUNT_CLASS", `
    INSERT INTO erp.account_class (no, name_ar, name_en, ${AUDIT_COLS})
    SELECT CAST("CLASS_NO" AS integer), COALESCE("CLASS_A_NAME",''), NULLIF("CLASS_E_NAME",''), ${AUDIT}
    FROM extract."IAS_ACCOUNT_CLASS"`);
  out.account_type = await scalar(db, `SELECT count(*) c FROM erp.account_type`);
  out.account_report_type = await scalar(db, `SELECT count(*) c FROM erp.account_report_type`);

  /* ═══ op.1.2.9 — الحسابات الوسيطة لكل فرع (SY-D4: أعمدة المطاعم والمستشفيات محذوفة) ═══ */
  await seed(db, "erp.branch_posting_accounts", "INTERFACE_ACC", `
    INSERT INTO erp.branch_posting_accounts (branch_no, interface_no,
      fx_diff, vat_output, vat_input, rounding_diff, rounding_after_vat, wh_transfer_diff,
      cost_diff_purchase_return, issue_diff,
      lost_extra_goods, notes_payable, notes_receivable, lc_diff, commission, empty_acc,
      rounding_cc, rounding_pj, rounding_activity, purchase_discount_intermediary, balanced_cc, branch_current,
      stock_diff_purchase, kit_item_diff, wh_transfer_return_diff, promissory_notes, cashier_deficit, cashier_excess,
      bank_deposit, advance_payment, stock_adjustment, purchase_income, tax_due, lc,
      profit_tax_credit, profit_tax_debit, shipping_vat,
      rep_commission, collector_commission, marketer_commission, employee_commission, daily_sales,
      return_replace, return_replace_free, coupon, coupon_replace_diff, points_replace, delivery_sales,
      delivery_sales_detail,
      fa_increase, fa_decrease, fa_transfer, fa_cc, fa_activity, fa_project, fa_maintenance, fa_lost, fa_profit,
      hr_end_of_service, hr_loan, hr_custody, hr_travel, hr_medical_tax, ${AUDIT_COLS})
    SELECT CAST("BRN_NO" AS integer), CAST(NULLIF("INTERFACE_NO",'') AS integer),
      NULLIF("CURR_DIFF",''), NULLIF("VAT_AC",''), NULLIF("VAT_PUR_A_CODE",''), NULLIF("FRC_DIFF_AC",''),
      NULLIF("FRC_DIFF_DISC_AFTR_VAT_AC",''), NULLIF("DIFF_WHTRNS_A_CODE",''),
      NULLIF("DIFF_PR_A_CODE",''), NULLIF("DIFF_OUTGOING_A_CODE",''),
      NULLIF("LOSS_OFG",''), NULLIF("PAY_LETTER",''), NULLIF("REC_LETTER",''), NULLIF("LC_DIFF",''),
      NULLIF("COMM_A_CODE",''), NULLIF("EMPTY_AC",''),
      NULLIF("FRC_DIFF_CC",''), NULLIF("FRC_DIFF_PJ",''), NULLIF("FRC_DIFF_ACTV",''),
      NULLIF("DISC_AMT_NOT_EFFECT_AC",''), NULLIF("AC_BALANCED_CC",''), NULLIF("AC_BALANCED_BRN",''),
      NULLIF("DIFF_PUR_STK_A_CODE",''), NULLIF("DIFF_KIT_ITM_A_CODE",''), NULLIF("DIFF_WHTRNS_RTRN_A_CODE",''),
      NULLIF("PAY_KIMB_A_CODE",''), NULLIF("DEFCT_CSHR_A_CODE",''), NULLIF("EXCESS_CSHR_A_CODE",''),
      NULLIF("GLS_BNK_DPST_AC",''), NULLIF("ADVNC_PYMNT_AC",''), NULLIF("STK_ADJ_A_CODE",''),
      NULLIF("PUR_INCM_A_CODE",''), NULLIF("TAX_DUE_A_CODE",''), NULLIF("LC_A_CODE",''),
      NULLIF("VAT_PROFIT_CRDT",''), NULLIF("VAT_PROFIT_DEBT",''), NULLIF("SHP_VAT_AC",''),
      NULLIF("REPRS_COMM_AC",''), NULLIF("COL_COMM_AC",''), NULLIF("PRM_COMM_AC",''), NULLIF("EMP_COMM_AC",''),
      NULLIF("DLY_SALES_AC",''), NULLIF("RT_RPLC_A_CODE",''), NULLIF("RT_RPLC_ITM_FREE_A_CODE",''),
      NULLIF("COUPON_A_CODE",''), NULLIF("COUPON_RPLC_DIFF",''), NULLIF("POINT_RPLC_A_CODE",''),
      NULLIF("DLVRY_SAL_A_CODE",''), NULLIF("DLVRY_SAL_AC_CODE_DTL",''),
      NULLIF("FAS_INCR_A_CODE",''), NULLIF("FAS_DECR_A_CODE",''), NULLIF("FAS_TRNS_IMDT",''),
      NULLIF("FAS_CC_CODE",''), NULLIF("FAS_ACTV_NO",''), NULLIF("FAS_PJ_NO",''),
      NULLIF("FAS_MNT_IMDT_A_CODE",''), NULLIF("FAS_LOST_A_CODE",''), NULLIF("FAS_PRFT_A_CODE",''),
      NULLIF("HRS_DSRV_EMP_A_CODE",''), NULLIF("HRS_LOAN_EMP_A_CODE",''), NULLIF("HRS_TRUST_EMP_A_CODE",''),
      NULLIF("HRS_TRVL_PYMNT_A_CODE",''), NULLIF("HRS_MDCL_CARE_TAX_ACC",''), ${AUDIT}
    FROM extract."INTERFACE_ACC"`);
  out.branch_posting_accounts = await scalar(db, `SELECT count(*) c FROM erp.branch_posting_accounts`);

  /* ═══ op.4.1.2.8 — ربط الحسابات بالمشاريع (0 صف في أونيكس — يُنقل كما هو بلا اختراع) ═══ */
  await seed(db, "erp.account_project", "IAS_ACCOUNT_PJ", `
    INSERT INTO erp.account_project (account_code, project_no, ${AUDIT_COLS})
    SELECT "A_CODE", CAST("PJ_NO" AS bigint), ${AUDIT}
    FROM extract."IAS_ACCOUNT_PJ"`);
  out.account_project = await scalar(db, `SELECT count(*) c FROM erp.account_project`);

  /* ═══ ربط الصنف بمجموعته (يغذّي حارس حذف المجموعة — IV-R71) ═══ */
  if (await has(db, "IAS_ITM_MST")) {
    await db.exec(
      `UPDATE erp.item i SET group_code = x."G_CODE"
       FROM extract."IAS_ITM_MST" x
       WHERE i.code = x."I_CODE" AND i.group_code IS NULL AND NULLIF(x."G_CODE",'') IS NOT NULL`,
    );
  }

  return out;
}
