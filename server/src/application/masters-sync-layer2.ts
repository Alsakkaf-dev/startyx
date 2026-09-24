import type { Db } from "../infrastructure/db.ts";

/**
 * مزامنة الطبقة ٢ (البيانات الأساسية) من مستخرج أونيكس (schema `extract`) إلى `erp`.
 * نفس عقد `masters-sync-layer1.ts`: تعمل عند كل إقلاع وتملأ الناقص فقط — لا تدوس تعديل المستخدم.
 * الأعداد المتوقعة مثبّتة في `GO/` ويُطابقها `verify-layer2-records.ts` مع ملفات أونيكس نفسها.
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

async function seed(db: Db, target: string, source: string, sql: string): Promise<void> {
  if ((await scalar(db, `SELECT count(*) c FROM ${target}`)) > 0) return;
  if (!(await has(db, source))) return;
  await db.exec(sql);
}

const AUDIT = `NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
               NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz),
               COALESCE(CAST(NULLIF("UP_CNT",'') AS integer), 0)`;
const AUDIT_COLS = `created_by, created_at, updated_by, updated_at, update_count`;

/**
 * أعمدة `IAS_ITM_MST` خلف مركز الميزات (F1–F12 في GO/05-warehouse.md §op.5.1.2.10 «ب») — 145 عموداً.
 * تُحفظ في `erp.item.features` بأسماء أونيكس؛ الفارغ لا يُكتب. التقسيم الكامل
 * (37 أساسي + 145 + 39 محذوف IV-D19 + 2 محفوظ + 8 تدقيق = 231) يفحصه `verify-layer2-records.ts`.
 */
export const ITEM_FEATURE_COLS = [
  "GRP_CLASS_CODE", "MNG_CODE", "SUBG_CODE", "ITEM_TYPE", "ALTER_CODE", "MANF_CODE", "USE_EXP_DATE", "USE_BATCH_NO",
  "USE_SERIALNO", "USE_ATTCH", "ALLOW_DISC", "DISC_PER", "ALLOW_DISC_PI", "DISC_PER_PI", "ALLOW_FREE_QTY", "FREE_QTY_PER",
  "UNDER_SELLING", "USE_ITM_IN_CSS_SYS_FLG", "GROUP_NO", "ILEV_NO", "DAY_ITM_EXPIRE", "MIN_LMT_COST_PER", "MAX_LMT_COST_PER",
  "FIELD1", "FIELD2", "FIELD3", "FIELD4", "FIELD5", "FIELD6", "FIELD7", "FIELD8", "FIELD9", "FIELD10", "FIELD11", "FIELD12",
  "FIELD13", "FIELD14", "FIELD15", "FIELD16", "FIELD17", "FIELD18", "FIELD19", "FIELD20", "ASSISTANT_NO", "DETAIL_NO",
  "LENGTH_ITM", "WIDTH_ITM", "HEIGHT_ITM", "SIZE_ITM", "AREA_ITM", "WEIGHT_ITM", "SEASON_ITM", "ORE_ITM", "MARK_ITM",
  "COMPANY_ITM", "COUNTRY_ITM", "REQUIREMENT", "ASSETS", "HAS_COMM", "COMM_TYPE", "COMM_AMT", "ACTIVITY_NO", "V_CODE",
  "VNDR_A_CY", "VNDR_PRICE", "VNDR_I_CODE", "HOT_KEY", "LOW_LMT_PRNT_FRST", "LOW_LMT_PRNT_SCND", "LOW_LMT_APP_REQ_ATTCH",
  "LOW_LMT_NOT_APP_REQ_ATTCH", "WEIGHTED", "BALANCE_NO", "RET_ITM_BEFOR_EXP_PRD", "MSUR_UNT_REP", "PI_BILL_NO", "USE_GRANT",
  "GRANT_PERIOD", "ITM_COLOR", "ITM_MEASURE", "USE_WEIGHT", "CONN_ITM_SO_INC", "LNK_BRCHR", "LNK_YOUTUBE", "ALTR_MLT_FLG",
  "USED_ITM", "MRP_ITM", "MRP_ITM_CLSS", "CST_PER", "PRFT_MRGN_PRCNT", "HAS_PRCNT", "SRVC_SORT", "GNR_ITM_FLG", "HSN_CODE",
  "CST_STANDR", "STNDRD_CST_VAL", "STNDRD_CST_PRCNT", "CST_LAST_PROD", "ITM_ORDR_NO", "USE_QR_CODE",
  "USE_PRICE_EXPIRE_DATE_OPTIONAL", "USE_PRICE_BATCH_NO_OPTIONAL", "ITM_MIN_LMT_QTY", "ITM_MAX_LMT_QTY", "ITM_ROL_LMT_QTY",
  "DFLT_ASM_ORD_QTY", "PRCHS_SRVC_AC_CODE", "USE_SRLNO_TYPE", "USE_QR_CODE_TYPE", "QR_CODE_MTHD_NO", "ITM_MIN_QTY",
  "ITM_MAX_QTY", "USE_BATCH_NO_AUTO_SQ_FLG", "BATCH_NO_MTHD_NO_SQ", "KIT_ITM_CLSSFCTN_TYP", "GET_AVL_QTY_FROM_CMPNNT_FLG",
  "STATCL_CLSS", "LMT_QTY_SAL_CST", "KIT_ITEM_RANK", "WGHT_VAL_ITM", "CHK_ITM_PCS_MNDTRY_FLG", "EXCD_PER", "MWS_CHK_FLG",
  "DFLT_TIME_MNT", "LOST_PRCNT_IN_PRCHS", "ITM_SAL_LMT_PRD_DAY", "FREE_SMPL", "LOW_SAL_PRICE_ALLW_TYP",
  "LOW_SAL_PRICE_ALLW_SGN", "LOW_SAL_PRICE_ALLW_VAL_TYP", "LOW_SAL_PRICE_ALLW_VAL", "ITM_BATCH_NO_COL", "USE_IN_CRM_FLG",
  "USE_IN_VSS_FLG", "MAX_CST_ORDR_LIMT", "MIN_CST_ORDR_LIMT", "SRVC_EXEC_FLG", "APPRVD_ICODE_AS_SERIALNO", "GRNT_DSTNC",
  "ALLW_UPDT_PRICE", "ITM_BARCODE_TYP", "WT_SYS_RND_TYP", "INCM_AS_DMG_FLG", "I_CODE_OPPST", "USE_PARTITION",
] as const;

