import type { Db } from "../infrastructure/db.ts";
import { castSql, featuresSql, secretHash, type ColSpec } from "./masters-sync-layer2b.ts";
import { openingLedgerSql } from "./masters-sync-opening.ts";

/**
 * 35 · op.6.1.2.2 — بيانات الموردين · V_DETAILS (89 عموداً) [GO/06-suppliers-purchasing.md]
 * نفس عقد بقية الطبقة ٢: يُكمَّل الناقص فقط ولا يُداس تعديل مستخدم. AP_AC_LINK_TYPE = 2 «مجموعة الحسابات» ⇒ الحساب
 * من المجموعة (130/130 مورداً حسابه = حساب مجموعته). القوائم: CLC_VAT_PRICE_TYP 1–2 · CALC_VAT_AMT_TYPE 1–4.
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

const AUDIT = `NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
               NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz),
               COALESCE(CAST(NULLIF("UP_CNT",'') AS integer), 0)`;
const AUDIT_COLS = `created_by, created_at, updated_by, updated_at, update_count`;

export const VENDOR_COLS: ColSpec[] = [
  /* الأساسية */
  ["V_CODE", "code", "text"], ["V_A_NAME", "name_ar", "text"], ["V_E_NAME", "name_en", "text"],
  ["V_GROUP_CODE", "group_no", "int"], ["V_A_CODE", "account_code", "text"], ["V_SEQ", "seq_no", "int"],
  /* الرئيسية */
  ["V_CLASS", "vendor_class", "int"], ["V_DEGREE", "degree_no", "int"], ["CC_CODE", "cost_center", "text"],
  ["CC_NO", "cost_center_no", "int"], ["CONN_BRN_NO", "branch_no", "int"], ["INACTIVE", "inactive", "bool"],
  ["INACTIVE_PUR", "purchase_inactive", "bool"], ["BLK_LST", "blacklisted", "bool"], ["BLK_LST_RES", "blacklist_reason", "text"],
  ["V_TAX_CODE", "vat_no", "text"], ["TAXPAYER", "is_taxpayer", "bool"], ["CLC_TYP_NO_TAX", "tax_calc_method", "int"],
  ["CLC_VAT_PRICE_TYP", "price_vat_type", "int"], ["CALC_VAT_AMT_TYPE_VNDR", "vat_base", "int"],
  ["CR_NO", "cr_no", "text"], ["ACTVTY_NM", "activity_name", "text"], ["CREDIT_PERIOD", "credit_days", "int"],
  ["V_PARENT", "parent_code", "text"], ["PMAN_CODE", "purchaser_code", "text"], ["FAV_AC", "is_favorite", "bool"],
  /* بيانات أخرى */
  ["V_ADDRESS", "address", "text"], ["CNTRY_NO", "country_no", "int"], ["PROV_NO", "province_no", "int"],
  ["CITY_NO", "city_no", "int"], ["R_CODE", "region_no", "int"], ["V_BOX", "po_box", "text"], ["V_PHONE", "phone", "text"],
  ["V_FAX", "fax", "text"], ["V_MOBILE", "mobile", "text"], ["V_E_MAIL", "email", "text"], ["V_WEB_SITE", "website", "text"],
  ["V_PERSON", "referred_by", "text"], ["V_SINCE", "since", "date"], ["V_NOTE", "notes", "text"],
  ["CONF_LAST_DATE", "last_reconciled_on", "date"],
  /* بيانات إضافية */
  ["NIS_NO", "statistical_no", "text"], ["NAI_DSC", "tax_article", "text"], ["EQ_CPTL", "capital", "text"],
];

/** كلمة سر بوابة الموردين — بصمة لا نص (فارغة في أونيكس كلها) */
export const VENDOR_SECRET = ["PASSWRD", "SECRET_KEY"] as const;

