import type { Db } from "../infrastructure/db.ts";
import {
  AUDIT_SQL, accountMoved, b, count, n, onyxError, requirePostingAccount, s,
  type EntityDef, type Row,
} from "./master-kit.ts";

/**
 * الطبقة ١ — التهيئة · بنود 13–27 في `startyx/BUILD-ORDER.md`.
 *
 * المصدر لكل بند هو ملف `GO/` الخاص بشاشته، والقواعد مرقّمة كما فيه
 * (TX-R… ضرائب · IV-R… مخزون · CG-R… عملاء · AP-R… موردون · SY-R… تهيئة).
 * الشاشات الستّ التي لا ملف `GO/` لها (op.5.1.2.8 · op.1.2.11 · op.1.2.4 · op.1.1.13 ·
 * op.1.2.1 · op.4.1.2.8) وُثّقت من مساعدة أونيكس ونماذجه وقاعدته مباشرة — المرجع
 * مذكور فوق كل كيان، ولا قاعدة هنا بلا مصدر.
 */

/* ═══════════ مساعدات الحركة (إثبات الأثر قبل المنع) ═══════════ */

async function extractHas(db: Db, table: string): Promise<boolean> {
  return (
    (await count(
      db,
      `SELECT count(*) c FROM information_schema.tables WHERE table_schema = 'extract' AND table_name = $1`,
      [table],
    )) > 0
  );
}

/** هل سبق تحميل فعلي للمستخرج؟ إن نعم وغاب الجدول ⇒ لا يمكن إثبات الخلوّ ⇒ يُمنع الحذف. */
async function loadedOnce(db: Db): Promise<boolean> {
  return (await count(db, `SELECT count(*) c FROM erp.extract_load_log`)) > 0;
}

/** حركة ضريبية على صنف أو حساب — GNR_TAX_ITM_MOVMNT (33,891 سطراً في 2026) · TX-R7 */
async function taxMovement(db: Db, col: "I_CODE" | "A_CODE", value: string): Promise<number> {
  if (!(await extractHas(db, "GNR_TAX_ITM_MOVMNT"))) return (await loadedOnce(db)) ? 1 : 0;
  return await count(db, `SELECT count(*) c FROM extract."GNR_TAX_ITM_MOVMNT" WHERE "${col}" = $1`, [value]);
}

/** وحدة القياس مستخدَمة في أي صنف — IAS_ITM_DTL.ITM_UNT · IV-R24 */
async function unitUsed(db: Db, code: string): Promise<number> {
  if (!(await extractHas(db, "IAS_ITM_DTL"))) return (await loadedOnce(db)) ? 1 : 0;
  return await count(db, `SELECT count(*) c FROM extract."IAS_ITM_DTL" WHERE "ITM_UNT" = $1`, [code]);
}

/** حركة مرحّلة تحمل هذا المشروع — IAS_POST_DTL.PJ_NO */
async function projectMovement(db: Db, no: string): Promise<number> {
  if (!(await extractHas(db, "IAS_POST_DTL"))) return (await loadedOnce(db)) ? 1 : 0;
  return await count(db, `SELECT count(*) c FROM extract."IAS_POST_DTL" WHERE "PJ_NO" = $1`, [no]);
}

/** النسبة معرَّفة في شرائح الضريبة — TX-R11 · IV-R74 */
async function sliceExists(db: Db, pct: number | null): Promise<boolean> {
  if (pct == null) return false;
  return (await count(db, `SELECT count(*) c FROM erp.tax_slice WHERE pct = $1 AND inactive = false`, [String(pct)])) > 0;
}

async function taxTypeExists(db: Db, no: number | null): Promise<boolean> {
  if (no == null) return false;
  return (await count(db, `SELECT count(*) c FROM erp.tax_type WHERE no = $1`, [no])) > 0;
}

/* ═══════════ 13 · op.3.2 — أنواع الضرائب · GNR_TAX_CODE_MST [GO/03-tax.md] ═══════════ */

const taxType: EntityDef = {
  table: "erp.tax_type",
  screen: "op.3.2",
  listSql: `SELECT no, name_ar, name_en, code, applies_to, agency_count, is_default, company_id,
                   calc_on_document, tax_kind, tax_class, tds, min_amount::text min_amount,
                   pct_on_prepaid::text pct_on_prepaid, sync, inactive, inactive_reason, ${AUDIT_SQL}
            FROM erp.tax_type`,
  searchCols: ["code", "name_ar", "CAST(no AS text)"],
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    code: { col: "code", kind: "text", required: true },
    applies_to: { col: "applies_to", kind: "int", required: true },
    agency_count: { col: "agency_count", kind: "int" },
    is_default: { col: "is_default", kind: "bool" },
    company_id: { col: "company_id", kind: "int" },
    calc_on_document: { col: "calc_on_document", kind: "bool" },
    tax_kind: { col: "tax_kind", kind: "int" },
    tax_class: { col: "tax_class", kind: "text" },
    tds: { col: "tds", kind: "bool" },
    min_amount: { col: "min_amount", kind: "num" },
    pct_on_prepaid: { col: "pct_on_prepaid", kind: "num" },
    sync: { col: "sync", kind: "bool" },
    inactive: { col: "inactive", kind: "bool" },
    inactive_reason: { col: "inactive_reason", kind: "text" },
  },
  async validate(db, _mode, v) {
    const no = n(v.no) ?? -1;
    /* TX-R5 — الرمز يُرسل في XML الهيئة ⇒ لا يتكرر ولا يُترك فارغاً */
    const code = s(v.code).toUpperCase();
    if (!code) throw onyxError(5020);
    v.code = code;
    if ((await count(db, `SELECT count(*) c FROM erp.tax_type WHERE code = $1 AND no <> $2`, [code, no])) > 0) {
      throw onyxError(2143);
    }
    /* TX-R1 — النطاق: 1 مبيعات · 2 مشتريات · 3 الكل */
    const scope = n(v.applies_to);
    if (scope == null || scope < 1 || scope > 3) throw onyxError(5020);
    /* TX-R4 — نوع افتراضي واحد يُقترح في المستندات */
    if (b(v.is_default)) await db.query(`UPDATE erp.tax_type SET is_default = false WHERE no <> $1`, [no]);
    /* AGNCY_CNT آلي بعد حفظ الجهات — لا يُدخَل يدوياً */
    v.agency_count = await count(db, `SELECT count(*) c FROM erp.tax_agency WHERE tax_no = $1`, [no]);
  },
  async guardDelete(db, before) {
    const no = n(before.no) ?? -1;
    if ((await count(db, `SELECT count(*) c FROM erp.tax_agency WHERE tax_no = $1`, [no])) > 0) throw onyxError(4050);
    if ((await count(db, `SELECT count(*) c FROM erp.item_tax WHERE tax_no = $1`, [no])) > 0) throw onyxError(3618, "أصناف");
    if ((await count(db, `SELECT count(*) c FROM erp.account_tax WHERE tax_no = $1`, [no])) > 0) throw onyxError(3618, "حسابات");
  },
};

