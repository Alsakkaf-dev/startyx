import { createHash } from "node:crypto";
import type { Db } from "../infrastructure/db.ts";
import { openingLedgerSql } from "./masters-sync-opening.ts";

/**
 * مزامنة بقية الطبقة ٢ (BUILD-ORDER 34–36: العملاء · الموردون · الموظفون) من مستخرج أونيكس إلى `erp`.
 * نفس عقد `masters-sync-layer2.ts`: تعمل عند كل إقلاع وتملأ الناقص فقط — لا تدوس تعديل المستخدم.
 * كل عمود في جدول أونيكس المصدر له مكان واحد: عمود ظاهر · ميزات (jsonb بأسماء أونيكس) · محذوف بقرار · تدقيق —
 * والتقسيم يفحصه `verify-layer2-records.ts` مقابل رأس ملف أونيكس نفسه.
 */

export type ColKind = "text" | "int" | "num" | "bool" | "date" | "ts";
export type ColSpec = [onyx: string, erp: string, kind: ColKind];

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

/** jsonb من أعمدة أونيكس بأسمائها — الفارغ يُسقط. jsonb_build_object حدّه 100 وسيط ⇒ دفعات من 40 عموداً. */
export function featuresSql(cols: readonly string[], alias = ""): string {
  if (!cols.length) return `'{}'::jsonb`;
  const parts: string[] = [];
  for (let i = 0; i < cols.length; i += 40) {
    const pairs = cols.slice(i, i + 40).map((c) => `'${c}', NULLIF(${alias}"${c}",'')`);
    parts.push(`jsonb_build_object(${pairs.join(", ")})`);
  }
  return `jsonb_strip_nulls(${parts.join(" || ")})`;
}

/** تحويل خانة أونيكس النصية إلى نوع عمود erp — المنطقي «1» فقط صحيح (0/فارغ خطأ) */
export function castSql(col: string, kind: ColKind, alias = ""): string {
  const c = `${alias}"${col}"`;
  switch (kind) {
    case "bool": return `COALESCE(${c} = '1', false)`;
    case "int": return `CAST(NULLIF(${c},'') AS integer)`;
    case "num": return `CAST(NULLIF(${c},'') AS numeric)`;
    case "date": return `CAST(NULLIF(${c},'') AS date)`;
    case "ts": return `CAST(NULLIF(${c},'') AS timestamp)`;
    default: return `NULLIF(${c},'')`;
  }
}

/** DDL عمود erp لنوع المواصفة */
export function sqlType(kind: ColKind): string {
  return { text: "text", int: "integer", num: "numeric(28,10)", bool: "boolean NOT NULL DEFAULT false", date: "date", ts: "timestamp" }[kind];
}

/** كلمة سر البوابة (SECRET_KEY) تُحفظ بصمةً لا نصاً — GO/07 §op.7.1.2.8 «٦»: «تُعيَّن ولا تُعرض» */
export function secretHash(plain: string): string {
  return createHash("sha256").update("startyx-portal|" + plain, "utf8").digest("hex");
}

export const AUDIT5 = ["AD_U_ID", "AD_DATE", "UP_U_ID", "UP_DATE", "UP_CNT"] as const;
export const AUDIT8 = [...AUDIT5, "PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"] as const;
const AUDIT = `NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
               NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz),
               COALESCE(CAST(NULLIF("UP_CNT",'') AS integer), 0)`;
const AUDIT_COLS = `created_by, created_at, updated_by, updated_at, update_count`;

/* ═══════════ op.1.1.12 — الفروع · S_BRN (92) [GO/01-system-setup.md] ═══════════
   كان «غير مقروء (BLOB)» ⇒ الرقم والاسم فقط (SY-Q4). القارئ يتخطى رأس LOB ويقرأ الصفوف الستة كاملة. */
export const BRANCH_COLS: ColSpec[] = [
  ["BRN_NO", "no", "int"], ["CMP_NO", "company_id", "int"], ["BRN_LNAME", "name_ar", "text"], ["BRN_FNAME", "name_en", "text"],
  ["BRN_SRL", "seq_no", "int"], ["BRN_YEAR", "start_year", "int"], ["MAIN_BRN", "is_main", "bool"],
  ["BRN_TAX_CODE", "vat_no", "text"], ["RC_CODE", "cr_no", "text"], ["CITY_NO", "city_no", "int"],
  ["DSTRCT_NM", "district", "text"], ["STREET", "street", "text"], ["BUILDING_NO", "building_no", "text"],
  ["POSTAL_CODE", "postal_code", "text"], ["ADD_NO", "additional_no", "text"], ["SHRT_ADD", "short_address", "text"],
  ["BRN_IDNTFR", "id_scheme", "text"], ["USE_E_INVOICE", "einvoice_enabled", "bool"], ["INACTIVE", "inactive", "bool"],
];
/** الترويسة · Onyx Lite · التأمينات · إقفال الأرباح لكل فرع · PAN/TAN … — خلف مركز الميزات بأسماء أونيكس */
export const BRANCH_FEATURE_COLS = [
  "BRN_PARENT", "CMP_GRP", "TAX_GRP_NO", "CMP_LNAME", "CMP_FNAME", "BRN_LDES", "BRN_FDES", "BRN_LADD", "BRN_FADD",
  "BRN_LTELE", "BRN_FTELE", "BRN_LFAX", "BRN_FFAX", "BRN_LBOX", "BRN_FBOX", "DIAL_NAME", "RPRT_HDR_TYP", "RPRT_HDR_IMG_NM",
  "RPRT_HDR_IMG_NM_H", "BRN_CODE", "BRN_LOCAL", "BRN_LGHT", "CNTRY_NO", "PROV_NO", "R_CODE", "TKN_PIN", "TKN_DLL_NM",
  "CMP_IMG", "LATITUDE", "LONGITUDE", "GPS_COLOR", "GPS", "WEB_SITE", "IDNFNT_SCL_SCRTY_NO", "AGNCY_SCL_SCRTY_CODE",
  "AGNCY_SCL_SCRTY_NM", "TAX_WEB_SITE", "BRN_USR", "NAI_TAX", "NIS_CODE", "BRN_TEL_NO", "INACTIVE_DATE", "INACTIVE_U_ID",
  "INACTIVE_RES", "CAPITAL", "GRP_NO", "PL_CLS", "PL_CLS_CNT", "PL_CLS_U_ID", "PL_CLS_DATE", "PL_CLS_A_CODE",
  "PL_CLS_CUR_CODE", "PL_CLS_AMT", "PL_UNCLS_U_ID", "PL_UNCLS_DATE", "PAN_CODE", "TAN_CODE", "TAX_AUTH_CODE",
  "SHW_QR_CODE_RPRT_FLG", "POS_REF_CODE", "SAL_AMT_LMT", "ACTVTY_CLSS_NO", "ACTVTY_CLSS_NM", "BRN_SUB_TAX_CODE",
] as const;
export const BRANCH_LOB = ["RPRT_HDR_IMG"] as const;

