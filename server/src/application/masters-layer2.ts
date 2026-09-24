import type { Db } from "../infrastructure/db.ts";
import { DomainError } from "../shared-kernel/errors.ts";
import {
  AUDIT_SQL, b, count, n, onyxError, requirePostingAccount, s,
  type EntityDef, type FieldDef, type Row, type Values,
} from "./master-kit.ts";

/**
 * الطبقة ٢ — البيانات الأساسية · بنود 28–36 في `startyx/BUILD-ORDER.md`.
 * المصدر لكل بند ملف `GO/` الخاص بشاشته، والقواعد مرقّمة كما فيه (IV-R… مخزون · …).
 * نصوص الأخطاء من جدول رسائل أونيكس برقمها (`shared-kernel/onyx-messages.ts`).
 */

/* ═══════════ حركة الصنف (إثبات الأثر قبل المنع — نفس نمط الطبقة ١) ═══════════ */

async function extractHas(db: Db, table: string): Promise<boolean> {
  return (
    (await count(
      db,
      `SELECT count(*) c FROM information_schema.tables WHERE table_schema = 'extract' AND table_name = $1`,
      [table],
    )) > 0
  );
}

async function loadedOnce(db: Db): Promise<boolean> {
  return (await count(db, `SELECT count(*) c FROM erp.extract_load_log`)) > 0;
}

/**
 * مستندات أونيكس التي تحمل الصنف — من `DELETE_PROC` في نموذج INVI008 (26 فحصاً) بما استُخرج منها.
 * `opening` = سطور المخزون الافتتاحي (يُستثنى في IV-R99). `where` تقيّد الجدول المشترك.
 */
const OPENING_STOCK = "erp.opening_stock";
const ITEM_DOCS: { table: string; label: string; opening?: boolean; where?: string }[] = [
  { table: "IAS_BILL_DTL", label: "فواتير المبيعات" },
  { table: "IAS_RT_BILL_DTL", label: "مردود المبيعات" },
  { table: "IAS_PI_BILL_DTL", label: "فواتير المشتريات" },
  { table: "IAS_PR_BILL_DTL", label: "مردود المشتريات" },
  { table: "GR_DETAIL", label: "التوريد المخزني", where: `"PI_TYPE" <> '0'` },
  /* المخزون الافتتاحي الحيّ (op.5.1.2.15) في نفس موضعه القديم — مصدره الجدول لا IAS_OPEN_STOCK · GR_DETAIL نوع 0 */
  { table: OPENING_STOCK, label: "المخزون الافتتاحي", opening: true },
  { table: "IAS_OUTGOING_DTL", label: "الصرف المخزني" },
  { table: "IAS_WHTRNS_DTL", label: "التحويل المخزني" },
];

/**
 * أول مستند يحمل الصنف (أو الصنف بوحدته) — `null` إن لا حركة.
 * جدول مستخرج غائب بعد تحميل فعلي ⇒ لا يمكن إثبات الخلوّ ⇒ يُعامل كحركة (يفشل مغلقاً).
 */
async function itemMovement(
  db: Db,
  code: string,
  opts: { unit?: string; skipOpening?: boolean } = {},
): Promise<string | null> {
  const live = await count(
    db,
    `SELECT count(*) c FROM erp.stock_movement WHERE item_code = $1`,
    [code],
  );
  if (live > 0) return "حركة المخزون";
  for (const d of ITEM_DOCS) {
    if (opts.skipOpening && d.opening) continue;
    if (d.table === OPENING_STOCK) {
      const open = await count(db, `SELECT count(*) c FROM erp.opening_stock WHERE item_code = $1${opts.unit ? " AND unit_code = $2" : ""}`,
        opts.unit ? [code, opts.unit] : [code]);
      if (open > 0) return d.label;
      continue;
    }
    if (!(await extractHas(db, d.table))) {
      if (await loadedOnce(db)) return d.label;
      continue;
    }
    const conds = [`"I_CODE" = $1`];
    const params: unknown[] = [code];
    if (opts.unit) {
      conds.push(`"ITM_UNT" = $2`);
      params.push(opts.unit);
    }
    if (d.where) conds.push(d.where);
    if ((await count(db, `SELECT count(*) c FROM extract."${d.table}" WHERE ${conds.join(" AND ")}`, params)) > 0) {
      return d.label;
    }
  }
  return null;
}

/** ما يمنع حذف الصنف غير المستندات: التسعيرة · التركيب · الأرقام المرجعية للموردين (IV-R97) */
async function itemLinks(db: Db, code: string): Promise<string | null> {
  /* التسعيرة الحيّة (op.5.1.2.14 — مزامَنة من IAS_ITEM_PRICE) لا المستخرج: سعر يُضاف أو يُحذف هنا يُحتسب */
  if ((await count(db, `SELECT count(*) c FROM erp.item_price WHERE item_code = $1`, [code])) > 0) return "تسعيرة الأصناف";
  if ((await count(db, `SELECT count(*) c FROM erp.kit_component WHERE component_code = $1`, [code])) > 0) {
    return "مكونات الأصناف المركبة";
  }
  return null;
}

async function itemExists(db: Db, code: string): Promise<Row | null> {
  return ((await db.query(`SELECT code, is_kit, used_in_kit FROM erp.item WHERE code = $1`, [code])).rows[0] as Row) ?? null;
}

async function unitExists(db: Db, code: string): Promise<boolean> {
  return (await count(db, `SELECT count(*) c FROM erp.unit WHERE code = $1`, [code])) > 0;
}

/** الوحدة من وحدات الصنف (الموردون والمكونات يُدخلون بوحدات الصنف فقط) */
async function itemHasUnit(db: Db, item: string, unit: string): Promise<boolean> {
  return (await count(db, `SELECT count(*) c FROM erp.item_unit WHERE item_code = $1 AND unit_code = $2`, [item, unit])) > 0;
}

/** IV-R94 — الرقم لا يقبل الرموز الخاصة (`YS_CHK_SPCL_CHR_FNC`): حروف وأرقام فقط */
function hasSpecialChars(code: string): boolean {
  return !/^[\p{L}\p{N}]+$/u.test(code);
}

