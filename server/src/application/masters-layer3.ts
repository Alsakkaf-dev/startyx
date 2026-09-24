import type { Db } from "../infrastructure/db.ts";
import { DomainError } from "../shared-kernel/errors.ts";
import { ACTIVE_SCOPE, AUDIT_SQL, count, n, onyxError, s, type EntityDef, type FieldDef, type Row, type Values } from "./master-kit.ts";
import { extractHas, inOnyxList, onyxParam } from "./masters-layer2.ts";

/**
 * الطبقة ٣ — BUILD-ORDER 37: الأرصدة الافتتاحية op.4.1.2.10 · OPEN_BAL [GO/04-general-ledger.md §op.4.1.2.10]
 * + نسختاها بنوع رصيد ثابت: العملاء op.7.1.2.10 (OB-R1…R9) · الموردون op.6.1.2.4 (AP-R23…R26) — نفس الجدول ونفس القواعد.
 * السطر = حساب + تحليلي + عملة + مركز + مدين/دائن محلي وأجنبي؛ أونيكس يخزّن J_AMT بإشارة (المشغّل في 009 يبقيهما متسقين).
 * الحفظ غير المتوازن مسموح (GL-R30) — الفرق يُعرض تنبيهاً ولا يمنع؛ إقفال الفترة الأولى هو الذي يُمنع.
 */

/** AC_DTL_TYP ⇒ جدول بطاقة التحليلي وعمود حسابها (AP-R24 · OB-R1: حساب السطر = حساب البطاقة) */
const ANALYTIC_CARD: Record<string, { table: string; key: string; account: string | null; label: string }> = {
  "1": { table: "erp.cashbox", key: "CAST(no AS text)", account: "account_code", label: "الصندوق" },
  "2": { table: "erp.bank", key: "CAST(no AS text)", account: "account_code", label: "البنك" },
  "3": { table: "erp.customer", key: "code", account: "account_code", label: "العميل" },
  "4": { table: "erp.vendor", key: "code", account: "account_code", label: "المورد" },
  "7": { table: "erp.employee", key: "code", account: null, label: "الموظف" },
};

/** الفترة الأولى من السنة لشركة الفرع — مغلقة ⇒ لا إضافة ولا تعديل ولا حذف (OB-R5 · ملزمة 2018 ص9).
    للمخزون الافتتاحي يكفي إقفال المخزون للفرع (SY-R9: إقفال المخزون يمنع وثائق المخزون وحدها). */
async function firstPeriodClosed(db: Db, branch: number | null, inventory = false): Promise<boolean> {
  if (branch == null) return false;
  const r = await db.query(
    `SELECT p.status, COALESCE(c.gl_closed, false) gl_closed, COALESCE(c.inventory_closed, false) inv_closed
       FROM erp.branch b
       JOIN erp.fiscal_period p ON p.company_id = b.company_id AND p.fiscal_year_id = $2
  LEFT JOIN erp.period_branch_close c ON c.company_id = p.company_id AND c.branch_id = b.no AND c.period_id = p.id
      WHERE b.no = $1 ORDER BY p.from_date LIMIT 1`,
    [branch, ACTIVE_SCOPE.fiscal_year_id],
  );
  const p = r.rows[0];
  return !!p && (s(p.status) === "closed" || p.gl_closed === true || (inventory && p.inv_closed === true));
}

function fieldsOf(names: [string, FieldDef["kind"]][]): Record<string, FieldDef> {
  return Object.fromEntries(names.map(([c, k]) => [c, { col: c, kind: k }]));
}

const OPENING_FIELDS: Record<string, FieldDef> = {
  ...fieldsOf([
    ["analytic_code", "text"], ["analytic_type", "text"], ["analytic_sub", "text"], ["fx_rate", "num"],
    ["debit", "num"], ["credit", "num"], ["debit_fc", "num"], ["credit_fc", "num"], ["cost_center", "text"],
    ["project_no", "text"], ["activity_no", "text"], ["rep_code", "text"], ["collector_no", "text"], ["ref_no", "text"],
    ["description", "text"], ["value_date", "date"], ["lc_no", "text"],
  ]),
  doc_sequence: { col: "doc_sequence", kind: "text", required: true, key: true },
  branch_id: { col: "branch_id", kind: "int", required: true },
  /* الشركة تتبع الفرع */
  company_id: { col: "company_id", kind: "int", required: true, inheritedWhen: "branch_id" },
  account_code: { col: "account_code", kind: "text", required: true },
  currency: { col: "currency", kind: "text", required: true },
};