/* الجهات وحساباتها · GNR_TAX_CODE_DTL — TX-R2 */
const taxAgency: EntityDef = {
  table: "erp.tax_agency",
  screen: "op.3.2",
  listSql: `SELECT tax_no, agency_no, name_ar, name_en, sales_account, purchase_account, due_tax_account,
                   pct::text pct, ${AUDIT_SQL}
            FROM erp.tax_agency`,
  searchCols: ["name_ar", "sales_account", "purchase_account", "CAST(tax_no AS text)"],
  keyCols: ["tax_no", "agency_no"],
  orderBy: "tax_no, agency_no",
  fields: {
    tax_no: { col: "tax_no", kind: "int", required: true, key: true },
    agency_no: { col: "agency_no", kind: "int", required: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    sales_account: { col: "sales_account", kind: "text" },
    purchase_account: { col: "purchase_account", kind: "text" },
    due_tax_account: { col: "due_tax_account", kind: "text" },
    pct: { col: "pct", kind: "num" },
  },
  async validate(db, _mode, v) {
    const taxNo = n(v.tax_no);
    if (!(await taxTypeExists(db, taxNo))) throw onyxError(5020);
    const t = (await db.query(`SELECT applies_to FROM erp.tax_type WHERE no = $1`, [taxNo])).rows[0];
    const scope = Number(t?.applies_to ?? 3);
    /* TX-R2 — ضريبة المبيعات دائنة في حساب الجهة، والمشتريات مدينة في حسابها */
    const sales = s(v.sales_account);
    const purch = s(v.purchase_account);
    if ((scope === 1 || scope === 3) && !sales) throw onyxError(4801);
    if ((scope === 2 || scope === 3) && !purch) throw onyxError(4801);
    for (const acc of [sales, purch, s(v.due_tax_account)]) if (acc) await requirePostingAccount(db, acc);
  },
  async guardDelete(db, before) {
    const used = await count(db, `SELECT count(*) c FROM erp.item_tax WHERE tax_no = $1 AND agency_no = $2`, [
      n(before.tax_no) ?? -1,
      n(before.agency_no) ?? -1,
    ]);
    if (used > 0) throw onyxError(3618, "أصناف");
  },
};

/* الشرائح · GNR_TAX_SLICE — TX-R11 */
const taxSlice: EntityDef = {
  table: "erp.tax_slice",
  screen: "op.3.2",
  listSql: `SELECT no, name_ar, name_en, pct::text pct, is_default, inactive, inactive_reason, ${AUDIT_SQL}
            FROM erp.tax_slice`,
  searchCols: ["name_ar", "CAST(no AS text)"],
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    pct: { col: "pct", kind: "num", required: true },
    is_default: { col: "is_default", kind: "bool" },
    inactive: { col: "inactive", kind: "bool" },
    inactive_reason: { col: "inactive_reason", kind: "text" },
  },
  async validate(db, _mode, v) {
    const pct = n(v.pct);
    if (pct == null || pct <= 0) throw onyxError(7438);
    if (b(v.is_default)) await db.query(`UPDATE erp.tax_slice SET is_default = false WHERE no <> $1`, [n(v.no) ?? -1]);
  },
  async guardDelete(db, before) {
    const pct = String(n(before.pct) ?? 0);
    if ((await count(db, `SELECT count(*) c FROM erp.item_tax WHERE pct = $1`, [pct])) > 0) throw onyxError(3618, "أصناف");
    if ((await count(db, `SELECT count(*) c FROM erp.account_tax WHERE pct = $1`, [pct])) > 0) throw onyxError(3618, "حسابات");
    if ((await count(db, `SELECT count(*) c FROM erp.item_group WHERE default_tax_pct = $1`, [pct])) > 0) {
      throw onyxError(3618, "مجموعات أصناف");
    }
  },
};

/* ═══════════ 14 · op.5.1.1.2 — وحدات القياس · MEASUREMENT [GO/05-warehouse.md] ═══════════ */