/** GO «خلف ميزات»: قوائم الأسعار · فترات الاستحقاق حسب الصنف · المطالبات · الدفعات المقدمة · TDS/PAN · المزامنة والبوابة ·
    GLN · حقول إضافية 1–10 · مدد الإرجاع · مستوى السعر · مورد الخليج */
export const VENDOR_FEATURE_COLS = [
  "USE_PRICE_LST_FLG", "CRDT_PRIOD_TYPE", "USE_CRDT_PRIOD_ITM", "USE_VNDR_CLAIM", "ADVNC_PYMNT_TYPE",
  "CLC_TAX_ADVNC_PYMNT_TYPE", "USE_TDS_FLG", "USE_PAN_NO", "PAN_CODE", "USE_AUTO_SYNC_VNDR", "USE_VSS_FLG", "EXTRNL_C_CODE",
  "USER_NO", "V_CODE_LGN", "WEB_SRVC_URL", "UNIT_SRVC_NO", "YEAR_SRVC_NO", "GLN_CODE",
  "FIELD1", "FIELD2", "FIELD3", "FIELD4", "FIELD5", "FIELD6", "FIELD7", "FIELD8", "FIELD9", "FIELD10",
  "RETURN_PERIOD", "RETURN_PERIOD_B4_EXP", "LVL_NO_PRICE", "VND_GCC", "C_TAX_CODE", "AC_OP_NO", "IMP_XLS",
] as const;

/** IAS_VENDOR_BANK (16) — حسابات المورد البنكية؛ لا مفتاح طبيعي في أونيكس (4 تكرارات مورد+آيبان) ⇒ رقم سطر */
export const VENDOR_BANK_COLS: ColSpec[] = [
  ["V_CODE", "vendor_code", "text"], ["BANK_NO", "bank_no", "int"], ["BANK_ACC", "bank_account", "text"],
  ["BANK_NAME", "bank_name", "text"], ["SWIFT_CODE", "swift_code", "text"], ["CNTRY_NO", "country_no", "int"],
  ["CITY_NO", "city_no", "int"], ["BNFCRY_NAME", "beneficiary_name", "text"], ["BANK_KEY", "bank_key", "text"],
  ["IBAN_NO", "iban", "text"], ["A_CY", "currency", "text"],
];

/** IAS_VNDR_ACCNT (16) — الحسابات الإضافية للمورد (فارغ في أونيكس) */
export const VENDOR_ACCNT_COLS: ColSpec[] = [
  ["RCRD_NO", "rcrd_no", "int"], ["V_CODE", "vendor_code", "text"], ["A_CODE", "account_code", "text"],
  ["AC_TYP", "account_type", "int"], ["INACTIVE", "inactive", "bool"], ["INACTIVE_DATE", "inactive_date", "date"],
  ["INACTIVE_RES", "inactive_reason", "text"], ["INACTIVE_U_ID", "inactive_by", "text"],
];

/** IAS_PRIV_VENDOR (9) — صلاحيات المستخدمين على المورد (2,730) */
export const VENDOR_USER_COLS: ColSpec[] = [
  ["V_CODE", "vendor_code", "text"], ["U_ID", "user_id", "int"], ["A_CY", "currency", "text"],
  ["ADD_FLAG", "can_add", "bool"], ["VIEW_FLAG", "can_view", "bool"],
];

function insertSelect(target: string, cols: ColSpec[], source: string): string {
  return `INSERT INTO ${target} (${cols.map(([, e]) => e).join(", ")}, ${AUDIT_COLS})
          SELECT ${cols.map(([o, , k]) => castSql(o, k)).join(", ")}, ${AUDIT} FROM extract."${source}"`;
}

async function seed(db: Db, target: string, source: string, sql: string): Promise<void> {
  if ((await scalar(db, `SELECT count(*) c FROM ${target}`)) > 0) return;
  if (!(await has(db, source))) return;
  await db.exec(sql);
}