const OPENING_LIST = `
  SELECT o.doc_sequence, o.company_id, o.branch_id, o.fiscal_year, o.account_code, o.analytic_type, o.analytic_code, o.analytic_sub,
         o.currency, trim_scale(o.fx_rate)::text fx_rate, trim_scale(o.debit)::text debit, trim_scale(o.credit)::text credit,
         trim_scale(o.debit_fc)::text debit_fc, trim_scale(o.credit_fc)::text credit_fc, trim_scale(o.amount)::text amount,
         o.cost_center, o.project_no, o.activity_no, o.rep_code, o.collector_no, o.ref_no, o.description, o.lc_no,
         to_char(o.value_date,'YYYY-MM-DD') value_date,
         (SELECT a.name_ar FROM erp.account a WHERE a.code = o.account_code) account_name,
         CASE o.analytic_type
           WHEN '1' THEN (SELECT x.name_ar FROM erp.cashbox x WHERE CAST(x.no AS text) = o.analytic_code)
           WHEN '2' THEN (SELECT x.name_ar FROM erp.bank x WHERE CAST(x.no AS text) = o.analytic_code)
           WHEN '3' THEN (SELECT x.name_ar FROM erp.customer x WHERE x.code = o.analytic_code)
           WHEN '4' THEN (SELECT x.name_ar FROM erp.vendor x WHERE x.code = o.analytic_code)
           WHEN '7' THEN (SELECT x.name_ar FROM erp.employee x WHERE x.code = o.analytic_code)
         END analytic_name,
         (SELECT c.name_ar FROM erp.cost_center c WHERE c.code = o.cost_center) cost_center_name,
         (SELECT k.name_ar FROM erp.branch k WHERE k.no = o.branch_id) branch_name,
         ${AUDIT_SQL}
    FROM erp.opening_balance_line o`;