/** IV-R96 — الباركود/الرقم المرجعي/رقم صنف المورد لا يساوي رقم صنف قائم ولا باركوداً قائماً */
async function codeTaken(
  db: Db,
  value: string,
  except: { item?: string; unitKey?: [string, string]; ref?: string },
): Promise<"item" | "barcode" | "ref" | null> {
  if ((await count(db, `SELECT count(*) c FROM erp.item WHERE code = $1`, [value])) > 0) return "item";
  const [bi, bu] = except.unitKey ?? ["", ""];
  if (
    (await count(
      db,
      `SELECT count(*) c FROM erp.item_unit WHERE barcode = $1 AND NOT (item_code = $2 AND unit_code = $3)`,
      [value, bi, bu],
    )) > 0
  ) {
    return "barcode";
  }
  if ((await count(db, `SELECT count(*) c FROM erp.item_ref_code WHERE ref_code = $1 AND ref_code <> $2`, [value, except.ref ?? ""])) > 0) {
    return "ref";
  }
  return null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** IV-R101 — التوقيف يسجّل التاريخ والمستخدم آلياً، ورفعه يمسحهما */
function stampInactive(v: Values, before: Row | null, user: string): void {
  const now = b(v.inactive);
  const was = before ? b(before.inactive) : false;
  if (now && !was) {
    v.inactive_date = today();
    v.inactive_by = user;
  } else if (!now) {
    v.inactive_date = null;
    v.inactive_by = null;
    v.inactive_reason = null;
  }
}

/**
 * IV-R100 — بعد الحفظ: لا وحدة بيع ⇒ الرئيسية تصير وحدة البيع، ويُعاد ترقيم الترتيب
 * (الرئيسية أولاً ثم بالعبوة تصاعدياً).
 */
async function normalizeUnits(db: Db, item: string): Promise<void> {
  const sales = await count(db, `SELECT count(*) c FROM erp.item_unit WHERE item_code = $1 AND is_sale`, [item]);
  if (sales === 0) await db.query(`UPDATE erp.item_unit SET is_sale = true WHERE item_code = $1 AND is_main`, [item]);
  await db.query(
    `UPDATE erp.item_unit u SET level_no = r.rn
     FROM (SELECT unit_code, row_number() OVER (ORDER BY is_main DESC, pack_size, unit_code) rn
           FROM erp.item_unit WHERE item_code = $1) r
     WHERE u.item_code = $1 AND u.unit_code = r.unit_code AND u.level_no <> r.rn`,
    [item],
  );
}

/** IV-R100 · 6238 — لا يدور المركب على نفسه: المكوّن لا يكون المركب ولا أحد أصوله في شجرة التركيب */
async function kitCycle(db: Db, kit: string, component: string): Promise<boolean> {
  if (kit === component) return true;
  const r = await db.query(
    `WITH RECURSIVE down(code) AS (
       SELECT component_code FROM erp.kit_component WHERE kit_item_code = $1
       UNION
       SELECT k.component_code FROM erp.kit_component k JOIN down d ON k.kit_item_code = d.code
     )
     SELECT count(*) c FROM down WHERE code = $2`,
    [component, kit],
  );
  return Number(r.rows[0]?.c ?? 0) > 0;
}

/**
 * IV-D20 — علامة «مركب بلا مكونات» تُعاد بعد كل تغيير في المكونات.
 * «يستخدم في تكوين المركب» (USED_IN_KIT_ITM) لا يُشتق: حقل يؤشّره المستخدم — 58 صنفاً في أونيكس
 * بينما المكونات الفعلية أقل (KIT_ITEMS 32 سطراً) ⇒ اشتقاقه كان سيغيّر بيانات أونيكس.
 */
async function refreshKitFlags(db: Db, kit: string): Promise<void> {
  /* IV-D20 — مكوّن واحد على الأقل يرفع علامة المراجعة عن «مركب بلا مكونات» */
  await db.query(
    `UPDATE erp.item SET needs_review = (is_kit AND NOT EXISTS (SELECT 1 FROM erp.kit_component WHERE kit_item_code = $1))
     WHERE code = $1`,
    [kit],
  );
}

/* ═══════════ 28 · op.5.1.2.10 — بيانات الأصناف · IAS_ITM_MST [GO/05-warehouse.md] ═══════════ */

const item: EntityDef = {
  table: "erp.item",
  screen: "op.5.1.2.10",
  listLimit: 5000,
  listSql: `SELECT code, name_ar, name_en, group_code, short_name_ar, short_name_en, description_ar, description_en,
                   image_ref, trim_scale(initial_cost)::text initial_cost, trim_scale(primary_cost)::text primary_cost, trim_scale(avg_cost)::text avg_cost,
                   to_char(last_receipt_date,'YYYY-MM-DD') last_receipt_date, is_stocked,
                   inactive, inactive_reason, to_char(inactive_date,'YYYY-MM-DD') inactive_date, inactive_by,
                   is_blocked, no_sale, is_service, cash_sale_only, no_return, return_period_days,
                   is_kit, used_in_kit, allow_fraction, qty_decimals, vat_type, trim_scale(vat_pct)::text vat_pct,
                   tax_classification, gtin, used_in_emp_requests, imported_from_excel,
                   import_doc_type, import_doc_no, import_doc_ser, needs_review,
                   (SELECT u.unit_code FROM erp.item_unit u WHERE u.item_code = erp.item.code AND u.is_main) main_unit,
                   (SELECT string_agg(u.unit_code || CASE WHEN u.is_main THEN '' ELSE ' × ' || trim(to_char(u.pack_size,'FM999999990.##########'),'.') END,
                                      ' ← ' ORDER BY u.level_no)
                      FROM erp.item_unit u WHERE u.item_code = erp.item.code) units,
                   (SELECT trim_scale(sum(w.available_qty * w.pack_size))::text FROM erp.item_warehouse w WHERE w.item_code = erp.item.code) available_qty,
                   ${AUDIT_SQL}
            FROM erp.item`,
  searchCols: ["code", "name_ar", "name_en", "group_code"],
  fields: {
    code: { col: "code", kind: "text", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    group_code: { col: "group_code", kind: "text", required: true },
    short_name_ar: { col: "short_name_ar", kind: "text" },
    short_name_en: { col: "short_name_en", kind: "text" },
    description_ar: { col: "description_ar", kind: "text" },
    description_en: { col: "description_en", kind: "text" },
    image_ref: { col: "image_ref", kind: "text" },
    initial_cost: { col: "initial_cost", kind: "num" },
    primary_cost: { col: "primary_cost", kind: "num" },
    inactive: { col: "inactive", kind: "bool" },
    inactive_reason: { col: "inactive_reason", kind: "text" },
    inactive_date: { col: "inactive_date", kind: "date" },
    inactive_by: { col: "inactive_by", kind: "text" },
    is_blocked: { col: "is_blocked", kind: "bool" },
    no_sale: { col: "no_sale", kind: "bool" },
    is_service: { col: "is_service", kind: "bool" },
    cash_sale_only: { col: "cash_sale_only", kind: "bool" },
    no_return: { col: "no_return", kind: "bool" },
    return_period_days: { col: "return_period_days", kind: "int" },
    is_kit: { col: "is_kit", kind: "bool" },
    used_in_kit: { col: "used_in_kit", kind: "bool" },
    allow_fraction: { col: "allow_fraction", kind: "bool" },
    qty_decimals: { col: "qty_decimals", kind: "int" },
    tax_classification: { col: "tax_classification", kind: "text" },
    gtin: { col: "gtin", kind: "text" },
    used_in_emp_requests: { col: "used_in_emp_requests", kind: "bool" },
    needs_review: { col: "needs_review", kind: "bool" },
  },
  async validate(db, mode, v, before, user) {
    const code = s(v.code);
    /* IV-R94 — لا رموز خاصة في الرقم */
    if (hasSpecialChars(code)) throw onyxError(4724);
    /* المجموعة موجودة (IV-R94 إلزامية) */
    const group = s(v.group_code);
    if ((await count(db, `SELECT count(*) c FROM erp.item_group WHERE code = $1`, [group])) === 0) throw onyxError(5093);
    if (mode === "add") {
      /* IV-R94 — وحدة رئيسية واحدة إلزامية مع الصنف الجديد */
      const main = s(v.main_unit);
      if (!main) throw onyxError(4723);
      if (!(await unitExists(db, main))) throw onyxError(9754);
      /* رقم الصنف لا يساوي باركوداً أو رقماً مرجعياً قائماً (IV-R96) */
      const taken = await codeTaken(db, code, {});
      if (taken === "barcode" || taken === "ref") throw onyxError(2143);
    }
    /* IV-R96 — GTIN فريد */
    const gtin = s(v.gtin);
    if (gtin && (await count(db, `SELECT count(*) c FROM erp.item WHERE gtin = $1 AND code <> $2`, [gtin, code])) > 0) {
      throw onyxError(2143);
    }
    for (const k of ["initial_cost", "primary_cost"]) {
      const x = n(v[k]);
      if (x != null && x < 0) throw onyxError(7438);
    }
    if (mode === "edit" && before) {
      const moved = async () => itemMovement(db, code);
      /* IV-R98 — بعد أول حركة يُقفل «مركب» و«خدمي» */
      if (b(before.is_kit) !== b(v.is_kit) || b(before.is_service) !== b(v.is_service)) {
        if (await moved()) throw onyxError(5119);
      }
      /* IV-R98 — «مركب» يُقفل إذا للصنف مكونات أو استُخدم مكوّناً */
      if (b(before.is_kit) && !b(v.is_kit)) {
        if ((await count(db, `SELECT count(*) c FROM erp.kit_component WHERE kit_item_code = $1`, [code])) > 0) {
          throw onyxError(5119);
        }
      }
      /* IV-R99 — التكلفة الأولية تُعدَّل فقط إن لا حركة غير الافتتاحي */
      if (s(before.primary_cost) !== "" && n(before.primary_cost) !== n(v.primary_cost)) {
        if (await itemMovement(db, code, { skipOpening: true })) throw onyxError(5119);
      }
    }
    stampInactive(v, before, user);
    /* IV-D20 — «مركب» بلا مكونات يبقى بعلامة المراجعة، والعلامة مشتقة لا تُدخَل */
    v.needs_review = b(v.is_kit)
      ? (await count(db, `SELECT count(*) c FROM erp.kit_component WHERE kit_item_code = $1`, [code])) === 0
      : false;
  },
  async afterSave(db, mode, saved, payload, before, user) {
    const code = s(saved.code);
    if (mode !== "add") {
      /* IV-R99 — تعديل «التكلفة الأولية» يعيد كتابة تكلفة المخزون الافتتاحي للصنف (IV-R121: واحدة في كل المخازن × العبوة) */
      if (before && n(before.primary_cost) !== n(saved.primary_cost)) {
        await db.query(`UPDATE erp.opening_stock SET unit_cost = COALESCE($2::numeric, 0) * pack_size, updated_by = $3, updated_at = now(),
                                                   update_count = update_count + 1
                          WHERE item_code = $1`, [code, s(saved.primary_cost) || null, user]);
      }
      return;
    }
    /* الوحدة الرئيسية: المستوى الأول وعبوتها واحد (5743 · 5744) وهي وحدة البيع (IV-R100) */
    await db.query(
      `INSERT INTO erp.item_unit (item_code, unit_code, pack_size, level_no, is_main, is_sale, created_by, created_at)
       VALUES ($1, $2, 1, 1, true, true, $3, now())`,
      [code, s(payload.main_unit), user],
    );
    /* T1 «إضافة من» — وحدات الصنف المصدر (غير الرئيسية) تُنسخ للصنف الجديد؛ الباركود لا يُنسخ (فريد — IV-R96) */
    const from = s(payload.copy_from);
    if (from) {
      if (!(await itemExists(db, from))) throw onyxError(3319);
      await db.query(
        `INSERT INTO erp.item_unit (item_code, unit_code, pack_size, level_no, is_main, is_sale, is_purchase, is_stock,
                                    is_transfer, no_sale, desc_ar, desc_en, created_by, created_at)
         SELECT $1, unit_code, pack_size, level_no, false, is_sale, is_purchase, is_stock, is_transfer, no_sale,
                desc_ar, desc_en, $3, now()
         FROM erp.item_unit
         WHERE item_code = $2 AND NOT is_main AND unit_code <> $4`,
        [code, from, user, s(payload.main_unit)],
      );
      await normalizeUnits(db, code);
    }
    /* الربط الضريبي جزء من دورة إنشاء الصنف [GO/03-tax.md op.3.5 §٢]:
       النوع الافتراضي · الجهة 1 · نسبة المجموعة الافتراضية (IV-R74) وإلا الشريحة الافتراضية · فئة S
       [مستنتج لاختيار النسبة — كل 2,228 صنفاً في أونيكس S 15%] */
    await db.query(
      `INSERT INTO erp.item_tax (item_code, tax_no, agency_no, pct, tax_code, vat_category, created_by, created_at)
       SELECT $1, t.no, 1,
              COALESCE((SELECT g.default_tax_pct FROM erp.item_group g WHERE g.code = $2),
                       (SELECT sl.pct FROM erp.tax_slice sl WHERE NOT sl.inactive ORDER BY sl.is_default DESC, sl.no LIMIT 1)),
              t.code, 'S', $3, now()
       FROM erp.tax_type t
       WHERE NOT t.inactive
       ORDER BY t.is_default DESC, t.no
       LIMIT 1
       ON CONFLICT (item_code) DO NOTHING`,
      [code, s(saved.group_code), user],
    );
  },
  async warnings(db, saved) {
    /* IV-R107 — «مركب» بلا مكونات يُنبَّه ولا يُمنع (حتى يُحسم IV-Q15) */
    if (b(saved.is_kit) && (await count(db, `SELECT count(*) c FROM erp.kit_component WHERE kit_item_code = $1`, [s(saved.code)])) === 0) {
      return ["ONYX-5812: هناك أصناف  مركبة ليس لها مكونات"];
    }
    return [];
  },
  async guardDelete(db, before) {
    const code = s(before.code);
    /* IV-R97 — لا حذف لصنف في أي مستند أو تسعيرة أو تركيب */
    const doc = await itemMovement(db, code);
    if (doc) throw onyxError(3618, doc);
    const link = await itemLinks(db, code);
    if (link) throw onyxError(3618, link);
    if ((await count(db, `SELECT count(*) c FROM erp.item_warehouse WHERE item_code = $1 AND COALESCE(available_qty,0) <> 0`, [code])) > 0) {
      throw onyxError(3618, "رصيد في المخازن");
    }
  },
  async cascade(db, before) {
    /* تفاصيل الصنف تُحذف معه (نفس نموذج INVI008: رأس + تبويبات) */
    const code = s(before.code);
    for (const t of ["item_unit", "item_vendor", "item_warehouse", "item_ref_code", "item_tax"]) {
      await db.query(`DELETE FROM erp.${t} WHERE item_code = $1`, [code]);
    }
    await db.query(`DELETE FROM erp.kit_component WHERE kit_item_code = $1`, [code]);
  },
};

/* وحدات الصنف · IAS_ITM_DTL — IV-R94 · IV-R96 · IV-R98 · IV-R100 */
const itemUnit: EntityDef = {
  table: "erp.item_unit",
  screen: "op.5.1.2.10",
  listLimit: 5000,
  listSql: `SELECT item_code, unit_code, trim_scale(pack_size)::text pack_size, level_no, is_main, is_sale, is_purchase, is_stock,
                   is_transfer, no_sale, inactive, inactive_reason, inactive_by, to_char(inactive_date,'YYYY-MM-DD') inactive_date,
                   barcode, desc_ar, desc_en, ${AUDIT_SQL}
            FROM erp.item_unit`,
  searchCols: ["item_code", "unit_code", "barcode"],
  keyCols: ["item_code", "unit_code"],
  orderBy: "item_code, level_no",
  fields: {
    item_code: { col: "item_code", kind: "text", required: true, key: true },
    unit_code: { col: "unit_code", kind: "text", required: true },
    pack_size: { col: "pack_size", kind: "num", required: true },
    is_main: { col: "is_main", kind: "bool" },
    is_sale: { col: "is_sale", kind: "bool" },
    is_purchase: { col: "is_purchase", kind: "bool" },
    is_stock: { col: "is_stock", kind: "bool" },
    is_transfer: { col: "is_transfer", kind: "bool" },
    no_sale: { col: "no_sale", kind: "bool" },
    inactive: { col: "inactive", kind: "bool" },
    inactive_reason: { col: "inactive_reason", kind: "text" },
    inactive_by: { col: "inactive_by", kind: "text" },
    inactive_date: { col: "inactive_date", kind: "date" },
    barcode: { col: "barcode", kind: "text" },
    desc_ar: { col: "desc_ar", kind: "text" },
    desc_en: { col: "desc_en", kind: "text" },
  },
  async validate(db, mode, v, before, user) {
    const itemCode = s(v.item_code);
    const unit = s(v.unit_code);
    if (!(await itemExists(db, itemCode))) throw onyxError(3319);
    if (!unit) throw onyxError(3318);
    if (!(await unitExists(db, unit))) throw onyxError(9754);
    const pack = n(v.pack_size);
    if (pack == null || pack <= 0) throw onyxError(7438);
    /* 5744 — الرئيسية عبوتها واحد */
    if (b(v.is_main) && pack !== 1) throw onyxError(5744);
    /* 4723 — لا يُرفع مؤشر «رئيسية» عن الوحدة الرئيسية الوحيدة (تُنقل بتأشير وحدة أخرى) */
    if (mode === "edit" && before && b(before.is_main) && !b(v.is_main)) throw onyxError(4723);
    /* IV-R98 — بعد أول حركة: الوحدة الرئيسية والعبوات مقفلة */
    const moved = await itemMovement(db, itemCode);
    if (moved) {
      if (mode === "add" && b(v.is_main)) throw onyxError(5119);
      if (mode === "edit" && before && (n(before.pack_size) !== pack || b(before.is_main) !== b(v.is_main))) {
        throw onyxError(5119);
      }
    }
    /* لا تتكرر الوحدة في الصنف (IV-R96 · CHK_DUP_ITM_UNT) — المفتاح (الصنف، الوحدة) ⇒ 2143 */
    /* IV-R96 — الباركود فريد بين الوحدات والأرقام المرجعية ولا يساوي رقم صنف */
    const barcode = s(v.barcode);
    if (barcode && (await codeTaken(db, barcode, { unitKey: [itemCode, unit] }))) throw onyxError(2143);
    stampInactive(v, before, user);
  },
  async afterSave(db, _mode, saved) {
    const itemCode = s(saved.item_code);
    /* وحدة رئيسية واحدة: تأشير وحدة رئيسية جديدة يرفعه عن السابقة (قبل الحركة فقط — فُحص في validate) */
    if (b(saved.is_main)) {
      await db.query(
        `UPDATE erp.item_unit SET is_main = false WHERE item_code = $1 AND unit_code <> $2 AND is_main`,
        [itemCode, s(saved.unit_code)],
      );
    }
    await normalizeUnits(db, itemCode);
  },
  async guardDelete(db, before) {
    /* 4723 — لا يبقى الصنف بلا وحدة رئيسية */
    if (b(before.is_main)) throw onyxError(4723);
    const doc = await itemMovement(db, s(before.item_code), { unit: s(before.unit_code) });
    if (doc) throw onyxError(3618, doc);
    const vend = await count(db, `SELECT count(*) c FROM erp.item_vendor WHERE item_code = $1 AND unit_code = $2`, [
      s(before.item_code), s(before.unit_code),
    ]);
    if (vend > 0) throw onyxError(3618, "موردي الصنف");
  },
  async afterDelete(db, before) {
    await normalizeUnits(db, s(before.item_code));
  },
};

/* موردو الصنف · IAS_VNDR_ITM — IV-R96 · IV-R103 */
const itemVendor: EntityDef = {
  table: "erp.item_vendor",
  screen: "op.5.1.2.10",
  listLimit: 5000,
  listSql: `SELECT item_code, vendor_code, unit_code, trim_scale(pack_size)::text pack_size, trim_scale(price)::text price, currency, is_main,
                   vendor_item_code, packing, trim_scale(min_qty)::text min_qty, vendor_unit, use_in_vss,
                   (SELECT v.name_ar FROM erp.vendor v WHERE v.code = erp.item_vendor.vendor_code) vendor_name,
                   ${AUDIT_SQL}
            FROM erp.item_vendor`,
  searchCols: ["item_code", "vendor_code", "vendor_item_code"],
  keyCols: ["item_code", "vendor_code", "unit_code", "pack_size"],
  orderBy: "item_code, vendor_code",
  fields: {
    item_code: { col: "item_code", kind: "text", required: true, key: true },
    vendor_code: { col: "vendor_code", kind: "text", required: true },
    unit_code: { col: "unit_code", kind: "text", required: true },
    pack_size: { col: "pack_size", kind: "num", required: true },
    price: { col: "price", kind: "num" },
    currency: { col: "currency", kind: "text" },
    is_main: { col: "is_main", kind: "bool" },
    vendor_item_code: { col: "vendor_item_code", kind: "text" },
    packing: { col: "packing", kind: "text" },
    min_qty: { col: "min_qty", kind: "num" },
    vendor_unit: { col: "vendor_unit", kind: "text" },
    use_in_vss: { col: "use_in_vss", kind: "bool" },
  },
  async validate(db, mode, v) {
    const itemCode = s(v.item_code);
    if (!(await itemExists(db, itemCode))) throw onyxError(3319);
    if ((await count(db, `SELECT count(*) c FROM erp.vendor WHERE code = $1`, [s(v.vendor_code)])) === 0) throw onyxError(5093);
    /* الوحدة من وحدات الصنف عند الإضافة فقط — أونيكس فيه ربط قائم بوحدة لم تعد في الصنف (080108 كرتون) */
    if (mode === "add" && !(await itemHasUnit(db, itemCode, s(v.unit_code)))) throw onyxError(9754);
    const price = n(v.price);
    if (price != null && price < 0) throw onyxError(7438);
    const cur = s(v.currency);
    if (cur && (await count(db, `SELECT count(*) c FROM erp.currency WHERE code = $1`, [cur])) === 0) throw onyxError(3418);
    /* IV-R96 — رقم الصنف عند المورد: لا يساوي رقم صنف (4774) ولا باركوداً (4775) ولا يتكرر */
    const vic = s(v.vendor_item_code);
    if (vic) {
      const taken = await codeTaken(db, vic, {});
      if (taken === "item") throw onyxError(4774);
      if (taken === "barcode") throw onyxError(4775);
      const dup = await count(
        db,
        `SELECT count(*) c FROM erp.item_vendor
         WHERE vendor_item_code = $1 AND vendor_code = $2 AND item_code <> $3`,
        [vic, s(v.vendor_code), itemCode],
      );
      if (dup > 0) throw onyxError(2143);
    }
    /* مورد رئيسي واحد للصنف */
    if (b(v.is_main)) {
      await db.query(
        `UPDATE erp.item_vendor SET is_main = false WHERE item_code = $1 AND vendor_code <> $2 AND is_main`,
        [itemCode, s(v.vendor_code)],
      );
    }
  },
  async guardDelete() {
    /* الربط يُحذف بلا أثر محاسبي */
  },
};

/* مكونات المركب · KIT_ITEMS — IV-R100 (دوران) · IV-R107 · IV-D5 */
const kitComponent: EntityDef = {
  table: "erp.kit_component",
  screen: "op.5.1.2.10",
  listSql: `SELECT kit_item_code, component_code, unit_code, trim_scale(pack_size)::text pack_size, trim_scale(qty)::text qty, trim_scale(pack_qty)::text pack_qty,
                   trim_scale(cost_pct)::text cost_pct, trim_scale(min_qty)::text min_qty, trim_scale(max_qty)::text max_qty, note, exceed_qty, allow_delete,
                   default_warehouse, trim_scale(product_qty)::text product_qty,
                   (SELECT i.name_ar FROM erp.item i WHERE i.code = erp.kit_component.component_code) component_name,
                   ${AUDIT_SQL}
            FROM erp.kit_component`,
  searchCols: ["kit_item_code", "component_code"],
  keyCols: ["kit_item_code", "component_code", "unit_code"],
  orderBy: "kit_item_code, component_code",
  fields: {
    kit_item_code: { col: "kit_item_code", kind: "text", required: true, key: true },
    component_code: { col: "component_code", kind: "text", required: true },
    unit_code: { col: "unit_code", kind: "text", required: true },
    pack_size: { col: "pack_size", kind: "num" },
    qty: { col: "qty", kind: "num", required: true },
    pack_qty: { col: "pack_qty", kind: "num" },
    cost_pct: { col: "cost_pct", kind: "num" },
    min_qty: { col: "min_qty", kind: "num" },
    max_qty: { col: "max_qty", kind: "num" },
    note: { col: "note", kind: "text" },
    exceed_qty: { col: "exceed_qty", kind: "bool" },
    allow_delete: { col: "allow_delete", kind: "bool" },
    default_warehouse: { col: "default_warehouse", kind: "text" },
    product_qty: { col: "product_qty", kind: "num" },
  },
  async validate(db, _mode, v) {
    const kit = s(v.kit_item_code);
    const comp = s(v.component_code);
    const k = await itemExists(db, kit);
    if (!k || !(await itemExists(db, comp))) throw onyxError(3319);
    /* المكونات لصنف مؤشَّر «مركب» فقط */
    if (!b(k.is_kit)) throw onyxError(6837);
    if (await kitCycle(db, kit, comp)) throw onyxError(6238);
    if (!(await itemHasUnit(db, comp, s(v.unit_code)))) throw onyxError(9754);
    const p = (await db.query(`SELECT pack_size FROM erp.item_unit WHERE item_code = $1 AND unit_code = $2`, [comp, s(v.unit_code)])).rows[0];
    v.pack_size = s(p?.pack_size) || "1";
    const qty = n(v.qty);
    if (qty == null || qty <= 0) throw onyxError(7438);
    const lo = n(v.min_qty);
    const hi = n(v.max_qty);
    if (lo != null && hi != null && lo > hi) throw onyxError(4244);
    const wh = s(v.default_warehouse);
    if (wh && (await count(db, `SELECT count(*) c FROM erp.warehouse WHERE code = $1`, [wh])) === 0) throw onyxError(5093);
  },
  async afterSave(db, _mode, saved) {
    await refreshKitFlags(db, s(saved.kit_item_code));
  },
  async guardDelete() {
    /* المكوّن يُرفع من التركيبة بلا أثر محاسبي */
  },
  async afterDelete(db, before) {
    await refreshKitFlags(db, s(before.kit_item_code));
  },
};

/* الأرقام المرجعية · INV_REF_CODE_ITM — REF_CODE فريد (CHK_DUP_ITM_REF_CODE_PRC) */
const itemRefCode: EntityDef = {
  table: "erp.item_ref_code",
  screen: "op.5.1.2.10",
  listSql: `SELECT ref_code, item_code, ${AUDIT_SQL} FROM erp.item_ref_code`,
  searchCols: ["ref_code", "item_code"],
  orderBy: "item_code, ref_code",
  fields: {
    ref_code: { col: "ref_code", kind: "text", required: true, key: true },
    item_code: { col: "item_code", kind: "text", required: true },
  },
  async validate(db, _mode, v) {
    if (!(await itemExists(db, s(v.item_code)))) throw onyxError(3319);
    const ref = s(v.ref_code);
    if (hasSpecialChars(ref)) throw onyxError(4724);
    const taken = await codeTaken(db, ref, { ref });
    if (taken) throw onyxError(2143);
  },
  async guardDelete() {
    /* الرقم المرجعي بديل بحث فقط */
  },
};

/* أرصدة الصنف في المخازن · IAS_ITM_WCODE — للقراءة (IV-R105)؛ التوقيف أمام المخزن فقط يُعدَّل (IV-R101) */
const itemWarehouse: EntityDef = {
  table: "erp.item_warehouse",
  screen: "op.5.1.2.10",
  listLimit: 5000,
  noAdd: true,
  noDelete: true,
  listSql: `SELECT item_code, warehouse_code, unit_code, trim_scale(pack_size)::text pack_size, warehouse_group,
                   trim_scale(primary_cost)::text primary_cost, trim_scale(avg_cost)::text avg_cost, trim_scale(available_qty)::text available_qty,
                   allow_negative, inactive,
                   (SELECT w.name_ar FROM erp.warehouse w WHERE w.code = erp.item_warehouse.warehouse_code) warehouse_name,
                   ${AUDIT_SQL}
            FROM erp.item_warehouse`,
  searchCols: ["item_code", "warehouse_code"],
  keyCols: ["item_code", "warehouse_code", "unit_code"],
  orderBy: "item_code, warehouse_code",
  fields: {
    item_code: { col: "item_code", kind: "text", required: true, key: true },
    warehouse_code: { col: "warehouse_code", kind: "text", required: true },
    unit_code: { col: "unit_code", kind: "text", required: true },
    inactive: { col: "inactive", kind: "bool" },
  },
  async validate() {
    /* لا حقول محسوبة تُكتب من الشاشة: الكمية والتكلفة من الحركة (IV-R105) */
  },
  async guardDelete() {
    throw onyxError(3428);
  },
};

/* ═══════════ 29 · op.5.1.2.9 — بيانات المخازن · WAREHOUSE_DETAILS [GO/05-warehouse.md] ═══════════ */

/** مستندات أونيكس التي تحمل المخزن (DELETE_PROC في INVI006 + القيود IAS_POST_DTL.W_CODE — IV-R80/81) */
const WAREHOUSE_DOCS: { table: string; cols: string[]; label: string; where?: string }[] = [
  { table: "IAS_POST_DTL", cols: ["W_CODE"], label: "القيود المرحّلة" },
  { table: "IAS_BILL_DTL", cols: ["W_CODE"], label: "فواتير المبيعات" },
  { table: "IAS_RT_BILL_DTL", cols: ["W_CODE"], label: "مردود المبيعات" },
  { table: "IAS_PI_BILL_DTL", cols: ["W_CODE"], label: "فواتير المشتريات" },
  { table: "IAS_PR_BILL_DTL", cols: ["W_CODE"], label: "مردود المشتريات" },
  { table: "GR_DETAIL", cols: ["W_CODE"], label: "التوريد المخزني", where: `"PI_TYPE" <> '0'` },
  { table: "IAS_OUTGOING_DTL", cols: ["W_CODE"], label: "الصرف المخزني" },
  { table: "IAS_WHTRNS_DTL", cols: ["W_CODE", "T_W_CODE", "F_W_CODE"], label: "التحويل المخزني" },
  { table: OPENING_STOCK, cols: ["warehouse_code"], label: "المخزون الافتتاحي" },
];

async function warehouseMovement(db: Db, code: string): Promise<string | null> {
  if ((await count(db, `SELECT count(*) c FROM erp.stock_movement WHERE warehouse_code = $1`, [code])) > 0) return "حركة المخزون";
  for (const d of WAREHOUSE_DOCS) {
    if (d.table === OPENING_STOCK) {
      if ((await count(db, `SELECT count(*) c FROM erp.opening_stock WHERE warehouse_code = $1`, [code])) > 0) return d.label;
      continue;
    }
    if (!(await extractHas(db, d.table))) {
      if (await loadedOnce(db)) return d.label;
      continue;
    }
    const where = "(" + d.cols.map((c) => `"${c}" = $1`).join(" OR ") + ")" + (d.where ? " AND " + d.where : "");
    if ((await count(db, `SELECT count(*) c FROM extract."${d.table}" WHERE ${where}`, [code])) > 0) return d.label;
  }
  return null;
}

const warehouse: EntityDef = {
  table: "erp.warehouse",
  screen: "op.5.1.2.9",
  listSql: `SELECT code, name_ar, name_en, group_code, branch_no, inactive, no_sale, doc_sequence_key, is_main,
                   transfer_account, transfer_analytic, transfer_analytic_type, default_cost_center, default_price_level,
                   trim_scale(stock_cost_limit)::text stock_cost_limit, is_damaged_goods, is_service_default,
                   keeper_name, phone, location, country_no, province_no, city_no, region_code, gln, latitude, longitude,
                   address_ar, address_en, needs_review,
                   (SELECT count(*) FROM erp.item_warehouse iw WHERE iw.warehouse_code = erp.warehouse.code) item_count,
                   ${AUDIT_SQL}
            FROM erp.warehouse`,
  searchCols: ["code", "name_ar", "name_en", "CAST(branch_no AS text)"],
  orderBy: "CASE WHEN code ~ '^[0-9]+$' THEN lpad(code, 10, '0') ELSE code END",
  fields: {
    code: { col: "code", kind: "text", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    group_code: { col: "group_code", kind: "text" },
    branch_no: { col: "branch_no", kind: "int", required: true },
    inactive: { col: "inactive", kind: "bool" },
    no_sale: { col: "no_sale", kind: "bool" },
    doc_sequence_key: { col: "doc_sequence_key", kind: "int" },
    is_main: { col: "is_main", kind: "bool" },
    transfer_account: { col: "transfer_account", kind: "text" },
    transfer_analytic: { col: "transfer_analytic", kind: "text" },
    transfer_analytic_type: { col: "transfer_analytic_type", kind: "int" },
    default_cost_center: { col: "default_cost_center", kind: "text" },
    default_price_level: { col: "default_price_level", kind: "int" },
    stock_cost_limit: { col: "stock_cost_limit", kind: "num" },
    is_damaged_goods: { col: "is_damaged_goods", kind: "bool" },
    is_service_default: { col: "is_service_default", kind: "bool" },
    keeper_name: { col: "keeper_name", kind: "text" },
    phone: { col: "phone", kind: "text" },
    location: { col: "location", kind: "text" },
    country_no: { col: "country_no", kind: "int" },
    province_no: { col: "province_no", kind: "int" },
    city_no: { col: "city_no", kind: "int" },
    region_code: { col: "region_code", kind: "text" },
    gln: { col: "gln", kind: "text" },
    latitude: { col: "latitude", kind: "text" },
    longitude: { col: "longitude", kind: "text" },
    address_ar: { col: "address_ar", kind: "text" },
    address_en: { col: "address_en", kind: "text" },
    needs_review: { col: "needs_review", kind: "bool" },
  },
  async validate(db, mode, v, before) {
    const code = s(v.code);
    /* W_CODE NUMBER(10) في أونيكس — أرقام فقط */
    if (!/^[0-9]{1,10}$/.test(code)) throw onyxError(4724);
    /* IV-R79 — الفرع إلزامي وموجود */
    const brn = n(v.branch_no);
    if ((await count(db, `SELECT count(*) c FROM erp.branch WHERE no = $1`, [brn ?? -1])) === 0) throw onyxError(5093);
    const grp = s(v.group_code);
    if (grp && (await count(db, `SELECT count(*) c FROM erp.warehouse_group WHERE code = $1`, [grp])) === 0) {
      throw onyxError(5093);
    }
    /* IV-R81 — بعد الحركة أو القيود يُقفل تغيير الفرع */
    if (mode === "edit" && before && n(before.branch_no) !== brn && (await warehouseMovement(db, code))) {
      throw onyxError(5119);
    }
    /* IV-R83 — الوسيط حساب حركة، ليس صندوقاً ولا بنكاً ولا عميلاً ولا مورداً (4267) · التحليلي إن طلبه الحساب (4559) */
    const tr = s(v.transfer_account);
    if (tr) {
      const acc = await requirePostingAccount(db, tr);
      const at = s(acc.analytic_type);
      if (["1", "2", "3", "4"].includes(at)) throw onyxError(4267);
      if (at && at !== "0") {
        if (!s(v.transfer_analytic)) throw onyxError(4559);
        v.transfer_analytic_type = Number(at);
      } else {
        v.transfer_analytic = null;
        v.transfer_analytic_type = null;
      }
    } else {
      v.transfer_analytic = null;
      v.transfer_analytic_type = null;
    }
    /* المركز الافتراضي (IV-R91): مركز تكلفة فرعي موجود */
    const cc = s(v.default_cost_center);
    if (cc && (await count(db, `SELECT count(*) c FROM erp.cost_center WHERE code = $1`, [cc])) === 0) throw onyxError(5093);
    /* المستوى السعري (IV-R90): من مستويات التسعيرة المعرّفة (IAS_PRICING_LEVELS) */
    const lvl = n(v.default_price_level);
    if (lvl != null && (await extractHas(db, "IAS_PRICING_LEVELS"))) {
      if ((await count(db, `SELECT count(*) c FROM extract."IAS_PRICING_LEVELS" WHERE "LEV_NO" = $1`, [String(lvl)])) === 0) {
        throw onyxError(5093);
      }
    }
    const lim = n(v.stock_cost_limit);
    if (lim != null && lim < 0) throw onyxError(7438);
    /* مخزن رئيسي واحد (IV-R87 — «جديد: فريد جزئياً») */
    if (b(v.is_main) && (await count(db, `SELECT count(*) c FROM erp.warehouse WHERE is_main AND code <> $1`, [code])) > 0) {
      throw onyxError(2143);
    }
  },
  async afterSave(db, _mode, saved, _payload, before) {
    /* IV-R92 — تغيير مجموعة المخزن يعبّئ مجموعة أصنافه الفارغة في أرصدة المخازن */
    const grp = s(saved.group_code);
    if (grp && (!before || s(before.group_code) !== grp)) {
      await db.query(
        `UPDATE erp.item_warehouse SET warehouse_group = $2 WHERE warehouse_code = $1 AND warehouse_group IS NULL`,
        [s(saved.code), grp],
      );
    }
  },
  async warnings(db, saved) {
    /* IV-R93 [مستنتج — حالة 300/80000]: مخزن موقوف ما زال مربوطاً بمندوب — تنبيه لا منع */
    if (!b(saved.inactive) || !(await extractHas(db, "SALES_MAN"))) return [];
    const r = await db.query(
      `SELECT "REPRS_CODE" code, "REPRS_A_NAME" name FROM extract."SALES_MAN" WHERE "W_CODE" = $1 AND COALESCE("INACTIVE",'0') <> '1'`,
      [s(saved.code)],
    );
    return r.rows.map((x) => `المخزن موقوف وما زال مخزن المندوب ${s(x.code)} ${s(x.name)} (IV-R93)`);
  },
  async guardDelete(db, before) {
    const code = s(before.code);
    /* IV-R80 — أصناف مربوطة · حركة · قيود */
    if ((await count(db, `SELECT count(*) c FROM erp.item_warehouse WHERE warehouse_code = $1`, [code])) > 0) {
      throw onyxError(3618, "أرصدة أصناف");
    }
    const doc = await warehouseMovement(db, code);
    if (doc) throw onyxError(3618, doc);
  },
};

/* ═══════════ 30–31 · op.4.1.2.2 الصناديق · op.4.1.2.3 البنوك [GO/04-general-ledger.md] ═══════════
   نفس النمط (GL-R24): الحساب تحليليه «صندوق»/«بنك» (GL-R18) · أكثر من صندوق على حساب واحد مسموح
   بمتغير `ALLOW_DUP_CASH_AC`/`ALLOW_DUP_BANK_AC` (☑ عند بتروسبيشل: 21 صندوقاً على 1201010002 · 28 بنكاً على 1201020005). */

type Treasury = { kind: "cash" | "bank"; table: string; analytic: string; dupParam: string; branchRequired: boolean };
const CASH: Treasury = { kind: "cash", table: "erp.cashbox", analytic: "1", dupParam: "ALLOW_DUP_CASH_AC", branchRequired: true };
const BANK: Treasury = { kind: "bank", table: "erp.bank", analytic: "2", dupParam: "ALLOW_DUP_BANK_AC", branchRequired: false };

async function glParam(db: Db, name: string): Promise<string> {
  if (!(await extractHas(db, "IAS_PARA_GL"))) return "";
  const r = await db.query(`SELECT "${name}" v FROM extract."IAS_PARA_GL" LIMIT 1`);
  return s(r.rows[0]?.v);
}

/** حركة الصندوق/البنك: القيود المرحّلة في أونيكس (رقمه + حسابه) · القيود الحيّة · الأرصدة الافتتاحية بتحليليه */
async function treasuryMovement(db: Db, t: Treasury, no: number, account: string): Promise<string | null> {
  if ((await count(db, `SELECT count(*) c FROM erp.gl_entry_line WHERE analytic_type = $1 AND analytic_id = $2`, [t.kind, no])) > 0) {
    return "القيود";
  }
  if ((await count(db, `SELECT count(*) c FROM erp.opening_balance_line WHERE analytic_type = $1 AND analytic_code = $2`, [t.analytic, String(no)])) > 0) {
    return "الأرصدة الافتتاحية";
  }
  if (!(await extractHas(db, "IAS_POST_DTL"))) return (await loadedOnce(db)) ? "القيود المرحّلة" : null;
  const posted = await count(
    db,
    `SELECT count(*) c FROM extract."IAS_POST_DTL"
      WHERE "A_CODE" = $1 AND ("CASH_NO" = $2 OR ("AC_DTL_TYP" = $3 AND "AC_CODE_DTL" = $2))`,
    [account, String(no), t.analytic],
  );
  return posted > 0 ? "القيود المرحّلة" : null;
}

function treasuryEntity(t: Treasury, screen: string, extraFields: EntityDef["fields"], extraCols: string): EntityDef {
  return {
    table: t.table,
    screen,
    listSql: `SELECT no, name_ar, name_en, account_code, sequence_group, receipt_seq_type, default_payment_type,
                     default_receipt_type, group_no, branch_no, to_char(last_reconciled_at,'YYYY-MM-DD') last_reconciled_at,
                     inactive, to_char(inactive_date,'YYYY-MM-DD') inactive_date, inactive_reason, favourite, is_mediator,
                     ${extraCols},
                     (SELECT a.name_ar FROM erp.account a WHERE a.code = ${t.table}.account_code) account_name,
                     ${AUDIT_SQL}
              FROM ${t.table}`,
    searchCols: ["CAST(no AS text)", "name_ar", "account_code"],
    fields: {
      no: { col: "no", kind: "int", required: true, key: true },
      name_ar: { col: "name_ar", kind: "text", required: true },
      name_en: { col: "name_en", kind: "text" },
      account_code: { col: "account_code", kind: "text", required: true },
      sequence_group: { col: "sequence_group", kind: "int" },
      receipt_seq_type: { col: "receipt_seq_type", kind: "int" },
      default_payment_type: { col: "default_payment_type", kind: "int" },
      default_receipt_type: { col: "default_receipt_type", kind: "int" },
      group_no: { col: "group_no", kind: "int" },
      branch_no: { col: "branch_no", kind: "int", required: t.branchRequired },
      inactive: { col: "inactive", kind: "bool" },
      inactive_date: { col: "inactive_date", kind: "date" },
      inactive_reason: { col: "inactive_reason", kind: "text" },
      favourite: { col: "favourite", kind: "bool" },
      is_mediator: { col: "is_mediator", kind: "bool" },
      ...extraFields,
    },
    async validate(db, mode, v, before, user) {
      const no = n(v.no);
      if (no == null || no <= 0 || !Number.isInteger(no)) throw onyxError(4724);
      /* GL-R18/24 — حساب حركة تحليليه «صندوق»/«بنك» */
      const acc = await requirePostingAccount(db, s(v.account_code));
      if (s(acc.analytic_type) !== t.analytic) throw onyxError(5114);
      if ((await glParam(db, t.dupParam)) === "0") {
        const dup = await count(db, `SELECT count(*) c FROM ${t.table} WHERE account_code = $1 AND no <> $2`, [s(v.account_code), no]);
        if (dup > 0) throw onyxError(2143);
      }
      /* تغيير الحساب بعد الحركة ممنوع (نفس قاعدة الحسابات 5798) */
      if (mode === "edit" && before && s(before.account_code) !== s(v.account_code)) {
        if (await treasuryMovement(db, t, no, s(before.account_code))) throw onyxError(5798);
      }
      /* GL-R19 — الفرع (إلزامي للصندوق) موجود */
      const brn = n(v.branch_no);
      if (brn != null && (await count(db, `SELECT count(*) c FROM erp.branch WHERE no = $1`, [brn])) === 0) throw onyxError(5093);
      /* القوائم: تسلسل القبض 1 عام · 2 محصل · 3 مندوب */
      const rst = n(v.receipt_seq_type);
      if (rst != null && ![1, 2, 3].includes(rst)) throw onyxError(5093);
      if (t.kind === "cash") {
        /* GL-R20 — نوع الصندوق من قائمة CASH_TYPE */
        const ct = n(v.cash_type);
        if (ct != null && ![1, 2, 3, 4, 98, 126, 127].includes(ct)) throw onyxError(5093);
      } else {
        const bc = n(v.bank_class);
        if (bc != null && ![1, 2].includes(bc)) throw onyxError(5093);
        /* GL-R26 — حسابات الأوراق ووسيط الشيكات: حسابات حركة إن أُدخلت */
        for (const k of ["notes_receivable_account", "notes_payable_account", "cheque_intermediary_account"]) {
          if (s(v[k])) await requirePostingAccount(db, s(v[k]));
        }
      }
      /* التوقيف بتاريخه (GL-R23) — البنك يسجّل الموقِف أيضاً */
      const now = b(v.inactive);
      const was = before ? b(before.inactive) : false;
      if (now && !was) {
        v.inactive_date = today();
        if (t.kind === "bank") v.inactive_by = user;
      } else if (!now) {
        v.inactive_date = null;
        v.inactive_reason = null;
        if (t.kind === "bank") v.inactive_by = null;
      }
    },
    async afterSave(db, mode, saved, _payload, _before, user) {
      /* صف العملة المحلية الافتراضي مع الصندوق/البنك الجديد (أونيكس: صف SAR واحد لكل صندوق/بنك) */
      if (mode !== "add") return;
      const detail = t.kind === "cash" ? "erp.cashbox_currency" : "erp.bank_currency";
      const keyCol = t.kind === "cash" ? "cash_no" : "bank_no";
      await db.query(
        `INSERT INTO ${detail} (${keyCol}, currency, account_code, is_default, created_by, created_at)
         SELECT $1, c.code, $2, true, $3, now() FROM erp.currency c WHERE c.is_local
         ON CONFLICT DO NOTHING`,
        [n(saved.no), s(saved.account_code), user],
      );
    },
    async guardDelete(db, before) {
      /* GL-R23 — لا حذف لصندوق/بنك عليه حركة (التوقيف بديله) */
      const doc = await treasuryMovement(db, t, n(before.no) ?? -1, s(before.account_code));
      if (doc) throw onyxError(3618, doc);
    },
    async cascade(db, before) {
      const detail = t.kind === "cash" ? "erp.cashbox_currency" : "erp.bank_currency";
      const keyCol = t.kind === "cash" ? "cash_no" : "bank_no";
      await db.query(`DELETE FROM ${detail} WHERE ${keyCol} = $1`, [n(before.no)]);
    },
  };
}

const cashbox = treasuryEntity(CASH, "op.4.1.2.2", {
  cash_type: { col: "cash_type", kind: "int" },
  use_cash_income: { col: "use_cash_income", kind: "bool" },
  pos_sys: { col: "pos_sys", kind: "bool" },
}, "cash_type, use_cash_income, pos_sys");

const bank = treasuryEntity(BANK, "op.4.1.2.3", {
  bank_account_no: { col: "bank_account_no", kind: "text" },
  description: { col: "description", kind: "text" },
  phone: { col: "phone", kind: "text" },
  fax: { col: "fax", kind: "text" },
  po_box: { col: "po_box", kind: "text" },
  address: { col: "address", kind: "text" },
  email: { col: "email", kind: "text" },
  website: { col: "website", kind: "text" },
  country_no: { col: "country_no", kind: "int" },
  city_no: { col: "city_no", kind: "int" },
  network_code: { col: "network_code", kind: "text" },
  inactive_by: { col: "inactive_by", kind: "text" },
  logo_ref: { col: "logo_ref", kind: "text" },
  notes_receivable_account: { col: "notes_receivable_account", kind: "text" },
  notes_payable_account: { col: "notes_payable_account", kind: "text" },
  cheque_intermediary_account: { col: "cheque_intermediary_account", kind: "text" },
  card_amount_post_type: { col: "card_amount_post_type", kind: "int" },
  commission_vat: { col: "commission_vat", kind: "bool" },
  print_template: { col: "print_template", kind: "text" },
  bank_class: { col: "bank_class", kind: "int" },
  cheque_auto_seq: { col: "cheque_auto_seq", kind: "bool" },
  bank_code: { col: "bank_code", kind: "text" },
}, `bank_account_no, description, phone, fax, po_box, address, email, website, country_no, city_no, network_code,
    inactive_by, logo_ref, notes_receivable_account, notes_payable_account, cheque_intermediary_account,
    card_amount_post_type, commission_vat, print_template, bank_class, cheque_auto_seq, bank_code`);

/* عملات الصندوق/البنك · IAS_CASH_IN_HAND_DTL / IAS_CASH_AT_BANK_DTL — حدود GL-R22 */
function treasuryCurrency(t: Treasury, screen: string): EntityDef {
  const table = t.kind === "cash" ? "erp.cashbox_currency" : "erp.bank_currency";
  const keyCol = t.kind === "cash" ? "cash_no" : "bank_no";
  const extra = t.kind === "bank" ? ", bank_account_no" : "";
  return {
    table,
    screen,
    listSql: `SELECT ${keyCol}, currency, account_code, trim_scale(opening_local)::text opening_local,
                     trim_scale(opening_foreign)::text opening_foreign, trim_scale(current_local)::text current_local,
                     trim_scale(current_foreign)::text current_foreign, is_default, inactive,
                     to_char(inactive_date,'YYYY-MM-DD') inactive_date, trim_scale(min_balance)::text min_balance,
                     trim_scale(max_balance)::text max_balance, trim_scale(min_txn)::text min_txn,
                     trim_scale(max_txn)::text max_txn, pass_limit${extra}, ${AUDIT_SQL}
              FROM ${table}`,
    searchCols: [`CAST(${keyCol} AS text)`, "currency"],
    keyCols: [keyCol, "currency"],
    orderBy: `${keyCol}, currency`,
    fields: {
      [keyCol]: { col: keyCol, kind: "int", required: true, key: true },
      currency: { col: "currency", kind: "text", required: true },
      account_code: { col: "account_code", kind: "text" },
      is_default: { col: "is_default", kind: "bool" },
      inactive: { col: "inactive", kind: "bool" },
      inactive_date: { col: "inactive_date", kind: "date" },
      min_balance: { col: "min_balance", kind: "num" },
      max_balance: { col: "max_balance", kind: "num" },
      min_txn: { col: "min_txn", kind: "num" },
      max_txn: { col: "max_txn", kind: "num" },
      pass_limit: { col: "pass_limit", kind: "int" },
      ...(t.kind === "bank" ? { bank_account_no: { col: "bank_account_no", kind: "text" as const } } : {}),
    },
    async validate(db, mode, v, before) {
      const head = (await db.query(`SELECT account_code FROM ${t.table} WHERE no = $1`, [n(v[keyCol]) ?? -1])).rows[0];
      if (!head) throw onyxError(5093);
      if ((await count(db, `SELECT count(*) c FROM erp.currency WHERE code = $1`, [s(v.currency)])) === 0) throw onyxError(3418);
      v.account_code = s(head.account_code);
      for (const [lo, hi] of [["min_balance", "max_balance"], ["min_txn", "max_txn"]] as const) {
        const a = n(v[lo]);
        const c = n(v[hi]);
        if (a != null && c != null && a > c) throw onyxError(4244);
      }
      const pl = n(v.pass_limit);
      if (pl != null && ![1, 2, 3].includes(pl)) throw onyxError(5093);
      if (b(v.inactive) && !(before && b(before.inactive))) v.inactive_date = today();
      if (!b(v.inactive)) v.inactive_date = null;
      void mode;
    },
    async afterSave(db, _mode, saved) {
      /* عملة افتراضية واحدة لكل صندوق/بنك */
      if (b(saved.is_default)) {
        await db.query(`UPDATE ${table} SET is_default = false WHERE ${keyCol} = $1 AND currency <> $2 AND is_default`, [
          n(saved[keyCol]), s(saved.currency),
        ]);
      }
    },
    async guardDelete(db, before) {
      /* العملة المحلية لصندوق/بنك عليه حركة لا تُرفع */
      const head = (await db.query(`SELECT account_code FROM ${t.table} WHERE no = $1`, [n(before[keyCol])])).rows[0];
      const local = await count(db, `SELECT count(*) c FROM erp.currency WHERE code = $1 AND is_local`, [s(before.currency)]);
      if (head && local > 0) {
        const doc = await treasuryMovement(db, t, n(before[keyCol]) ?? -1, s(head.account_code));
        if (doc) throw onyxError(3618, doc);
      }
    },
  };
}

/* ═══════════ 32 · op.5.1.2.14 — تسعيرة الأصناف · IAS_ITEM_PRICE [GO/05-warehouse.md] ═══════════ */

/** مستويات التسعيرة (op.5.1.1.6 · IAS_PRICING_LEVELS) — المستوى موجود وغير موقوف (IV-R110) */
async function requireLevel(db: Db, lvl: number | null): Promise<void> {
  if (lvl == null) throw onyxError(4048);
  if (!(await extractHas(db, "IAS_PRICING_LEVELS"))) return;
  const r = (await db.query(`SELECT "INACTIVE" i FROM extract."IAS_PRICING_LEVELS" WHERE "LEV_NO" = $1`, [String(lvl)])).rows[0];
  if (!r) throw onyxError(5093);
  if (s(r.i) === "1") throw onyxError(5006);
}

/** IV-R109 — كل إضافة وتعديل وحذف يُسجَّل في رقابة الأسعار بالقيم السابقة (سجل للإضافة فقط) */
async function auditPrice(db: Db, action: 1 | 2 | 3, row: Row, prev: Row | null, user: string): Promise<void> {
  await db.query(
    `INSERT INTO erp.item_price_audit (audit_no, action, input_method, audited_by, audited_at, branch_no, price_level,
                                       item_code, unit_code, pack_size, price, prev_price, min_price, prev_min_price,
                                       max_price, prev_max_price, created_by, created_at)
     SELECT COALESCE(max(audit_no), 0) + 1, $1, 0, $2, now(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $2, now()
     FROM erp.item_price_audit`,
    [
      action, user, n(row.branch_no), n(row.price_level), s(row.item_code), s(row.unit_code), s(row.pack_size) || null,
      action === 3 ? null : s(row.price) || null, prev ? s(prev.price) || null : null,
      action === 3 ? null : s(row.min_price) || null, prev ? s(prev.min_price) || null : null,
      action === 3 ? null : s(row.max_price) || null, prev ? s(prev.max_price) || null : null,
    ],
  );
}

const itemPrice: EntityDef = {
  table: "erp.item_price",
  screen: "op.5.1.2.14",
  listLimit: 5000,
  listSql: `SELECT price_level, item_code, unit_code, trim_scale(pack_size)::text pack_size, trim_scale(price)::text price,
                   trim_scale(min_price)::text min_price, trim_scale(max_price)::text max_price, branch_no,
                   imported_from_excel, note,
                   (SELECT i.name_ar FROM erp.item i WHERE i.code = erp.item_price.item_code) item_name,
                   ${AUDIT_SQL}
            FROM erp.item_price`,
  searchCols: ["item_code", "unit_code", "CAST(price_level AS text)",
    "(SELECT i.name_ar FROM erp.item i WHERE i.code = erp.item_price.item_code)"],
  keyCols: ["price_level", "item_code", "unit_code"],
  orderBy: "price_level, item_code, unit_code",
  fields: {
    price_level: { col: "price_level", kind: "int", required: true, key: true },
    item_code: { col: "item_code", kind: "text", required: true },
    unit_code: { col: "unit_code", kind: "text", required: true },
    pack_size: { col: "pack_size", kind: "num" },
    price: { col: "price", kind: "num", required: true },
    min_price: { col: "min_price", kind: "num" },
    max_price: { col: "max_price", kind: "num" },
    branch_no: { col: "branch_no", kind: "int" },
    note: { col: "note", kind: "text" },
  },
  async validate(db, mode, v) {
    await requireLevel(db, n(v.price_level));
    const itemCode = s(v.item_code);
    if (!(await itemExists(db, itemCode))) throw onyxError(3319);
    /* الوحدة من وحدات الصنف والعبوة لقطة منها (مفتاح السعر لا يتغير بالتعديل) */
    const u = (await db.query(`SELECT pack_size FROM erp.item_unit WHERE item_code = $1 AND unit_code = $2`, [itemCode, s(v.unit_code)])).rows[0];
    if (mode === "add") {
      if (!u) throw onyxError(9754);
      v.pack_size = s(u.pack_size);
    }
    const price = n(v.price);
    const lo = n(v.min_price);
    const hi = n(v.max_price);
    if (price == null || price < 0) throw onyxError(5360);
    if (lo != null && hi != null && lo > hi) throw onyxError(4244);
    if ((lo != null && price < lo) || (hi != null && price > hi)) throw onyxError(5954);
    const brn = n(v.branch_no);
    if (brn != null && (await count(db, `SELECT count(*) c FROM erp.branch WHERE no = $1`, [brn])) === 0) throw onyxError(5093);
  },
  async afterSave(db, mode, saved, _payload, before, user) {
    await auditPrice(db, mode === "add" ? 1 : 2, saved, before, user);
    if (mode !== "add") return;
    /* IV-R112 — تسعير وحدة يُكمل وحدات الصنف الأخرى غير المسعّرة في المستوى: السعر × (عبوتها ÷ عبوة هذه) */
    const r = await db.query(
      `INSERT INTO erp.item_price (price_level, item_code, unit_code, pack_size, price, min_price, max_price, branch_no,
                                   created_by, created_at)
       SELECT $1, u.item_code, u.unit_code, u.pack_size, $4::numeric * u.pack_size / $3::numeric,
              $5::numeric * u.pack_size / $3::numeric, $6::numeric * u.pack_size / $3::numeric, $7, $8, now()
       FROM erp.item_unit u
       WHERE u.item_code = $2 AND u.unit_code <> $9
         AND NOT EXISTS (SELECT 1 FROM erp.item_price p WHERE p.price_level = $1 AND p.item_code = u.item_code AND p.unit_code = u.unit_code)
       RETURNING price_level, item_code, unit_code, pack_size::text pack_size, price::text price,
                 min_price::text min_price, max_price::text max_price, branch_no`,
      [
        n(saved.price_level), s(saved.item_code), s(saved.pack_size) || "1", s(saved.price),
        s(saved.min_price) || null, s(saved.max_price) || null, n(saved.branch_no), user, s(saved.unit_code),
      ],
    );
    for (const row of r.rows) await auditPrice(db, 1, row as Row, null, user);
  },
  async guardDelete() {
    /* السعر ليس إلزامياً للبيع (IV-R116) — حذفه لا يكسر مستنداً؛ الأثر في الرقابة */
  },
  async afterDelete(db, before, user) {
    await auditPrice(db, 3, before, before, user);
  },
};

/* رقابة الأسعار · IAS_ITEM_PRICE_HISTORY — للقراءة فقط (IV-R109) */
const itemPriceAudit: EntityDef = {
  table: "erp.item_price_audit",
  screen: "op.5.1.2.14",
  listLimit: 5000,
  noAdd: true,
  noDelete: true,
  listSql: `SELECT audit_no, action, audited_by, to_char(audited_at,'DD/MM/YYYY HH24:MI') audited_at, branch_no,
                   price_level, item_code, unit_code, trim_scale(price)::text price, trim_scale(prev_price)::text prev_price,
                   trim_scale(min_price)::text min_price, trim_scale(prev_min_price)::text prev_min_price,
                   trim_scale(max_price)::text max_price, trim_scale(prev_max_price)::text prev_max_price, ${AUDIT_SQL}
            FROM erp.item_price_audit`,
  searchCols: ["item_code", "CAST(price_level AS text)", "audited_by"],
  orderBy: "audit_no DESC",
  fields: {
    audit_no: { col: "audit_no", kind: "int", required: true, key: true },
  },
  async validate() {
    throw onyxError(4053);
  },
  async guardDelete() {
    throw onyxError(4053);
  },
};

/* ═══════════ 33 · op.7.1.2.4 — بيانات مندوبي المبيعات · SALES_MAN [GO/07-customers-sales.md] ═══════════
   القوائم من S_FLAGS (لا من التخمين): التصنيف SMAN_SP_TYP 0–3 · الضمانة G_STATUS 0/1 و G_TYPE 1–9 ·
   ترحيل الشيكات CHEQ_TYPE_REC 0–3 · فتح الزيارة VST_OPN_TYP 1–5. الحذف يأخذ معه ربط العملاء والصلاحيات
   والمواقع كما في DELETE من نموذج ARSI004. */

/** مستندات أونيكس التي تحمل رقم المندوب (REP_CODE) — ما عليه منها يمنع الحذف (3618) */
const SALESMAN_DOCS: { table: string; label: string }[] = [
  { table: "IAS_BILL_MST", label: "فواتير المبيعات" },
  { table: "IAS_RT_BILL_MST", label: "مردود المبيعات" },
  { table: "VOUCHERS", label: "السندات" },
  { table: "VOUCHER_DETAIL", label: "السندات" },
  { table: "IAS_POST_DTL", label: "القيود المرحّلة" },
  { table: "USER_R", label: "المستخدمين" },
];

async function salesmanMovement(db: Db, code: string): Promise<string | null> {
  for (const d of SALESMAN_DOCS) {
    if (!(await extractHas(db, d.table))) {
      if (await loadedOnce(db)) return d.label;
      continue;
    }
    if ((await count(db, `SELECT count(*) c FROM extract."${d.table}" WHERE "REP_CODE" = $1`, [code])) > 0) return d.label;
  }
  return null;
}

/** الرقم موجود في جدول ترميز أونيكس المستخرج — غياب الجدول لا يمنع (لا نخترع قائمة) */
async function inOnyxList(db: Db, table: string, col: string, value: string): Promise<boolean> {
  if (!(await extractHas(db, table))) return true;
  return (await count(db, `SELECT count(*) c FROM extract."${table}" WHERE "${col}" = $1`, [value])) > 0;
}

async function onyxParam(db: Db, table: string, col: string): Promise<string> {
  if (!(await extractHas(db, table))) return "";
  const r = await db.query(`SELECT "${col}" v FROM extract."${table}" LIMIT 1`);
  return s(r.rows[0]?.v);
}

/** SR-R2 — هل يصل صعود هرم المشرفين من `parent` إلى `code`؟ */
async function salesmanCycle(db: Db, code: string, parent: string): Promise<boolean> {
  const seen = new Set<string>();
  let cur: string = parent;
  while (cur) {
    if (cur === code || seen.has(cur)) return true;
    seen.add(cur);
    const r = await db.query(`SELECT parent_code FROM erp.salesman WHERE code = $1`, [cur]);
    cur = s(r.rows[0]?.parent_code);
  }
  return false;
}

const SALESMAN_BOOLS = [
  "allow_edit_customer_location", "allow_return_all_items", "work_without_plan", "allow_cancel_docs", "no_sale", "no_collect",
  "allow_file_share", "no_sales_return", "return_request_required", "daily_close", "print_by_ultimate_app",
  "allow_issue_transfer_requests", "allow_return_other_rep", "no_partial_update", "stop_if_plan_missed", "allow_direct_transfer",
  "auto_reserve_orders", "close_visit_by_gps", "allow_approve_target_customer", "no_sale_outside_locations",
  "receipt_request_in_app",
] as const;

const SALESMAN_FIELDS: EntityDef["fields"] = {
  code: { col: "code", kind: "text", required: true, key: true },
  name_ar: { col: "name_ar", kind: "text", required: true },
  classification: { col: "classification", kind: "int", required: true },
  ...Object.fromEntries(
    ([
      ["name_en", "text"], ["parent_code", "text"], ["rep_type", "int"], ["account_code", "text"],
      ["account_analytic_type", "int"], ["account_analytic", "text"], ["address", "text"], ["phone", "text"],
      ["po_box", "text"], ["fax", "text"], ["mobile", "text"], ["country_no", "int"], ["city_no", "int"], ["region_no", "int"],
      ["commission_pct", "num"], ["route_no", "int"], ["route_order", "int"], ["notes", "text"], ["warehouse_code", "text"],
      ["return_warehouse_code", "text"], ["cash_no", "int"], ["cost_center", "text"], ["project_no", "int"],
      ["activity_no", "int"], ["credit_limit", "num"], ["bank_no", "int"], ["sales_plan_amount_no", "int"],
      ["sales_plan_amount_ser", "int"], ["employee_no", "text"], ["sales_plan_qty_no", "int"], ["sales_plan_qty_ser", "int"],
      ["collection_plan_no", "int"], ["inactive", "bool"], ["inactive_by", "text"], ["inactive_date", "date"],
      ["inactive_reason", "text"],
      ["g_status", "int"], ["g_type", "int"], ["g_start_date", "date"], ["g_expire_date", "date"], ["g_name", "text"],
      ["g_address", "text"], ["g_work", "text"], ["g_fin_center", "text"], ["g_amount", "num"], ["g_doc_date", "date"],
      ["g_court_reg", "text"], ["g_chamber_reg", "text"], ["g_cr_no", "text"], ["g_phone", "text"], ["g_fax", "text"],
      ["tax_calc_method", "int"], ["distribution_group", "text"], ["cheque_post_type", "int"], ["visit_open_distance", "int"],
      ["district_radius", "int"], ["route_deviation_max", "int"], ["plan_customer_max", "int"],
      ["cash_cumulative_limit", "num"], ["cash_daily_limit", "num"], ["visit_open_type", "int"],
      ...SALESMAN_BOOLS.map((k) => [k, "bool"]),
    ] as [string, FieldDef["kind"]][]).map(([k, kind]) => [k, { col: k, kind }]),
  ),
};

const salesman: EntityDef = {
  table: "erp.salesman",
  screen: "op.7.1.2.4",
  listSql: `SELECT code, name_ar, name_en, parent_code, rep_type, classification, account_code, account_analytic_type,
                   account_analytic, address, phone, po_box, fax, mobile, country_no, city_no, region_no,
                   trim_scale(commission_pct)::text commission_pct, route_no, route_order,
                   to_char(last_sale_date,'YYYY-MM-DD') last_sale_date, notes, warehouse_code, return_warehouse_code, cash_no,
                   cost_center, project_no, activity_no, trim_scale(credit_limit)::text credit_limit, bank_no,
                   sales_plan_amount_no, sales_plan_amount_ser, employee_no, sales_plan_qty_no, sales_plan_qty_ser,
                   collection_plan_no, inactive, inactive_by, to_char(inactive_date,'YYYY-MM-DD') inactive_date, inactive_reason,
                   g_status, g_type, to_char(g_start_date,'YYYY-MM-DD') g_start_date,
                   to_char(g_expire_date,'YYYY-MM-DD') g_expire_date, g_name, g_address, g_work, g_fin_center,
                   trim_scale(g_amount)::text g_amount, to_char(g_doc_date,'YYYY-MM-DD') g_doc_date, g_court_reg,
                   g_chamber_reg, g_cr_no, g_phone, g_fax, tax_calc_method, distribution_group, cheque_post_type,
                   visit_open_distance, district_radius, route_deviation_max, plan_customer_max,
                   trim_scale(cash_cumulative_limit)::text cash_cumulative_limit,
                   trim_scale(cash_daily_limit)::text cash_daily_limit, visit_open_type,
                   to_char(app_last_update_at,'DD/MM/YYYY HH24:MI') app_last_update_at,
                   to_char(app_last_post_at,'DD/MM/YYYY HH24:MI') app_last_post_at,
                   ${SALESMAN_BOOLS.join(", ")},
                   (SELECT p.name_ar FROM erp.salesman p WHERE p.code = erp.salesman.parent_code) parent_name,
                   (SELECT a.name_ar FROM erp.account a WHERE a.code = erp.salesman.account_code) account_name,
                   (SELECT w.name_ar FROM erp.warehouse w WHERE w.code = erp.salesman.warehouse_code) warehouse_name,
                   (SELECT c.name_ar FROM erp.cashbox c WHERE c.no = erp.salesman.cash_no) cash_name,
                   (SELECT k.name_ar FROM erp.bank k WHERE k.no = erp.salesman.bank_no) bank_name,
                   (SELECT count(*) FROM erp.salesman t WHERE t.parent_code = erp.salesman.code) team_count,
                   (SELECT count(*) FROM erp.salesman_customer sc WHERE sc.rep_code = erp.salesman.code) customer_count,
                   ${AUDIT_SQL}
            FROM erp.salesman`,
  searchCols: ["code", "name_ar", "name_en", "parent_code"],
  orderBy: "lpad(code, 15, '0')",
  fields: SALESMAN_FIELDS,
  async validate(db, mode, v, before, user) {
    const code = s(v.code);
    /* REPRS_CODE يُولَّد في أونيكس بـ MAX(TO_NUMBER)+1 ⇒ أرقام فقط */
    if (!/^[0-9]{1,15}$/.test(code)) throw onyxError(4724);
    /* SR-R1 — التصنيف من SMAN_SP_TYP */
    const cls = n(v.classification);
    if (cls == null || ![0, 1, 2, 3].includes(cls)) throw onyxError(4048);
    /* SR-R2 — المشرف مندوب موجود، ولا يعود الهرم إلى المندوب نفسه */
    const parent = s(v.parent_code);
    if (parent) {
      if ((await count(db, `SELECT count(*) c FROM erp.salesman WHERE code = $1`, [parent])) === 0) throw onyxError(5003);
      if (await salesmanCycle(db, code, parent)) throw onyxError(5003);
    }
    /* SR-R3 — حساب المندوب حساب حركة، وتحليليه إن طلبه الحساب (4559) */
    const acc = s(v.account_code);
    if (acc) {
      const a = await requirePostingAccount(db, acc);
      const at = s(a.analytic_type);
      if (at && at !== "0") {
        if (!s(v.account_analytic)) throw onyxError(4559);
        v.account_analytic_type = Number(at);
      } else {
        v.account_analytic = null;
        v.account_analytic_type = null;
      }
    } else {
      v.account_analytic = null;
      v.account_analytic_type = null;
    }
    /* SR-R6 — الربط التشغيلي: كل رقم موجود في ترميزه */
    for (const [k, sql] of [
      ["warehouse_code", `SELECT count(*) c FROM erp.warehouse WHERE code = $1`],
      ["return_warehouse_code", `SELECT count(*) c FROM erp.warehouse WHERE code = $1`],
      ["cash_no", `SELECT count(*) c FROM erp.cashbox WHERE no = CAST($1 AS integer)`],
      ["bank_no", `SELECT count(*) c FROM erp.bank WHERE no = CAST($1 AS integer)`],
      ["cost_center", `SELECT count(*) c FROM erp.cost_center WHERE code = $1`],
      ["activity_no", `SELECT count(*) c FROM erp.activity WHERE no = CAST($1 AS bigint)`],
    ] as const) {
      const val = s(v[k]);
      if (val && (await count(db, sql, [val])) === 0) throw onyxError(5093);
    }
    const pj = s(v.project_no);
    if (pj && (await count(db, `SELECT count(*) c FROM erp.project WHERE no = CAST($1 AS bigint)`, [pj])) === 0) {
      throw onyxError(2112);
    }
    /* الموظف من بيانات الموظفين الحيّة (op.1.2.8) — موظف أُضيف في startyx يُقبل */
    const emp = s(v.employee_no);
    if (emp && (await count(db, `SELECT count(*) c FROM erp.employee WHERE code = $1`, [emp])) === 0) throw onyxError(5093);
    /* ترميزات أونيكس غير المبنية بعد في startyx — تُفحص من جداولها المستخرجة */
    for (const [k, table, col] of [
      ["country_no", "CNTRY", "CNTRY_NO"], ["city_no", "CITIES", "CITY_NO"],
      ["region_no", "REGIONS", "R_CODE"], ["route_no", "IAS_ROUTE_MST", "ROUTE_NO"],
      ["tax_calc_method", "GNR_TAX_TYP_CLC_MST", "CLC_TYP_NO"], ["distribution_group", "DTS_GRP_MST", "GRP_CODE"],
      ["rep_type", "IAS_SALESMAN_TYPES", "SMAN_TYPE"],
    ] as const) {
      const val = s(v[k]);
      if (val && !(await inOnyxList(db, table, col, val))) throw onyxError(5093);
    }
    /* الموظف لمندوب واحد (6204 — مطابق للبيانات: 9 موظفين لـ9 مندوبين) */
    if (emp && (await count(db, `SELECT count(*) c FROM erp.salesman WHERE employee_no = $1 AND code <> $2`, [emp, code])) > 0) {
      throw onyxError(6204);
    }
    /* البنك الوسيط لمندوب واحد إلا إن سمح DTS_PARA.ALLOW_CONN_BANK_MULTI_SMAN (☑ عند بتروسبيشل: 501 لخمسة، 502 لثلاثة) */
    const bank = n(v.bank_no);
    if (bank != null && (await onyxParam(db, "DTS_PARA", "ALLOW_CONN_BANK_MULTI_SMAN")) === "0") {
      if ((await count(db, `SELECT count(*) c FROM erp.salesman WHERE bank_no = $1 AND code <> $2`, [bank, code])) > 0) {
        throw onyxError(5210);
      }
    }
    /* القوائم الثابتة (S_FLAGS) */
    for (const [k, allowed] of [
      ["g_status", [0, 1]], ["g_type", [1, 2, 3, 4, 5, 6, 7, 8, 9]], ["cheque_post_type", [0, 1, 2, 3]],
      ["visit_open_type", [1, 2, 3, 4, 5]],
    ] as const) {
      const x = n(v[k]);
      if (x != null && !(allowed as readonly number[]).includes(x)) throw onyxError(5093);
    }
    /* SR-R4 — نسبة العمولة (GO §٣: 0–100) — لا رسالة أونيكس لها */
    const pct = n(v.commission_pct);
    if (pct != null && (pct < 0 || pct > 100)) throw new DomainError("SR-R4", "نسبة العمولة يجب أن تكون بين 0 و100");
    for (const k of ["credit_limit", "g_amount", "cash_cumulative_limit", "cash_daily_limit"]) {
      const x = n(v[k]);
      if (x != null && x < 0) throw onyxError(7438);
    }
    /* ضمانة واحدة: النهاية ≥ البداية (GO §٣ «قيد سلامة») */
    const gs = s(v.g_start_date);
    const ge = s(v.g_expire_date);
    if (gs && ge && ge < gs) throw onyxError(3434);
    /* SR-R11 — التوقيف يسجّل الموقِف وتاريخه */
    stampInactive(v, before, user);
    void mode;
  },
  async warnings(db, saved) {
    /* SR-R6 [مستنتج — CHECK_SMAN_SEQ في ARSI004]: المخزن/الصندوق لمندوب واحد في كل بيانات أونيكس — مشاركته تنبيه لا منع */
    const out: string[] = [];
    const code = s(saved.code);
    for (const [col, label] of [["warehouse_code", "المخزن"], ["cash_no", "الصندوق"]] as const) {
      const val = s(saved[col]);
      if (!val) continue;
      const r = await db.query(`SELECT code, name_ar FROM erp.salesman WHERE CAST(${col} AS text) = $1 AND code <> $2`, [val, code]);
      for (const x of r.rows) out.push(`${label} ${val} مربوط أيضاً بالمندوب ${s(x.code)} ${s(x.name_ar)}`);
    }
    return out;
  },
  async guardDelete(db, before) {
    const code = s(before.code);
    if ((await count(db, `SELECT count(*) c FROM erp.salesman WHERE parent_code = $1`, [code])) > 0) throw onyxError(4050);
    const doc = await salesmanMovement(db, code);
    if (doc) throw onyxError(3618, doc);
  },
  async cascade(db, before) {
    const code = s(before.code);
    for (const t of ["erp.salesman_customer", "erp.salesman_user", "erp.salesman_location"]) {
      await db.query(`DELETE FROM ${t} WHERE rep_code = $1`, [code]);
    }
  },
};

async function requireSalesman(db: Db, code: string): Promise<void> {
  if ((await count(db, `SELECT count(*) c FROM erp.salesman WHERE code = $1`, [code])) === 0) throw onyxError(5003);
}

/* تبويب ٤ — ربط العملاء بالمندوبين · IAS_CST_SMAN (SR-R8) */
const salesmanCustomer: EntityDef = {
  table: "erp.salesman_customer",
  screen: "op.7.1.2.4",
  listSql: `SELECT rep_code, customer_code, visit_day1, visit_day2, visit_day3, visit_day4, visit_day5, visit_day6, visit_day7,
                   is_default, inactive, to_char(inactive_date,'YYYY-MM-DD') inactive_date, inactive_by, inactive_reason,
                   (SELECT c.name_ar FROM erp.customer c WHERE c.code = erp.salesman_customer.customer_code) customer_name,
                   (SELECT string_agg(o.rep_code, ' · ' ORDER BY o.rep_code) FROM erp.salesman_customer o
                     WHERE o.customer_code = erp.salesman_customer.customer_code
                       AND o.rep_code <> erp.salesman_customer.rep_code) other_reps,
                   ${AUDIT_SQL}
            FROM erp.salesman_customer`,
  searchCols: ["customer_code", "rep_code"],
  keyCols: ["rep_code", "customer_code"],
  orderBy: "rep_code, customer_code",
  listLimit: 5000,
  fields: {
    rep_code: { col: "rep_code", kind: "text", required: true, key: true },
    customer_code: { col: "customer_code", kind: "text", required: true },
    visit_day1: { col: "visit_day1", kind: "bool" },
    visit_day2: { col: "visit_day2", kind: "bool" },
    visit_day3: { col: "visit_day3", kind: "bool" },
    visit_day4: { col: "visit_day4", kind: "bool" },
    visit_day5: { col: "visit_day5", kind: "bool" },
    visit_day6: { col: "visit_day6", kind: "bool" },
    visit_day7: { col: "visit_day7", kind: "bool" },
    is_default: { col: "is_default", kind: "bool" },
    inactive: { col: "inactive", kind: "bool" },
    inactive_date: { col: "inactive_date", kind: "date" },
    inactive_by: { col: "inactive_by", kind: "text" },
    inactive_reason: { col: "inactive_reason", kind: "text" },
  },
  async validate(db, mode, v, before, user) {
    await requireSalesman(db, s(v.rep_code));
    const cust = s(v.customer_code);
    if (mode === "add") {
      /* ARSI004: SELECT 1 FROM CUSTOMER WHERE C_CODE = … — العميل موجود */
      if ((await count(db, `SELECT count(*) c FROM erp.customer WHERE code = $1`, [cust])) === 0) throw onyxError(5093);
      /* SR-R8 — العميل عند أكثر من مندوب فقط إن سمح CONN_CST_MULTI_SMAN (☑ عند بتروسبيشل) */
      if ((await onyxParam(db, "IAS_PARA_AR", "CONN_CST_MULTI_SMAN")) === "0") {
        const other = await count(db, `SELECT count(*) c FROM erp.salesman_customer WHERE customer_code = $1 AND rep_code <> $2`, [
          cust, s(v.rep_code),
        ]);
        if (other > 0) throw onyxError(2143);
      }
    }
    stampInactive(v, before, user);
  },
  async guardDelete() {
    /* أونيكس يحذف الربط بلا فحص حركة (DELETE FROM IAS_CST_SMAN) */
  },
};

/* تبويب ٦ — الصلاحيات · IAS_PRIV_SMAN (SR-R10: إضافة = يستخدمه في العمليات · عرض = تقاريره) */
const salesmanUser: EntityDef = {
  table: "erp.salesman_user",
  screen: "op.7.1.2.4",
  listSql: `SELECT rep_code, user_id, can_add, can_view, ${AUDIT_SQL} FROM erp.salesman_user`,
  searchCols: ["CAST(user_id AS text)"],
  keyCols: ["rep_code", "user_id"],
  orderBy: "rep_code, user_id",
  fields: {
    rep_code: { col: "rep_code", kind: "text", required: true, key: true },
    user_id: { col: "user_id", kind: "int", required: true },
    can_add: { col: "can_add", kind: "bool" },
    can_view: { col: "can_view", kind: "bool" },
  },
  async validate(db, _mode, v) {
    await requireSalesman(db, s(v.rep_code));
    if (!(await inOnyxList(db, "USER_R", "U_ID", s(v.user_id)))) throw onyxError(4145);
  },
  async guardDelete() {},
};

/* تبويب ٥ — المواقع الجغرافية · ARS_LOCTN_GEO_SMAN — CHK_LOCTN_PRC يفحص الرقم في جدول نوعه */
const LOCATION_TABLES: Record<number, [string, string]> = {
  1: ["CNTRY", "CNTRY_NO"], 2: ["IAS_PROVINCES", "PROV_NO"], 3: ["CITIES", "CITY_NO"], 4: ["REGIONS", "R_CODE"],
  5: ["IAS_ROUTE_MST", "ROUTE_NO"],
};
const salesmanLocation: EntityDef = {
  table: "erp.salesman_location",
  screen: "op.7.1.2.4",
  listSql: `SELECT rep_code, loc_type, code_no, ${AUDIT_SQL} FROM erp.salesman_location`,
  searchCols: ["CAST(code_no AS text)"],
  keyCols: ["rep_code", "loc_type", "code_no"],
  orderBy: "rep_code, loc_type, code_no",
  fields: {
    rep_code: { col: "rep_code", kind: "text", required: true, key: true },
    loc_type: { col: "loc_type", kind: "int", required: true },
    code_no: { col: "code_no", kind: "int", required: true },
  },
  async validate(db, _mode, v) {
    await requireSalesman(db, s(v.rep_code));
    const t = LOCATION_TABLES[n(v.loc_type) ?? -1];
    if (!t) throw onyxError(5093);
    if (!(await inOnyxList(db, t[0], t[1], s(v.code_no)))) throw onyxError(5093);
  },
  async guardDelete() {},
};

/* تبويب ٧ — العمليات (استعلام) · عرض أونيكس IAS_V_SM_MOVE — قراءة فقط */
const salesmanOperation: EntityDef = {
  table: "erp.salesman_operation",
  screen: "op.7.1.2.4",
  listSql: `SELECT rep_code, op_kind, op_kind_name, doc_no, doc_type_name, to_char(doc_date,'YYYY-MM-DD') doc_date,
                   customer_code, customer_name, currency, trim_scale(round(amount, 2))::text amount,
                   trim_scale(round(commission, 2))::text commission
            FROM erp.salesman_operation`,
  searchCols: ["doc_no", "customer_code", "customer_name"],
  keyCols: ["rep_code", "op_kind", "doc_no"],
  orderBy: "doc_date DESC, op_kind, doc_no",
  listLimit: 5000,
  noAdd: true,
  noDelete: true,
  fields: {
    rep_code: { col: "rep_code", kind: "text", key: true },
    op_kind: { col: "op_kind", kind: "int" },
    doc_no: { col: "doc_no", kind: "text" },
  },
  async validate() {
    throw onyxError(4053);
  },
  async guardDelete() {
    throw onyxError(4053);
  },
};

export const LAYER2: Record<string, EntityDef> = {
  salesman,
  salesman_customer: salesmanCustomer,
  salesman_user: salesmanUser,
  salesman_location: salesmanLocation,
  salesman_operation: salesmanOperation,
  item_price: itemPrice,
  item_price_audit: itemPriceAudit,
  cashbox,
  cashbox_currency: treasuryCurrency(CASH, "op.4.1.2.2"),
  bank,
  bank_currency: treasuryCurrency(BANK, "op.4.1.2.3"),
  warehouse,
  item,
  item_unit: itemUnit,
  item_vendor: itemVendor,
  kit_component: kitComponent,
  item_ref_code: itemRefCode,
  item_warehouse: itemWarehouse,
};

export type { Values };

/* مشتركة مع بقية الطبقة ٢ (`masters-layer2b.ts`: العملاء · الموردون · الموظفون) */
export { extractHas, loadedOnce, inOnyxList, onyxParam, stampInactive, today };
