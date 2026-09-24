import type { Db } from "../infrastructure/db.ts";
import { castSql, featuresSql, secretHash, type ColSpec } from "./masters-sync-layer2b.ts";
import { openingLedgerSql } from "./masters-sync-opening.ts";

/**
 * 36 · op.1.2.8 — بيانات الموظفين · S_EMP (240 عموداً · 47) [GO/01-system-setup.md §op.1.2.8]
 * نفس عقد بقية الطبقة ٢: يُكمَّل الناقص فقط ولا يُداس تعديل مستخدم. بتروسبيشل لا تشغّل الرواتب ⇒ أعمدة الرواتب والموارد
 * البشرية (148) محفوظة كما هي في `features` بأسماء أونيكس (SY-R54)، وتبويبات التفاصيل فارغة في أونيكس فلا تُبنى.
 */

async function has(db: Db, table: string): Promise<boolean> {
  const r = await db.query(
    `SELECT count(*) c FROM information_schema.tables WHERE table_schema = 'extract' AND table_name = $1`,
    [table],
  );
  return Number(r.rows[0]?.c ?? 0) > 0;
}

const AUDIT = `NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
               NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz),
               COALESCE(CAST(NULLIF("UP_CNT",'') AS integer), 0)`;
const AUDIT_COLS = `created_by, created_at, updated_by, updated_at, update_count`;

/** الأعمدة الظاهرة — تبويبات GENS012: الرئيسية · التعيين · الشخصية · الاتصال · المالية */
export const EMPLOYEE_COLS: ColSpec[] = [
  /* الرئيسية */
  ["EMP_NO", "code", "text"], ["EMP_L_NM", "name_ar", "text"], ["EMP_F_NM", "name_en", "text"],
  ["FRST_L_NM", "first_ar", "text"], ["FRST_F_NM", "first_en", "text"], ["SCND_L_NM", "second_ar", "text"],
  ["SCND_F_NM", "second_en", "text"], ["THRD_L_NM", "third_ar", "text"], ["THRD_F_NM", "third_en", "text"],
  ["LST_L_NM", "last_ar", "text"], ["LST_F_NM", "last_en", "text"], ["CUR_CODE", "currency", "text"],
  ["BRN_NO", "branch_no", "int"], ["CMP_NO", "company_no", "int"], ["HRCHY_NO", "hierarchy_no", "int"],
  ["EMP_NO_MNGR", "manager_no", "text"], ["EMP_NO_MNGR2", "manager2_no", "text"], ["STRT_WRK_DATE", "hired_on", "date"],
  ["CRNT_JOB_DATE", "current_job_on", "date"], ["REINSTTMNT_DATE", "reinstated_on", "date"],
  /* التعيين */
  ["EMP_JOB_NO", "job_title_no", "int"], ["MJR_NO", "major_no", "int"], ["GRD_NO", "grade_no", "int"],
  ["CRNT_QLFCTN", "qualification_no", "int"], ["EMPLYMNT_TYP", "employment_type", "int"], ["EMP_ST", "job_status", "int"],
  ["CLASS_NO", "class_no", "int"], ["EMP_CRNT_ST", "current_status", "int"], ["GRP_NO", "group_no", "int"],
  ["MNGRL_NO", "admin_title_no", "int"], ["CTGRY_NO", "category_no", "int"], ["LVL_NO", "level_no", "int"],
  ["CRNT_EMP_LOC_ASSGN", "work_location_no", "int"], ["WRK_PRD_TYP", "work_period_type", "int"],
  /* الشخصية */
  ["GNDR", "gender", "int"], ["NTNLTY_NO", "nationality_no", "int"], ["CTZNSHP", "citizenship", "int"],
  ["SCL_ST", "marital_status", "int"], ["RLGN_NO", "religion_no", "int"], ["BLD_TYP", "blood_type", "int"],
  ["EMP_LANG_NO", "language_no", "int"], ["BRTH_AD_DATE", "birth_date", "text"], ["BRTH_HG_DATE", "birth_date_hijri", "text"],
  ["BRTH_PLC", "birth_place", "text"], ["CRD_TYP", "id_type", "int"], ["CRD_NO", "id_no", "text"],
  ["NTNL_NO", "national_no", "text"], ["PLC_CRD_ISSUE", "id_issue_place", "text"], ["CRD_DATE", "id_issue_date", "date"],
  ["CRD_EXP_DATE", "id_expiry_date", "date"], ["BORDER_NO", "border_no", "text"], ["USE_SLF_SRVC_SYS", "self_service", "bool"],
  ["NOTES", "notes", "text"],
  /* الاتصال */
  ["E_MAIL", "email", "text"], ["TEL_NO", "phone", "text"], ["MOBILE_NO", "mobile", "text"],
  ["FAX_NO", "fax", "text"], ["PO_BOX_NO", "po_box", "text"], ["ADDRS", "address", "text"],
  ["WEB_SITE", "website", "text"], ["CNTRY_NO", "country_no", "int"], ["PROV_NO", "province_no", "int"],
  ["CITY_NO", "city_no", "int"], ["R_CODE", "region_no", "int"],
  /* المالية */
  ["AC_CODE", "account_code", "text"], ["BNK_AC_CODE", "bank_account_code", "text"], ["CC_CODE", "cost_center", "text"],
  ["PJ_NO", "project_no", "text"], ["ACTV_NO", "activity_no", "text"], ["PAY_MTHD", "pay_method", "int"],
  ["SLRY_PAY_WAY", "salary_pay_way", "int"], ["SLRY_ST", "salary_status", "int"], ["TAX_FLG", "taxable", "bool"],
  ["SCL_INSRNCE_NO", "social_insurance_no", "text"], ["WRK_DY_MNTH", "work_days_month", "num"], ["WRK_HRS_DY", "work_hours_day", "num"],
  ["WRK_HRS_MNTH", "work_hours_month", "num"], ["WRK_HRS_YR", "work_hours_year", "num"], ["WRK_DY_YR", "work_days_year", "num"],
  /* التوقيف */
  ["INACTIVE", "inactive", "bool"], ["INACTIVE_U_ID", "inactive_by", "text"], ["INACTIVE_DATE", "inactive_date", "date"],
  ["INACTIVE_RES", "inactive_reason", "text"],
];