/** نسخة الشاشة: الكاملة (كل الأنواع) أو بنوع رصيد ثابت (عميل 3 · مورد 4) */
function openingEntity(screen: string, fixedType: string | null): EntityDef {
  return {
    table: "erp.opening_balance_line",
    screen,
    listSql: OPENING_LIST,
    searchCols: ["account_code", "analytic_code", "cost_center", "description", "doc_sequence"],
    scope: { fiscal_year: ACTIVE_SCOPE.fiscal_year_id, ...(fixedType ? { analytic_type: fixedType } : {}) },
    orderBy: "o.branch_id, o.account_code, lpad(COALESCE(o.analytic_code,''), 15, '0'), o.cost_center, o.doc_sequence",
    listLimit: 5000,
    fields: OPENING_FIELDS,
    async nextKey(db) {
      const r = await db.query(`SELECT COALESCE(max(CAST(doc_sequence AS numeric)), 0) + 1 m FROM erp.opening_balance_line WHERE doc_sequence ~ '^[0-9]+$'`);
      return String(r.rows[0]?.m ?? 1);
    },
    async validate(db, mode, v, before) {
      /* OB-R5 — لا إضافة ولا تعديل بعد إقفال أول فترة (الفرع القديم والجديد) */
      if (await firstPeriodClosed(db, n(v.branch_id))) throw onyxError(3478);
      if (before && (await firstPeriodClosed(db, n(before.branch_id)))) throw onyxError(3478);
      /* الفرع موجود والشركة منه */
      const brn = (await db.query(`SELECT no, company_id FROM erp.branch WHERE no = $1`, [n(v.branch_id) ?? -1])).rows[0];
      if (!brn) throw onyxError(5093);
      if (brn.company_id != null) v.company_id = Number(brn.company_id);
      if (n(v.company_id) == null) throw onyxError(4048);
      /* الحساب فرعي؛ الموقوف يُمنع عند الإضافة أو تغيير الحساب فقط (أونيكس فيه 3 سطور على 1205010004 أُوقف بعدها) */
      const code = s(v.account_code);
      const acc = (await db.query(`SELECT code, kind, inactive, analytic_type, use_cc FROM erp.account WHERE code = $1`, [code])).rows[0];
      if (!acc || s(acc.kind) !== "posting") throw onyxError(497);
      const accountChanged = mode === "add" || !before || s(before.account_code) !== code;
      if (acc.inactive === true && accountChanged) throw onyxError(497);
      /* OB-R1 — نوع التحليلي من الحساب؛ الشاشة ذات النوع الثابت لا تقبل حساباً من نوع آخر */
      const type = s(acc.analytic_type) || "0";
      if (fixedType && type !== fixedType) throw onyxError(5114);
      v.analytic_type = type;
      const party = s(v.analytic_code);
      if (type === "0") {
        if (party) throw onyxError(5114);
        v.analytic_code = null;
      } else {
        if (!party) throw onyxError(4559);
        const card = ANALYTIC_CARD[type];
        if (card) {
          const row = (await db.query(`SELECT ${card.account ?? "NULL"} account_code FROM ${card.table} WHERE ${card.key} = $1`, [party])).rows[0];
          if (!row) throw onyxError(5093);
          /* AP-R24 / OB-R1 — حساب السطر = حساب بطاقة الطرف (3,396/3,396 في أونيكس) */
          if (card.account && s(row.account_code) && s(row.account_code) !== code) throw onyxError(5114);
        }
      }
      /* GL-R33 — العملة موجودة؛ المحلية بسعر 1، والأجنبية ضمن حدودها. OB-R3: المحلي = الأجنبي × السعر */
      const cur = (await db.query(`SELECT code, is_local, rate, rate_min, rate_max FROM erp.currency WHERE code = $1`, [s(v.currency)])).rows[0];
      if (!cur) throw onyxError(3418);
      for (const k of ["debit", "credit", "debit_fc", "credit_fc"]) {
        const x = n(v[k]);
        if (x != null && x < 0) throw onyxError(7438);
        v[k] = x ?? 0;
      }
      /* GL-R48 — السطر مدين أو دائن لا الاثنان (أونيكس يخزّن مبلغاً واحداً بإشارة) */
      if (Number(v.debit) > 0 && Number(v.credit) > 0) {
        throw new DomainError("GL-R48", "السطر مدين أو دائن — لا الاثنان معاً (أونيكس يخزّن مبلغاً واحداً بإشارة)");
      }
      if (Number(v.debit_fc) > 0 && Number(v.credit_fc) > 0) {
        throw new DomainError("GL-R48", "السطر مدين أو دائن — لا الاثنان معاً (أونيكس يخزّن مبلغاً واحداً بإشارة)");
      }
      if (cur.is_local === true) {
        v.fx_rate = 1;
        v.debit_fc = 0;
        v.credit_fc = 0;
      } else {
        const fc = Number(v.debit_fc) - Number(v.credit_fc);
        const lc = Number(v.debit) - Number(v.credit);
        let rate = n(v.fx_rate);
        /* إدخال الأجنبي والمحلي معاً يشتق السعر؛ الأجنبي وحده يحسب المحلي بالسعر */
        if (fc !== 0 && lc !== 0) rate = Math.abs(lc / fc);
        if (rate == null || rate <= 0) rate = n(cur.rate);
        if (rate == null || rate <= 0) throw onyxError(7438);
        const lo = n(cur.rate_min);
        const hi = n(cur.rate_max);
        if ((lo != null && lo > 0 && rate < lo) || (hi != null && hi > 0 && rate > hi)) {
          throw new DomainError("GL-R33", `سعر التحويل ${rate} خارج حدود العملة ${s(cur.code)} (${lo ?? "—"} … ${hi ?? "—"})`);
        }
        v.fx_rate = rate;
        if (fc !== 0 && lc === 0) {
          v.debit = fc > 0 ? Math.round(fc * rate * 100) / 100 : 0;
          v.credit = fc < 0 ? Math.round(-fc * rate * 100) / 100 : 0;
        }
      }
      /* SY-R39 — مركز التكلفة: فرعي غير موقوف؛ إجباري للحساب «مركز إجباري»، ويُمسح لـ«غير مستخدم» */
      const cc = s(v.cost_center);
      const useCc = n(acc.use_cc) ?? 1;
      if (useCc === 0) v.cost_center = null;
      else if (useCc === 2 && !cc) throw onyxError(4048);
      if (useCc !== 0 && cc) {
        const c = (await db.query(`SELECT kind, inactive FROM erp.cost_center WHERE code = $1`, [cc])).rows[0];
        if (!c || s(c.kind) !== "sub" || c.inactive === true) throw onyxError(5093);
      }
      for (const [k, sql] of [
        ["project_no", `SELECT count(*) c FROM erp.project WHERE CAST(no AS text) = $1`],
        ["activity_no", `SELECT count(*) c FROM erp.activity WHERE CAST(no AS text) = $1`],
      ] as const) {
        const val = s(v[k]);
        if (val && (await count(db, sql, [val])) === 0) throw onyxError(5093);
      }
      const rep = s(v.rep_code);
      if (rep && (await count(db, `SELECT count(*) c FROM erp.salesman WHERE code = $1`, [rep])) === 0) throw onyxError(5003);
      const col = s(v.collector_no);
      if (col && (await extractHas(db, "COLLERCTOR")) && !(await inOnyxList(db, "COLLERCTOR", "COL_NO", col))) throw onyxError(5093);
    },
    async warnings(db, saved) {
      /* GL-R30 — الحفظ غير المتوازن مسموح، والفرق يُعرض لكل شركة */
      const r = await db.query(
        `SELECT trim_scale(round(sum(amount), 2))::text d FROM erp.opening_balance_line WHERE company_id = $1 AND fiscal_year = $2`,
        [n(saved.company_id), ACTIVE_SCOPE.fiscal_year_id],
      );
      const d = s(r.rows[0]?.d);
      return d && Number(d) !== 0 ? [`القيد الافتتاحي لشركة ${s(saved.company_id)} غير متوازن: الفرق ${d} — الحفظ مسموح، وإقفال الفترة الأولى ممنوع حتى يتوازن (GL-R30)`] : [];
    },
    async guardDelete(db, before) {
      if (await firstPeriodClosed(db, n(before.branch_id))) throw onyxError(3478);
    },
  };
}

