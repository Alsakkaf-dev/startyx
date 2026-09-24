import type { Db } from "../infrastructure/db.ts";
import { DomainError } from "../shared-kernel/errors.ts";
import {
  AUDIT_SQL, b, count, n, onyxError, requirePostingAccount, s,
  type EntityDef, type FieldDef, type Row, type Values,
} from "./master-kit.ts";
import { extractHas, inOnyxList, loadedOnce, onyxParam, stampInactive, today } from "./masters-layer2.ts";
import {
  CUSTOMER_COLS, CUSTOMER_CURR_COLS, CUSTOMER_ACCNT_COLS, CUSTOMER_SALES_CAP_COLS, CUSTOMER_DRIVER_COLS,
  type ColKind, type ColSpec,
} from "./masters-sync-layer2b.ts";
import { VENDOR_ACCNT_COLS, VENDOR_BANK_COLS, VENDOR_COLS } from "./masters-sync-vendors.ts";
import { EMPLOYEE_COLS } from "./masters-sync-employees.ts";

/**
 * الطبقة ٢ (تكملة) — بنود 34–36 في `startyx/BUILD-ORDER.md`: العملاء · الموردون · الموظفون.
 * المصدر لكل بند ملف `GO/` الخاص بشاشته؛ الأعمدة من المواصفة في `masters-sync-layer2b.ts`.
 * نصوص الأخطاء من جدول رسائل أونيكس برقمها. قاعدة بلا رسالة أونيكس ⇒ رمز القاعدة في GO لا نص مخترع.
 */

const FIELD_KIND: Record<ColKind, FieldDef["kind"]> = { text: "text", int: "int", num: "num", bool: "bool", date: "date", ts: "text" };

/** حقول الكيان من المواصفة — الإلزامي يُحدَّد بعدها */
function fieldsOf(cols: ColSpec[]): Record<string, FieldDef> {
  return Object.fromEntries(cols.map(([, e, k]) => [e, { col: e, kind: FIELD_KIND[k] }]));
}

/** قائمة القراءة من المواصفة: التاريخ يوماً · الرقم بلا أصفار زائدة */
function selectOf(cols: ColSpec[], alias: string): string {
  return cols.map(([, e, k]) =>
    k === "date" ? `to_char(${alias}.${e},'YYYY-MM-DD') ${e}`
      : k === "num" ? `trim_scale(${alias}.${e})::text ${e}`
        : k === "ts" ? `to_char(${alias}.${e},'DD/MM/YYYY HH24:MI') ${e}` : `${alias}.${e}`).join(", ");
}

function inList(v: Values, key: string, allowed: readonly number[]): void {
  const x = n(v[key]);
  if (x != null && !allowed.includes(x)) throw onyxError(5093);
}

async function exists(db: Db, sql: string, val: string): Promise<boolean> {
  return (await count(db, sql, [val])) > 0;
}

/* ═══════════ 34 · op.7.1.2.8 — بيانات العملاء · CUSTOMER [GO/07-customers-sales.md] ═══════════ */

/** مستندات أونيكس التي تحمل العميل — ما عليه منها يمنع الحذف (CU-R15 · 3618 باسم المستند) */
const CUSTOMER_DOCS: { table: string; label: string; where: string }[] = [
  { table: "IAS_BILL_MST", label: "فواتير المبيعات", where: `"C_CODE" = $1` },
  { table: "IAS_RT_BILL_MST", label: "مردود المبيعات", where: `"C_CODE" = $1` },
  { table: "IAS_POST_DTL", label: "القيود المرحّلة", where: `"AC_CODE_DTL" = $1 AND "AC_DTL_TYP" = '3' AND "DOC_TYPE" <> '0'` },
];

/** القيد الافتتاحي الحيّ (op.4.1.2.10) على تحليلي الطرف — مصدره الجدول لا نسخة أونيكس المستخرجة */
async function inOpening(db: Db, analyticType: string, code: string): Promise<boolean> {
  return (await count(db, `SELECT count(*) c FROM erp.opening_balance_line WHERE analytic_type = $1 AND analytic_code = $2`, [analyticType, code])) > 0;
}

async function customerMovement(db: Db, code: string): Promise<string | null> {
  for (const d of CUSTOMER_DOCS) {
    if (!(await extractHas(db, d.table))) {
      if (await loadedOnce(db)) return d.label;
      continue;
    }
    if ((await count(db, `SELECT count(*) c FROM extract."${d.table}" WHERE ${d.where}`, [code])) > 0) return d.label;
  }
  const live = await count(db, `SELECT count(*) c FROM erp.gl_entry_line WHERE analytic_type = 'customer' AND CAST(analytic_id AS text) = $1`, [code]);
  if (live > 0) return "القيود المرحّلة";
  if (await inOpening(db, "3", code)) return "الأرصدة الافتتاحية";
  return null;
}

async function customerCycle(db: Db, code: string, parent: string): Promise<boolean> {
  const seen = new Set<string>();
  let cur = parent;
  while (cur) {
    if (cur === code || seen.has(cur)) return true;
    seen.add(cur);
    const r = await db.query(`SELECT parent_code FROM erp.customer WHERE code = $1`, [cur]);
    cur = s(r.rows[0]?.parent_code);
  }
  return false;
}

async function requireCustomer(db: Db, code: string): Promise<void> {
  if (!(await exists(db, `SELECT count(*) c FROM erp.customer WHERE code = $1`, code))) throw onyxError(5093);
}

/**
 * الرقم المقترح لطرف جديد في مجموعته (العميل CG-R3 · المورد AP-R13) — يُعيد إنتاج كل سلسلة قائمة في أونيكس:
 * ١) أكبر رقم يبدأ برقم المجموعة وبالطول المهيّأ + 1 (عملاء 102 ⇒ 102000136)؛
 * ٢) وإلا تكملة سلسلة المجموعة كما هي (عملاء 114 ⇒ 11400056 · موردو 2 ⇒ 20078 · موردو 6 ⇒ 17)؛
 * ٣) مجموعة بلا أعضاء ⇒ رقم المجموعة + 1 مبطَّناً للطول المهيّأ. التسلسل العام (النوع 1) ⇒ الأكبر + 1.
 * [مستنتج من البيانات — نموذج أونيكس مترجَم لا تُقرأ دالته] والرقم قابل للتعديل قبل الحفظ كما في أونيكس.
 */
async function nextInGroup(db: Db, table: string, group: string, len: number, general: boolean): Promise<string> {
  if (general) {
    const r = await db.query(`SELECT max(CAST(code AS numeric)) m FROM ${table} WHERE code ~ '^[0-9]+$'`);
    return String(Number(r.rows[0]?.m ?? 0) + 1);
  }
  if (!/^[0-9]+$/.test(group)) return "";
  const pref = await db.query(
    `SELECT max(CAST(code AS numeric)) m FROM ${table} WHERE group_no = $1 AND code LIKE $2 AND length(code) = $3 AND code ~ '^[0-9]+$'`,
    [Number(group), group + "%", len],
  );
  if (pref.rows[0]?.m != null) return String(BigInt(String(pref.rows[0].m)) + 1n);
  const any = await db.query(`SELECT max(CAST(code AS numeric)) m FROM ${table} WHERE group_no = $1 AND code ~ '^[0-9]+$'`, [Number(group)]);
  if (any.rows[0]?.m != null) return String(BigInt(String(any.rows[0].m)) + 1n);
  const width = len - group.length;
  return width < 1 ? "" : group + "1".padStart(width, "0");
}

/** رقم متسلسل داخلي (CST_SEQ · V_SEQ = MAX + 1) */
async function nextSeq(db: Db, table: string): Promise<number> {
  const r = await db.query(`SELECT COALESCE(max(seq_no), 0) + 1 m FROM ${table}`);
  return Number(r.rows[0]?.m ?? 1);
}

async function localCurrency(db: Db): Promise<string> {
  const r = await db.query(`SELECT code FROM erp.currency WHERE is_local ORDER BY no LIMIT 1`);
  return s(r.rows[0]?.code) || "SAR";
}

/** أونيكس يعرض المجموعة «رقم - اسم» — الحقل يقبل الرقم وحده */
const CUSTOMER_FIELDS: Record<string, FieldDef> = {
  ...fieldsOf(CUSTOMER_COLS),
  usage_kind: { col: "usage_kind", kind: "text" },
};
CUSTOMER_FIELDS.code = { col: "code", kind: "text", required: true, key: true };
CUSTOMER_FIELDS.name_ar = { col: "name_ar", kind: "text", required: true };
CUSTOMER_FIELDS.group_no = { col: "group_no", kind: "int", required: true };
/* CU-R2 — الحساب يُورث من المجموعة ⇒ لا يُطلب ما دامت المجموعة محدّدة */
CUSTOMER_FIELDS.account_code = { col: "account_code", kind: "text", required: true, inheritedWhen: "group_no" };
/* CU-R1 — النوع الضريبي إلزامي (IAS_MNDTRY_SCR_FIELDS: FORM_NO 143 · C_CLASS_VAT · FLD_ST 1) */
CUSTOMER_FIELDS.vat_class = { col: "vat_class", kind: "int", required: true };