const unit: EntityDef = {
  table: "erp.unit",
  screen: "op.5.1.1.2",
  listSql: `SELECT code, name_ar, name_en, global_code, default_pack_size::text default_pack_size, lock_pack_size,
                   unit_kind, measure_class, linked_to_counted, sale_scope, ${AUDIT_SQL}
            FROM erp.unit`,
  searchCols: ["code", "name_ar", "name_en"],
  fields: {
    code: { col: "code", kind: "text", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    global_code: { col: "global_code", kind: "text" },
    default_pack_size: { col: "default_pack_size", kind: "num" },
    lock_pack_size: { col: "lock_pack_size", kind: "bool" },
    unit_kind: { col: "unit_kind", kind: "int", required: true },
    measure_class: { col: "measure_class", kind: "int" },
    linked_to_counted: { col: "linked_to_counted", kind: "bool" },
    sale_scope: { col: "sale_scope", kind: "int" },
  },
  async validate(db, mode, v, before) {
    const code = s(v.code);
    if (!code) throw onyxError(9754);
    /* IV-R21 — المقارنة بعد قص المسافات وبلا تمييز حالة الأحرف */
    const dup = await count(db, `SELECT count(*) c FROM erp.unit WHERE lower(trim(code)) = lower($1) AND code <> $2`, [code, code]);
    if (dup > 0) throw onyxError(2143);
    /* IV-R22 — الرمز الدولي فريد إن أُدخل */
    const gb = s(v.global_code);
    if (gb) {
      const dupGb = await count(db, `SELECT count(*) c FROM erp.unit WHERE global_code = $1 AND code <> $2`, [gb, code]);
      if (dupGb > 0) throw onyxError(2143);
    }
    /* IV-R23 — تصنيف الوحدة إلزامي عند «مقاسة» */
    const kind = n(v.unit_kind) ?? 1;
    if (kind === 2 && n(v.measure_class) == null) throw onyxError(4048);
    /* IV-R25 — نوع الوحدة والارتباط يُقفلان بعد أول استخدام في صنف */
    if (mode === "edit" && before) {
      const changed = n(before.unit_kind) !== kind || b(before.linked_to_counted) !== b(v.linked_to_counted);
      if (changed && (await unitUsed(db, code)) > 0) throw onyxError(5119);
    }
  },
  async guardDelete(db, before) {
    const used = await unitUsed(db, s(before.code));
    if (used > 0) throw onyxError(3618, "أصناف");
  },
};

const unitConversion: EntityDef = {
  table: "erp.unit_conversion",
  screen: "op.5.1.1.2",
  listSql: `SELECT id, group_no, from_code, to_code, factor::text factor, needs_review, ${AUDIT_SQL}
            FROM erp.unit_conversion`,
  searchCols: ["from_code", "to_code"],
  keyCols: ["from_code", "to_code"],
  orderBy: "group_no, from_code",
  fields: {
    from_code: { col: "from_code", kind: "text", required: true, key: true },
    to_code: { col: "to_code", kind: "text", required: true },
    group_no: { col: "group_no", kind: "int" },
    factor: { col: "factor", kind: "num", required: true },
    needs_review: { col: "needs_review", kind: "bool" },
  },
  async validate(_db, _mode, v) {
    const f = n(v.factor);
    if (f == null || f <= 0) throw onyxError(7438);
    /* لا منع لتحويل الوحدة لنفسها: أونيكس نفسه فيه سجل cm² ← cm² (IAS_UNTS_CONV) */
  },
  async guardDelete() {
    /* IV-R28 — جدول التحويل خلف «نظام الأوزان» المطفأ: الحذف لا يمس أي مستند */
  },
};

/* ═══════════ 15 · op.5.1.2.1 — المجموعة الرئيسية · GROUP_DETAILS [GO/05-warehouse.md] ═══════════ */

const itemGroup: EntityDef = {
  table: "erp.item_group",
  screen: "op.5.1.2.1",
  listSql: `SELECT code, name_ar, name_en, item_code_prefix, default_tax_pct::text default_tax_pct, sort_no,
                   qty_limit::text qty_limit, sync_to_web, use_sale_as_purchase_price, allow_disc_sales, allow_disc_purch,
                   min_price_base, min_price_sign, min_price_val_typ, min_price_value::text min_price_value,
                   needs_review, ${AUDIT_SQL}
            FROM erp.item_group`,
  searchCols: ["code", "name_ar"],
  fields: {
    code: { col: "code", kind: "text", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    item_code_prefix: { col: "item_code_prefix", kind: "text" },
    default_tax_pct: { col: "default_tax_pct", kind: "num" },
    sort_no: { col: "sort_no", kind: "int" },
    qty_limit: { col: "qty_limit", kind: "num" },
    sync_to_web: { col: "sync_to_web", kind: "bool" },
    use_sale_as_purchase_price: { col: "use_sale_as_purchase_price", kind: "bool" },
    allow_disc_sales: { col: "allow_disc_sales", kind: "bool" },
    allow_disc_purch: { col: "allow_disc_purch", kind: "bool" },
    min_price_base: { col: "min_price_base", kind: "int" },
    min_price_sign: { col: "min_price_sign", kind: "text" },
    min_price_val_typ: { col: "min_price_val_typ", kind: "int" },
    min_price_value: { col: "min_price_value", kind: "num" },
    needs_review: { col: "needs_review", kind: "bool" },
  },
  async validate(db, _mode, v) {
    /* IV-R74 — نسبة الضريبة لازم تكون شريحة معرّفة في الشرائح */
    const pct = n(v.default_tax_pct);
    if (pct != null && !(await sliceExists(db, pct))) throw onyxError(4814);
  },
  async guardDelete(db, before) {
    const code = s(before.code);
    /* IV-R71 — منع الحذف إذا عليها صنف أو ربط محاسبي */
    if ((await count(db, `SELECT count(*) c FROM erp.item WHERE group_code = $1`, [code])) > 0) throw onyxError(3618, "أصناف");
    const linked = await count(db, `SELECT count(*) c FROM erp.inventory_gl_link WHERE link_type = 1 AND group_code = $1`, [code]);
    if (linked > 0) throw onyxError(3618, "ربط محاسبي");
  },
};

/* ═══════════ 16 · op.5.1.2.8 — مجموعات المخازن · WAREHOUSE_GROUP
   [مساعدة: INVI004] [نموذج: INVI004] [قاعدة: WAREHOUSE_GROUP] ═══════════ */

const warehouseGroup: EntityDef = {
  table: "erp.warehouse_group",
  screen: "op.5.1.2.8",
  listSql: `SELECT code, name_ar, name_en, ${AUDIT_SQL} FROM erp.warehouse_group`,
  searchCols: ["code", "name_ar"],
  fields: {
    code: { col: "code", kind: "text", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
  },
  async validate(_db, _mode, v) {
    /* [مساعدة: INVI004] الرقم آلي قابل للتعديل، والاسم المحلي إجباري — الأجنبي اختياري */
    if (!s(v.code)) throw onyxError(4048);
  },
  async guardDelete(db, before) {
    const code = s(before.code);
    /* المجموعة تُستخدم في بيانات المخازن وفي ربط الحسابات بنوع 2 [مساعدة: INVI004] */
    if ((await count(db, `SELECT count(*) c FROM erp.warehouse WHERE group_code = $1`, [code])) > 0) {
      throw onyxError(3618, "مخازن");
    }
    const linked = await count(db, `SELECT count(*) c FROM erp.inventory_gl_link WHERE link_type = 2 AND group_code = $1`, [code]);
    if (linked > 0) throw onyxError(3618, "ربط محاسبي");
  },
};

/* ═══════════ 17 · op.1.2.11 — ربط الحسابات المدينة والدائنة الأخرى · GLS_AC_CODE_DTL_GRPS
   [مساعدة: GENI025] [نموذج: GENI025] ═══════════ */

const accountDetailLink: EntityDef = {
  table: "erp.account_detail_link",
  screen: "op.1.2.11",
  listSql: `SELECT code, name_ar, name_en, conn_code, account_code, analytic_type, ${AUDIT_SQL}
            FROM erp.account_detail_link`,
  searchCols: ["code", "name_ar", "account_code"],
  fields: {
    code: { col: "code", kind: "text", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    account_code: { col: "account_code", kind: "text", required: true },
    analytic_type: { col: "analytic_type", kind: "int" },
    conn_code: { col: "conn_code", kind: "int" },
  },
  async validate(db, mode, v, before) {
    const acc = await requirePostingAccount(db, s(v.account_code));
    /* [مساعدة: GENI025] «الحسابات لا تظهر في هذه الشاشة إلا إذا رُبطت بنوعَي مدينة/دائنة أخرى».
       يُفحص عند الإضافة أو تغيير الحساب فقط: السجل الوحيد في أونيكس (1 · 3201010017) محفوظ بنوع 5
       بينما الحساب في الدليل اليوم نوعه 0 ⇒ فحصه عند كل تعديل يمنع تعديل سجل أونيكس حقيقي */
    const changed = mode === "add" || !before || s(before.account_code) !== s(v.account_code);
    if (changed) {
      const t = n(acc.analytic_type);
      if (t !== 5 && t !== 6) throw onyxError(4544);
      v.analytic_type = t; /* يظهر آلياً حسب الدليل — لا يُدخَل */
    } else {
      v.analytic_type = n(before.analytic_type);
    }
    /* النوع التفصيلي: 1 «مدينة ودائنة أخرى». خيار «طبيب» لا يظهر إلا مع نظام المستشفيات (محذوف — SY-D4) */
    if (n(v.conn_code) == null) v.conn_code = 1;
  },
  async guardDelete(db, before) {
    const used = await count(db, `SELECT count(*) c FROM erp.account_detail_group WHERE account_code = $1`, [
      s(before.account_code),
    ]);
    if (used > 0) throw onyxError(3618, "مجموعات حسابات تحليلية");
  },
};

/* ═══════════ 18 · op.1.2.4 — ربط الحسابات بالحسابات العامة والتدفقات النقدية · GENI006
   تبويب ١: الحساب العام ← نوع التدفق · تبويب ٢: حساب الدليل ← الحساب العام
   [مساعدة: GENI006 إنجليزي] [قاعدة: IAS_ACCOUNT_ANLSYS · ACCOUNT.A_ANALYSIS/FLOW_TYPE] ═══════════ */

const generalFlow: EntityDef = {
  table: "erp.general_account",
  screen: "op.1.2.4",
  listSql: `SELECT no, name_ar, name_en, level, analytic_type, report_type, flow_type, update_accounts, ${AUDIT_SQL}
            FROM erp.general_account`,
  searchCols: ["name_ar", "CAST(no AS text)"],
  orderBy: "no",
  noAdd: true,
  noDelete: true,
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    flow_type: { col: "flow_type", kind: "int" },
    update_accounts: { col: "update_accounts", kind: "bool" },
  },
  async validate(db, _mode, v) {
    const flow = n(v.flow_type);
    /* 1 تشغيلي · 2 استثماري · 3 تمويلي — القيم الموجودة فعلاً في IAS_ACCOUNT_ANLSYS */
    if (flow != null && (flow < 1 || flow > 3)) throw onyxError(4048);
    /* «تحديث دليل الحسابات»: الحفظ يُنزل نوع التدفق على حسابات الدليل المربوطة بهذا الحساب العام */
    if (b(v.update_accounts) && flow != null) {
      await db.query(`UPDATE erp.account SET flow_type = $1 WHERE analysis_no = $2`, [flow, n(v.no) ?? -1]);
    }
  },
  async guardDelete() {
    /* الشاشة لا تحذف — noDelete */
  },
};

const accountFlow: EntityDef = {
  table: "erp.account",
  screen: "op.1.2.4",
  /* حسابات الحركة فقط [مساعدة: GENI006 «detail accounts»] — 289 من 384 */
  listSql: `SELECT code, name_ar, a_level, kind, analysis_no, flow_type, ${AUDIT_SQL}
            FROM erp.account`,
  scope: { kind: "posting" },
  searchCols: ["code", "name_ar"],
  orderBy: "code",
  noAdd: true,
  noDelete: true,
  fields: {
    code: { col: "code", kind: "text", required: true, key: true },
    analysis_no: { col: "analysis_no", kind: "int" },
    flow_type: { col: "flow_type", kind: "int" },
  },
  async validate(db, _mode, v, before) {
    /* الحسابات النازلة في الشاشة هي حسابات الحركة فقط [مساعدة: GENI006 «detail accounts»] */
    if (before && s(before.kind) !== "posting") throw onyxError(497);
    const anls = n(v.analysis_no);
    if (anls == null) {
      v.flow_type = null;
      return;
    }
    const g = (await db.query(`SELECT no, flow_type FROM erp.general_account WHERE no = $1`, [anls])).rows[0];
    if (!g) throw onyxError(497);
    /* «The system automatically displays the type of flow» — يُشتق من الحساب العام لا يُدخَل */
    v.flow_type = n(g.flow_type);
  },
  async guardDelete() {
    /* الشاشة لا تحذف — noDelete */
  },
};

/* ═══════════ 19 · op.3.4 — ربط الحسابات بالأنواع الضريبية · GLS_TAX_ACC [GO/03-tax.md] ═══════════ */

const accountTax: EntityDef = {
  table: "erp.account_tax",
  screen: "op.3.4",
  listSql: `SELECT account_code, tax_no, agency_no, pct::text pct, ${AUDIT_SQL} FROM erp.account_tax`,
  searchCols: ["account_code", "CAST(tax_no AS text)"],
  orderBy: "account_code",
  fields: {
    account_code: { col: "account_code", kind: "text", required: true, key: true },
    tax_no: { col: "tax_no", kind: "int", required: true },
    agency_no: { col: "agency_no", kind: "int", required: true },
    pct: { col: "pct", kind: "num", required: true },
  },
  async validate(db, _mode, v) {
    /* TX-R8 — الحساب من الحسابات الفرعية (المتأثرة بالحركة) فقط */
    await requirePostingAccount(db, s(v.account_code));
    if (!(await taxTypeExists(db, n(v.tax_no)))) throw onyxError(5020);
    /* TX-R11 — النسبة من الشرائح المعرّفة */
    const pct = n(v.pct);
    if (!(await sliceExists(db, pct))) throw onyxError(4814);
    const ag = await count(db, `SELECT count(*) c FROM erp.tax_agency WHERE tax_no = $1 AND agency_no = $2`, [
      n(v.tax_no) ?? -1,
      n(v.agency_no) ?? 1,
    ]);
    if (!ag) throw onyxError(4801);
  },
  async guardDelete(db, before) {
    /* TX-R7 — لا يُحذف ربط استُخدم في حركة ضريبية */
    if ((await taxMovement(db, "A_CODE", s(before.account_code))) > 0) throw onyxError(3618, "حركة ضريبية");
  },
};

/* ═══════════ 20 · op.3.5 — ربط الأصناف بالأنواع الضريبية · GNR_TAX_ITM [GO/03-tax.md] ═══════════ */

const ZATCA_CATS = ["S", "Z", "E", "O"];

const itemTax: EntityDef = {
  table: "erp.item_tax",
  screen: "op.3.5",
  listSql: `SELECT item_code, tax_no, agency_no, pct::text pct, min_amount::text min_amount,
                   exempt_reason_code, exempt_reason_text, tax_code, vat_category, exempt_load_by_nationality, ${AUDIT_SQL}
            FROM erp.item_tax`,
  searchCols: ["item_code", "vat_category"],
  orderBy: "item_code",
  fields: {
    item_code: { col: "item_code", kind: "text", required: true, key: true },
    tax_no: { col: "tax_no", kind: "int", required: true },
    agency_no: { col: "agency_no", kind: "int", required: true },
    pct: { col: "pct", kind: "num", required: true },
    min_amount: { col: "min_amount", kind: "num" },
    exempt_reason_code: { col: "exempt_reason_code", kind: "text" },
    exempt_reason_text: { col: "exempt_reason_text", kind: "text" },
    tax_code: { col: "tax_code", kind: "text" },
    vat_category: { col: "vat_category", kind: "text", required: true },
    exempt_load_by_nationality: { col: "exempt_load_by_nationality", kind: "bool" },
  },
  async validate(db, _mode, v) {
    const item = s(v.item_code);
    if (!item) throw onyxError(3319);
    if ((await count(db, `SELECT count(*) c FROM erp.item WHERE code = $1`, [item])) === 0) throw onyxError(3319);
    if (!(await taxTypeExists(db, n(v.tax_no)))) throw onyxError(5020);
    /* TX-R11 — النسبة تُختار من الشرائح المعرّفة فقط */
    if (!(await sliceExists(db, n(v.pct)))) throw onyxError(4783);
    const cat = s(v.vat_category).toUpperCase() || "S";
    if (!ZATCA_CATS.includes(cat)) throw onyxError(5020);
    v.vat_category = cat;
    /* TX-R12 — الفئة E/Z/O تستلزم رمز ونص سبب الإعفاء (مدقق الهيئة يرفض بدونها) */
    if (cat !== "S" && (!s(v.exempt_reason_code) || !s(v.exempt_reason_text))) throw onyxError(4048);
    const t = (await db.query(`SELECT code FROM erp.tax_type WHERE no = $1`, [n(v.tax_no)])).rows[0];
    v.tax_code = s(t?.code); /* TAX_TYP_CODE لقطة من النوع — يُرسل في XML */
  },
  async guardDelete(db, before) {
    if ((await taxMovement(db, "I_CODE", s(before.item_code))) > 0) throw onyxError(3618, "حركة ضريبية");
  },
};

/* ═══════════ 21 · op.5.1.2.16 — ربط حسابات المخزون بالأستاذ · IAS_CONN_ACC_INV_BY_GL
   [GO/05-warehouse.md] ═══════════ */

const INV_LINK_ACCOUNTS = [
  "inventory_acc", "sales_acc", "sales_return_acc", "discount_allowed_acc", "discount_earned_acc",
  "cogs_acc", "cogs_return_acc", "py_sales_return_acc", "py_cogs_return_acc",
  "free_cogs_acc", "free_purchase_cost_acc", "free_return_cogs_acc", "purchase_acc", "prepaid_revenue_acc",
  "service_purchase_acc", "deferred_sales_acc", "deferred_cogs_acc", "advance_sales_acc", "advance_return_acc",
  "compensation_cogs_acc", "price_diff_acc",
];
/* IV-R130 — الحسابات الخمسة الأساسية إلزامية (السجلات الـ12 كلها ممتلئة فيها) */
const INV_LINK_REQUIRED = ["inventory_acc", "sales_acc", "sales_return_acc", "cogs_acc", "cogs_return_acc"];

const inventoryGlLink: EntityDef = {
  table: "erp.inventory_gl_link",
  screen: "op.5.1.2.16",
  listSql: `SELECT link_type, group_code, ${INV_LINK_ACCOUNTS.join(", ")}, ${AUDIT_SQL} FROM erp.inventory_gl_link`,
  searchCols: ["group_code", "inventory_acc", "sales_acc"],
  keyCols: ["link_type", "group_code"],
  orderBy: "link_type, group_code",
  fields: {
    link_type: { col: "link_type", kind: "int", required: true, key: true },
    group_code: { col: "group_code", kind: "text", required: true },
    ...Object.fromEntries(INV_LINK_ACCOUNTS.map((c) => [c, { col: c, kind: "text" as const }])),
  },
  async validate(db, mode, v, before) {
    const type = n(v.link_type) ?? 1;
    const code = s(v.group_code);
    /* IV-R129 — القائمة تتبع المتغير: 1 مجموعات أصناف · 2 مجموعات مخازن */
    const table = type === 2 ? "erp.warehouse_group" : "erp.item_group";
    if ((await count(db, `SELECT count(*) c FROM ${table} WHERE code = $1`, [code])) === 0) throw onyxError(4048);
    for (const f of INV_LINK_REQUIRED) if (!s(v[f])) throw onyxError(4048);
    /* IV-R132 — كل حساب فرعي (يقبل الحركة) */
    for (const f of INV_LINK_ACCOUNTS) {
      const acc = s(v[f]);
      if (acc) await requirePostingAccount(db, acc);
    }
    /* IV-R131 — حساب المخزون لا يُعدَّل بعد أول حركة عليه */
    if (mode === "edit" && before && s(before.inventory_acc) && s(before.inventory_acc) !== s(v.inventory_acc)) {
      if ((await accountMoved(db, s(before.inventory_acc))) > 0) throw onyxError(5798);
    }
  },
  async guardDelete(db, before) {
    /* IV-R136 — لا يُحذف ربط مجموعة عليها حركات */
    if (n(before.link_type) === 1) {
      const items = await count(db, `SELECT count(*) c FROM erp.item WHERE group_code = $1`, [s(before.group_code)]);
      if (items > 0) throw onyxError(3618, "أصناف");
    } else {
      const whs = await count(db, `SELECT count(*) c FROM erp.warehouse WHERE group_code = $1`, [s(before.group_code)]);
      if (whs > 0) throw onyxError(3618, "مخازن");
    }
  },
};

/* ═══════════ 22 · op.7.1.2.2 — مجموعة العملاء · CUSTOMER_GROUP [GO/07-customers-sales.md] ═══════════ */

const customerGroup: EntityDef = {
  table: "erp.customer_group",
  screen: "op.7.1.2.2",
  listSql: `SELECT no, name_ar, name_en, account_code, extra_account, ${AUDIT_SQL} FROM erp.customer_group`,
  searchCols: ["name_ar", "account_code", "CAST(no AS text)"],
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    account_code: { col: "account_code", kind: "text", required: true },
    extra_account: { col: "extra_account", kind: "text" },
  },
  async validate(db, _mode, v) {
    /* CG-R1 · CG-R2 — الرقم والاسم وحساب المجموعة إلزامية، والحساب فرعي تحليليه «عميل» */
    const acc = await requirePostingAccount(db, s(v.account_code));
    if (s(acc.analytic_type) !== "3") throw onyxError(497);
  },
  async guardDelete(db, before) {
    /* CG-R9 — لا تُحذف مجموعة لها عملاء */
    const c = await count(db, `SELECT count(*) c FROM erp.customer WHERE group_no = $1`, [n(before.no) ?? -1]);
    if (c > 0) throw onyxError(3618, "عملاء");
    const lim = await count(db, `SELECT count(*) c FROM erp.customer_group_limit WHERE group_no = $1`, [n(before.no) ?? -1]);
    if (lim > 0) throw onyxError(4050);
  },
};

const customerGroupLimit: EntityDef = {
  table: "erp.customer_group_limit",
  screen: "op.7.1.2.2",
  listSql: `SELECT group_no, currency, side, balance_min::text balance_min, balance_max::text balance_max,
                   txn_min::text txn_min, txn_max::text txn_max, overrun_pct::text overrun_pct,
                   overrun_possible::text overrun_possible, overrun_policy, inactive, branch_no, ${AUDIT_SQL}
            FROM erp.customer_group_limit`,
  searchCols: ["currency", "CAST(group_no AS text)"],
  keyCols: ["group_no", "currency", "side"],
  orderBy: "group_no, currency, side",
  fields: {
    group_no: { col: "group_no", kind: "int", required: true, key: true },
    currency: { col: "currency", kind: "text", required: true },
    side: { col: "side", kind: "int", required: true },
    balance_min: { col: "balance_min", kind: "num" },
    balance_max: { col: "balance_max", kind: "num" },
    txn_min: { col: "txn_min", kind: "num" },
    txn_max: { col: "txn_max", kind: "num" },
    overrun_pct: { col: "overrun_pct", kind: "num" },
    overrun_possible: { col: "overrun_possible", kind: "num" },
    overrun_policy: { col: "overrun_policy", kind: "int" },
    inactive: { col: "inactive", kind: "bool" },
    branch_no: { col: "branch_no", kind: "int" },
  },
  async validate(db, _mode, v) {
    const g = await count(db, `SELECT count(*) c FROM erp.customer_group WHERE no = $1`, [n(v.group_no) ?? -1]);
    if (!g) throw onyxError(4048);
    const cur = await count(db, `SELECT count(*) c FROM erp.currency WHERE code = $1`, [s(v.currency)]);
    if (!cur) throw onyxError(4048);
    const lo = n(v.balance_min);
    const hi = n(v.balance_max);
    if (lo != null && hi != null && lo > hi) throw onyxError(4244);
    const tlo = n(v.txn_min);
    const thi = n(v.txn_max);
    if (tlo != null && thi != null && tlo > thi) throw onyxError(4244);
    /* CG-R7 — 1 لا يسمح · 2 يسمح · 3 يسمح مع التنبيه (قائمة LOW_PRICE نفسها) */
    const pol = n(v.overrun_policy) ?? 1;
    if (pol < 1 || pol > 3) throw onyxError(4048);
    const side = n(v.side) ?? 1;
    if (side < 1 || side > 3) throw onyxError(4048);
    /* «أعلى حد متاح» = الحد الأعلى × (1 + نسبة التجاوز) — محسوب لا مُدخَل */
    const pct = n(v.overrun_pct);
    v.overrun_possible = hi == null ? null : String(hi * (1 + (pct ?? 0) / 100));
    if (pol === 1 && pct != null && pct > 0) throw onyxError(7181);
  },
  async guardDelete() {
    /* الحد الائتماني سجل إعداد بلا أثر دفتري — حذفه يرفع القيد فقط */
  },
};

/* ═══════════ 23 · op.6.1.2.1 — مجموعة الموردين · VENDOR_GROUP [GO/06-suppliers-purchasing.md] ═══════════ */

const supplierGroup: EntityDef = {
  table: "erp.supplier_group",
  screen: "op.6.1.2.1",
  listSql: `SELECT no, name_ar, name_en, account_code, ${AUDIT_SQL} FROM erp.supplier_group`,
  searchCols: ["name_ar", "account_code", "CAST(no AS text)"],
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    account_code: { col: "account_code", kind: "text", required: true },
  },
  async validate(db, mode, v, before) {
    /* AP-R11 — الحساب من حسابات نوع «مورد» فقط */
    const acc = await requirePostingAccount(db, s(v.account_code));
    if (s(acc.analytic_type) !== "4") throw onyxError(497);
    /* AP-R14 — تغيير حساب المجموعة ينعكس على موردي المجموعة: يُمنع إن كان على الحساب القديم حركة */
    if (mode === "edit" && before && s(before.account_code) !== s(v.account_code)) {
      if ((await accountMoved(db, s(before.account_code))) > 0) throw onyxError(5798);
    }
  },
  async guardDelete(db, before) {
    const c = await count(db, `SELECT count(*) c FROM erp.vendor WHERE group_no = $1`, [n(before.no) ?? -1]);
    if (c > 0) throw onyxError(3618, "موردون");
  },
};

/* ═══════════ 24 · op.1.1.13 — تهيئة الدليل المحاسبي · ACCOUNT_TYPES · ACCOUNT_REPORT_TYPE
   · ACCOUNT_GROUPING · IAS_ACCOUNT_CLASS [مساعدة: GENS021] [نموذج: GENS021] ═══════════ */

const accountType: EntityDef = {
  table: "erp.account_type",
  screen: "op.1.1.13",
  listSql: `SELECT no, name_ar, name_en, affected_by_trans, ${AUDIT_SQL} FROM erp.account_type`,
  searchCols: ["name_ar", "CAST(no AS text)"],
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    affected_by_trans: { col: "affected_by_trans", kind: "bool" },
  },
  async validate(db, _mode, v) {
    /* [مساعدة: GENS021] «وهو نوع واحد ودائماً ما يكون في المستوى الأخير» */
    if (b(v.affected_by_trans)) {
      await db.query(`UPDATE erp.account_type SET affected_by_trans = false WHERE no <> $1`, [n(v.no) ?? -1]);
    }
  },
  async guardDelete(db, before) {
    const used = await count(db, `SELECT count(*) c FROM erp.account WHERE type_no = $1`, [n(before.no) ?? -1]);
    if (used > 0) throw onyxError(3618, "حسابات");
  },
};