/** الفرع من S_BRN — يُكمَّل مرة واحدة (features IS NULL) ولا يدوس تعديل مستخدم (update_count = 0) */
async function syncBranches(db: Db): Promise<void> {
  if (!(await has(db, "S_BRN"))) return;
  if ((await scalar(db, `SELECT count(*) c FROM extract."S_BRN" WHERE "BRN_NO" ~ '^[0-9]+$'`)) === 0) return;
  const sets = BRANCH_COLS.filter(([o]) => o !== "BRN_NO").map(([o, e, k]) => `${e} = ${castSql(o, k, "x.")}`);
  await db.exec(`
    UPDATE erp.branch b SET ${sets.join(", ")},
      city = COALESCE((SELECT c."CITY_A_NAME" FROM extract."CITIES" c WHERE c."CITY_NO" = x."CITY_NO" LIMIT 1), b.city),
      code = COALESCE(NULLIF(x."BRN_CODE",''), b.code),
      features = ${featuresSql(BRANCH_FEATURE_COLS, "x.")},
      legacy = ${featuresSql(["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"], "x.")},
      created_by = NULLIF(x."AD_U_ID",''), created_at = CAST(NULLIF(x."AD_DATE",'') AS timestamptz),
      updated_by = NULLIF(x."UP_U_ID",''), updated_at = CAST(NULLIF(x."UP_DATE",'') AS timestamptz),
      update_count = COALESCE(CAST(NULLIF(x."UP_CNT",'') AS integer), 0)
    FROM extract."S_BRN" x
    WHERE b.no = CAST(x."BRN_NO" AS integer) AND b.features IS NULL AND b.update_count = 0`);
  /* فرع عُدِّل في startyx قبل أن يُقرأ S_BRN: يُكمَّل الفارغ فقط ولا يُمسّ ما أدخله المستخدم (النص غير الفارغ يبقى،
     والمؤشر يصير صحيحاً إن كان صحيحاً في أيٍّ منهما) — لا فقد لتعديل ولا لقيمة أونيكس */
  const fill = BRANCH_COLS.filter(([o]) => o !== "BRN_NO").map(([o, e, k]) =>
    k === "bool" ? `${e} = b.${e} OR ${castSql(o, k, "x.")}`
      : k === "text" ? `${e} = COALESCE(NULLIF(b.${e},''), ${castSql(o, k, "x.")})`
        : `${e} = COALESCE(b.${e}, ${castSql(o, k, "x.")})`);
  await db.exec(`
    UPDATE erp.branch b SET ${fill.join(", ")},
      city = COALESCE(NULLIF(b.city,''), (SELECT c."CITY_A_NAME" FROM extract."CITIES" c WHERE c."CITY_NO" = x."CITY_NO" LIMIT 1)),
      features = ${featuresSql(BRANCH_FEATURE_COLS, "x.")},
      legacy = ${featuresSql(["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"], "x.")},
      created_by = COALESCE(b.created_by, NULLIF(x."AD_U_ID",'')),
      created_at = COALESCE(b.created_at, CAST(NULLIF(x."AD_DATE",'') AS timestamptz))
    FROM extract."S_BRN" x
    WHERE b.no = CAST(x."BRN_NO" AS integer) AND b.features IS NULL AND b.update_count > 0`);
}

/* ═══════════ 34 · op.7.1.2.8 — بيانات العملاء · CUSTOMER (277 عموداً) [GO/07-customers-sales.md] ═══════════
   الترتيب = ترتيب بنود GO (الرأس ثم التبويبات). القوائم من S_FLAGS: C_CLASS_VAT 1–5 · PRIV_LEVEL 0–2 (#63) ·
   AUTO_SEND 0/1/3 (#69) · CST_RGSTR_TYP 1–4 · CST_SCTR_TYP 1–2 · CUST_GNDR 1–2 · VST_OPN_TYP_CST 1–4 ·
   CST_LMT_ITM_QTY_TYP 0–2 · G_STATUS/G_TYPE كالمندوب. */