/** أعمدة الميزات في `IAS_ITM_DTL` (10) */
export const ITEM_UNIT_FEATURE_COLS = [
  "PRICE_UNIT", "CHF_UNT_FLG", "STORE_UNIT", "WEIGHT_UNIT", "CSS_UNIT", "EXCPTN_DISC_CRD_FLG", "QR_CODE_MTHD_NO",
  "USE_SRLNO", "EXCLD_PNT_CLC_FLG", "AUTO_BRCD_FLG",
] as const;

/** jsonb من أعمدة أونيكس بأسمائها — الفارغ يُسقط. jsonb_build_object حدّه 100 وسيط ⇒ دفعات من 40 عموداً. */
function featuresSql(cols: readonly string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < cols.length; i += 40) {
    const pairs = cols.slice(i, i + 40).map((c) => `'${c}', NULLIF("${c}",'')`);
    parts.push(`jsonb_build_object(${pairs.join(", ")})`);
  }
  return `jsonb_strip_nulls(${parts.join(" || ")})`;
}

const flag = (c: string) => `COALESCE("${c}" = '1', false)`;
const num = (c: string) => `CAST(NULLIF("${c}",'') AS numeric)`;
const int = (c: string) => `CAST(NULLIF("${c}",'') AS integer)`;
const txt = (c: string) => `NULLIF("${c}",'')`;
const day = (c: string) => `CAST(NULLIF("${c}",'') AS date)`;