const accountReportType: EntityDef = {
  table: "erp.account_report_type",
  screen: "op.1.1.13",
  listSql: `SELECT no, name_ar, name_en, is_balance_sheet, ${AUDIT_SQL} FROM erp.account_report_type`,
  searchCols: ["name_ar", "CAST(no AS text)"],
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    is_balance_sheet: { col: "is_balance_sheet", kind: "bool" },
  },
  async validate() {
    /* [مساعدة: GENS021] ترميز أنواع التقارير الختامية إلزامي كي يُربط بها الحساب — بلا قيد إضافي */
  },
  async guardDelete(db, before) {
    const used = await count(db, `SELECT count(*) c FROM erp.account WHERE report_type_no = $1`, [n(before.no) ?? -1]);
    if (used > 0) throw onyxError(3618, "حسابات");
  },
};

const accountGroup: EntityDef = {
  table: "erp.account_group",
  screen: "op.1.1.13",
  listSql: `SELECT no, name_ar, name_en, ${AUDIT_SQL} FROM erp.account_group`,
  searchCols: ["name_ar", "CAST(no AS text)"],
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
  },
  async validate() {
    /* [مساعدة: GENS021] تبويب اختياري — لا قاعدة إضافية */
  },
  async guardDelete(db, before) {
    const used = await count(db, `SELECT count(*) c FROM erp.account WHERE grouping_no = $1`, [n(before.no) ?? -1]);
    if (used > 0) throw onyxError(3618, "حسابات");
  },
};