export const CUSTOMER_COLS: ColSpec[] = [
  /* الرأس #1–#10 + التسلسل #126 */
  ["C_CODE", "code", "text"], ["C_A_NAME", "name_ar", "text"], ["C_E_NAME", "name_en", "text"],
  ["C_GROUP_CODE", "group_no", "int"], ["C_CLASS", "customer_type", "int"], ["C_A_CODE", "account_code", "text"],
  ["C_PARENT", "parent_code", "text"], ["C_CLASS_TYP", "classification", "int"], ["C_CODE_LGN", "portal_user", "text"],
  ["CST_SEQ", "seq_no", "int"],
  /* تبويب ١ — البيانات الرئيسية #11–#24 (+ رقم المندوب REP_CODE في نموذج ARSI005) */
  ["C_DEGREE", "grade_no", "int"], ["CC_CODE", "cost_center", "text"], ["C_VENDOR", "linked_vendor", "text"],
  ["C_TAX_CODE", "vat_no", "text"], ["C_CLASS_VAT", "vat_class", "int"], ["CONN_BRN_NO", "branch_no", "int"],
  ["C_SALES_MAN", "is_rep", "bool"], ["REP_CODE", "rep_code", "text"], ["COL_NO", "collector_no", "int"],
  ["AGNT_FLG", "is_agent", "bool"], ["CREDIT_PERIOD", "credit_days", "int"],
  ["CREDIT_PERIOD_PNDNG_CASH", "pending_cash_credit_days", "int"], ["ROUTE_NO", "route_no", "int"],
  ["SORTINROUTE", "route_order", "int"], ["PRM_CODE", "marketer_code", "text"], ["EMP_NO", "employee_no", "int"],
  /* تبويب ٢ — بيانات أخرى #35–#74 */
  ["C_ADDRESS", "address", "text"], ["C_PHONE", "phone", "text"], ["C_MOBILE", "mobile", "text"],
  ["C_WHATSAPP_NO", "whatsapp_no", "text"], ["WHATSAPP_GRP", "whatsapp_group", "text"], ["C_BOX", "po_box", "text"],
  ["C_FAX", "fax", "text"], ["C_E_MAIL", "email", "text"], ["C_WEB_SITE", "website", "text"],
  ["DISC_PER", "max_discount_pct", "num"], ["C_SINCE", "opened_on", "date"], ["DISC_PER_DFLT", "default_discount_pct", "num"],
  ["C_PERSON", "referred_by", "text"], ["GPS", "gps", "text"], ["CONF_LAST_DATE", "last_reconciled_on", "date"],
  ["C_NOTE", "notes", "text"], ["INACTIVE", "inactive", "bool"], ["INACTIVE_SALES", "sales_inactive", "bool"],
  ["INACTIVE_DATE", "inactive_date", "date"], ["ALLOW_PRD_AFTR_DUE", "grace_days", "int"],
  ["INACTIVE_RES", "inactive_reason", "text"], ["F_ACTV_DATE", "active_from", "date"], ["F_ACTV_DATE_H", "active_from_h", "date"],
  ["T_ACTV_DATE", "active_to", "date"], ["T_ACTV_DATE_H", "active_to_h", "date"], ["BLK_LST", "blacklisted", "bool"],
  ["BLK_LST_DATE", "blacklisted_at", "date"], ["SND_VRFCT_MSG_FOR_CRDT_BILL", "verify_msg_credit", "bool"],
  ["CST_ALLOW_SALES_PRV_DR", "allow_sale_with_debt", "int"], ["BLK_LST_RES", "blacklist_reason", "text"],
  ["LICENSE_NO", "license_no", "text"], ["LICENSE_OWNER", "license_owner", "text"],
  ["RESPONS_PERSON", "responsible_person", "text"], ["SIGN_AUTH_PERSON", "authorized_signatory", "text"],
  ["SEND_MSG", "notify_channel", "int"], ["FAV_AC", "is_favorite", "bool"], ["CST_EXCPT_QT_PRM_FLG", "exclude_promotions", "bool"],
  ["INS_SND_ALRT_FLG", "notify_installments", "bool"], ["AUTO_INSTALLMENT", "auto_installments", "bool"],
  ["HOW_DID_YOU_KNOW_US", "lead_source", "int"],
  /* تبويب ٣ — العنوان الوطني #75–#89 (الرمز البريدي = C_BOX_CODE: 47912 للعميل 1000000016 = لقطة CU16-3) */
  ["BUILDING_NO", "building_no", "text"], ["STREET", "street", "text"], ["DSTRCT_NM", "district_name", "text"],
  ["CNTRY_NO", "country_no", "int"], ["PROV_NO", "province_no", "int"], ["CITY_NO", "city_no", "int"],
  ["R_CODE", "region_no", "int"], ["C_BOX_CODE", "postal_code", "text"], ["ADD_NO", "additional_no", "text"],
  ["CR_NO", "cr_no", "text"], ["C_COM_LNAME", "trade_name_ar", "text"], ["C_COM_FNAME", "trade_name_en", "text"],
  ["SHRT_ADD", "short_address", "text"], ["IDNTFR_TYP", "id_scheme", "text"], ["CSTMR_IDNTFR", "id_value", "text"],
  /* تبويب ٤ — البيانات الشخصية #90–#107 */
  ["TYP_CRD", "id_type", "int"], ["CRD_NO", "id_no", "text"], ["CRD_ISSUSE_DATE", "id_issue_date", "date"],
  ["CRD_ISSUSE_DATE_AH", "id_issue_date_h", "date"], ["C_PROFF", "profession", "int"], ["BRTH_DATE", "birth_date", "date"],
  ["BRTH_PLC", "birth_place", "text"], ["CMPNY_WORK", "employer", "text"], ["SRC_INC", "income_source", "text"],
  ["CRD_ISSUSE_PLAC", "id_issue_place", "text"], ["CRD_END_DATE", "id_expiry_date", "date"],
  ["CRD_END_DATE_AH", "id_expiry_date_h", "date"], ["MRTL_STAT", "marital_status", "int"],
  ["BRTH_DATE_AH", "birth_date_h", "date"], ["WORK_PLC", "work_address", "text"], ["C_GENDER", "gender", "int"],
  ["SRC_INC_RATE", "monthly_income", "num"], ["NTNLTY_NO", "nationality", "int"],
  /* تبويب ٦ — بيانات إضافية #112–#125 */
  ["CLC_TYP_NO_TAX", "tax_calc_method", "int"], ["ACTVTY_NM", "activity_name", "text"],
  ["CST_RGSTR_TYP", "registration_type", "int"], ["NIS_NO", "statistical_no", "text"], ["NAI_DSC", "tax_article", "text"],
  ["EQ_CPTL", "capital", "text"], ["CST_GCC", "is_gcc", "bool"], ["CST_VAT_GRP_FLG", "is_vat_group", "bool"],
  ["SCTR_TYP", "sector", "int"], ["C_BARCODE", "barcode", "text"], ["VST_OPN_TYP", "visit_open_type", "int"],
  ["GLN_CODE", "gln_code", "text"], ["WEB_SRVC_USE_AUTO_SYNC_CST", "auto_sync_vendor", "bool"],
  ["LMT_ITM_QTY_TYP", "item_cap_type", "int"],
  /* تبويب ٧ — حقول إضافية #127–#146 */
  ...Array.from({ length: 20 }, (_, i): ColSpec => ["FIELD" + (i + 1), "field" + (i + 1), "text"]),
  /* تبويب ١٤ — بيانات الضمانات #196–#210 */
  ["G_STATUS", "g_status", "int"], ["G_TYPE", "g_type", "int"], ["G_START_DATE", "g_start_date", "date"],
  ["G_EXPIRE_DATE", "g_expire_date", "date"], ["G_NAME", "g_name", "text"], ["G_ADDRESS", "g_address", "text"],
  ["G_WORK", "g_work", "text"], ["G_FIN_CENTER", "g_fin_center", "text"], ["G_AMT", "g_amount", "num"],
  ["G_DOC_DATE", "g_doc_date", "date"], ["G_REG_COURT", "g_court_reg", "text"], ["G_REG_TRADA", "g_chamber_reg", "text"],
  ["G_FILE_TRADA", "g_cr_no", "text"], ["G_TEL", "g_phone", "text"], ["G_FAX", "g_fax", "text"],
  /* تبويب ١٥ — مكان التسليم #211–#219 */
  ["DLVR_CITY_NO", "dlvr_city_no", "int"], ["DLVR_PROV_NO", "dlvr_province_no", "int"], ["DLVR_R_CODE", "dlvr_region_no", "int"],
  ["DLVR_TEL", "dlvr_phone", "text"], ["DLVR_ADDRESS", "dlvr_address", "text"], ["DLVR_FAX", "dlvr_fax", "text"],
  ["DLVR_EMAIL", "dlvr_email", "text"], ["DLVR_NAME", "dlvr_person", "text"], ["DLVR_PHON", "dlvr_mobile", "text"],
];