export async function syncLayer2(db: Db): Promise<Record<string, number>> {
  const out: Record<string, number> = {};

  /* فهارس على رقم الصنف في مستندات أونيكس — فحص الحركة قبل الحذف/التعديل (IV-R97/98/99) يمسحها */
  for (const t of ["IAS_BILL_DTL", "IAS_RT_BILL_DTL", "IAS_PI_BILL_DTL", "IAS_PR_BILL_DTL", "GR_DETAIL",
    "IAS_OPEN_STOCK", "IAS_OUTGOING_DTL", "IAS_WHTRNS_DTL", "IAS_ITEM_PRICE"]) {
    if (await has(db, t)) {
      await db.exec(`CREATE INDEX IF NOT EXISTS "x_${t.toLowerCase()}_icode" ON extract."${t}" ("I_CODE")`);
    }
  }

  /* وفهارس رقم المخزن — فحص حركة المخزن قبل تغيير الفرع/الحذف (IV-R80/81) */
  for (const [t, c] of [["IAS_POST_DTL", "W_CODE"], ["IAS_BILL_DTL", "W_CODE"], ["GR_DETAIL", "W_CODE"],
    ["IAS_WHTRNS_DTL", "W_CODE"], ["IAS_OUTGOING_DTL", "W_CODE"]] as const) {
    if (await has(db, t)) {
      await db.exec(`CREATE INDEX IF NOT EXISTS "x_${t.toLowerCase()}_wcode" ON extract."${t}" ("${c}")`);
    }
  }

  /* ═══ 28 · op.5.1.2.10 — الأصناف ═══
     `erp.item` يعبّئه `load-2026.ts` بالرقم والاسم والمجموعة فقط؛ هنا تُكمَّل بقية الأعمدة للصف
     الذي لم تُكمَّل بعد (`features IS NULL`) ولم يلمسه مستخدم (`update_count = 0`). */
  if (await has(db, "IAS_ITM_MST")) {
    await db.exec(`
      UPDATE erp.item i SET
        name_en = ${txt("I_E_NAME")}, short_name_ar = ${txt("SHRT_ITM_L_NM")}, short_name_en = ${txt("SHRT_ITM_F_NM")},
        description_ar = ${txt("I_DESC")}, description_en = ${txt("I_F_DESC")}, image_ref = ${txt("I_IMG")},
        initial_cost = ${num("INIT_PRIMARY_COST")}, primary_cost = ${num("PRIMARY_COST")}, avg_cost = ${num("I_CWTAVG")},
        last_receipt_date = ${day("INCOME_DATE")}, is_stocked = COALESCE("ITEM_STORE" <> '0', true),
        inactive = ${flag("INACTIVE")}, inactive_reason = ${txt("INACTIVE_RES")}, inactive_date = ${day("INACTIVE_DATE")},
        inactive_by = CASE WHEN "INACTIVE" = '1' THEN ${txt("INACTIVE_U_ID")} END,
        is_blocked = ${flag("BLOCKED")}, no_sale = ${flag("NO_SALE")}, is_service = ${flag("SERVICE_ITM")},
        cash_sale_only = ${flag("CASH_SALE")}, no_return = ${flag("NO_RETURN_SALE")}, return_period_days = ${int("RETURN_PERIOD")},
        is_kit = ${flag("KIT_ITM")}, used_in_kit = ${flag("USED_IN_KIT_ITM")}, allow_fraction = ${flag("USE_QTY_FRACTION")},
        qty_decimals = ${int("ICODE_QTY_FRC")}, vat_type = ${int("VAT_TYPE")}, vat_pct = ${num("VAT_PER")},
        tax_classification = ${txt("CLSFCTN_CODE")}, gtin = ${txt("GTIN_CODE")},
        used_in_emp_requests = ${flag("USE_EMP_FLG")}, imported_from_excel = ${flag("IMP_XLS")},
        import_doc_type = ${txt("DOC_TYPE_REF")}, import_doc_no = ${txt("DOC_NO_REF")}, import_doc_ser = ${txt("DOC_SER_REF")},
        features = ${featuresSql(ITEM_FEATURE_COLS)},
        /* IV-D20 — «مركب» بلا مكونات يُنقل بعلامة مراجعة (67 صنفاً في أونيكس) — مرة واحدة مع التعبئة */
        needs_review = (COALESCE("KIT_ITM" = '1', false) AND NOT EXISTS (SELECT 1 FROM extract."KIT_ITEMS" k WHERE k."KIT_ITEM_NO" = x."I_CODE")),
        legacy_item_size = ${num("ITEM_SIZE")}, legacy_clc_avg_factor = ${num("CLC_AVG_FCTR_FOR_NUM_QTY")},
        created_by = ${txt("AD_U_ID")}, created_at = CAST(NULLIF("AD_DATE",'') AS timestamptz),
        updated_by = ${txt("UP_U_ID")}, updated_at = CAST(NULLIF("UP_DATE",'') AS timestamptz),
        update_count = COALESCE(${int("UP_CNT")}, 0)
      FROM extract."IAS_ITM_MST" x
      WHERE i.code = x."I_CODE" AND i.features IS NULL AND i.update_count = 0`);
  }
  out.item = await scalar(db, `SELECT count(*) c FROM erp.item`);

  await seed(db, "erp.item_unit", "IAS_ITM_DTL", `
    INSERT INTO erp.item_unit (item_code, unit_code, pack_size, level_no, is_main, is_sale, is_purchase, is_stock,
                               is_transfer, no_sale, inactive, inactive_reason, inactive_by, inactive_date, barcode,
                               desc_ar, desc_en, features, ${AUDIT_COLS})
    SELECT "I_CODE", "ITM_UNT", COALESCE(${num("P_SIZE")}, 1), COALESCE(${int("LVL_UNIT")}, 1),
           ${flag("MAIN_UNIT")}, ${flag("SALE_UNIT")}, ${flag("PUR_UNIT")}, ${flag("STOCK_UNIT")}, ${flag("TRNS_UNIT")},
           ${flag("NO_SALE")}, ${flag("INACTIVE")}, ${txt("INACTIVE_RES")},
           CASE WHEN "INACTIVE" = '1' THEN ${txt("INACTIVE_U_ID")} END, ${day("INACTIVE_DATE")},
           ${txt("BARCODE")}, ${txt("ITM_UNT_L_DSC")}, ${txt("ITM_UNT_F_DSC")},
           ${featuresSql(ITEM_UNIT_FEATURE_COLS)}, ${AUDIT}
    FROM extract."IAS_ITM_DTL"`);
  out.item_unit = await scalar(db, `SELECT count(*) c FROM erp.item_unit`);

  /* IAS_ITM_WCODE بلا AD_U_ID/AD_DATE/UP_U_ID — التدقيق المتاح: UP_DATE · UP_CNT فقط */
  await seed(db, "erp.item_warehouse", "IAS_ITM_WCODE", `
    INSERT INTO erp.item_warehouse (item_code, unit_code, pack_size, warehouse_code, warehouse_group, primary_cost,
                                    avg_cost, available_qty, allow_negative, inactive, min_cost_pct, max_cost_pct,
                                    last_reeval_serial, updated_at, update_count)
    SELECT "I_CODE", "ITM_UNT", COALESCE(${num("P_SIZE")}, 1), "W_CODE", ${txt("WHG_CODE")}, ${num("PRIMARY_COST")},
           ${num("I_CWTAVG")}, ${num("AVL_QTY")}, ${flag("NEG_QTY_FLG")}, ${flag("INACTIVE")},
           ${num("MIN_LMT_COST_PER")}, ${num("MAX_LMT_COST_PER")}, ${txt("LAST_REEVAL_SERIAL")},
           CAST(NULLIF("UP_DATE",'') AS timestamptz), COALESCE(${int("UP_CNT")}, 0)
    FROM extract."IAS_ITM_WCODE"`);
  out.item_warehouse = await scalar(db, `SELECT count(*) c FROM erp.item_warehouse`);

  await seed(db, "erp.item_vendor", "IAS_VNDR_ITM", `
    INSERT INTO erp.item_vendor (item_code, vendor_code, unit_code, pack_size, price, currency, is_main, vendor_item_code,
                                 packing, min_qty, vendor_unit, use_in_vss, ${AUDIT_COLS})
    SELECT "I_CODE", "V_CODE", "ITM_UNT", COALESCE(${num("P_SIZE")}, 1), ${num("VNDR_PRICE")}, ${txt("A_CY")},
           ${flag("MAIN_VNDR")}, ${txt("I_CODE_VNDR")}, ${txt("I_PACKING")}, ${num("ITM_MIN_QTY")}, ${txt("UNT_VNDR")},
           ${flag("USE_IN_VSS_FLG")}, ${AUDIT}
    FROM extract."IAS_VNDR_ITM"`);
  out.item_vendor = await scalar(db, `SELECT count(*) c FROM erp.item_vendor`);

  await seed(db, "erp.kit_component", "KIT_ITEMS", `
    INSERT INTO erp.kit_component (kit_item_code, component_code, unit_code, pack_size, qty, pack_qty, cost_pct, min_qty,
                                   max_qty, note, exceed_qty, allow_delete, default_warehouse, product_qty, ${AUDIT_COLS})
    SELECT "KIT_ITEM_NO", "I_CODE", "ITM_UNT", COALESCE(${num("P_SIZE")}, 1), COALESCE(${num("I_QTY")}, 0), ${num("P_QTY")},
           ${num("PER_COST_FROM_KIT_ITM")}, ${num("ITM_MIN_QTY")}, ${num("ITM_MAX_QTY")}, ${txt("NOTE")},
           ${flag("EXCD_ITM_QTY")}, ${flag("ALLW_DEL_ITM")}, ${txt("W_CODE_DFLT")}, ${num("PRDCT_QTY")}, ${AUDIT}
    FROM extract."KIT_ITEMS"`);
  out.kit_component = await scalar(db, `SELECT count(*) c FROM erp.kit_component`);

  await seed(db, "erp.item_ref_code", "INV_REF_CODE_ITM", `
    INSERT INTO erp.item_ref_code (ref_code, item_code, ${AUDIT_COLS})
    SELECT "REF_CODE", "I_CODE", ${AUDIT}
    FROM extract."INV_REF_CODE_ITM"`);
  out.item_ref_code = await scalar(db, `SELECT count(*) c FROM erp.item_ref_code`);

  /* ═══ 29 · op.5.1.2.9 — المخازن ═══
     `erp.warehouse` يعبّئه `load-2026.ts` بالرقم والاسم، والطبقة ١ بالمجموعة؛ هنا بقية الأعمدة مرة واحدة. */
  if (await has(db, "WAREHOUSE_DETAILS")) {
    await db.exec(`
      UPDATE erp.warehouse w SET
        name_en = ${txt("W_E_NAME")}, branch_no = ${int("CONN_BRN_NO")}, inactive = ${flag("INACTIVE")},
        no_sale = ${flag("NO_SALE")}, doc_sequence_key = ${int("W_SER")},
        is_main = COALESCE("MAIN_WCODE" NOT IN ('', '0'), false),
        transfer_account = ${txt("TR_A_CODE")}, transfer_analytic = ${txt("AC_CODE_DTL")},
        transfer_analytic_type = ${int("AC_DTL_TYP")}, default_cost_center = ${txt("CC_CODE")},
        default_price_level = ${int("PRICE_LVL")}, stock_cost_limit = ${num("WH_CST_LMT")},
        is_damaged_goods = ${flag("USE_DMG_ITM_FLG")}, is_service_default = ${flag("SRVC_FLG")},
        keeper_name = ${txt("WH_KEEPER")}, phone = ${txt("TEL_NO")}, location = ${txt("LOCATION")},
        country_no = ${int("CNTRY_NO")}, province_no = ${int("PROV_NO")}, city_no = ${int("CITY_NO")},
        region_code = ${txt("R_CODE")}, gln = ${txt("GLN_CODE")}, latitude = ${txt("LATITUDE")},
        longitude = ${txt("LONGITUDE")}, address_ar = ${txt("W_L_ADDRS")}, address_en = ${txt("W_F_ADDRS")},
        features = ${featuresSql(WAREHOUSE_FEATURE_COLS)},
        legacy = ${featuresSql(["W_TYPE", "GPS", "DB_LINK_NAME"])},
        /* IV-D17 — «مخزن يحذف» (1) والموقوف 300 (مندوبه ما زال عليه) للمراجعة */
        needs_review = x."W_CODE" IN ('1', '300'),
        created_by = ${txt("AD_U_ID")}, created_at = CAST(NULLIF("AD_DATE",'') AS timestamptz),
        updated_by = ${txt("UP_U_ID")}, updated_at = CAST(NULLIF("UP_DATE",'') AS timestamptz),
        update_count = COALESCE(${int("UP_CNT")}, 0)
      FROM extract."WAREHOUSE_DETAILS" x
      WHERE w.code = x."W_CODE" AND w.features IS NULL AND w.update_count = 0`);
  }
  out.warehouse = await scalar(db, `SELECT count(*) c FROM erp.warehouse`);

  /* ═══ 30 · op.4.1.2.2 — الصناديق وعملاتها ═══ */
  await seed(db, "erp.cashbox", "CASH_IN_HAND", `
    INSERT INTO erp.cashbox (no, name_ar, name_en, account_code, sequence_group, receipt_seq_type, cash_type,
                             use_cash_income, is_mediator, pos_sys, default_payment_type, default_receipt_type, group_no,
                             branch_no, last_reconciled_at, inactive, inactive_date, inactive_reason, favourite, ${AUDIT_COLS})
    SELECT CAST("CASH_NO" AS integer), COALESCE("CASH_NAME",''), ${txt("CASH_E_NAME")}, "A_CODE", ${int("CASH_SR")},
           COALESCE(${int("RCPT_SRL_TYP")}, 1), COALESCE(${int("CASH_TYPE")}, 3), ${flag("USE_CASH_INCOME")},
           ${flag("MEDIATOR")}, ${flag("POS_SYS")}, ${int("PYMNT_TYP_NO_DFLT")}, ${int("RCVD_TYP_NO_DFLT")}, ${int("GROUP_NO")},
           CAST("CONN_BRN_NO" AS integer), ${day("CONF_LAST_DATE")}, ${flag("INACTIVE")}, ${day("INACTIVE_DATE")},
           ${txt("INACTIVE_RES")}, ${flag("FAV_AC")}, ${AUDIT}
    FROM extract."CASH_IN_HAND"`);
  out.cashbox = await scalar(db, `SELECT count(*) c FROM erp.cashbox`);

  await seed(db, "erp.cashbox_currency", "IAS_CASH_IN_HAND_DTL", `
    INSERT INTO erp.cashbox_currency (cash_no, currency, account_code, opening_local, opening_foreign, current_local,
                                      current_foreign, is_default, inactive, inactive_date, min_balance, max_balance,
                                      min_txn, max_txn, pass_limit, ${AUDIT_COLS})
    SELECT CAST("CASH_NO" AS integer), "A_CY", ${txt("A_CODE")}, ${num("OPEN_BAL_L")}, ${num("OPEN_BAL_F")},
           ${num("CURR_BAL_L")}, ${num("CURR_BAL_F")}, ${flag("DFLT")}, ${flag("INACTIVE")}, ${day("INACTIVE_DATE")},
           ${num("MIN_LMT_AMT")}, ${num("MAX_LMT_AMT")}, ${num("MIN_LMT_TRNS_AMT")}, ${num("MAX_LMT_TRNS_AMT")},
           ${int("PASS_LMT")}, ${AUDIT}
    FROM extract."IAS_CASH_IN_HAND_DTL"`);
  out.cashbox_currency = await scalar(db, `SELECT count(*) c FROM erp.cashbox_currency`);

  /* ═══ 31 · op.4.1.2.3 — البنوك وعملاتها ═══ */
  await seed(db, "erp.bank", "CASH_AT_BANK", `
    INSERT INTO erp.bank (no, name_ar, name_en, account_code, sequence_group, receipt_seq_type, default_payment_type,
                          default_receipt_type, group_no, bank_account_no, description, branch_no, phone, fax, po_box,
                          address, email, website, country_no, city_no, is_mediator, network_code, inactive, inactive_by,
                          inactive_date, inactive_reason, logo_ref, notes_receivable_account, notes_payable_account,
                          cheque_intermediary_account, notes_payable_analytic, notes_receivable_analytic,
                          cheque_intermediary_analytic, cheque_intermediary_analytic_type, notes_payable_analytic_type,
                          notes_receivable_analytic_type, card_amount_post_type, commission_vat, print_template, bank_class,
                          favourite, last_reconciled_at, cheque_auto_seq, bank_code, ${AUDIT_COLS})
    SELECT CAST("BANK_NO" AS integer), COALESCE("BANK_NAME",''), ${txt("BANK_E_NAME")}, "A_CODE", CAST("BANK_SR" AS integer),
           COALESCE(${int("RCPT_SRL_TYP")}, 1), ${int("PYMNT_TYP_NO_DFLT")}, ${int("RCVD_TYP_NO_DFLT")}, ${int("GROUP_NO")},
           ${txt("BANK_ACC")}, ${txt("BANK_DSC")}, ${int("CONN_BRN_NO")}, ${txt("B_TEL")}, ${txt("B_FAX")}, ${txt("B_BOX")},
           ${txt("B_ADDRESS")}, ${txt("B_E_MAIL")}, ${txt("B_WEB_SITE")}, ${int("CNTRY_NO")}, ${int("CITY_NO")},
           ${flag("MEDIATOR")}, ${txt("BNK_NTWRK_CODE")}, ${flag("INACTIVE")},
           CASE WHEN "INACTIVE" = '1' THEN ${txt("INACTIVE_U_ID")} END, ${day("INACTIVE_DATE")}, ${txt("INACTIVE_RES")},
           ${txt("BANK_IMG")}, ${txt("REC_LETTER")}, ${txt("PAY_LETTER")}, ${txt("CHQ_PAY_INTRM_AC")},
           ${txt("PAY_LETTER_DTL")}, ${txt("REC_LETTER_DTL")}, ${txt("CHQ_PAY_INTRM_AC_DTL")},
           ${int("CHQ_PAY_INTRM_AC_DTL_TYP")}, ${int("PAY_LETTER_DTL_TYP")}, ${int("REC_LETTER_DTL_TYP")},
           ${int("CRD_CARD_AMT_PST_TYP")}, ${flag("COMM_TAX_FRC")}, ${txt("REP_SMPLE")}, COALESCE(${int("BNK_CLSS_TYP")}, 1),
           ${flag("FAV_AC")}, ${day("CONF_LAST_DATE")}, ${flag("OCHK_AUTO_SER")}, ${txt("BANK_CODE")}, ${AUDIT}
    FROM extract."CASH_AT_BANK"`);
  out.bank = await scalar(db, `SELECT count(*) c FROM erp.bank`);

  await seed(db, "erp.bank_currency", "IAS_CASH_AT_BANK_DTL", `
    INSERT INTO erp.bank_currency (bank_no, currency, account_code, opening_local, opening_foreign, current_local,
                                   current_foreign, is_default, inactive, inactive_date, min_balance, max_balance, min_txn,
                                   max_txn, pass_limit, bank_account_no, ${AUDIT_COLS})
    SELECT CAST("BANK_NO" AS integer), "A_CY", ${txt("A_CODE")}, ${num("OPEN_BAL_L")}, ${num("OPEN_BAL_F")},
           ${num("CURR_BAL_L")}, ${num("CURR_BAL_F")}, ${flag("DFLT")}, ${flag("INACTIVE")}, ${day("INACTIVE_DATE")},
           ${num("MIN_LMT_AMT")}, ${num("MAX_LMT_AMT")}, ${num("MIN_LMT_TRNS_AMT")}, ${num("MAX_LMT_TRNS_AMT")},
           ${int("PASS_LMT")}, ${txt("BNK_AC")}, ${AUDIT}
    FROM extract."IAS_CASH_AT_BANK_DTL"`);
  out.bank_currency = await scalar(db, `SELECT count(*) c FROM erp.bank_currency`);

  /* ═══ 32 · op.5.1.2.14 — تسعيرة الأصناف ورقابتها ═══
     الانتهاء 1900-01-01 والدفعة '0' قيمة «لا شيء» في أونيكس ⇒ NULL (GO §op.5.1.2.14 ٣) · DCTR_PRICE لا يُنقل (IV-D22) */
  const noDate = (c: string) => `CASE WHEN "${c}" LIKE '1900-01-01%' THEN NULL ELSE ${day(c)} END`;
  const noBatch = (c: string) => `CASE WHEN "${c}" IN ('', '0') THEN NULL ELSE "${c}" END`;
  await seed(db, "erp.item_price", "IAS_ITEM_PRICE", `
    INSERT INTO erp.item_price (price_level, item_code, unit_code, pack_size, price, min_price, max_price, branch_no,
                                imported_from_excel, note, warehouse_code, from_qty, to_qty, expire_date, batch_no, ${AUDIT_COLS})
    SELECT CAST("LEV_NO" AS integer), "I_CODE", "ITM_UNT", COALESCE(${num("P_SIZE")}, 1), CAST("I_PRICE" AS numeric),
           ${num("MIN_ITM_PRICE")}, ${num("MAX_ITM_PRICE")}, ${int("BRN_NO")}, ${flag("IMP_XLS")}, ${txt("NOTE")},
           ${txt("W_CODE")}, ${num("FROM_QTY")}, ${num("TO_QTY")}, ${noDate("EXPIRE_DATE")}, ${noBatch("BATCH_NO")}, ${AUDIT}
    FROM extract."IAS_ITEM_PRICE"`);
  out.item_price = await scalar(db, `SELECT count(*) c FROM erp.item_price`);

  await seed(db, "erp.item_price_audit", "IAS_ITEM_PRICE_HISTORY", `
    INSERT INTO erp.item_price_audit (audit_no, action, input_method, audited_by, audited_at, doc_no, doc_date, branch_no,
                                      price_level, item_code, unit_code, pack_size, warehouse_code, expire_date, batch_no,
                                      from_qty, to_qty, price, prev_price, min_price, prev_min_price, max_price,
                                      prev_max_price, ${AUDIT_COLS})
    SELECT CAST("AUD_NO" AS bigint), CAST("AUD_TYPE" AS integer), ${int("INPT_MTHD")}, ${txt("AUD_U_ID")},
           CAST(NULLIF("AUD_DATE",'') AS timestamptz), ${txt("DOC_NO")}, ${day("DOC_DATE")}, ${int("BRN_NO")},
           ${int("LEV_NO")}, ${txt("I_CODE")}, ${txt("ITM_UNT")}, ${num("P_SIZE")}, ${txt("W_CODE")},
           ${noDate("EXPIRE_DATE")}, ${noBatch("BATCH_NO")}, ${num("FROM_QTY")}, ${num("TO_QTY")}, ${num("I_PRICE")},
           ${num("PREV_I_PRICE")}, ${num("MIN_ITM_PRICE")}, ${num("PREV_MIN_ITM_PRICE")}, ${num("MAX_ITM_PRICE")},
           ${num("PREV_MAX_ITM_PRICE")}, ${AUDIT}
    FROM extract."IAS_ITEM_PRICE_HISTORY"`);
  out.item_price_audit = await scalar(db, `SELECT count(*) c FROM erp.item_price_audit`);

  /* ═══ 33 · op.7.1.2.4 — مندوبو المبيعات وربط عملائهم وصلاحياتهم ومواقعهم ═══ */
  const cast = (c: string, k: SalesmanKind) =>
    k === "bool" ? flag(c) : k === "int" ? int(c) : k === "num" ? num(c) : k === "date" ? day(c)
      : k === "ts" ? `CAST(NULLIF("${c}",'') AS timestamptz)` : txt(c);
  await seed(db, "erp.salesman", "SALES_MAN", `
    INSERT INTO erp.salesman (${SALESMAN_COLS.map(([, e]) => e).join(", ")}, features, ${AUDIT_COLS})
    SELECT ${SALESMAN_COLS.map(([o, , k]) => (o === "REPRS_A_NAME" ? `COALESCE("${o}",'')` : o === "CONN_SP_SMAN" || o === "CHEQ_TYPE" ? `COALESCE(${int(o)}, 0)` : cast(o, k))).join(", ")},
           ${featuresSql(SALESMAN_FEATURE_COLS)}, ${AUDIT}
    FROM extract."SALES_MAN"`);
  /* SR-R12 — «اخر تاريخ بيع» من آخر فاتورة مبيعات بالمندوب */
  if (await has(db, "IAS_BILL_MST")) {
    await db.exec(`
      UPDATE erp.salesman s SET last_sale_date = x.d
      FROM (SELECT "REP_CODE" rep, max(CAST(NULLIF("BILL_DATE",'') AS date)) d FROM extract."IAS_BILL_MST"
            WHERE NULLIF("REP_CODE",'') IS NOT NULL GROUP BY 1) x
      WHERE s.code = x.rep AND s.last_sale_date IS NULL`);
  }
  out.salesman = await scalar(db, `SELECT count(*) c FROM erp.salesman`);

  await seed(db, "erp.salesman_customer", "IAS_CST_SMAN", `
    INSERT INTO erp.salesman_customer (rep_code, customer_code, visit_day1, visit_day2, visit_day3, visit_day4, visit_day5,
                                       visit_day6, visit_day7, is_default, inactive, inactive_date, inactive_by,
                                       inactive_reason, features, ${AUDIT_COLS})
    SELECT "REP_CODE", "C_CODE", ${flag("FLD_DAY1")}, ${flag("FLD_DAY2")}, ${flag("FLD_DAY3")}, ${flag("FLD_DAY4")},
           ${flag("FLD_DAY5")}, ${flag("FLD_DAY6")}, ${flag("FLD_DAY7")}, ${flag("DFLT_FLG")}, ${flag("INACTIVE")},
           CAST(NULLIF("INACTIVE_DATE",'') AS timestamptz), ${txt("INACTIVE_U_ID")}, ${txt("INACTIVE_RES")},
           ${featuresSql(["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"])}, ${AUDIT}
    FROM extract."IAS_CST_SMAN"`);
  out.salesman_customer = await scalar(db, `SELECT count(*) c FROM erp.salesman_customer`);

  await seed(db, "erp.salesman_user", "IAS_PRIV_SMAN", `
    INSERT INTO erp.salesman_user (rep_code, user_id, can_add, can_view, created_by, created_at, updated_by, updated_at)
    SELECT "REP_CODE", CAST("U_ID" AS integer), ${flag("ADD_FLAG")}, ${flag("VIEW_FLAG")},
           NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
           NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz)
    FROM extract."IAS_PRIV_SMAN"`);
  out.salesman_user = await scalar(db, `SELECT count(*) c FROM erp.salesman_user`);

  await seed(db, "erp.salesman_location", "ARS_LOCTN_GEO_SMAN", `
    INSERT INTO erp.salesman_location (rep_code, loc_type, code_no, ${AUDIT_COLS})
    SELECT "REP_CODE", CAST("LOC_TYP" AS integer), CAST("CODE_NO" AS integer), ${AUDIT}
    FROM extract."ARS_LOCTN_GEO_SMAN"`);
  out.salesman_location = await scalar(db, `SELECT count(*) c FROM erp.salesman_location`);

  /* تبويب ٧ «العمليات» — عرض أونيكس IAS_V_SM_MOVE حرفياً: الصافي = المبلغ − الخصم · العمولة = الصافي × النسبة ÷ 100 · المردود بالسالب */
  const ops = (await has(db, "IAS_BILL_MST")) && (await has(db, "IAS_RT_BILL_MST")) && (await has(db, "S_FLAGS"));
  await db.exec(`DROP VIEW IF EXISTS erp.salesman_operation`);
  await db.exec(ops
    ? `CREATE VIEW erp.salesman_operation AS
       SELECT m."REP_CODE" rep_code, 1 op_kind, 'فواتير المبيعات' op_kind_name, m."BILL_NO" doc_no, f."FLG_DESC" doc_type_name,
              CAST(NULLIF(m."BILL_DATE",'') AS date) doc_date, m."C_CODE" customer_code, m."C_NAME" customer_name,
              m."BILL_CURRENCY" currency,
              COALESCE(CAST(NULLIF(m."BILL_AMT",'') AS numeric),0) - COALESCE(CAST(NULLIF(m."DISC_AMT",'') AS numeric),0) amount,
              (COALESCE(CAST(NULLIF(m."BILL_AMT",'') AS numeric),0) - COALESCE(CAST(NULLIF(m."DISC_AMT",'') AS numeric),0))
                * COALESCE(CAST(NULLIF(m."COMM_PER",'') AS numeric),0) / 100 commission
       FROM extract."IAS_BILL_MST" m
       LEFT JOIN extract."S_FLAGS" f ON f."FLG_CODE" = 'TYPE_NAME_SI' AND f."LANG_NO" = '1' AND f."FLG_VALUE" = m."BILL_DOC_TYPE"
       WHERE NULLIF(m."REP_CODE",'') IS NOT NULL
       UNION ALL
       SELECT r."REP_CODE", 2, 'فواتير مردود المبيعات', r."RT_BILL_NO", f."FLG_DESC", CAST(NULLIF(r."RT_BILL_DATE",'') AS date),
              r."C_CODE", r."C_NAME", r."RT_BILL_CURRENCY",
              -(COALESCE(CAST(NULLIF(r."BILL_AMT",'') AS numeric),0) - COALESCE(CAST(NULLIF(r."DISC_AMT",'') AS numeric),0)),
              -((COALESCE(CAST(NULLIF(r."BILL_AMT",'') AS numeric),0) - COALESCE(CAST(NULLIF(r."DISC_AMT",'') AS numeric),0))
                * COALESCE(CAST(NULLIF(r."COMM_PER",'') AS numeric),0) / 100)
       FROM extract."IAS_RT_BILL_MST" r
       LEFT JOIN extract."S_FLAGS" f ON f."FLG_CODE" = 'TYPE_NAME' AND f."LANG_NO" = '1' AND f."FLG_VALUE" = r."RT_BILL_DOC_TYPE"
       WHERE NULLIF(r."REP_CODE",'') IS NOT NULL`
    : `CREATE VIEW erp.salesman_operation AS
       SELECT NULL::text rep_code, NULL::integer op_kind, NULL::text op_kind_name, NULL::text doc_no, NULL::text doc_type_name,
              NULL::date doc_date, NULL::text customer_code, NULL::text customer_name, NULL::text currency,
              NULL::numeric amount, NULL::numeric commission WHERE false`);
  if (ops) {
    await db.exec(`CREATE INDEX IF NOT EXISTS x_ias_bill_mst_rep ON extract."IAS_BILL_MST" ("REP_CODE")`);
    await db.exec(`CREATE INDEX IF NOT EXISTS x_ias_rt_bill_mst_rep ON extract."IAS_RT_BILL_MST" ("REP_CODE")`);
  }

  return out;
}