const accountClass: EntityDef = {
  table: "erp.account_class",
  screen: "op.1.1.13",
  listSql: `SELECT no, name_ar, name_en, ${AUDIT_SQL} FROM erp.account_class`,
  searchCols: ["name_ar", "CAST(no AS text)"],
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
  },
  async validate() {
    /* [مساعدة: GENS021] تبويب اختياري — لا قاعدة إضافية */
  },
  async guardDelete(db, before) {
    const used = await count(db, `SELECT count(*) c FROM erp.account WHERE class_no = $1`, [n(before.no) ?? -1]);
    if (used > 0) throw onyxError(3618, "حسابات");
  },
};

/* ═══════════ 25 · op.1.2.1 — الدليل المحاسبي العام للوحدات · IAS_ACCOUNT_ANLSYS
   [نموذج: GENI008] [قاعدة: IAS_ACCOUNT_ANLSYS — 147 صفاً · 4 مستويات] ═══════════ */

const GENERAL_LEVEL_LEN = [1, 2, 3, 5]; /* مستخرج من الأرقام الفعلية: 1 → 11 → 111 → 11101 */

const generalAccount: EntityDef = {
  table: "erp.general_account",
  screen: "op.1.2.1",
  listSql: `SELECT no, name_ar, name_en, parent_no, order_code, notes, order_no, analytic_type, flow_type,
                   is_main, level, report_type, is_debit, update_accounts, ${AUDIT_SQL}
            FROM erp.general_account`,
  searchCols: ["name_ar", "name_en", "CAST(no AS text)"],
  orderBy: "no",
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    parent_no: { col: "parent_no", kind: "int" },
    order_code: { col: "order_code", kind: "text" },
    notes: { col: "notes", kind: "text" },
    order_no: { col: "order_no", kind: "int" },
    analytic_type: { col: "analytic_type", kind: "int" },
    flow_type: { col: "flow_type", kind: "int" },
    is_main: { col: "is_main", kind: "bool" },
    level: { col: "level", kind: "int" },
    report_type: { col: "report_type", kind: "int", required: true },
    is_debit: { col: "is_debit", kind: "bool" },
    update_accounts: { col: "update_accounts", kind: "bool" },
  },
  async validate(db, _mode, v) {
    const no = s(v.no);
    const parent = s(v.parent_no);
    const level = GENERAL_LEVEL_LEN.indexOf(no.length) + 1;
    if (level <= 0) throw onyxError(6039);
    v.level = level;
    if (parent && parent !== "0") {
      const p = (await db.query(`SELECT no, level, is_main FROM erp.general_account WHERE no = $1`, [n(v.parent_no) ?? -1])).rows[0];
      if (!p) throw onyxError(4048);
      /* 6039 عن الرتبة فقط — لا شرط أن يبدأ الرقم برقم الأب: أونيكس فيه 11301 تحت 114 و11401 تحت 113 */
      if (level !== Number(p.level ?? 0) + 1) throw onyxError(6039);
    } else if (level !== 1) {
      throw onyxError(6039);
    }
    /* الأب في الدليل العام ليس حساب حركة (MN_SUB = 1 للـ106 في المستوى الأخير) */
    const children = await count(db, `SELECT count(*) c FROM erp.general_account WHERE parent_no = $1`, [n(v.no) ?? -1]);
    if (children > 0 && b(v.is_main)) throw onyxError(6039);
    const rep = n(v.report_type);
    if (rep !== 1 && rep !== 2) throw onyxError(4048);
  },
  async guardDelete(db, before) {
    const children = await count(db, `SELECT count(*) c FROM erp.general_account WHERE parent_no = $1`, [n(before.no) ?? -1]);
    if (children > 0) throw onyxError(4050);
    const linked = await count(db, `SELECT count(*) c FROM erp.account WHERE analysis_no = $1`, [n(before.no) ?? -1]);
    if (linked > 0) throw onyxError(3618, "حسابات الدليل");
  },
};