/** #10 كلمة السر — بصمة لا نص */
export const CUSTOMER_SECRET = ["SECRET_KEY"] as const;

/** خلف مركز الميزات: إعدادات أنظمة غير مفعّلة عند بتروسبيشل (الجوال · الخدمة الذاتية · العقار · الحوالات · التقسيط …) */
export const CUSTOMER_FEATURE_COLS = [
  "PJ_NO", "C_AGE", "C_CODE_TRGT", "CSH_CST", "CST_CR_LMT_LOCAL", "CST_INV_LMT_LOCAL", "CST_LMT_TYP", "CST_LMT_PER",
  "PLTCL_RLTN_FLG", "PLTCL_RLTN_WITH", "GRNT_DSCNT_FREE_MTHD", "C_FINSCAN_STATUS", "OPN_FILE_DATE", "END_FILE_DATE",
  "HOME_ADDRESS", "SIGN_IMG_NM", "PASS_NO", "PASS_ISSUSE_PLAC", "PASS_ISSUSE_DATE", "PASS_END_DATE", "NAME_IN_PASS",
  "ADD_INCM_SRCE", "ADD_INCM_RATE", "CNT_REM_MNTH_EXPCT", "OTHR_CMP_BNK", "COMM_REG_NO", "REG_ISSUSE_PLAC",
  "REG_ISSUSE_DATE", "REG_END_DATE", "CMP_ACTIV", "CST_FILE_UP_DATE", "CST_BNF_TYPE", "CST_MAIN_IMG_NM", "CST_DEAL_FLG",
  "CST_EXCH_FLG", "C_BUS_SEC", "C_PER_FEE", "C_ACCT_FEE", "AUTO_APPRVD", "ALLOW_UPD_FIXED_PRICE", "C_MOB_DEV_SRL",
  "C_SAV_LOGIN_DATA", "C_REST_PASS", "C_VERFY_SMS_CODE", "WEB_SRVC_EXTRNL_C_CODE", "WEB_SRVC_USR_NO", "WEB_SRVC_PASSWRD",
  "WEB_SRVC_LNK", "AGENT_CST_NO_SER", "PRD_DAY", "RPT_QTY_LMT_CNT", "USE_HOLSTR", "CNFRM_NOTE", "CMPNS_TYP",
  "EXTERNAL_POST", "TRNSFR_FLG", "CSTMR_LGHT_FLG", "USE_SUB_CSTMR_FLG", "SHW_AVLQTY_IN_CSS_SYS", "SHW_ITM_PRICE_IN_CSS_SYS",
  "C_RSOLV_CODE", "C_RISK", "CST_BUS_SEC", "N_INSTLS", "N_DAYS", "FDA_CST_FLG", "INS_SEND_TYP", "INS_SND_LANG_NO",
  "INS_RPRT_ATTACH_FLG", "SALE_PLAN_NO_SUM", "SALE_PLAN_SRL_SUM", "SALE_PLAN_NO_DET", "SALE_PLAN_SRL_DET",
  "C_BLK_LST_STS_IN_ADD", "PRCNT_TYP", "BOUND_FLG", "BOUND_ACCT_FLG", "BLD_NO", "ADD_BLD_NO", "CST_TYP", "CST_FILE_NO",
  "CST_SUB_TYP", "C_CODE_REF", "DONT_BAY_IN_WEB", "IMG_PATH", "NM_BLD_NO", "PRPS_OPN_FILE", "UNT_NO", "WRK_AREA",
  "R_U_REAL_BNFT", "AD_U_PHOTO", "LATITUDE", "LONGITUDE", "GPS_COLOR", "SERIALNO", "DRIVER_NO", "DUE_TYPE", "AC_OP_NO",
  "IMP_XLS", "CONN_REM_SYS", "CLC_VAT_PRICE_TYP", "ALLOW_UPD_FIXED_PRICE_DIS", "RESPONS_PERSON_JOB",
] as const;