/** لوحة التوازن — قراءة: مدين/دائن/صافي لكل شركة ونوع تحليلي (GL-R34 · OB-R6) */
const openingSummary: EntityDef = {
  table: "erp.opening_balance_summary",
  screen: "op.4.1.2.10",
  listSql: `SELECT company_id, analytic_type, line_count, trim_scale(round(debit, 2))::text debit,
                   trim_scale(round(credit, 2))::text credit, trim_scale(round(net, 2))::text net,
                   CASE analytic_type WHEN 'all' THEN 'الإجمالي' WHEN '0' THEN 'عام' WHEN '1' THEN 'صندوق' WHEN '2' THEN 'بنك'
                     WHEN '3' THEN 'عميل' WHEN '4' THEN 'مورد' WHEN '5' THEN 'مدينة أخرى' WHEN '6' THEN 'دائنة أخرى'
                     WHEN '7' THEN 'موظف' END analytic_type_name
            FROM erp.opening_balance_summary`,
  searchCols: ["analytic_type"],
  keyCols: ["company_id", "analytic_type"],
  orderBy: "company_id, CASE WHEN analytic_type = 'all' THEN 'z' ELSE analytic_type END",
  noAdd: true,
  noDelete: true,
  fields: {
    company_id: { col: "company_id", kind: "int", key: true },
    analytic_type: { col: "analytic_type", kind: "text" },
  },
  async validate() { throw onyxError(4053); },
  async guardDelete() { throw onyxError(4053); },
};

/* ═══════════ 38 · op.5.1.2.15 — المخزون الافتتاحي · IAS_OPEN_STOCK [GO/05-warehouse.md §op.5.1.2.15] ═══════════ */

const STOCK_FIELDS: Record<string, FieldDef> = {
  doc_sequence: { col: "doc_sequence", kind: "text", required: true, key: true },
  item_code: { col: "item_code", kind: "text", required: true },
  unit_code: { col: "unit_code", kind: "text", required: true },
  warehouse_code: { col: "warehouse_code", kind: "text", required: true },
  qty: { col: "qty", kind: "num", required: true },
  /* مشتقة من الصنف والمخزن — لا تُطلب (IV-R121 · IV-R122) */
  pack_size: { col: "pack_size", kind: "num", required: true, inheritedWhen: "unit_code" },
  base_qty: { col: "base_qty", kind: "num" },
  unit_cost: { col: "unit_cost", kind: "num" },
  warehouse_group: { col: "warehouse_group", kind: "text" },
  company_id: { col: "company_id", kind: "int" },
  branch_id: { col: "branch_id", kind: "int" },
  line_no: { col: "line_no", kind: "int" },
};