/* ═══════════ 26 · op.1.2.9 — الحسابات الوسيطة · INTERFACE_ACC [GO/01-system-setup.md] ═══════════ */

const INTERFACE_FILLED = [
  "fx_diff", "vat_output", "vat_input", "rounding_diff", "rounding_after_vat",
  "wh_transfer_diff", "cost_diff_purchase_return", "issue_diff",
];
const INTERFACE_EMPTY = [
  "lost_extra_goods", "notes_payable", "notes_receivable", "lc_diff", "commission", "empty_acc",
  "rounding_cc", "rounding_pj", "rounding_activity", "purchase_discount_intermediary", "balanced_cc",
  "branch_current", "stock_diff_purchase", "kit_item_diff", "wh_transfer_return_diff", "promissory_notes",
  "cashier_deficit", "cashier_excess", "bank_deposit", "advance_payment", "stock_adjustment",
  "purchase_income", "tax_due", "lc", "profit_tax_credit", "profit_tax_debit", "shipping_vat",
  "rep_commission", "collector_commission", "marketer_commission", "employee_commission", "daily_sales",
  "return_replace", "return_replace_free", "coupon", "coupon_replace_diff", "points_replace",
  "delivery_sales", "delivery_sales_detail",
  "fa_increase", "fa_decrease", "fa_transfer", "fa_cc", "fa_activity", "fa_project", "fa_maintenance",
  "fa_lost", "fa_profit",
  "hr_end_of_service", "hr_loan", "hr_custody", "hr_travel", "hr_medical_tax",
];
/* أعمدة أبعاد لا حسابات — تُستثنى من فحص «الحساب فرعي» */
const INTERFACE_DIMENSIONS = new Set(["rounding_cc", "rounding_pj", "rounding_activity", "balanced_cc", "fa_cc", "fa_activity", "fa_project"]);
const INTERFACE_ALL = [...INTERFACE_FILLED, ...INTERFACE_EMPTY];