/** محذوف بقرار المستخدم (CLAUDE.md: «medical/insurance fields deleted») — كلها 0/فارغة في أونيكس (يفحصه verify) */
export const CUSTOMER_DELETED = [
  "C_INSURANCE", "INSURANCE_NO", "APPROVAL_NO", "INSRNCE_CST", "INSRNCE_CMP_NO", "CONN_HPS_SYS", "HPS_BLD_BNK_BNF",
] as const;

/** عمود صورة (LOB) — فارغ في كل الصفوف؛ القارئ يرفض أي LOB غير فارغ (DESYNC) فلا يضيع شيء صامتاً */
export const CUSTOMER_LOB = ["CST_MAIN_IMG"] as const;

/** CUSTOMER_CURR (22) — شبكة العملات في تبويب ١ #25–#32 + حدود العملة */
export const CUSTOMER_CURR_COLS: ColSpec[] = [
  ["C_CODE", "customer_code", "text"], ["A_CY", "currency", "text"], ["LEV_NO", "price_level_credit", "int"],
  ["LEV_NO_CSH", "price_level_cash", "int"], ["DFLT_FLG", "is_default", "bool"], ["INACTIVE", "inactive", "bool"],
  ["INACTIVE_SALES", "sales_inactive", "bool"], ["INACTIVE_DATE", "inactive_date", "date"],
  ["CR_LIMIT", "credit_limit", "num"], ["INV_LIMIT", "invoice_limit", "num"], ["CST_LMT_PER", "overrun_pct", "num"],
  ["CST_LMT_TYP", "overrun_policy", "int"], ["CNFRM_LST_DATE", "last_confirmed_on", "date"],
  ["EXTERNAL_POST", "external_post", "int"], ["TRNSFR_FLG", "transfer_flag", "int"],
  ["TRNS_LMT_MOBILE", "mobile_txn_max", "num"], ["TRNS_MIN_LMT_MOBILE", "mobile_txn_min", "num"],
];

/** IAS_AC_CC_LMT (35) — حدود الحسابات بالتحليلي؛ تبويب ٨ «حد الدين» = صفوف AC_DTL_TYP 3 للعميل */
export const ACCOUNT_LIMIT_COLS: ColSpec[] = [
  ["RCRD_SQ", "rcrd_sq", "int"], ["A_CODE", "account_code", "text"], ["A_CY", "currency", "text"],
  ["CC_CODE", "cost_center", "text"], ["PJ_NO", "project_no", "text"], ["ACTV_NO", "activity_no", "text"],
  ["MIN_AMT", "balance_min", "num"], ["MAX_AMT", "balance_max", "num"], ["MIN_TRNS_AMT", "txn_min", "num"],
  ["MAX_TRNS_AMT", "txn_max", "num"], ["MAX_LMT_PER", "overrun_pct", "num"], ["MAX_LMT_PSBL", "overrun_possible", "num"],
  ["EXCEED_LMT", "overrun_policy", "int"], ["DR_CR", "side", "int"], ["LMT_DESC", "description", "text"],
  ["AC_CODE_DTL", "analytic_code", "text"], ["AC_CODE_DTL_SUB", "analytic_sub", "text"], ["AC_DTL_TYP", "analytic_type", "int"],
  ["FCLTY_AMT", "facility_amount", "num"], ["FCLTY_ST", "facility_status", "int"], ["INACTIVE", "inactive", "bool"],
  ["DALY_AMT", "daily_amount", "num"], ["MNTHLY_AMT", "monthly_amount", "num"], ["ANULY_AMT", "annual_amount", "num"],
  ["BRN_NO", "branch_no", "int"], ["CMP_NO", "company_no", "int"], ["EXTERNAL_POST", "external_post", "int"],
];