export async function syncVendors(db: Db): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  /* `erp.vendor` يعبّئه load-2026.ts بالرقم والاسم والحساب؛ يُكمَّل هنا مرة واحدة (features IS NULL) */
  if (await has(db, "V_DETAILS")) {
    const sets = VENDOR_COLS.filter(([o]) => o !== "V_CODE" && o !== "V_A_NAME").map(([o, e, k]) => `${e} = ${castSql(o, k, "x.")}`);
    await db.exec(`
      UPDATE erp.vendor v SET ${sets.join(", ")},
        name_ar = COALESCE(x."V_A_NAME", v.name_ar),
        features = ${featuresSql(VENDOR_FEATURE_COLS, "x.")},
        legacy = ${featuresSql(["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"], "x.")},
        created_by = NULLIF(x."AD_U_ID",''), created_at = CAST(NULLIF(x."AD_DATE",'') AS timestamptz),
        updated_by = NULLIF(x."UP_U_ID",''), updated_at = CAST(NULLIF(x."UP_DATE",'') AS timestamptz),
        update_count = COALESCE(CAST(NULLIF(x."UP_CNT",'') AS integer), 0)
      FROM extract."V_DETAILS" x
      WHERE v.code = x."V_CODE" AND v.features IS NULL AND v.update_count = 0`);
    await db.exec(`
      INSERT INTO erp.vendor (${VENDOR_COLS.map(([, e]) => e).join(", ")}, features, legacy, ${AUDIT_COLS})
      SELECT ${VENDOR_COLS.map(([o, , k]) => (o === "V_A_NAME" ? `COALESCE("V_A_NAME",'')` : castSql(o, k))).join(", ")},
             ${featuresSql(VENDOR_FEATURE_COLS)}, ${featuresSql(["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"])}, ${AUDIT}
      FROM extract."V_DETAILS" x WHERE NOT EXISTS (SELECT 1 FROM erp.vendor v WHERE v.code = x."V_CODE")`);
    /* PASSWRD = كلمة سر خدمة الويب (USER_NO) · SECRET_KEY = كلمة سر البوابة (V_CODE_LGN) — عمودان منفصلان */
    for (const [col, target] of [["PASSWRD", "webservice_secret_hash"], ["SECRET_KEY", "portal_secret_hash"]] as const) {
      const r = await db.query(`SELECT "V_CODE" code, "${col}" k FROM extract."V_DETAILS" WHERE NULLIF("${col}",'') IS NOT NULL`);
      for (const x of r.rows) {
        await db.query(`UPDATE erp.vendor SET ${target} = $1 WHERE code = $2 AND ${target} IS NULL`,
          [secretHash(String(x.k)), String(x.code)]);
      }
    }
  }
  out.vendor = await scalar(db, `SELECT count(*) c FROM erp.vendor`);
  await seed(db, "erp.vendor_bank", "IAS_VENDOR_BANK", insertSelect("erp.vendor_bank", VENDOR_BANK_COLS, "IAS_VENDOR_BANK"));
  await seed(db, "erp.vendor_account", "IAS_VNDR_ACCNT", insertSelect("erp.vendor_account", VENDOR_ACCNT_COLS, "IAS_VNDR_ACCNT"));
  await seed(db, "erp.vendor_user", "IAS_PRIV_VENDOR", `
    INSERT INTO erp.vendor_user (vendor_code, user_id, currency, can_add, can_view, created_by, created_at, updated_by, updated_at)
    SELECT "V_CODE", CAST("U_ID" AS integer), COALESCE(NULLIF("A_CY",''),'SAR'), COALESCE("ADD_FLAG" = '1', false),
           COALESCE("VIEW_FLAG" = '1', false), NULLIF("AD_U_ID",''), CAST(NULLIF("AD_DATE",'') AS timestamptz),
           NULLIF("UP_U_ID",''), CAST(NULLIF("UP_DATE",'') AS timestamptz)
    FROM extract."IAS_PRIV_VENDOR"`);
  out.vendor_bank = await scalar(db, `SELECT count(*) c FROM erp.vendor_bank`);
  out.vendor_user = await scalar(db, `SELECT count(*) c FROM erp.vendor_user`);
  await vendorViews(db);
  return out;
}