const openingStock: EntityDef = {
  table: "erp.opening_stock",
  screen: "op.5.1.2.15",
  listSql: `SELECT o.doc_sequence, o.item_code, o.unit_code, trim_scale(o.pack_size)::text pack_size, trim_scale(o.qty)::text qty,
                   trim_scale(o.base_qty)::text base_qty, o.warehouse_code, o.warehouse_group, trim_scale(o.unit_cost)::text unit_cost,
                   trim_scale(round(o.qty * o.unit_cost, 2))::text line_value, o.company_id, o.branch_id, o.fiscal_year, o.line_no,
                   o.carried_forward, o.source, to_char(o.expire_date,'YYYY-MM-DD') expire_date, o.batch_no,
                   (SELECT i.name_ar FROM erp.item i WHERE i.code = o.item_code) item_name,
                   (SELECT w.name_ar FROM erp.warehouse w WHERE w.code = o.warehouse_code) warehouse_name,
                   ${AUDIT_SQL}
            FROM erp.opening_stock o`,
  searchCols: ["item_code", "warehouse_code", "unit_code", "doc_sequence"],
  scope: { fiscal_year: ACTIVE_SCOPE.fiscal_year_id },
  orderBy: "o.item_code, o.warehouse_code, o.doc_sequence",
  listLimit: 5000,
  fields: STOCK_FIELDS,
  async nextKey(db) {
    const r = await db.query(`SELECT COALESCE(max(CAST(doc_sequence AS numeric)), 0) + 1 m FROM erp.opening_stock WHERE doc_sequence ~ '^[0-9]+$'`);
    return String(r.rows[0]?.m ?? 1);
  },
  async validate(db, mode, v, before) {
    /* المخزن موجود — والفرع والشركة ومجموعة المخازن منه (1,218/1,218 في أونيكس) */
    const wh = (await db.query(`SELECT w.code, w.group_code, w.branch_no, b.company_id FROM erp.warehouse w
                                  LEFT JOIN erp.branch b ON b.no = w.branch_no WHERE w.code = $1`, [s(v.warehouse_code)])).rows[0];
    if (!wh) throw onyxError(5093);
    v.warehouse_group = wh.group_code ?? null;
    v.branch_id = wh.branch_no ?? null;
    v.company_id = wh.company_id ?? null;
    /* إقفال المخزون للفترة الأولى (الفرع القديم والجديد) */
    if (await firstPeriodClosed(db, n(v.branch_id), true)) throw onyxError(3478);
    if (before && (await firstPeriodClosed(db, n(before.branch_id), true))) throw onyxError(3478);
    /* الصنف موجود · الخدمي لا رصيد له (IV-R124) */
    const item = (await db.query(`SELECT code, is_service, primary_cost FROM erp.item WHERE code = $1`, [s(v.item_code)])).rows[0];
    if (!item) throw onyxError(3319);
    if (item.is_service === true) throw new DomainError("IV-R124", "الصنف الخدمي ليس له رصيد افتتاحي [مساعدة: INVI011]");
    /* IV-R122 — الوحدة من وحدات الصنف، والعبوة منها، والكمية بالأساس = الكمية × العبوة */
    const unit = (await db.query(`SELECT pack_size FROM erp.item_unit WHERE item_code = $1 AND unit_code = $2`,
      [s(v.item_code), s(v.unit_code)])).rows[0];
    if (!unit) throw onyxError(9754);
    const pack = n(unit.pack_size) ?? 1;
    const qty = n(v.qty);
    if (qty == null || qty < 0) throw onyxError(7438);
    v.pack_size = pack;
    v.base_qty = qty * pack;
    /* IV-R121 — متوسط «حسب الصنف»: التكلفة = «التكلفة الأولية» للصنف × العبوة (1,218/1,218 = PRIMARY_COST في أونيكس)
       وواحدة في كل المخازن. تعديلها من op.5.1.2.10 (IV-R99) يعيد كتابة كل سطور الصنف هنا. */
    v.unit_cost = (n(item.primary_cost) ?? 0) * pack;
    /* IV-R123 — (صنف · وحدة · مخزن · انتهاء · دفعة) مرة واحدة ما دام DUP_ITM_IN_OPEN_STOCK = 0 */
    if ((await onyxParam(db, "IAS_PARA_INV", "DUP_ITM_IN_OPEN_STOCK")) !== "1") {
      const dup = await count(db, `SELECT count(*) c FROM erp.opening_stock
                                    WHERE fiscal_year = $1 AND item_code = $2 AND unit_code = $3 AND warehouse_code = $4
                                      AND doc_sequence <> $5 AND expire_date IS NOT DISTINCT FROM $6::date
                                      AND batch_no IS NOT DISTINCT FROM $7`,
        [ACTIVE_SCOPE.fiscal_year_id, s(v.item_code), s(v.unit_code), s(v.warehouse_code), s(v.doc_sequence),
          s(before?.expire_date) || null, s(before?.batch_no) || null]);
      if (dup > 0) throw onyxError(2143);
    }
    if (mode === "add" && v.line_no == null) v.line_no = 1;
  },
  async warnings(db, saved) {
    const out: string[] = [];
    const item = (await db.query(`SELECT is_kit, primary_cost FROM erp.item WHERE code = $1`, [s(saved.item_code)])).rows[0];
    /* IV-R124 — «مركب» يُقبل بتنبيه ما دام IV-Q15 معلّقاً */
    if (item?.is_kit === true) out.push("الصنف مؤشَّر «مركب» — المساعدة تقول لا رصيد افتتاحي للمركب (IV-Q15 معلّق)");
    if (n(item?.primary_cost) == null) out.push("الصنف بلا «تكلفة أولية» — التكلفة صفر حتى تُدخل في بيانات الأصناف (IV-R121)");
    if (Number(saved.qty) === 0) out.push("سطر بكمية صفر — أونيكس يحذف الصفرية قبل الحفظ عند اختيارها");
    /* IV-R120 — فرق المطابقة مع حسابات المخزون لفرع السطر */
    const r = await db.query(`SELECT trim_scale(round(difference, 2))::text d FROM erp.opening_stock_recon WHERE branch_id = $1`, [n(saved.branch_id)]);
    const d = s(r.rows[0]?.d);
    if (d && Number(d) !== 0) out.push(`المخزون الافتتاحي للفرع ${s(saved.branch_id)} يختلف عن حسابات المخزون في الأستاذ بـ ${d} (IV-R120)`);
    return out;
  },
  async guardDelete(db, before) {
    if (await firstPeriodClosed(db, n(before.branch_id), true)) throw onyxError(3478);
  },
};