export const CUSTOMER_ACCNT_COLS: ColSpec[] = [
  ["RCRD_NO", "rcrd_no", "int"], ["C_CODE", "customer_code", "text"], ["A_CODE", "account_code", "text"],
  ["AC_TYP", "account_type", "int"], ["INACTIVE", "inactive", "bool"], ["INACTIVE_DATE", "inactive_date", "date"],
  ["INACTIVE_RES", "inactive_reason", "text"], ["INACTIVE_U_ID", "inactive_by", "text"],
];

export const CUSTOMER_SALES_CAP_COLS: ColSpec[] = [
  ["RCRD_NO", "rcrd_no", "int"], ["C_CODE", "customer_code", "text"], ["F_DATE", "from_date", "date"],
  ["T_DATE", "to_date", "date"], ["A_CY", "currency", "text"], ["AMT", "amount", "num"], ["LMT_DSC", "note", "text"],
];

export const CUSTOMER_DRIVER_COLS: ColSpec[] = [
  ["C_CODE", "customer_code", "text"], ["DRIVER_NO", "driver_no", "int"], ["DFLT_FLG", "is_default", "bool"],
  ["INACTIVE", "inactive", "bool"], ["INACTIVE_DATE", "inactive_date", "date"], ["INACTIVE_U_ID", "inactive_by", "text"],
  ["INACTIVE_RES", "inactive_reason", "text"],
];

export const CUSTOMER_USER_COLS: ColSpec[] = [
  ["C_CODE", "customer_code", "text"], ["U_ID", "user_id", "int"], ["A_CY", "currency", "text"],
  ["ADD_FLAG", "can_add", "bool"], ["VIEW_FLAG", "can_view", "bool"],
];

function insertSelect(target: string, cols: ColSpec[], extra: { erp: string; sql: string }[], source: string, audit: string, where = ""): string {
  const erpCols = [...cols.map(([, e]) => e), ...extra.map((x) => x.erp)];
  const sel = [...cols.map(([o, , k]) => castSql(o, k)), ...extra.map((x) => x.sql)];
  return `INSERT INTO ${target} (${erpCols.join(", ")}${audit ? ", " + AUDIT_COLS : ""})
          SELECT ${sel.join(", ")}${audit ? ", " + audit : ""} FROM extract."${source}" ${where}`;
}