const branchPostingAccounts: EntityDef = {
  table: "erp.branch_posting_accounts",
  screen: "op.1.2.9",
  listSql: `SELECT branch_no, interface_no, ${INTERFACE_ALL.join(", ")}, ${AUDIT_SQL}
            FROM erp.branch_posting_accounts`,
  searchCols: ["CAST(branch_no AS text)", "vat_output", "vat_input"],
  orderBy: "branch_no",
  fields: {
    branch_no: { col: "branch_no", kind: "int", required: true, key: true },
    interface_no: { col: "interface_no", kind: "int" },
    ...Object.fromEntries(INTERFACE_ALL.map((c) => [c, { col: c, kind: "text" as const }])),
  },
  async validate(db, mode, v, before) {
    const brn = n(v.branch_no);
    if (brn == null) throw onyxError(4048);
    if ((await count(db, `SELECT count(*) c FROM erp.branch WHERE no = $1`, [brn])) === 0) throw onyxError(4048);
    /* SY-R33 — الحساب يُختار من الدليل (فرعي فقط)، وتغيير حساب عليه حركة يُفحص */
    for (const f of INTERFACE_ALL) {
      if (INTERFACE_DIMENSIONS.has(f)) continue;
      const acc = s(v[f]);
      if (!acc) continue;
      await requirePostingAccount(db, acc);
      if (mode === "edit" && before && s(before[f]) && s(before[f]) !== acc) {
        if ((await accountMoved(db, s(before[f]))) > 0) throw onyxError(5798);
      }
    }
  },
  async guardDelete(db, before) {
    const brn = n(before.branch_no) ?? -1;
    const live = await count(db, `SELECT count(*) c FROM erp.gl_entry WHERE branch_id = $1`, [brn]);
    const open = await count(db, `SELECT count(*) c FROM erp.opening_balance_line WHERE branch_id = $1`, [brn]);
    if (live + open > 0) throw onyxError(4921);
  },
};