type SalesmanKind = "text" | "int" | "num" | "bool" | "date" | "ts";

/**
 * `SALES_MAN` ⇐ `erp.salesman`: كل عمود له حقل في تبويبات الشاشة (١ الرئيسية · ٢ الضمانات · ٣ نظام التوزيع) — 87.
 * مع `SALESMAN_FEATURE_COLS` (27) و5 تدقيق = 119 عموداً؛ يفحصه `verify-layer2-records.ts` مع رأس الملف.
 */
export const SALESMAN_COLS: [string, string, SalesmanKind][] = [
  ["REPRS_CODE", "code", "text"], ["REPRS_A_NAME", "name_ar", "text"], ["REPRS_E_NAME", "name_en", "text"],
  ["REP_CODE_PARENT", "parent_code", "text"], ["SMAN_TYPE", "rep_type", "int"], ["CONN_SP_SMAN", "classification", "int"],
  ["R_A_CODE", "account_code", "text"], ["AC_DTL_TYP", "account_analytic_type", "int"], ["AC_CODE_DTL", "account_analytic", "text"],
  ["R_ADDRESS", "address", "text"], ["R_PHONE", "phone", "text"], ["R_BOX", "po_box", "text"], ["R_FAX", "fax", "text"],
  ["R_MOBILE", "mobile", "text"], ["CNTRY_NO", "country_no", "int"], ["CITY_NO", "city_no", "int"], ["R_CODE", "region_no", "int"],
  ["COMM_PER", "commission_pct", "num"], ["ROUTE_NO", "route_no", "int"], ["SORTINROUTE", "route_order", "int"],
  ["R_NOTE", "notes", "text"], ["W_CODE", "warehouse_code", "text"], ["RT_W_CODE", "return_warehouse_code", "text"],
  ["CASH_NO", "cash_no", "int"], ["CC_CODE", "cost_center", "text"], ["PJ_NO", "project_no", "int"], ["ACTV_NO", "activity_no", "int"],
  ["CR_LMT", "credit_limit", "num"], ["BANK_NO", "bank_no", "int"], ["PLAN_NO_AMOUNT", "sales_plan_amount_no", "int"],
  ["PLAN_SER_AMOUNT", "sales_plan_amount_ser", "int"], ["EMP_NO", "employee_no", "text"], ["PLAN_NO", "sales_plan_qty_no", "int"],
  ["PLAN_SER", "sales_plan_qty_ser", "int"], ["COL_PLAN_NO", "collection_plan_no", "int"], ["INACTIVE", "inactive", "bool"],
  ["INACTIVE_U_ID", "inactive_by", "text"], ["INACTIVE_DATE", "inactive_date", "date"], ["INACTIVE_RES", "inactive_reason", "text"],
  /* تبويب ٢ — الضمانات (36–50) */
  ["G_STATUS", "g_status", "int"], ["G_TYPE", "g_type", "int"], ["G_START_DATE", "g_start_date", "date"],
  ["G_EXPIRE_DATE", "g_expire_date", "date"], ["G_NAME", "g_name", "text"], ["G_ADDRESS", "g_address", "text"],
  ["G_WORK", "g_work", "text"], ["G_FIN_CENTER", "g_fin_center", "text"], ["G_AMT", "g_amount", "num"],
  ["G_DOC_DATE", "g_doc_date", "date"], ["G_REG_COURT", "g_court_reg", "text"], ["G_REG_TRADA", "g_chamber_reg", "text"],
  ["G_FILE_TRADA", "g_cr_no", "text"], ["G_TEL", "g_phone", "text"], ["G_FAX", "g_fax", "text"],
  /* تبويب ٣ — نظام التوزيع: الحقول (51–62) */
  ["CLC_TYP_NO_TAX", "tax_calc_method", "int"], ["GRP_CODE", "distribution_group", "text"], ["CHEQ_TYPE", "cheque_post_type", "int"],
  ["VST_OPN_DSTNC", "visit_open_distance", "int"], ["REGN_RNG", "district_radius", "int"],
  ["APP_ROUT_MAX_LMT_EXPCTN", "route_deviation_max", "int"], ["APP_CSTMR_PLN_INSRT_MAX_LMT", "plan_customer_max", "int"],
  ["CASH_AMT_LMT", "cash_cumulative_limit", "num"], ["CASH_AMT_DAILY_LMT", "cash_daily_limit", "num"],
  ["VST_OPN_TYP", "visit_open_type", "int"], ["LAST_UP_DATE_DTS", "app_last_update_at", "ts"],
  ["LAST_POST_DATE_DTS", "app_last_post_at", "ts"],
  /* والمؤشرات (63–83) */
  ["ALLW_MOD_CST_LOCTN", "allow_edit_customer_location", "bool"], ["ALLW_RTRN_ALL_ITM_FLG", "allow_return_all_items", "bool"],
  ["WRK_WITHOUT_PLN", "work_without_plan", "bool"], ["ALLW_CNCL_DOC", "allow_cancel_docs", "bool"], ["NO_SAL", "no_sale", "bool"],
  ["NO_COLCT", "no_collect", "bool"], ["ALLW_FILE_SHARE", "allow_file_share", "bool"],
  ["NOT_ALLW_ENTR_RTRN_SAL", "no_sales_return", "bool"], ["USE_RT_BILL_RQ_TYP", "return_request_required", "bool"],
  ["USE_CLOSE_UPDT_DAILY", "daily_close", "bool"], ["PRINT_BY_ULT_APP", "print_by_ultimate_app", "bool"],
  ["ALLW_INPUT_OUT_TRNS_REQ", "allow_issue_transfer_requests", "bool"], ["ALLW_RTRN_BILL_OTHER_SMAN", "allow_return_other_rep", "bool"],
  ["NOT_ALLW_UPDT_PARTIAL_DATA", "no_partial_update", "bool"], ["INACTV_NONE_ADHERE_PLAN_FLG", "stop_if_plan_missed", "bool"],
  ["ALLW_WHTRNS_DIRCT", "allow_direct_transfer", "bool"], ["USE_RES_IN_SO_APP", "auto_reserve_orders", "bool"],
  ["CLS_VST_BY_GPS", "close_visit_by_gps", "bool"], ["ALLW_APPROV_CSTMR_TRGT", "allow_approve_target_customer", "bool"],
  ["NOT_ALLW_SAL_OUT_LOCTN_GEO", "no_sale_outside_locations", "bool"], ["USE_VCHR_RCPT_RQ", "receipt_request_in_app", "bool"],
];