export async function syncLayer2b(db: Db): Promise<Record<string, number>> {
  const out: Record<string, number> = {};

  await syncBranches(db);
  out.branch = await scalar(db, `SELECT count(*) c FROM erp.branch`);

  /* ═══ 34 · العملاء ═══
     `erp.customer` كان يُعبّأ جزئياً من الأرصدة والفواتير (رقم + اسم) قبل أن يُقرأ CUSTOMER (LOB).
     الصف غير المكتمل (`features IS NULL`) ولم يلمسه مستخدم (`update_count = 0`) يُكمَّل من أونيكس، والغائب يُضاف. */
  if (await has(db, "CUSTOMER")) {
    await db.exec(`CREATE INDEX IF NOT EXISTS x_customer_ccode ON extract."CUSTOMER" ("C_CODE")`);
    const sets = CUSTOMER_COLS.filter(([o]) => o !== "C_CODE" && o !== "C_A_NAME").map(([o, e, k]) => `${e} = ${castSql(o, k, "x.")}`);
    await db.exec(`
      UPDATE erp.customer c SET ${sets.join(", ")},
        name_ar = COALESCE(NULLIF(x."C_A_NAME",''), c.name_ar),
        features = ${featuresSql(CUSTOMER_FEATURE_COLS, "x.")},
        created_by = NULLIF(x."AD_U_ID",''), created_at = CAST(NULLIF(x."AD_DATE",'') AS timestamptz),
        updated_by = NULLIF(x."UP_U_ID",''), updated_at = CAST(NULLIF(x."UP_DATE",'') AS timestamptz),
        update_count = COALESCE(CAST(NULLIF(x."UP_CNT",'') AS integer), 0),
        legacy = ${featuresSql(["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"], "x.")}
      FROM extract."CUSTOMER" x
      WHERE c.code = x."C_CODE" AND c.features IS NULL AND c.update_count = 0`);
    await db.exec(`
      INSERT INTO erp.customer (${CUSTOMER_COLS.map(([, e]) => e).join(", ")}, features, legacy, ${AUDIT_COLS})
      SELECT ${CUSTOMER_COLS.map(([o, , k]) => (o === "C_A_NAME" ? `COALESCE("C_A_NAME",'')` : castSql(o, k))).join(", ")},
             ${featuresSql(CUSTOMER_FEATURE_COLS)}, ${featuresSql(["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"])}, ${AUDIT}
      FROM extract."CUSTOMER" x
      WHERE NOT EXISTS (SELECT 1 FROM erp.customer c WHERE c.code = x."C_CODE")`);
    /* #10 كلمة السر: بصمة فقط — تُحسب هنا لأن sha256 ليس في PGlite */
    const secrets = await db.query(
      `SELECT x."C_CODE" code, x."SECRET_KEY" k FROM extract."CUSTOMER" x JOIN erp.customer c ON c.code = x."C_CODE"
       WHERE NULLIF(x."SECRET_KEY",'') IS NOT NULL AND c.portal_secret_hash IS NULL AND c.update_count = COALESCE(CAST(NULLIF(x."UP_CNT",'') AS integer), 0)`,
    );
    for (const r of secrets.rows) {
      await db.query(`UPDATE erp.customer SET portal_secret_hash = $1 WHERE code = $2`, [secretHash(String(r.k)), String(r.code)]);
    }
  }
  out.customer = await scalar(db, `SELECT count(*) c FROM erp.customer`);

  await seed(db, "erp.customer_currency", "CUSTOMER_CURR",
    insertSelect("erp.customer_currency", CUSTOMER_CURR_COLS, [], "CUSTOMER_CURR", AUDIT));
  out.customer_currency = await scalar(db, `SELECT count(*) c FROM erp.customer_currency`);

  await seed(db, "erp.account_limit", "IAS_AC_CC_LMT",
    insertSelect("erp.account_limit", ACCOUNT_LIMIT_COLS, [{ erp: "legacy", sql: featuresSql(["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"]) }],
      "IAS_AC_CC_LMT", AUDIT));
  await db.exec(`SELECT setval('erp.account_limit_rcrd_seq', GREATEST(1, (SELECT COALESCE(max(rcrd_sq), 0) FROM erp.account_limit)))`);
  out.account_limit = await scalar(db, `SELECT count(*) c FROM erp.account_limit`);

  await seed(db, "erp.customer_account", "IAS_CST_ACCNT",
    insertSelect("erp.customer_account", CUSTOMER_ACCNT_COLS, [], "IAS_CST_ACCNT", AUDIT));
  await seed(db, "erp.customer_sales_cap", "IAS_CST_LMT_SAL",
    insertSelect("erp.customer_sales_cap", CUSTOMER_SALES_CAP_COLS, [], "IAS_CST_LMT_SAL", AUDIT));
  await seed(db, "erp.customer_driver", "IAS_CST_DRVR",
    insertSelect("erp.customer_driver", CUSTOMER_DRIVER_COLS, [], "IAS_CST_DRVR", AUDIT));
  /* الصلاحيات (IAS_PRIV_CUSTOMER 9 أعمدة: بلا UP_CNT) */
  await seed(db, "erp.customer_user", "IAS_PRIV_CUSTOMER", `
    INSERT INTO erp.customer_user (customer_code, user_id, currency, can_add, can_view, created_by, created_at, updated_by, updated_at)
    SELECT "C_CODE", CAST("U_ID" AS integer), COALESCE(NULLIF("A_CY",''),'SAR'), COALESCE("ADD_FLAG" = '1', false),
           COALESCE("VIEW_FLAG" = '1', false), NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
           NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz)
    FROM extract."IAS_PRIV_CUSTOMER"`);
  out.customer_user = await scalar(db, `SELECT count(*) c FROM erp.customer_user`);

  /* تبويبات الاستعلام ١٦–١٨ — من قيود أونيكس (IAS_POST_DTL · تحليلي 3) + القيود الحيّة، ومن الفواتير والمردودات */
  await customerViews(db);

  return out;
}