/** IV-R120 — لوحة المطابقة بالفرع (قراءة) */
const openingStockRecon: EntityDef = {
  table: "erp.opening_stock_recon",
  screen: "op.5.1.2.15",
  listSql: `SELECT branch_key, branch_id, line_count,
                   trim_scale(round(stock_value, 2))::text stock_value, trim_scale(round(gl_value, 2))::text gl_value,
                   trim_scale(round(difference, 2))::text difference,
                   (SELECT k.name_ar FROM erp.branch k WHERE k.no = erp.opening_stock_recon.branch_id) branch_name
            FROM erp.opening_stock_recon`,
  searchCols: ["branch_key"],
  orderBy: "branch_id NULLS LAST",
  noAdd: true,
  noDelete: true,
  fields: { branch_key: { col: "branch_key", kind: "text", key: true } },
  async validate() { throw onyxError(4053); },
  async guardDelete() { throw onyxError(4053); },
};

export const LAYER3: Record<string, EntityDef> = {
  opening_balance: openingEntity("op.4.1.2.10", null),
  opening_balance_customer: openingEntity("op.7.1.2.10", "3"),
  opening_balance_vendor: openingEntity("op.6.1.2.4", "4"),
  opening_balance_summary: openingSummary,
  opening_stock: openingStock,
  opening_stock_recon: openingStockRecon,
};

export type { Row, Values };