/** «الرصيد والحركات» (GO §٦ — قراءة): كل سطر قيد على تحليلي المورد (4) من أونيكس + القيود الحيّة. الرصيد دائن − مدين. */
async function vendorViews(db: Db): Promise<void> {
  const ok = await has(db, "IAS_POST_DTL");
  for (const v of ["vendor_stats", "vendor_ledger"]) await db.exec(`DROP VIEW IF EXISTS erp.${v}`);
  const n = (c: string) => `COALESCE(CAST(NULLIF(${c},'') AS numeric),0)`;
  await db.exec(ok
    ? `CREATE VIEW erp.vendor_ledger AS
       SELECT p."AC_CODE_DTL" vendor_code, 'onyx' source, CAST(p."DOC_TYPE" AS integer) doc_type, p."DOC_NO" doc_no,
              CAST(NULLIF(p."DOC_DATE",'') AS date) doc_date, p."DOC_DESC" description, ${n('p."DR_AMT"')} debit,
              ${n('p."CR_AMT"')} credit, p."A_CY" currency, CAST(NULLIF(p."BRN_NO",'') AS integer) branch_no
       FROM extract."IAS_POST_DTL" p WHERE p."AC_DTL_TYP" = '4' AND NULLIF(p."AC_CODE_DTL",'') IS NOT NULL AND p."DOC_TYPE" <> '0'
       UNION ALL
       ${openingLedgerSql("4", "vendor")}
       UNION ALL
       SELECT CAST(l.analytic_id AS text), 'live', NULL, CAST(d.document_number AS text), e.date, d.doc_kind, l.debit, l.credit,
              'SAR', CAST(l.branch_id AS integer)
       FROM erp.gl_entry_line l JOIN erp.gl_entry e ON e.id = l.entry_id
       LEFT JOIN erp.live_document d ON d.id = e.live_document_id
       WHERE l.analytic_type = 'vendor' AND l.analytic_id IS NOT NULL`
    : `CREATE VIEW erp.vendor_ledger AS
       SELECT NULL::text vendor_code, NULL::text source, NULL::integer doc_type, NULL::text doc_no, NULL::date doc_date,
              NULL::text description, NULL::numeric debit, NULL::numeric credit, NULL::text currency, NULL::integer branch_no
       WHERE false`);
  await db.exec(`CREATE VIEW erp.vendor_stats AS
    SELECT v.code vendor_code,
      COALESCE((SELECT sum(credit - debit) FROM erp.vendor_ledger l WHERE l.vendor_code = v.code AND l.doc_type = 0), 0) opening_balance,
      COALESCE((SELECT sum(credit - debit) FROM erp.vendor_ledger l WHERE l.vendor_code = v.code), 0) current_balance,
      COALESCE((SELECT sum(credit) FROM erp.vendor_ledger l WHERE l.vendor_code = v.code AND l.doc_type = 6), 0) purchases,
      COALESCE((SELECT sum(debit) FROM erp.vendor_ledger l WHERE l.vendor_code = v.code AND l.doc_type = 7), 0) purchase_returns,
      COALESCE((SELECT sum(debit) FROM erp.vendor_ledger l WHERE l.vendor_code = v.code AND l.doc_type = 3), 0) payments,
      (SELECT max(doc_date) FROM erp.vendor_ledger l WHERE l.vendor_code = v.code AND l.doc_type = 6) last_purchase_date,
      (SELECT max(doc_date) FROM erp.vendor_ledger l WHERE l.vendor_code = v.code AND l.doc_type = 3) last_payment_date
    FROM erp.vendor v`);
}