/** كلمة سر الخدمة الذاتية — بصمة لا نص (47/47 معبّأة في أونيكس) */
export const EMPLOYEE_SECRET = ["EMP_PSWRD"] as const;

/** خلف مركز الميزات (SY-R54): العقد · التقاعد ونهاية الخدمة · التذاكر · التأمين · الحضور بالجوال · الإجازة الأسبوعية ·
    MRP · الكفالة · الأجر · FIELD1..20 — كل ما تبقّى من رأس S_EMP */
export const EMPLOYEE_FEATURE_COLS = [
  "EMP_IMG", "BRTH_PLC_DTL", "DGHTR_NO", "RTRMNT_PYMNT_PAID", "SON_NO", "PARNT_ST", "RLTV_L_NM", "RLTV_F_NM",
  "DCSN_DATE", "DCSN_ISSU_SD", "RTRMNT_DATE", "OLD_WRK_DY", "OLD_WRK_MNTH", "OLD_WRK_YR", "RTRMNT_DFRNT_SD_FLG", "LNK_LST_WRK_FLG",
  "RTRMNT_FLG", "DCSN_NO", "LST_WRK_DATE", "QLFCTN_STRT_WRK", "LST_STRT_DATE", "LST_MOV_DATE", "EVAL_LST", "QLFCTN_CNTRY",
  "QLFCTN_YR", "DCSN_TYP", "DY_WAGE", "HM_FCMP_FLG", "HR_WAGE", "QLFCTN_ISSSUE", "ATTNDNC_TYP", "STST_MAIN",
  "MNT_PSRC", "TCKT_DSRV_CLC_TYP", "LST_TCKT_PYMNT_DATE", "MRP_TYP", "MRP_RSRC", "WRK_OFFC", "PORT_DSC", "ENTRY_VSA_NO",
  "ENTRY_VSA_JOB", "INSRNCE_NO", "MDCL_INSRNCE_NO", "MDCL_INSRANCE_TYP", "INSRNCE_SON_NO", "INSRNCE_PARNT_NO", "TCKTS_DSRVE", "EMP_TCKTS_NO",
  "TCKTS_COST", "TCKTS_FOR_DAYS", "EMP_TCKTS_RTIO", "TCKT_PATH_NO", "EMP_NO_LAST", "EMP_NO_MCHN", "GNR_FLG", "LAW_NO_DSRV_HLDY",
  "RLTV_E_MAIL", "RLTV_MOBILE_NO", "RLTV_TEL_NO", "RTRMNT_AGE", "RTRMNT_WRK_YR", "SLRY_CALC", "LST_INCRS_DATE", "LST_ALNC_DATE",
  "FNG_CALC", "IMP_XLS", "GPS_LNGITD_X", "GPS_LATITD_Y", "GPS_CITY", "LNK_TIMESHEET", "VALT_LST", "PRBTNRY_PRD_END_DATE",
  "PRBTNRY_FLG", "INSRNCE_OTHRS", "EMP_INSRNCE_RTO", "EMP_INSRNCE_AMT", "INSRNCE_CUR_CODE", "SCL_SCRTY_NO", "EMP_CNTRCT_TYP", "EMP_TRCK_MTHD",
  "FEED_LMT_AMT", "FEED_LMT_TYP", "END_WRK_TYP", "DFLT_LAW_ARTCL_VAL", "EMP_ATTNDNC_TYP", "ATTNDNC_MOBILE_TYP", "MOBILE_CPTR_IMG_TYP", "EXCPT_PST_DSRV_FLG",
  "ATTNDNC_TIMEZONE", "MOBILE_CNNCT_TYP", "ATTNDNC_MOBILE_SRL", "USE_ATTNDNC_LOC", "MOBILE_ATTNDNC_SYNC", "FACEBOOK", "TWITTER", "INSTAGRAM",
  "TELEGRAM", "EMP_MDCL_AGE_LMT", "GOV_EMP_CODE", "WEEKLY_DAYOFF_CALC_ST", "WEEKLY_DAYOFF_SHFT_DAYS_RQRD", "WEEKLY_DAYOFF_RGLR_DAYS_RQRD", "WEEKLY_DAYOFF_COMPAR_EQL", "WEEKLY_DAYOFF_REF_HLDY_NO",
  "WEEK_DAYS", "EMP_MDCL_STRT_DATE", "EMP_MDCL_END_DATE", "PART_SLRY_CC_CODE", "EMPLYMNT_LAW_NO", "QLFCTN_MNTH", "ACMDTN_ESTAT_LVL_NO", "CLC_YR_DSRV_PRD",
  "LST_EMPLYMNT_TYP_CHNG_DATE", "CNTRCT_NO", "CNTRCT_DATE", "CNTRCT_F_DATE", "CNTRCT_T_DATE", "CNTRCT_TYP", "CNTRCT_PRBTNRY_F_DATE", "CNTRCT_PRBTNRY_T_DATE",
  "PRBTNRY_EXTND_CNT", "PRBTNRY_EXTND_F_DATE", "PRBTNRY_EXTND_T_DATE", "CNSDR_PRD_RSTDAYS_ABS_MIN_VAL", "CNSDR_PRD_RSTDAYS_PR_MIN_VAL", "RTRMNT_YRS_STRT_DATE_CLC", "WHATSAPP_GRP", "FIELD1",
  "FIELD10", "FIELD11", "FIELD12", "FIELD13", "FIELD14", "FIELD15", "FIELD16", "FIELD17",
  "FIELD18", "FIELD19", "FIELD2", "FIELD20", "FIELD3", "FIELD4", "FIELD5", "FIELD6",
  "FIELD7", "FIELD8", "FIELD9", "EOS_BNFT_ACCRL_CLC_TYP",
] as const;