async function customerViews(db: Db): Promise<void> {
  const ok = (await has(db, "IAS_POST_DTL")) && (await has(db, "IAS_BILL_MST")) && (await has(db, "IAS_RT_BILL_MST"));
  for (const v of ["customer_stats", "customer_ledger", "customer_sales_doc"]) await db.exec(`DROP VIEW IF EXISTS erp.${v}`);
  if (ok) {
    await db.exec(`CREATE INDEX IF NOT EXISTS x_ias_post_dtl_acdtl ON extract."IAS_POST_DTL" ("AC_CODE_DTL", "AC_DTL_TYP")`);
    await db.exec(`CREATE INDEX IF NOT EXISTS x_ias_bill_mst_ccode ON extract."IAS_BILL_MST" ("C_CODE")`);
    await db.exec(`CREATE INDEX IF NOT EXISTS x_ias_rt_bill_mst_ccode ON extract."IAS_RT_BILL_MST" ("C_CODE")`);
  }
  const n = (c: string) => `COALESCE(CAST(NULLIF(${c},'') AS numeric),0)`;
  /* ١٦ «العمليات» — كل سطر على تحليلي العميل: أونيكس (نوع 0 = الافتتاحي) + ما رُحِّل حياً في startyx */
  await db.exec(ok
    ? `CREATE VIEW erp.customer_ledger AS
       SELECT p."AC_CODE_DTL" customer_code, 'onyx' source, CAST(p."DOC_TYPE" AS integer) doc_type, p."DOC_NO" doc_no,
              CAST(NULLIF(p."DOC_DATE",'') AS date) doc_date, CAST(NULLIF(p."DOC_DUE_DATE",'') AS date) due_date,
              p."DOC_DESC" description, ${n('p."DR_AMT"')} debit, ${n('p."CR_AMT"')} credit, p."A_CY" currency,
              CAST(NULLIF(p."BRN_NO",'') AS integer) branch_no, NULLIF(p."CHEQUE_NO",'') cheque_no
       FROM extract."IAS_POST_DTL" p WHERE p."AC_DTL_TYP" = '3' AND NULLIF(p."AC_CODE_DTL",'') IS NOT NULL AND p."DOC_TYPE" <> '0'
       UNION ALL
       ${openingLedgerSql("3", "customer")}
       UNION ALL
       SELECT CAST(l.analytic_id AS text), 'live', NULL, CAST(d.document_number AS text), e.date, e.date,
              d.doc_kind, l.debit, l.credit, 'SAR', CAST(l.branch_id AS integer), NULL
       FROM erp.gl_entry_line l JOIN erp.gl_entry e ON e.id = l.entry_id
       LEFT JOIN erp.live_document d ON d.id = e.live_document_id
       WHERE l.analytic_type = 'customer' AND l.analytic_id IS NOT NULL`
    : `CREATE VIEW erp.customer_ledger AS
       SELECT NULL::text customer_code, NULL::text source, NULL::integer doc_type, NULL::text doc_no, NULL::date doc_date,
              NULL::date due_date, NULL::text description, NULL::numeric debit, NULL::numeric credit, NULL::text currency,
              NULL::integer branch_no, NULL::text cheque_no WHERE false`);
  /* ١٧ «وثائق المبيعات» — الفواتير (+) والمردودات (−) بصافيها قبل الضريبة وإجماليها */
  await db.exec(ok
    ? `CREATE VIEW erp.customer_sales_doc AS
       SELECT m."C_CODE" customer_code, 1 doc_kind, 'فاتورة مبيعات' doc_kind_name, m."BILL_NO" doc_no,
              CAST(m."BILL_DOC_TYPE" AS integer) doc_type, CAST(NULLIF(m."BILL_DATE",'') AS date) doc_date,
              CAST(NULLIF(m."BILL_DUE_DATE",'') AS date) due_date, m."A_DESC" description,
              ${n('m."BILL_AMT"')} amount, ${n('m."DISC_AMT"')} discount, ${n('m."VAT_AMT"')} vat,
              m."BILL_CURRENCY" currency, NULLIF(m."REF_NO",'') ref_no, CAST(NULLIF(m."BRN_NO",'') AS integer) branch_no
       FROM extract."IAS_BILL_MST" m WHERE NULLIF(m."C_CODE",'') IS NOT NULL
       UNION ALL
       SELECT r."C_CODE", 2, 'مردود مبيعات', r."RT_BILL_NO", CAST(r."RT_BILL_DOC_TYPE" AS integer),
              CAST(NULLIF(r."RT_BILL_DATE",'') AS date), CAST(NULLIF(r."RT_BILL_DUE_DATE",'') AS date), r."A_DESC",
              -${n('r."BILL_AMT"')}, -${n('r."DISC_AMT"')}, -${n('r."VAT_AMT"')}, r."RT_BILL_CURRENCY", NULLIF(r."REF_NO",''),
              CAST(NULLIF(r."BRN_NO",'') AS integer)
       FROM extract."IAS_RT_BILL_MST" r WHERE NULLIF(r."C_CODE",'') IS NOT NULL`
    : `CREATE VIEW erp.customer_sales_doc AS
       SELECT NULL::text customer_code, NULL::integer doc_kind, NULL::text doc_kind_name, NULL::text doc_no,
              NULL::integer doc_type, NULL::date doc_date, NULL::date due_date, NULL::text description, NULL::numeric amount,
              NULL::numeric discount, NULL::numeric vat, NULL::text currency, NULL::text ref_no, NULL::integer branch_no
       WHERE false`);
  /* ١٨ «إحصائيات» (CU-R13/R14): المبيعات بالصافي قبل الضريبة، والرصيد بالإجمالي من القيود */
  await db.exec(`CREATE VIEW erp.customer_stats AS
    SELECT c.code customer_code,
      COALESCE((SELECT sum(debit - credit) FROM erp.customer_ledger l WHERE l.customer_code = c.code AND l.doc_type = 0), 0) opening_balance,
      COALESCE((SELECT sum(debit - credit) FROM erp.customer_ledger l WHERE l.customer_code = c.code), 0) current_balance,
      COALESCE((SELECT sum(amount) FROM erp.customer_sales_doc s WHERE s.customer_code = c.code AND s.doc_kind = 1), 0) sales,
      COALESCE((SELECT -sum(amount) FROM erp.customer_sales_doc s WHERE s.customer_code = c.code AND s.doc_kind = 2), 0) returns,
      COALESCE((SELECT sum(discount) FROM erp.customer_sales_doc s WHERE s.customer_code = c.code), 0) net_discount,
      COALESCE((SELECT sum(amount - discount) FROM erp.customer_sales_doc s WHERE s.customer_code = c.code), 0) net_sales,
      COALESCE((SELECT sum(credit) FROM erp.customer_ledger l WHERE l.customer_code = c.code AND l.doc_type = 2), 0) receipts,
      COALESCE((SELECT sum(credit) FROM erp.customer_ledger l WHERE l.customer_code = c.code AND l.doc_type = 2
                  AND l.cheque_no IS NOT NULL AND l.due_date > CURRENT_DATE), 0) cheques_not_due,
      COALESCE((SELECT sum(debit - credit) FROM erp.customer_ledger l WHERE l.customer_code = c.code AND l.doc_type = 1), 0) settlements,
      (SELECT max(doc_date) FROM erp.customer_sales_doc s WHERE s.customer_code = c.code AND s.doc_kind = 1) last_sale_date,
      (SELECT max(doc_date) FROM erp.customer_ledger l WHERE l.customer_code = c.code AND l.doc_type = 2) last_payment_date
    FROM erp.customer c`);
}