/** بقية أعمدة `SALES_MAN` — إعدادات تطبيق الجوال والإقفال بلا حقل في شاشة أونيكس (27) */
export const SALESMAN_FEATURE_COLS = [
  "USE_INV_DTS", "SMAN_PASS", "POST_CHEQ_TYPE_REC", "CONN_BRN_NO", "IMPLMNT_PLAN_SRTROUTE_MNDTRY", "ALLW_CHNG_CST_GPS",
  "AUTO_MOBILE_POSTING", "SHW_QTY_IN_ALL_WRHS", "APP_VER_CODE", "SAVE_VCHR_ONLINE", "SYNC_METHOD", "DTS_CLS_FLG",
  "DTS_CLS_U_ID", "DTS_CLS_DATE", "REP_SER", "ALLW_SO_WH_REP_CONN_BRN", "USE_RET_WCODE", "OPN_CLS_VST_AUTO",
  "ALLW_UPDT_VCHR_APP", "SO_RES_PRD", "SO_W_CODE", "SEND_GPS_PRD", "READ_GPS_DSTNC", "STOP_TRK", "PR_REP",
  "AD_TRMNL_NM", "UP_TRMNL_NM",
] as const;

/** أعمدة `WAREHOUSE_DETAILS` خلف مركز الميزات (IV-D15): ب 13 + د 12 + نشاط الصنف = 26 */
export const WAREHOUSE_FEATURE_COLS = [
  "USE_BOE", "USE_AUTO_REC_WHTRNS", "CHK_AVL_QTY", "WCODE_SALE_TYP", "USE_BIN_MOV", "USE_PRPRTN_FLG", "ALLW_SL_IN_BRN",
  "FREE_SMPL_WH", "CUS_WH_UNDR_DSPSL_FLG", "USE_REC_SAL_FLG", "POS_WH_FLG", "PJ_NO", "ACTV_NO",
  "SHO_WC_TYP", "SHO_SYS_TYP", "SO_TYPE", "SO_DSC", "SC_NO", "BANK_NO", "REP_CODE", "COL_NO", "C_CODE", "C_GROUP_CODE",
  "CLC_TYP_NO_TAX", "A_CY", "ACTIVITY_NO",
] as const;