export async function syncEmployees(db: Db): Promise<Record<string, number>> {
  if ((await has(db, "S_EMP")) && Number((await db.query(`SELECT count(*) c FROM erp.employee`)).rows[0]?.c ?? 0) === 0) {
    await db.exec(`
      INSERT INTO erp.employee (${EMPLOYEE_COLS.map(([, e]) => e).join(", ")}, features, legacy, ${AUDIT_COLS})
      SELECT ${EMPLOYEE_COLS.map(([o, , k]) => castSql(o, k)).join(", ")},
             ${featuresSql(EMPLOYEE_FEATURE_COLS)}, ${featuresSql(["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"])}, ${AUDIT}
      FROM extract."S_EMP"`);
    const r = await db.query(`SELECT "EMP_NO" code, "EMP_PSWRD" k FROM extract."S_EMP" WHERE NULLIF("EMP_PSWRD",'') IS NOT NULL`);
    for (const x of r.rows) {
      await db.query(`UPDATE erp.employee SET self_service_secret_hash = $1 WHERE code = $2`, [secretHash(String(x.k)), String(x.code)]);
    }
  }
  await employeeViews(db);
  return { employee: Number((await db.query(`SELECT count(*) c FROM erp.employee`)).rows[0]?.c ?? 0) };
}