/** CU-R17 (قرار المستخدم 2026-09-15) */
const USAGE_KINDS = ["regular", "cash_sales", "free_qty", "unallocated", "doubtful", "general"];

const customer: EntityDef = {
  table: "erp.customer",
  screen: "op.7.1.2.8",
  listSql: `SELECT ${selectOf(CUSTOMER_COLS, "c")}, c.usage_kind,
                   (c.portal_secret_hash IS NOT NULL) has_portal_secret,
                   (SELECT g.name_ar FROM erp.customer_group g WHERE g.no = c.group_no) group_name,
                   (SELECT a.name_ar FROM erp.account a WHERE a.code = c.account_code) account_name,
                   (SELECT v.name_ar FROM erp.vendor v WHERE v.code = c.linked_vendor) linked_vendor_name,
                   (SELECT r.name_ar FROM erp.salesman r WHERE r.code = c.rep_code) rep_name,
                   (SELECT p.name_ar FROM erp.customer p WHERE p.code = c.parent_code) parent_name,
                   (SELECT k.name_ar FROM erp.branch k WHERE k.no = c.branch_no) branch_name,
                   (SELECT count(*) FROM erp.salesman_customer sc WHERE sc.customer_code = c.code) rep_count,
                   ${AUDIT_SQL}
            FROM erp.customer c`,
  searchCols: ["code", "name_ar", "name_en", "mobile", "phone", "vat_no"],
  orderBy: "lpad(code, 15, '0')",
  listLimit: 5000,
  fields: CUSTOMER_FIELDS,
  async nextKey(db, hint) {
    /* CU-R2 / CG-R3 — CST_SEQ_TYPE = 2 «حسب المجموعة» · CUST_LENGTH = 9 */
    return nextInGroup(db, "erp.customer", s(hint.group),
      n(await onyxParam(db, "IAS_PARA_AR", "CUST_LENGTH")) ?? 9, s(await onyxParam(db, "IAS_PARA_AR", "CST_SEQ_TYPE")) === "1");
  },
  async validate(db, mode, v, before, _user) {
    const code = s(v.code);
    /* CUST_D_TYPE = 1 «رقمي» ⇒ أرقام فقط */
    if (!/^[0-9]{1,15}$/.test(code)) throw onyxError(4724);
    /* CU-R2 — المجموعة موجودة، والحساب يُورث منها إن لم يُحدَّد */
    const grp = (await db.query(`SELECT no, account_code FROM erp.customer_group WHERE no = $1`, [n(v.group_no) ?? -1])).rows[0];
    if (!grp) throw onyxError(5093);
    /* AR_AC_LINK_TYPE = 2 «مجموعة الحسابات»: الحساب حساب المجموعة دائماً (GO #5 «عرض» — 1,863/1,863 كذلك) */
    if ((await onyxParam(db, "IAS_PARA_AR", "AR_AC_LINK_TYPE")) === "2" || !s(v.account_code)) v.account_code = s(grp.account_code);
    const acc = await requirePostingAccount(db, s(v.account_code));
    /* الحساب تحليليه «عميل» (3) — نفس فحص CG-R2 على حساب المجموعة */
    if (s(acc.analytic_type) !== "3") throw onyxError(5114);
    /* CU-R1 — النوع الضريبي من C_CLASS_VAT (1 شخصي · 2 أعمال · 3 شركات أجنبية · 4 مؤجلة · 5 حكومية) */
    const vc = n(v.vat_class);
    if (vc == null || ![1, 2, 3, 4, 5].includes(vc)) throw onyxError(4048);
    /* العميل الرئيسي: موجود ولا دوران */
    const parent = s(v.parent_code);
    if (parent) {
      if (!(await exists(db, `SELECT count(*) c FROM erp.customer WHERE code = $1`, parent))) throw onyxError(5093);
      if (await customerCycle(db, code, parent)) throw onyxError(5093);
    }
    /* المندوب (5003) · المورد المرتبط · الفرع · مركز التكلفة — كل رقم موجود في ترميزه */
    const rep = s(v.rep_code);
    if (rep && !(await exists(db, `SELECT count(*) c FROM erp.salesman WHERE code = $1`, rep))) throw onyxError(5003);
    for (const [k, sql] of [
      ["linked_vendor", `SELECT count(*) c FROM erp.vendor WHERE code = $1`],
      ["employee_no", `SELECT count(*) c FROM erp.employee WHERE code = $1`],
      ["branch_no", `SELECT count(*) c FROM erp.branch WHERE no = CAST($1 AS integer)`],
      ["cost_center", `SELECT count(*) c FROM erp.cost_center WHERE code = $1`],
    ] as const) {
      const val = s(v[k]);
      if (val && !(await exists(db, sql, val))) throw onyxError(5093);
    }
    /* ترميزات أونيكس غير المبنية بعد في startyx — تُفحص من جداولها المستخرجة (الفارغ منها يرفض أي رقم كما في قائمته) */
    for (const [k, table, col] of [
      ["customer_type", "CUSTOMER_CLASS", "C_CLASS"], ["classification", "CUSTOMER_CLASS_TYP", "C_CLASS_TYP"],
      ["grade_no", "CUSTOMER_DEGREE", "C_DEGREE"], ["collector_no", "COLLERCTOR", "COL_NO"],
      ["marketer_code", "IAS_PROMOTERS", "PRM_CODE"],
      ["route_no", "IAS_ROUTE_MST", "ROUTE_NO"], ["country_no", "CNTRY", "CNTRY_NO"],
      ["province_no", "IAS_PROVINCES", "PROV_NO"], ["city_no", "CITIES", "CITY_NO"], ["region_no", "REGIONS", "R_CODE"],
      ["dlvr_province_no", "IAS_PROVINCES", "PROV_NO"], ["dlvr_city_no", "CITIES", "CITY_NO"], ["dlvr_region_no", "REGIONS", "R_CODE"],
      ["tax_calc_method", "GNR_TAX_TYP_CLC_MST", "CLC_TYP_NO"],
    ] as const) {
      const val = s(v[k]);
      if (val && !(await inOnyxList(db, table, col, val))) throw onyxError(5093);
    }
    /* القوائم الثابتة (S_FLAGS) */
    inList(v, "allow_sale_with_debt", [0, 1, 2]);   /* PRIV_LEVEL */
    inList(v, "notify_channel", [0, 1, 3]);         /* AUTO_SEND */
    inList(v, "registration_type", [1, 2, 3, 4]);   /* CST_RGSTR_TYP */
    inList(v, "sector", [1, 2]);                    /* CST_SCTR_TYP */
    inList(v, "gender", [1, 2]);                    /* CUST_GNDR */
    inList(v, "visit_open_type", [1, 2, 3, 4]);     /* VST_OPN_TYP_CST */
    inList(v, "item_cap_type", [0, 1, 2]);          /* CST_LMT_ITM_QTY_TYP */
    inList(v, "g_status", [0, 1]);
    inList(v, "g_type", [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    if (s(v.usage_kind) && !USAGE_KINDS.includes(s(v.usage_kind))) throw onyxError(5093);
    for (const k of ["max_discount_pct", "default_discount_pct", "g_amount", "monthly_income", "credit_days",
      "pending_cash_credit_days", "grace_days"]) {
      const x = n(v[k]);
      if (x != null && x < 0) throw onyxError(7438);
    }
    /* الفترات: النهاية ≥ البداية (3434) · انتهاء الهوية بعد إصدارها (4928) */
    const pairs: [string, string, number][] = [["active_from", "active_to", 3434], ["g_start_date", "g_expire_date", 3434],
      ["id_issue_date", "id_expiry_date", 4928]];
    for (const [a, z, msg] of pairs) {
      const x = s(v[a]);
      const y = s(v[z]);
      if (x && y && (msg === 4928 ? y <= x : y < x)) throw onyxError(msg as 3434 | 4928);
    }
    /* CU-R4 — «توقيف العميل» يسجّل تاريخه (INACTIVE_DATE؛ لا عمود للموقِف في CUSTOMER) */
    stampInactive(v, before, "");
    delete v.inactive_by;
    /* CU-R6 — القائمة السوداء: تاريخ الإضافة آلي، ورفعها يمسح التاريخ والسبب */
    const bl = b(v.blacklisted);
    const wasBl = before ? b(before.blacklisted) : false;
    if (bl && !wasBl) v.blacklisted_at = today();
    else if (!bl) {
      v.blacklisted_at = null;
      v.blacklist_reason = null;
    }
    /* التسلسل CST_SEQ = MAX + 1 (ARSI005: SELECT NVL(MAX(CST_SEQ),0) + 1 FROM CUSTOMER) */
    /* دائماً عند الإضافة — «إضافة من» تنسخ حقول المصدر ولا يجوز أن تنسخ تسلسله */
    if (mode === "add") v.seq_no = await nextSeq(db, "erp.customer");
    else if (before) v.seq_no = before.seq_no;
    /* كلمة السر لا تُكتب من الشاشة نصاً — تُعيَّن بمسار مستقل (لا يُعرض ولا يُعاد) */
    delete v.portal_secret_hash;
  },
  async warnings(db, saved) {
    const out: string[] = [];
    const code = s(saved.code);
    /* CU-R16 [مستنتج · ويب: ZATCA] — «أعمال»: 15 رقماً يبدأ وينتهي بـ3 — تنبيه لا منع (TAX_CODE_LNGTH فارغ في أونيكس) */
    const vat = s(saved.vat_no);
    if (n(saved.vat_class) === 2) {
      if (vat && !/^3[0-9]{13}3$/.test(vat)) out.push(`الرقم الضريبي ${vat} ليس بصيغة الهيئة (15 رقماً يبدأ وينتهي بـ3)`);
      /* GO §٥ — جاهزية الفاتورة القياسية: الرقم الضريبي أو المعرّف + العنوان الوطني كامل */
      if (!vat && !s(saved.id_value)) out.push("عميل «أعمال» بلا رقم ضريبي ولا معرّف — الفاتورة القياسية تحتاج أحدهما");
      const miss = [["building_no", "رقم المبنى"], ["street", "الشارع"], ["district_name", "الحي"], ["city_no", "المدينة"],
        ["postal_code", "الرمز البريدي"]].filter(([k]) => !s(saved[k])).map(([, l]) => l);
      if (miss.length) out.push("العنوان الوطني ناقص للفاتورة القياسية: " + miss.join(" · "));
    }
    /* تحذيرات جودة (GO §٦): جوال مكرر · الخصم الافتراضي فوق الأعلى [مستنتج] */
    const mob = s(saved.mobile);
    if (mob && mob.replace(/0/g, "") !== "") {
      const r = await db.query(`SELECT code FROM erp.customer WHERE mobile = $1 AND code <> $2 ORDER BY code LIMIT 3`, [mob, code]);
      if (r.rows.length) out.push(`الجوال ${mob} مسجّل أيضاً للعميل ${r.rows.map((x) => s(x.code)).join(" · ")}`);
    }
    const mx = n(saved.max_discount_pct);
    const df = n(saved.default_discount_pct);
    if (mx != null && df != null && df > mx) out.push("نسبة الخصم الافتراضية أعلى من أعلى نسبة خصم");
    return out;
  },
  async afterSave(db, mode, saved, payload) {
    if (mode !== "add") return;
    const code = s(saved.code);
    /* CU-R3 — عملة واحدة على الأقل: «إضافة من» تنسخ عملات المصدر، وإلا صف العملة المحلية افتراضياً */
    const from = s(payload.copy_from);
    if (from) {
      await db.query(
        `INSERT INTO erp.customer_currency (customer_code, currency, price_level_credit, price_level_cash, is_default, created_by, created_at)
         SELECT $1, currency, price_level_credit, price_level_cash, is_default, $3, now() FROM erp.customer_currency WHERE customer_code = $2
         ON CONFLICT DO NOTHING`,
        [code, from, s(saved.created_by)],
      );
    }
    if ((await count(db, `SELECT count(*) c FROM erp.customer_currency WHERE customer_code = $1`, [code])) === 0) {
      await db.query(
        `INSERT INTO erp.customer_currency (customer_code, currency, is_default, created_by, created_at) VALUES ($1, $2, true, $3, now())`,
        [code, await localCurrency(db), s(saved.created_by)],
      );
    }
    /* GRNT_AUTO_PRIV_CST_AC = 1 — صلاحيات العميل الجديد آلياً من صلاحيات مجموعته (IAS_CUSTOMER_GROUP_PRIV) */
    if ((await onyxParam(db, "IAS_PARA_AR", "GRNT_AUTO_PRIV_CST_AC")) !== "0" && (await extractHas(db, "IAS_CUSTOMER_GROUP_PRIV"))) {
      const cur = await localCurrency(db);
      await db.query(
        `INSERT INTO erp.customer_user (customer_code, user_id, currency, can_add, can_view, created_by, created_at)
         SELECT $1, CAST(p."U_ID" AS integer), $3, p."ADD_FLAG" = '1', p."VIEW_FLAG" = '1', $4, now()
         FROM extract."IAS_CUSTOMER_GROUP_PRIV" p WHERE p."C_GROUP_CODE" = $2
         ON CONFLICT DO NOTHING`,
        [code, s(saved.group_no), cur, s(saved.created_by)],
      );
    }
  },
  async guardDelete(db, before) {
    const code = s(before.code);
    /* عميل رئيسي لعملاء آخرين */
    if ((await count(db, `SELECT count(*) c FROM erp.customer WHERE parent_code = $1`, [code])) > 0) throw onyxError(4050);
    /* CU-R15 — لا يُحذف عميل له حركات */
    const doc = await customerMovement(db, code);
    if (doc) throw onyxError(3618, doc);
  },
  async cascade(db, before) {
    const code = s(before.code);
    for (const t of ["erp.customer_currency", "erp.customer_user", "erp.customer_driver", "erp.customer_account",
      "erp.customer_sales_cap"]) {
      await db.query(`DELETE FROM ${t} WHERE customer_code = $1`, [code]);
    }
    await db.query(`DELETE FROM erp.salesman_customer WHERE customer_code = $1`, [code]);
    await db.query(`DELETE FROM erp.account_limit WHERE analytic_type = 3 AND analytic_code = $1`, [code]);
  },
};

/* تبويب ١ — شبكة العملات · CUSTOMER_CURR (CU-R3) */
const CURR_FIELDS = fieldsOf(CUSTOMER_CURR_COLS);
CURR_FIELDS.customer_code = { col: "customer_code", kind: "text", required: true, key: true };
CURR_FIELDS.currency = { col: "currency", kind: "text", required: true };
const customerCurrency: EntityDef = {
  table: "erp.customer_currency",
  screen: "op.7.1.2.8",
  listSql: `SELECT ${selectOf(CUSTOMER_CURR_COLS, "x")},
                   (SELECT c.name_ar FROM erp.currency c WHERE c.code = x.currency) currency_name,
                   (SELECT l."LEV_A_NAME" FROM extract."IAS_PRICING_LEVELS" l WHERE l."LEV_NO" = CAST(x.price_level_credit AS text) LIMIT 1) price_level_credit_name,
                   (SELECT l."LEV_A_NAME" FROM extract."IAS_PRICING_LEVELS" l WHERE l."LEV_NO" = CAST(x.price_level_cash AS text) LIMIT 1) price_level_cash_name,
                   ${AUDIT_SQL}
            FROM erp.customer_currency x`,
  searchCols: ["customer_code", "currency"],
  keyCols: ["customer_code", "currency"],
  orderBy: "customer_code, currency",
  listLimit: 5000,
  fields: CURR_FIELDS,
  async validate(db, _mode, v) {
    await requireCustomer(db, s(v.customer_code));
    if (!(await exists(db, `SELECT count(*) c FROM erp.currency WHERE code = $1`, s(v.currency)))) throw onyxError(5093);
    for (const k of ["price_level_credit", "price_level_cash"]) {
      const lv = s(v[k]);
      if (lv && !(await inOnyxList(db, "IAS_PRICING_LEVELS", "LEV_NO", lv))) throw onyxError(5093);
    }
    for (const k of ["credit_limit", "invoice_limit", "overrun_pct"]) {
      const x = n(v[k]);
      if (x != null && x < 0) throw onyxError(7438);
    }
    /* تجاوز الحد (CST_LMT_TYP): قائمة LOW_PRICE 1–3 كما في حد المجموعة */
    inList(v, "overrun_policy", [1, 2, 3]);
    if (b(v.inactive) && !s(v.inactive_date)) v.inactive_date = today();
    if (!b(v.inactive)) v.inactive_date = null;
  },
  async warnings(db, saved) {
    const r = await count(db, `SELECT count(*) c FROM erp.customer_currency WHERE customer_code = $1 AND is_default`, [s(saved.customer_code)]);
    return r > 1 ? ["أكثر من عملة افتراضية لهذا العميل"] : [];
  },
  async guardDelete(db, before) {
    /* CU-R3 — عملة واحدة على الأقل لكل عميل */
    const left = await count(db, `SELECT count(*) c FROM erp.customer_currency WHERE customer_code = $1`, [s(before.customer_code)]);
    if (left <= 1) throw new DomainError("CU-R3", "يجب أن تبقى للعميل عملة واحدة على الأقل");
  },
};

/* تبويب ٨ — حد الدين · IAS_AC_CC_LMT على تحليلي العميل (AC_DTL_TYP 3) — قواعد CG-R4–R7 نفسها */
const customerLimit: EntityDef = {
  table: "erp.account_limit",
  screen: "op.7.1.2.8",
  listSql: `SELECT rcrd_sq, analytic_code, account_code, currency, cost_center, side, trim_scale(balance_min)::text balance_min,
                   trim_scale(balance_max)::text balance_max, trim_scale(txn_min)::text txn_min, trim_scale(txn_max)::text txn_max,
                   trim_scale(overrun_pct)::text overrun_pct, trim_scale(overrun_possible)::text overrun_possible,
                   overrun_policy, description, branch_no, inactive, ${AUDIT_SQL}
            FROM erp.account_limit`,
  searchCols: ["analytic_code", "currency"],
  scope: { analytic_type: 3 },
  orderBy: "analytic_code, rcrd_sq",
  listLimit: 5000,
  fields: {
    rcrd_sq: { col: "rcrd_sq", kind: "int", required: true, key: true },
    analytic_code: { col: "analytic_code", kind: "text", required: true },
    account_code: { col: "account_code", kind: "text" },
    currency: { col: "currency", kind: "text", required: true },
    cost_center: { col: "cost_center", kind: "text" },
    side: { col: "side", kind: "int" },
    balance_min: { col: "balance_min", kind: "num" },
    balance_max: { col: "balance_max", kind: "num" },
    txn_min: { col: "txn_min", kind: "num" },
    txn_max: { col: "txn_max", kind: "num" },
    overrun_pct: { col: "overrun_pct", kind: "num" },
    overrun_possible: { col: "overrun_possible", kind: "num" },
    overrun_policy: { col: "overrun_policy", kind: "int" },
    description: { col: "description", kind: "text" },
    branch_no: { col: "branch_no", kind: "int" },
    inactive: { col: "inactive", kind: "bool" },
  },
  async validate(db, _mode, v) {
    const c = (await db.query(`SELECT account_code FROM erp.customer WHERE code = $1`, [s(v.analytic_code)])).rows[0];
    if (!c) throw onyxError(5093);
    /* الحد على حساب العميل نفسه (A_CODE = C_A_CODE) */
    v.account_code = s(c.account_code);
    if (!(await exists(db, `SELECT count(*) c FROM erp.currency WHERE code = $1`, s(v.currency)))) throw onyxError(5093);
    const cc = s(v.cost_center);
    if (cc && !(await exists(db, `SELECT count(*) c FROM erp.cost_center WHERE code = $1`, cc))) throw onyxError(5093);
    const lo = n(v.balance_min);
    const hi = n(v.balance_max);
    if (lo != null && hi != null && lo > hi) throw onyxError(4244);
    const tlo = n(v.txn_min);
    const thi = n(v.txn_max);
    if (tlo != null && thi != null && tlo > thi) throw onyxError(4244);
    for (const k of ["balance_min", "balance_max", "txn_min", "txn_max", "overrun_pct"]) {
      const x = n(v[k]);
      if (x != null && x < 0) throw onyxError(7438);
    }
    const pol = n(v.overrun_policy) ?? 1;
    if (pol < 1 || pol > 3) throw onyxError(4048);
    v.overrun_policy = pol;
    const side = n(v.side) ?? 1;
    if (side < 1 || side > 3) throw onyxError(4048);
    v.side = side;
    const pct = n(v.overrun_pct);
    /* «أعلى حد متاح» محسوب لا مُدخَل — ويبقى فارغاً كما في أونيكس ما لم تُحدَّد نسبة تجاوز */
    v.overrun_possible = hi == null || pct == null ? null : String(hi * (1 + pct / 100));
    if (pol === 1 && pct != null && pct > 0) throw onyxError(7181);
  },
  async guardDelete() {},
};

/* تبويب ٩ — الحسابات · IAS_CST_ACCNT (قائمة CST_ACCNT_TYP 1–8) */
const ACCNT_FIELDS = fieldsOf(CUSTOMER_ACCNT_COLS);
ACCNT_FIELDS.rcrd_no = { col: "rcrd_no", kind: "int", required: true, key: true };
ACCNT_FIELDS.customer_code = { col: "customer_code", kind: "text", required: true };
ACCNT_FIELDS.account_code = { col: "account_code", kind: "text", required: true };
ACCNT_FIELDS.account_type = { col: "account_type", kind: "int", required: true };
const customerAccount: EntityDef = {
  table: "erp.customer_account",
  screen: "op.7.1.2.8",
  listSql: `SELECT ${selectOf(CUSTOMER_ACCNT_COLS, "x")},
                   (SELECT a.name_ar FROM erp.account a WHERE a.code = x.account_code) account_name, ${AUDIT_SQL}
            FROM erp.customer_account x`,
  searchCols: ["customer_code", "account_code"],
  orderBy: "customer_code, rcrd_no",
  fields: ACCNT_FIELDS,
  async validate(db, _mode, v, before, user) {
    await requireCustomer(db, s(v.customer_code));
    await requirePostingAccount(db, s(v.account_code));
    inList(v, "account_type", [1, 2, 3, 4, 5, 6, 7, 8]);
    stampInactive(v, before, user);
  },
  async guardDelete() {},
};

/* تبويب ١١ — حدود مبيعات العملاء · IAS_CST_LMT_SAL (CU-R9) */
const CAP_FIELDS = fieldsOf(CUSTOMER_SALES_CAP_COLS);
CAP_FIELDS.rcrd_no = { col: "rcrd_no", kind: "int", required: true, key: true };
CAP_FIELDS.customer_code = { col: "customer_code", kind: "text", required: true };
CAP_FIELDS.from_date = { col: "from_date", kind: "date", required: true };
CAP_FIELDS.to_date = { col: "to_date", kind: "date", required: true };
CAP_FIELDS.amount = { col: "amount", kind: "num", required: true };
const customerSalesCap: EntityDef = {
  table: "erp.customer_sales_cap",
  screen: "op.7.1.2.8",
  listSql: `SELECT ${selectOf(CUSTOMER_SALES_CAP_COLS, "x")}, ${AUDIT_SQL} FROM erp.customer_sales_cap x`,
  searchCols: ["customer_code"],
  orderBy: "customer_code, rcrd_no",
  fields: CAP_FIELDS,
  async validate(db, _mode, v) {
    await requireCustomer(db, s(v.customer_code));
    if (s(v.to_date) < s(v.from_date)) throw onyxError(3434);
    const amt = n(v.amount);
    if (amt == null || amt < 0) throw onyxError(7438);
    if (!s(v.currency)) v.currency = await localCurrency(db);
  },
  async warnings(db, saved) {
    /* الفترات لا تتداخل [مستنتج — GO §٣] ⇒ تنبيه لا منع */
    const r = await count(db,
      `SELECT count(*) c FROM erp.customer_sales_cap WHERE customer_code = $1 AND rcrd_no <> $2 AND from_date <= $4 AND to_date >= $3`,
      [s(saved.customer_code), n(saved.rcrd_no), s(saved.from_date), s(saved.to_date)]);
    return r ? ["فترة هذا الحد تتداخل مع حد آخر للعميل"] : [];
  },
  async guardDelete() {},
};

/* تبويب ١٣ — ربط العملاء بالسائقين · IAS_CST_DRVR (السائق من IAS_DRIVERS — فارغ في أونيكس ⇒ 4849) */
const DRV_FIELDS = fieldsOf(CUSTOMER_DRIVER_COLS);
DRV_FIELDS.customer_code = { col: "customer_code", kind: "text", required: true, key: true };
DRV_FIELDS.driver_no = { col: "driver_no", kind: "int", required: true };
const customerDriver: EntityDef = {
  table: "erp.customer_driver",
  screen: "op.7.1.2.8",
  listSql: `SELECT ${selectOf(CUSTOMER_DRIVER_COLS, "x")}, ${AUDIT_SQL} FROM erp.customer_driver x`,
  searchCols: ["customer_code", "CAST(driver_no AS text)"],
  keyCols: ["customer_code", "driver_no"],
  orderBy: "customer_code, driver_no",
  fields: DRV_FIELDS,
  async validate(db, _mode, v, before, user) {
    await requireCustomer(db, s(v.customer_code));
    if (!(await inOnyxList(db, "IAS_DRIVERS", "DRIVER_NO", s(v.driver_no)))) throw onyxError(4849);
    stampInactive(v, before, user);
  },
  async guardDelete() {},
};

/* تبويب ١٠ — الصلاحيات · IAS_PRIV_CUSTOMER (إضافة = يستخدمه في العمليات · تقرير = يعرضه في التقارير) */
const customerUser: EntityDef = {
  table: "erp.customer_user",
  screen: "op.7.1.2.8",
  listSql: `SELECT customer_code, user_id, currency, can_add, can_view, ${AUDIT_SQL} FROM erp.customer_user`,
  searchCols: ["customer_code", "CAST(user_id AS text)"],
  keyCols: ["customer_code", "user_id", "currency"],
  orderBy: "customer_code, user_id, currency",
  listLimit: 5000,
  fields: {
    customer_code: { col: "customer_code", kind: "text", required: true, key: true },
    user_id: { col: "user_id", kind: "int", required: true },
    currency: { col: "currency", kind: "text", required: true },
    can_add: { col: "can_add", kind: "bool" },
    can_view: { col: "can_view", kind: "bool" },
  },
  async validate(db, _mode, v) {
    await requireCustomer(db, s(v.customer_code));
    if (!(await inOnyxList(db, "USER_R", "U_ID", s(v.user_id)))) throw onyxError(4145);
    if (!(await exists(db, `SELECT count(*) c FROM erp.currency WHERE code = $1`, s(v.currency)))) throw onyxError(5093);
  },
  async guardDelete() {},
};

/** رقم سجل عام للجدول كله (RCRD_SQ/RCRD_NO في أونيكس = MAX + 1 على الجدول لا على العميل) */
function globalNext(table: string, col: string): EntityDef["nextKey"] {
  return async (db) => {
    const r = await db.query(`SELECT COALESCE(max(${col}), 0) + 1 m FROM ${table}`);
    return String(r.rows[0]?.m ?? 1);
  };
}
customerLimit.nextKey = globalNext("erp.account_limit", "rcrd_sq");
customerAccount.nextKey = globalNext("erp.customer_account", "rcrd_no");
customerSalesCap.nextKey = globalNext("erp.customer_sales_cap", "rcrd_no");

/** تبويبات الاستعلام — قراءة فقط (مثل «العمليات» في شاشة المندوب) */
function readOnly(table: string, listSql: string, keyCols: string[], orderBy: string, fields: Record<string, FieldDef>, search: string[]): EntityDef {
  return {
    table, screen: "op.7.1.2.8", listSql, searchCols: search, keyCols, orderBy, listLimit: 5000, noAdd: true, noDelete: true, fields,
    async validate() { throw onyxError(4053); },
    async guardDelete() { throw onyxError(4053); },
  };
}

/* تبويب ١٦ «العمليات» — كل سطر قيد على تحليلي العميل؛ الرصيد تراكمي بالتاريخ */
const customerLedger = readOnly("erp.customer_ledger",
  `SELECT customer_code, source, doc_type, doc_no, to_char(doc_date,'YYYY-MM-DD') doc_date, description,
          trim_scale(round(debit, 2))::text debit, trim_scale(round(credit, 2))::text credit, currency, branch_no, cheque_no,
          (SELECT flg."FLG_DESC" FROM extract."S_FLAGS" flg WHERE flg."LANG_NO" = '1' AND flg."FLG_CODE" = 'POST_DOC_TYPE'
             AND flg."FLG_VALUE" = CAST(erp.customer_ledger.doc_type AS text) LIMIT 1) doc_type_name,
          trim_scale(round(sum(debit - credit) OVER (PARTITION BY customer_code ORDER BY doc_date, doc_type, doc_no
                     ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2))::text balance
   FROM erp.customer_ledger`,
  ["customer_code", "doc_type", "doc_no"], "doc_date, doc_type, doc_no",
  { customer_code: { col: "customer_code", kind: "text", key: true }, doc_type: { col: "doc_type", kind: "int" },
    doc_no: { col: "doc_no", kind: "text" }, branch_no: { col: "branch_no", kind: "int" }, currency: { col: "currency", kind: "text" } },
  ["doc_no", "description"]);

/* تبويب ١٧ «وثائق المبيعات» */
const customerSalesDoc = readOnly("erp.customer_sales_doc",
  `SELECT customer_code, doc_kind, doc_kind_name, doc_no, doc_type, to_char(doc_date,'YYYY-MM-DD') doc_date,
          to_char(due_date,'YYYY-MM-DD') due_date, description, trim_scale(round(amount, 2))::text amount,
          trim_scale(round(discount, 2))::text discount, trim_scale(round(vat, 2))::text vat,
          trim_scale(round(amount - discount + vat, 2))::text total, currency, ref_no, branch_no,
          (SELECT k.name_ar FROM erp.branch k WHERE k.no = erp.customer_sales_doc.branch_no) branch_name
   FROM erp.customer_sales_doc`,
  ["customer_code", "doc_kind", "doc_no"], "doc_date DESC, doc_kind, doc_no",
  { customer_code: { col: "customer_code", kind: "text", key: true }, doc_kind: { col: "doc_kind", kind: "int" },
    doc_no: { col: "doc_no", kind: "text" }, branch_no: { col: "branch_no", kind: "int" }, currency: { col: "currency", kind: "text" } },
  ["doc_no", "description", "ref_no"]);

/* تبويب ١٨ «إحصائيات» (CU-R13/R14) */
const customerStats = readOnly("erp.customer_stats",
  `SELECT customer_code, trim_scale(round(opening_balance, 2))::text opening_balance,
          trim_scale(round(current_balance, 2))::text current_balance, trim_scale(round(sales, 2))::text sales,
          trim_scale(round(returns, 2))::text returns, trim_scale(round(net_discount, 2))::text net_discount,
          trim_scale(round(net_sales, 2))::text net_sales, trim_scale(round(receipts, 2))::text receipts,
          trim_scale(round(cheques_not_due, 2))::text cheques_not_due, trim_scale(round(settlements, 2))::text settlements,
          to_char(last_sale_date,'YYYY-MM-DD') last_sale_date, to_char(last_payment_date,'YYYY-MM-DD') last_payment_date
   FROM erp.customer_stats`,
  ["customer_code"], "customer_code",
  { customer_code: { col: "customer_code", kind: "text", key: true } },
  ["customer_code"]);

/* ═══════════ 35 · op.6.1.2.2 — بيانات الموردين · V_DETAILS [GO/06-suppliers-purchasing.md] ═══════════ */

/** مستندات أونيكس التي تحمل المورد — AP-R22: الموقوف بدل الحذف لمن له حركة (3618 باسم المستند) */
const VENDOR_DOCS: { table: string; label: string; where: string }[] = [
  { table: "IAS_PI_BILL_MST", label: "فواتير المشتريات", where: `"V_CODE" = $1` },
  { table: "IAS_PR_BILL_MST", label: "مردود المشتريات", where: `"V_CODE" = $1` },
  { table: "GR_NOTE", label: "الواردات المخزنية", where: `"V_CODE" = $1` },
  { table: "IAS_POST_DTL", label: "القيود المرحّلة", where: `"AC_CODE_DTL" = $1 AND "AC_DTL_TYP" = '4' AND "DOC_TYPE" <> '0'` },
];

async function vendorMovement(db: Db, code: string): Promise<string | null> {
  for (const d of VENDOR_DOCS) {
    if (!(await extractHas(db, d.table))) {
      if (await loadedOnce(db)) return d.label;
      continue;
    }
    if ((await count(db, `SELECT count(*) c FROM extract."${d.table}" WHERE ${d.where}`, [code])) > 0) return d.label;
  }
  if ((await count(db, `SELECT count(*) c FROM erp.gl_entry_line WHERE analytic_type = 'vendor' AND CAST(analytic_id AS text) = $1`, [code])) > 0) {
    return "القيود المرحّلة";
  }
  if (await inOpening(db, "4", code)) return "الأرصدة الافتتاحية";
  /* روابط حيّة في startyx: أصناف المورد (op.5.1.2.10 تبويب الموردين) · عميل مرتبط به (op.7.1.2.8 #13) */
  if ((await count(db, `SELECT count(*) c FROM erp.item_vendor WHERE vendor_code = $1`, [code])) > 0) return "الأصناف";
  if ((await count(db, `SELECT count(*) c FROM erp.customer WHERE linked_vendor = $1`, [code])) > 0) return "العملاء";
  return null;
}

async function vendorCycle(db: Db, code: string, parent: string): Promise<boolean> {
  const seen = new Set<string>();
  let cur = parent;
  while (cur) {
    if (cur === code || seen.has(cur)) return true;
    seen.add(cur);
    const r = await db.query(`SELECT parent_code FROM erp.vendor WHERE code = $1`, [cur]);
    cur = s(r.rows[0]?.parent_code);
  }
  return false;
}

async function requireVendor(db: Db, code: string): Promise<void> {
  if (!(await exists(db, `SELECT count(*) c FROM erp.vendor WHERE code = $1`, code))) throw onyxError(5093);
}

const VENDOR_FIELDS: Record<string, FieldDef> = fieldsOf(VENDOR_COLS);
VENDOR_FIELDS.code = { col: "code", kind: "text", required: true, key: true };
VENDOR_FIELDS.name_ar = { col: "name_ar", kind: "text", required: true };
/* AP-R15 — المجموعة إلزامية، والحساب منها */
VENDOR_FIELDS.group_no = { col: "group_no", kind: "int", required: true };
VENDOR_FIELDS.account_code = { col: "account_code", kind: "text", required: true, inheritedWhen: "group_no" };

const vendor: EntityDef = {
  table: "erp.vendor",
  screen: "op.6.1.2.2",
  listSql: `SELECT ${selectOf(VENDOR_COLS, "v")},
                   (v.portal_secret_hash IS NOT NULL) has_portal_secret,
                   (SELECT g.name_ar FROM erp.supplier_group g WHERE g.no = v.group_no) group_name,
                   (SELECT a.name_ar FROM erp.account a WHERE a.code = v.account_code) account_name,
                   (SELECT p.name_ar FROM erp.vendor p WHERE p.code = v.parent_code) parent_name,
                   (SELECT k.name_ar FROM erp.branch k WHERE k.no = v.branch_no) branch_name,
                   (SELECT r.name_ar FROM erp.salesman r WHERE r.code = v.purchaser_code) purchaser_name,
                   (SELECT count(*) FROM erp.item_vendor iv WHERE iv.vendor_code = v.code) item_count,
                   ${AUDIT_SQL}
            FROM erp.vendor v`,
  searchCols: ["code", "name_ar", "name_en", "mobile", "vat_no"],
  orderBy: "lpad(code, 15, '0')",
  listLimit: 5000,
  fields: VENDOR_FIELDS,
  async nextKey(db, hint) {
    /* AP-R13/R16 — VENDOR_SERIAL = 2 «حسب المجموعة» · VENDOR_LENGTH = 9 */
    return nextInGroup(db, "erp.vendor", s(hint.group),
      n(await onyxParam(db, "IAS_PARA_AP", "VENDOR_LENGTH")) ?? 9, s(await onyxParam(db, "IAS_PARA_AP", "VENDOR_SERIAL")) === "1");
  },
  async validate(db, mode, v, before) {
    const code = s(v.code);
    /* AP-R16 — VENDOR_D_TYPE = 1 «رقمي» */
    if (!/^[0-9]{1,15}$/.test(code)) throw onyxError(4724);
    /* AP-R15 — المجموعة موجودة؛ AP_AC_LINK_TYPE = 2 ⇒ الحساب حساب المجموعة دائماً */
    const grp = (await db.query(`SELECT no, account_code FROM erp.supplier_group WHERE no = $1`, [n(v.group_no) ?? -1])).rows[0];
    if (!grp) throw onyxError(5093);
    if ((await onyxParam(db, "IAS_PARA_AP", "AP_AC_LINK_TYPE")) === "2" || !s(v.account_code)) v.account_code = s(grp.account_code);
    const acc = await requirePostingAccount(db, s(v.account_code));
    /* حساب المورد تحليليه «مورد» (4) — نفس فحص AP-R11 على حساب المجموعة */
    if (s(acc.analytic_type) !== "4") throw onyxError(5114);
    const parent = s(v.parent_code);
    if (parent) {
      if (!(await exists(db, `SELECT count(*) c FROM erp.vendor WHERE code = $1`, parent))) throw onyxError(5093);
      if (await vendorCycle(db, code, parent)) throw onyxError(5093);
    }
    const pman = s(v.purchaser_code);
    if (pman && !(await exists(db, `SELECT count(*) c FROM erp.salesman WHERE code = $1`, pman))) throw onyxError(5003);
    for (const [k, sql] of [
      ["branch_no", `SELECT count(*) c FROM erp.branch WHERE no = CAST($1 AS integer)`],
      ["cost_center", `SELECT count(*) c FROM erp.cost_center WHERE code = $1`],
    ] as const) {
      const val = s(v[k]);
      if (val && !(await exists(db, sql, val))) throw onyxError(5093);
    }
    /* AP-R18 — رقم المركز يتبع رمزه (CC_NO ⇐ CC_CODE) */
    const cc = s(v.cost_center);
    if (cc) {
      const r = await db.query(`SELECT no FROM erp.cost_center WHERE code = $1`, [cc]);
      v.cost_center_no = r.rows[0]?.no ?? null;
    } else v.cost_center_no = null;
    for (const [k, table, col] of [
      ["vendor_class", "VENDOR_CLASS", "V_CLASS"], ["country_no", "CNTRY", "CNTRY_NO"], ["province_no", "IAS_PROVINCES", "PROV_NO"],
      ["city_no", "CITIES", "CITY_NO"], ["region_no", "REGIONS", "R_CODE"], ["tax_calc_method", "GNR_TAX_TYP_CLC_MST", "CLC_TYP_NO"],
    ] as const) {
      const val = s(v[k]);
      if (val && !(await inOnyxList(db, table, col, val))) throw onyxError(5093);
    }
    inList(v, "price_vat_type", [1, 2]);        /* CLC_VAT_PRICE_TYP */
    inList(v, "vat_base", [1, 2, 3, 4]);         /* CALC_VAT_AMT_TYPE */
    const cd = n(v.credit_days);
    if (cd != null && cd < 0) throw onyxError(7438);
    /* القائمة السوداء: رفعها يمسح السبب */
    if (!b(v.blacklisted)) v.blacklist_reason = null;
    if (mode === "add") v.seq_no = await nextSeq(db, "erp.vendor");
    else if (before) v.seq_no = before.seq_no;
  },
  async warnings(db, saved) {
    /* AP-R21 — الرقم الضريبي: 15 خانة تبدأ وتنتهي بـ3؛ المخالف والمكرر تنبيه لا منع */
    const out: string[] = [];
    const vat = s(saved.vat_no);
    if (vat && !/^3[0-9]{13}3$/.test(vat)) out.push(`الرقم الضريبي ${vat} ليس بصيغة الهيئة (15 رقماً يبدأ وينتهي بـ3)`);
    if (vat) {
      const r = await db.query(`SELECT code FROM erp.vendor WHERE vat_no = $1 AND code <> $2 ORDER BY code LIMIT 3`, [vat, s(saved.code)]);
      if (r.rows.length) out.push(`الرقم الضريبي ${vat} مسجّل أيضاً للمورد ${r.rows.map((x) => s(x.code)).join(" · ")}`);
    }
    return out;
  },
  async guardDelete(db, before) {
    const code = s(before.code);
    if ((await count(db, `SELECT count(*) c FROM erp.vendor WHERE parent_code = $1`, [code])) > 0) throw onyxError(4050);
    const doc = await vendorMovement(db, code);
    if (doc) throw onyxError(3618, doc);
  },
  async cascade(db, before) {
    const code = s(before.code);
    for (const t of ["erp.vendor_bank", "erp.vendor_account", "erp.vendor_user"]) {
      await db.query(`DELETE FROM ${t} WHERE vendor_code = $1`, [code]);
    }
  },
};

/* حسابات المورد البنكية · IAS_VENDOR_BANK */
const VBANK_FIELDS: Record<string, FieldDef> = {
  line_no: { col: "line_no", kind: "int", key: true },
  ...fieldsOf(VENDOR_BANK_COLS),
};
VBANK_FIELDS.vendor_code = { col: "vendor_code", kind: "text", required: true };
const vendorBank: EntityDef = {
  table: "erp.vendor_bank",
  screen: "op.6.1.2.2",
  listSql: `SELECT x.line_no, ${selectOf(VENDOR_BANK_COLS, "x")}, ${AUDIT_SQL} FROM erp.vendor_bank x`,
  searchCols: ["vendor_code", "iban", "bank_name"],
  orderBy: "vendor_code, line_no",
  fields: VBANK_FIELDS,
  async nextKey(db) {
    const r = await db.query(`SELECT COALESCE(max(line_no), 0) + 1 m FROM erp.vendor_bank`);
    return String(r.rows[0]?.m ?? 1);
  },
  async validate(db, _mode, v) {
    await requireVendor(db, s(v.vendor_code));
    const cur = s(v.currency);
    if (cur && !(await exists(db, `SELECT count(*) c FROM erp.currency WHERE code = $1`, cur))) throw onyxError(5093);
    for (const [k, table, col] of [["country_no", "CNTRY", "CNTRY_NO"], ["city_no", "CITIES", "CITY_NO"]] as const) {
      const val = s(v[k]);
      if (val && !(await inOnyxList(db, table, col, val))) throw onyxError(5093);
    }
    const bank = s(v.bank_no);
    if (bank && !(await exists(db, `SELECT count(*) c FROM erp.bank WHERE no = CAST($1 AS integer)`, bank))) throw onyxError(5093);
  },
  async warnings(_db, saved) {
    /* آيبان السعودية: SA + 22 رقماً [ويب: SAMA] — تنبيه لا منع */
    const iban = s(saved.iban).replace(/\s+/g, "");
    return iban && !/^SA[0-9]{22}$/.test(iban) ? [`الآيبان ${iban} ليس بصيغة SA + 22 رقماً`] : [];
  },
  async guardDelete() {},
};

/* الحسابات الإضافية للمورد · IAS_VNDR_ACCNT (فارغ في أونيكس — AP_AC_LINK_TYPE = 2) */
const VACCNT_FIELDS = fieldsOf(VENDOR_ACCNT_COLS);
VACCNT_FIELDS.rcrd_no = { col: "rcrd_no", kind: "int", required: true, key: true };
VACCNT_FIELDS.vendor_code = { col: "vendor_code", kind: "text", required: true };
VACCNT_FIELDS.account_code = { col: "account_code", kind: "text", required: true };
const vendorAccount: EntityDef = {
  table: "erp.vendor_account",
  screen: "op.6.1.2.2",
  listSql: `SELECT ${selectOf(VENDOR_ACCNT_COLS, "x")},
                   (SELECT a.name_ar FROM erp.account a WHERE a.code = x.account_code) account_name, ${AUDIT_SQL}
            FROM erp.vendor_account x`,
  searchCols: ["vendor_code", "account_code"],
  orderBy: "vendor_code, rcrd_no",
  fields: VACCNT_FIELDS,
  async nextKey(db) {
    const r = await db.query(`SELECT COALESCE(max(rcrd_no), 0) + 1 m FROM erp.vendor_account`);
    return String(r.rows[0]?.m ?? 1);
  },
  async validate(db, _mode, v, before, user) {
    await requireVendor(db, s(v.vendor_code));
    await requirePostingAccount(db, s(v.account_code));
    stampInactive(v, before, user);
  },
  async guardDelete() {},
};

/* الصلاحيات · IAS_PRIV_VENDOR (GRNT_AUTO_PRIV_VND_AC = 0 ⇒ لا منح آلي من المجموعة) */
const vendorUser: EntityDef = {
  table: "erp.vendor_user",
  screen: "op.6.1.2.2",
  listSql: `SELECT vendor_code, user_id, currency, can_add, can_view, ${AUDIT_SQL} FROM erp.vendor_user`,
  searchCols: ["vendor_code", "CAST(user_id AS text)"],
  keyCols: ["vendor_code", "user_id", "currency"],
  orderBy: "vendor_code, user_id, currency",
  listLimit: 5000,
  fields: {
    vendor_code: { col: "vendor_code", kind: "text", required: true, key: true },
    user_id: { col: "user_id", kind: "int", required: true },
    currency: { col: "currency", kind: "text", required: true },
    can_add: { col: "can_add", kind: "bool" },
    can_view: { col: "can_view", kind: "bool" },
  },
  async validate(db, _mode, v) {
    await requireVendor(db, s(v.vendor_code));
    if (!(await inOnyxList(db, "USER_R", "U_ID", s(v.user_id)))) throw onyxError(4145);
    if (!(await exists(db, `SELECT count(*) c FROM erp.currency WHERE code = $1`, s(v.currency)))) throw onyxError(5093);
  },
  async guardDelete() {},
};

/* «الرصيد والحركات» (GO §٦) — قراءة */
const vendorLedger: EntityDef = {
  ...readOnly("erp.vendor_ledger",
    `SELECT vendor_code, source, doc_type, doc_no, to_char(doc_date,'YYYY-MM-DD') doc_date, description,
            trim_scale(round(debit, 2))::text debit, trim_scale(round(credit, 2))::text credit, currency, branch_no,
            (SELECT flg."FLG_DESC" FROM extract."S_FLAGS" flg WHERE flg."LANG_NO" = '1' AND flg."FLG_CODE" = 'POST_DOC_TYPE'
               AND flg."FLG_VALUE" = CAST(erp.vendor_ledger.doc_type AS text) LIMIT 1) doc_type_name,
            trim_scale(round(sum(credit - debit) OVER (PARTITION BY vendor_code ORDER BY doc_date, doc_type, doc_no
                       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2))::text balance
     FROM erp.vendor_ledger`,
    ["vendor_code", "doc_type", "doc_no"], "doc_date, doc_type, doc_no",
    { vendor_code: { col: "vendor_code", kind: "text", key: true }, doc_type: { col: "doc_type", kind: "int" },
      doc_no: { col: "doc_no", kind: "text" }, branch_no: { col: "branch_no", kind: "int" } },
    ["doc_no", "description"]),
  screen: "op.6.1.2.2",
};
const vendorStats: EntityDef = {
  ...readOnly("erp.vendor_stats",
    `SELECT vendor_code, trim_scale(round(opening_balance, 2))::text opening_balance,
            trim_scale(round(current_balance, 2))::text current_balance, trim_scale(round(purchases, 2))::text purchases,
            trim_scale(round(purchase_returns, 2))::text purchase_returns, trim_scale(round(payments, 2))::text payments,
            to_char(last_purchase_date,'YYYY-MM-DD') last_purchase_date, to_char(last_payment_date,'YYYY-MM-DD') last_payment_date
     FROM erp.vendor_stats`,
    ["vendor_code"], "vendor_code", { vendor_code: { col: "vendor_code", kind: "text", key: true } }, ["vendor_code"]),
  screen: "op.6.1.2.2",
};

/* ═══════════ 36 · op.1.2.8 — بيانات الموظفين · S_EMP [GO/01-system-setup.md §op.1.2.8] ═══════════ */

/** ربط العمود بنوع الترميز العام (S_EMP_CODE_MST · GENS017) — من اسم النوع [مستنتج، GO §١] */
const EMP_CODE_TYPE: Record<string, number> = {
  job_title_no: 1, major_no: 2, grade_no: 3, qualification_no: 4, employment_type: 6, job_status: 7, class_no: 9,
  current_status: 10, nationality_no: 11, gender: 12, marital_status: 13, religion_no: 14, blood_type: 15, id_type: 16,
  language_no: 17, group_no: 23, admin_title_no: 31, category_no: 33, level_no: 34, citizenship: 35, salary_pay_way: 36,
  pay_method: 37, salary_status: 43, work_location_no: 56,
};

async function inEmpCode(db: Db, type: number, value: string): Promise<boolean> {
  if (!(await extractHas(db, "S_EMP_CODE_DTL"))) return true;
  return (await count(db, `SELECT count(*) c FROM extract."S_EMP_CODE_DTL" WHERE "CODE_TYP" = $1 AND "CODE_NO" = $2`,
    [String(type), value])) > 0;
}

/** ما يربط الموظف — لا حذف معه (SY-R52 · 3618 باسم المرتبط) */
const EMPLOYEE_LINKS: { table: string; label: string; where: string }[] = [
  { table: "IAS_POST_DTL", label: "القيود المرحّلة", where: `"AC_CODE_DTL" = $1 AND "AC_DTL_TYP" = '7' AND "DOC_TYPE" <> '0'` },
  { table: "USER_R", label: "المستخدمين", where: `"EMP_NO" = $1` },
];

async function employeeLinked(db: Db, code: string): Promise<string | null> {
  for (const d of EMPLOYEE_LINKS) {
    if (!(await extractHas(db, d.table))) {
      if (await loadedOnce(db)) return d.label;
      continue;
    }
    if ((await count(db, `SELECT count(*) c FROM extract."${d.table}" WHERE ${d.where}`, [code])) > 0) return d.label;
  }
  if ((await count(db, `SELECT count(*) c FROM erp.gl_entry_line WHERE analytic_type = 'employee' AND CAST(analytic_id AS text) = $1`, [code])) > 0) {
    return "القيود المرحّلة";
  }
  if (await inOpening(db, "7", code)) return "الأرصدة الافتتاحية";
  if ((await count(db, `SELECT count(*) c FROM erp.salesman WHERE employee_no = $1`, [code])) > 0) return "مندوبي المبيعات";
  if ((await count(db, `SELECT count(*) c FROM erp.customer WHERE employee_no = $1`, [code])) > 0) return "العملاء";
  return null;
}

const NAME_PARTS = ["first", "second", "third", "last"] as const;

const EMPLOYEE_FIELDS: Record<string, FieldDef> = fieldsOf(EMPLOYEE_COLS);
EMPLOYEE_FIELDS.code = { col: "code", kind: "text", required: true, key: true };
/* SY-R48 — الاسم الكامل آلي ⇒ لا يُطلب؛ الأول والأخير إلزاميان */
EMPLOYEE_FIELDS.name_ar = { col: "name_ar", kind: "text", required: true, inheritedWhen: "first_ar" };
EMPLOYEE_FIELDS.first_ar = { col: "first_ar", kind: "text", required: true };
EMPLOYEE_FIELDS.last_ar = { col: "last_ar", kind: "text", required: true };
/* SY-R49 — الشركة تتبع الفرع ⇒ لا تُطلب ما دام الفرع محدّداً */
for (const k of ["currency", "branch_no", "hierarchy_no", "hired_on"]) EMPLOYEE_FIELDS[k] = { ...EMPLOYEE_FIELDS[k]!, required: true };
EMPLOYEE_FIELDS.company_no = { col: "company_no", kind: "int", required: true, inheritedWhen: "branch_no" };

const employee: EntityDef = {
  table: "erp.employee",
  screen: "op.1.2.8",
  listSql: `SELECT ${selectOf(EMPLOYEE_COLS, "e")},
                   (e.self_service_secret_hash IS NOT NULL) has_self_service_secret,
                   (SELECT h."HRCHY_L_NM" FROM extract."S_HRCHY" h WHERE h."HRCHY_NO" = CAST(e.hierarchy_no AS text) LIMIT 1) hierarchy_name,
                   (SELECT m.name_ar FROM erp.employee m WHERE m.code = e.manager_no) manager_name,
                   (SELECT m.name_ar FROM erp.employee m WHERE m.code = e.manager2_no) manager2_name,
                   (SELECT k.name_ar FROM erp.branch k WHERE k.no = e.branch_no) branch_name,
                   (SELECT a.name_ar FROM erp.account a WHERE a.code = e.account_code) account_name,
                   (SELECT r.code FROM erp.salesman r WHERE r.employee_no = e.code LIMIT 1) rep_code,
                   ${AUDIT_SQL}
            FROM erp.employee e`,
  searchCols: ["code", "name_ar", "name_en", "mobile", "national_no", "id_no"],
  orderBy: "lpad(code, 15, '0')",
  listLimit: 5000,
  fields: EMPLOYEE_FIELDS,
  async nextKey(db) {
    /* SY-R47 — `SELECT NVL(MAX(EMP_NO),0) + 1 FROM S_EMP` [نموذج: GENS012] */
    const r = await db.query(`SELECT COALESCE(max(CAST(code AS numeric)), 0) + 1 m FROM erp.employee WHERE code ~ '^[0-9]+$'`);
    return String(r.rows[0]?.m ?? 1);
  },
  async validate(db, mode, v, before, user) {
    const code = s(v.code);
    /* SY-R47 — EMP_NO NUMBER(10) */
    if (!/^[0-9]{1,10}$/.test(code)) throw onyxError(4724);
    /* SY-R48 — الاسم الكامل من الأجزاء الأربعة بمسافة واحدة، يُعاد توليده فقط عند تغيّر جزء (لا يُداس الاسم المحفوظ) */
    for (const lang of ["ar", "en"] as const) {
      const parts = NAME_PARTS.map((p) => s(v[p + "_" + lang]));
      const changed = mode === "add" || !before || NAME_PARTS.some((p) => s(before[p + "_" + lang]) !== s(v[p + "_" + lang]));
      if (changed) v["name_" + lang] = parts.some(Boolean) ? parts.join(" ") : lang === "ar" ? "" : null;
    }
    if (!s(v.first_ar) || !s(v.last_ar)) throw onyxError(4048);
    /* SY-R49 — العملة · الفرع (والشركة منه) · الهيكل الإداري */
    if (!(await exists(db, `SELECT count(*) c FROM erp.currency WHERE code = $1`, s(v.currency)))) throw onyxError(5093);
    const brn = (await db.query(`SELECT no, company_id FROM erp.branch WHERE no = $1`, [n(v.branch_no) ?? -1])).rows[0];
    if (!brn) throw onyxError(5093);
    if (brn.company_id != null) v.company_no = Number(brn.company_id);
    if (n(v.company_no) == null) throw onyxError(4048);
    if (!(await inOnyxList(db, "S_HRCHY", "HRCHY_NO", s(v.hierarchy_no)))) throw onyxError(5093);
    /* SY-R50 — المدير موظف موجود، ليس الموظف نفسه (4854)، والمديران مختلفان (4498) */
    for (const k of ["manager_no", "manager2_no"]) {
      const m = s(v[k]);
      if (!m) continue;
      if (m === code) throw onyxError(4854);
      if (!(await exists(db, `SELECT count(*) c FROM erp.employee WHERE code = $1`, m))) throw onyxError(5093);
    }
    if (s(v.manager_no) && s(v.manager_no) === s(v.manager2_no)) throw onyxError(4498);
    /* الترميزات العامة (GENS017) · الموقع · الأبعاد */
    for (const [k, type] of Object.entries(EMP_CODE_TYPE)) {
      const val = s(v[k]);
      if (val && !(await inEmpCode(db, type, val))) throw onyxError(5093);
    }
    for (const [k, table, col] of [["country_no", "CNTRY", "CNTRY_NO"], ["province_no", "IAS_PROVINCES", "PROV_NO"],
      ["city_no", "CITIES", "CITY_NO"], ["region_no", "REGIONS", "R_CODE"]] as const) {
      const val = s(v[k]);
      if (val && !(await inOnyxList(db, table, col, val))) throw onyxError(5093);
    }
    for (const [k, sql] of [
      ["cost_center", `SELECT count(*) c FROM erp.cost_center WHERE code = $1`],
      ["project_no", `SELECT count(*) c FROM erp.project WHERE CAST(no AS text) = $1`],
      ["activity_no", `SELECT count(*) c FROM erp.activity WHERE CAST(no AS text) = $1`],
    ] as const) {
      const val = s(v[k]);
      if (val && !(await exists(db, sql, val))) throw onyxError(5093);
    }
    /* SY-R51 — الحساب (اختياري) فرعي ومن نوع «ذمم موظفين» (تحليلي 7) */
    if (s(v.account_code)) {
      const acc = await requirePostingAccount(db, s(v.account_code));
      if (s(acc.analytic_type) !== "7") throw onyxError(4402);
    }
    for (const k of ["work_days_month", "work_hours_day", "work_hours_month", "work_hours_year", "work_days_year"]) {
      const x = n(v[k]);
      if (x != null && x < 0) throw onyxError(7438);
    }
    /* SY-R53 — الهوية (4928) · العودة للخدمة بعد التعيين (5106) */
    if (s(v.id_issue_date) && s(v.id_expiry_date) && s(v.id_expiry_date) <= s(v.id_issue_date)) throw onyxError(4928);
    if (s(v.reinstated_on) && s(v.hired_on) && s(v.hired_on) >= s(v.reinstated_on)) throw onyxError(5106);
    /* SY-R52 — التوقيف يسجّل الموقِف وتاريخه */
    stampInactive(v, before, user);
    delete v.self_service_secret_hash;
  },
  async guardDelete(db, before) {
    const code = s(before.code);
    if ((await count(db, `SELECT count(*) c FROM erp.employee WHERE manager_no = $1 OR manager2_no = $1`, [code])) > 0) {
      throw onyxError(4050);
    }
    const link = await employeeLinked(db, code);
    if (link) throw onyxError(3618, link);
  },
};

function empReadOnly(table: string, listSql: string, keyCols: string[], orderBy: string, fields: Record<string, FieldDef>, search: string[]): EntityDef {
  return { ...readOnly(table, listSql, keyCols, orderBy, fields, search), screen: "op.1.2.8" };
}

/* «حركة الموظف» — سطور التحليلي 7 (سلف · عهد · رواتب مستحقة · عمولات) والرصيد تراكمي بالتاريخ */
const employeeLedger = empReadOnly("erp.employee_ledger",
  `SELECT employee_code, source, account_code, doc_type, doc_no, to_char(doc_date,'YYYY-MM-DD') doc_date, description,
          trim_scale(round(debit, 2))::text debit, trim_scale(round(credit, 2))::text credit, currency, branch_no,
          (SELECT a.name_ar FROM erp.account a WHERE a.code = erp.employee_ledger.account_code) account_name,
          (SELECT flg."FLG_DESC" FROM extract."S_FLAGS" flg WHERE flg."LANG_NO" = '1' AND flg."FLG_CODE" = 'POST_DOC_TYPE'
             AND flg."FLG_VALUE" = CAST(erp.employee_ledger.doc_type AS text) LIMIT 1) doc_type_name,
          trim_scale(round(sum(debit - credit) OVER (PARTITION BY employee_code ORDER BY doc_date, doc_type, doc_no
                     ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2))::text balance
   FROM erp.employee_ledger`,
  ["employee_code", "doc_type", "doc_no"], "doc_date, doc_type, doc_no",
  { employee_code: { col: "employee_code", kind: "text", key: true }, doc_type: { col: "doc_type", kind: "int" },
    doc_no: { col: "doc_no", kind: "text" }, account_code: { col: "account_code", kind: "text" },
    branch_no: { col: "branch_no", kind: "int" } },
  ["doc_no", "description"]);

const employeeStats = empReadOnly("erp.employee_stats",
  `SELECT employee_code, trim_scale(round(opening_balance, 2))::text opening_balance, trim_scale(round(total_debit, 2))::text total_debit,
          trim_scale(round(total_credit, 2))::text total_credit, trim_scale(round(current_balance, 2))::text current_balance,
          line_count, to_char(last_move_date,'YYYY-MM-DD') last_move_date
   FROM erp.employee_stats`,
  ["employee_code"], "employee_code", { employee_code: { col: "employee_code", kind: "text", key: true } }, ["employee_code"]);

export const LAYER2B: Record<string, EntityDef> = {
  employee,
  employee_ledger: employeeLedger,
  employee_stats: employeeStats,
  vendor,
  vendor_bank: vendorBank,
  vendor_account: vendorAccount,
  vendor_user: vendorUser,
  vendor_ledger: vendorLedger,
  vendor_stats: vendorStats,
  customer,
  customer_currency: customerCurrency,
  customer_limit: customerLimit,
  customer_account: customerAccount,
  customer_user: customerUser,
  customer_sales_cap: customerSalesCap,
  customer_driver: customerDriver,
  customer_ledger: customerLedger,
  customer_sales_doc: customerSalesDoc,
  customer_stats: customerStats,
};

export type { Row, Values };