/* ═══════════ 27 · op.4.1.2.8 — ربط الحسابات بالمشاريع · IAS_ACCOUNT_PJ
   [مساعدة: GLSI009] [نموذج: GLSI009] [قاعدة: IAS_ACCOUNT_PJ — 0 صف] ═══════════ */

const accountProject: EntityDef = {
  table: "erp.account_project",
  screen: "op.4.1.2.8",
  listSql: `SELECT account_code, project_no, ${AUDIT_SQL} FROM erp.account_project`,
  searchCols: ["account_code", "CAST(project_no AS text)"],
  keyCols: ["account_code", "project_no"],
  orderBy: "account_code, project_no",
  fields: {
    account_code: { col: "account_code", kind: "text", required: true, key: true },
    project_no: { col: "project_no", kind: "int", required: true },
  },
  async validate(db, _mode, v) {
    /* [نموذج: GLSI009] الحسابات النازلة هي حسابات الحركة فقط (ACCOUNT_TYPES.AFFECTED_BY_TRANS) */
    await requirePostingAccount(db, s(v.account_code));
    const pj = await count(db, `SELECT count(*) c FROM erp.project WHERE no = $1`, [n(v.project_no) ?? -1]);
    if (!pj) throw onyxError(4048);
  },
  async guardDelete(db, before) {
    /* [مساعدة: GLSI009] الربط يحصر استخدام المشروع بالحسابات المربوطة ⇒ لا يُرفع ربط عليه حركة */
    if ((await projectMovement(db, s(before.project_no))) > 0) throw onyxError(3618, "حركة مالية");
  },
};

export const LAYER1: Record<string, EntityDef> = {
  tax_type: taxType,
  tax_agency: taxAgency,
  tax_slice: taxSlice,
  unit,
  unit_conversion: unitConversion,
  item_group: itemGroup,
  warehouse_group: warehouseGroup,
  account_detail_link: accountDetailLink,
  general_flow: generalFlow,
  account_flow: accountFlow,
  account_tax: accountTax,
  item_tax: itemTax,
  inventory_gl_link: inventoryGlLink,
  customer_group: customerGroup,
  customer_group_limit: customerGroupLimit,
  supplier_group: supplierGroup,
  account_type: accountType,
  account_report_type: accountReportType,
  account_group: accountGroup,
  account_class: accountClass,
  general_account: generalAccount,
  branch_posting_accounts: branchPostingAccounts,
  account_project: accountProject,
};

export type { Row };