/** «حركة الموظف» (GO §٦ — قراءة): كل سطر قيد على تحليلي الموظف (7) من أونيكس + القيود الحيّة. الرصيد مدين − دائن. */
async function employeeViews(db: Db): Promise<void> {
  const ok = await has(db, "IAS_POST_DTL");
  for (const v of ["employee_stats", "employee_ledger"]) await db.exec(`DROP VIEW IF EXISTS erp.${v}`);
  const n = (c: string) => `COALESCE(CAST(NULLIF(${c},'') AS numeric),0)`;
  await db.exec(ok
    ? `CREATE VIEW erp.employee_ledger AS
       SELECT p."AC_CODE_DTL" employee_code, 'onyx' source, p."A_CODE" account_code, CAST(p."DOC_TYPE" AS integer) doc_type,
              p."DOC_NO" doc_no, CAST(NULLIF(p."DOC_DATE",'') AS date) doc_date, p."DOC_DESC" description,
              ${n('p."DR_AMT"')} debit, ${n('p."CR_AMT"')} credit, p."A_CY" currency, CAST(NULLIF(p."BRN_NO",'') AS integer) branch_no
       FROM extract."IAS_POST_DTL" p WHERE p."AC_DTL_TYP" = '7' AND NULLIF(p."AC_CODE_DTL",'') IS NOT NULL AND p."DOC_TYPE" <> '0'
       UNION ALL
       ${openingLedgerSql("7", "employee")}
       UNION ALL
       SELECT CAST(l.analytic_id AS text), 'live', l.account_code, NULL, CAST(d.document_number AS text), e.date, d.doc_kind,
              l.debit, l.credit, 'SAR', CAST(l.branch_id AS integer)
       FROM erp.gl_entry_line l JOIN erp.gl_entry e ON e.id = l.entry_id
       LEFT JOIN erp.live_document d ON d.id = e.live_document_id
       WHERE l.analytic_type = 'employee' AND l.analytic_id IS NOT NULL`
    : `CREATE VIEW erp.employee_ledger AS
       SELECT NULL::text employee_code, NULL::text source, NULL::text account_code, NULL::integer doc_type, NULL::text doc_no,
              NULL::date doc_date, NULL::text description, NULL::numeric debit, NULL::numeric credit, NULL::text currency,
              NULL::integer branch_no WHERE false`);
  await db.exec(`CREATE VIEW erp.employee_stats AS
    SELECT e.code employee_code,
      COALESCE((SELECT sum(debit - credit) FROM erp.employee_ledger l WHERE l.employee_code = e.code AND l.doc_type = 0), 0) opening_balance,
      COALESCE((SELECT sum(debit) FROM erp.employee_ledger l WHERE l.employee_code = e.code), 0) total_debit,
      COALESCE((SELECT sum(credit) FROM erp.employee_ledger l WHERE l.employee_code = e.code), 0) total_credit,
      COALESCE((SELECT sum(debit - credit) FROM erp.employee_ledger l WHERE l.employee_code = e.code), 0) current_balance,
      (SELECT count(*) FROM erp.employee_ledger l WHERE l.employee_code = e.code) line_count,
      (SELECT max(doc_date) FROM erp.employee_ledger l WHERE l.employee_code = e.code) last_move_date
    FROM erp.employee e`);
}
