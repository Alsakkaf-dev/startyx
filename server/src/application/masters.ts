import type { Db } from "../infrastructure/db.ts";
import { DomainError } from "../shared-kernel/errors.ts";
import {
  ACTIVE_SCOPE, ONYX_MSG, onyxError, s, n, b, count, accountMoved,
  type EntityDef, type FieldDef, type MasterEntity, type Row, type Values,
} from "./master-kit.ts";
import { LAYER1 } from "./masters-layer1.ts";

/**
 * البيانات الأساسية — الطبقة ٠ (GO/01-system-setup.md) + الطبقة ١ (masters-layer1.ts).
 * العدّة المشتركة (رسائل أونيكس · الأنواع · المساعدات) في `master-kit.ts`.
 */
export { ACTIVE_SCOPE, ONYX_MSG, onyxError };
export type { MasterEntity, Row, Values };

/* ═══════════ الحركة الفعلية (هل للسجل أثر في الدفاتر؟) ═══════════ */

async function branchMovement(db: Db, no: number): Promise<number> {
  const live = await count(db, `SELECT count(*) c FROM erp.gl_entry WHERE branch_id = $1`, [no]);
  const open = await count(db, `SELECT count(*) c FROM erp.opening_balance_line WHERE branch_id = $1`, [no]);
  return live + open;
}

async function stockMovement(db: Db): Promise<number> {
  return await count(db, `SELECT count(*) c FROM erp.item_cost`);
}

/**
 * حركة بُعد تحليلي: سطور 2026 المرحّلة في أونيكس (`IAS_POST_DTL`).
 * إن غاب جدول المستخرج **بعد** أن جرى تحميل فعلي، لا يمكن إثبات خلوّ السجل من الحركة ⇒
 * يُعامَل كأنّ له حركة (منع الحذف) بدل السماح صامتاً وفقد بُعد مستخدَم.
 */
async function dimensionMovement(db: Db, col: "CC_CODE" | "PJ_NO" | "ACTV_NO", value: string): Promise<number> {
  const exists = await count(
    db,
    `SELECT count(*) c FROM information_schema.tables WHERE table_schema = 'extract' AND table_name = 'IAS_POST_DTL'`,
  );
  if (!exists) return (await count(db, `SELECT count(*) c FROM erp.extract_load_log`)) > 0 ? 1 : 0;
  return await count(db, `SELECT count(*) c FROM extract."IAS_POST_DTL" WHERE "${col}" = $1`, [value]);
}

/* ═══════════ تعريف الكيانات ═══════════ */

const ENTITIES: Record<MasterEntity, EntityDef> = {
  /* op.1.1.3 — تهيئة العملات · EX_RATE */
  currency: {
    table: "erp.currency",
    screen: "op.1.1.3",
    listSql: `SELECT no, code, iso_code, name_ar, name_en, fraction_ar, fraction_en, is_local, is_stock_currency,
                     rate::text rate, rate_min::text rate_min, rate_max::text rate_max, operator, decimals, inactive,
                     created_by, to_char(created_at,'DD/MM/YYYY HH24:MI:SS') created_at,
                     updated_by, to_char(updated_at,'DD/MM/YYYY HH24:MI:SS') updated_at, update_count
              FROM erp.currency`,
    searchCols: ["code", "iso_code", "name_ar", "CAST(no AS text)"],
    fields: {
      no: { col: "no", kind: "int", required: true, key: true },
      code: { col: "code", kind: "text", required: true },
      iso_code: { col: "iso_code", kind: "text", required: true },
      name_ar: { col: "name_ar", kind: "text", required: true },
      name_en: { col: "name_en", kind: "text" },
      fraction_ar: { col: "fraction_ar", kind: "text" },
      fraction_en: { col: "fraction_en", kind: "text" },
      is_local: { col: "is_local", kind: "bool" },
      is_stock_currency: { col: "is_stock_currency", kind: "bool" },
      rate: { col: "rate", kind: "num", required: true },
      rate_min: { col: "rate_min", kind: "num" },
      rate_max: { col: "rate_max", kind: "num" },
      operator: { col: "operator", kind: "text" },
      decimals: { col: "decimals", kind: "int" },
      inactive: { col: "inactive", kind: "bool" },
    },
    async validate(db, mode, v, before) {
      const min = n(v.rate_min);
      const max = n(v.rate_max);
      const rate = n(v.rate);
      /* رمز العملة لا يتكرر — نفس معنى ONYX-2143 المطبَّق على رقم العملة */
      const dupCode = await count(
        db,
        `SELECT count(*) c FROM erp.currency WHERE code = $1 AND no <> $2`,
        [s(v.code), n(v.no) ?? -1],
      );
      if (dupCode > 0) throw onyxError(2143);
      /* سعر تحويل صفري أو سالب يكسر كل تحويل عملة لاحق [مستنتج — نص أونيكس 7438 الأصلي] */
      if (rate != null && rate <= 0) throw onyxError(7438);
      if (min != null && max != null && min > max) throw onyxError(4244);
      if (rate != null && min != null && rate < min) throw onyxError(4242);
      if (rate != null && max != null && rate > max) throw onyxError(4243);
      if (b(v.is_local)) {
        const others = await count(
          db,
          `SELECT count(*) c FROM erp.currency WHERE is_local = true AND no <> $1`,
          [n(v.no) ?? -1],
        );
        if (others > 0) throw onyxError(3620); /* SY-R12 */
      }
      /* SY-R12 — عملة المخزون لا تتغيّر بعد أول حركة مخزون */
      if (mode === "edit" && before && b(before.is_stock_currency) !== b(v.is_stock_currency)) {
        if ((await stockMovement(db)) > 0) throw onyxError(5119);
      }
    },
    async guardDelete(db, before) {
      if (b(before.is_local)) throw onyxError(3618, "العملة المحلية");
      if (b(before.is_stock_currency) && (await stockMovement(db)) > 0) throw onyxError(3618, "حركة المخزون");
    },
  },

  /* op.1.2.3 — الدليل المحاسبي · ACCOUNT */
  account: {
    table: "erp.account",
    screen: "op.1.2.3",
    listSql: `SELECT code, name_ar, name_en, a_level, parent_code, kind, nature, report_type,
                     analytic_type, use_cc, use_pj, use_actv, inactive, inactive_reason,
                     created_by, to_char(created_at,'DD/MM/YYYY HH24:MI:SS') created_at,
                     updated_by, to_char(updated_at,'DD/MM/YYYY HH24:MI:SS') updated_at, update_count
              FROM erp.account`,
    searchCols: ["code", "name_ar"],
    fields: {
      code: { col: "code", kind: "text", required: true, key: true },
      name_ar: { col: "name_ar", kind: "text", required: true },
      name_en: { col: "name_en", kind: "text" },
      parent_code: { col: "parent_code", kind: "text" },
      a_level: { col: "a_level", kind: "int" },
      kind: { col: "kind", kind: "text", required: true },
      /* SY-R26 — يورَّثان من الأب، فلا يُطلبان عند وجود أب */
      nature: { col: "nature", kind: "text", required: true, inheritedWhen: "parent_code" },
      report_type: { col: "report_type", kind: "text", required: true, inheritedWhen: "parent_code" },
      analytic_type: { col: "analytic_type", kind: "text" },
      use_cc: { col: "use_cc", kind: "int" },
      use_pj: { col: "use_pj", kind: "int" },
      use_actv: { col: "use_actv", kind: "int" },
      inactive: { col: "inactive", kind: "bool" },
      inactive_reason: { col: "inactive_reason", kind: "text" },
    },
    async validate(db, mode, v, before) {
      const code = s(v.code);
      const parent = s(v.parent_code);
      const LEVEL_LEN = [1, 2, 4, 6, 10]; /* SY-R25 — 1 · 2 · 4 · 6 · 10 خانة */
      const level = LEVEL_LEN.indexOf(code.length) + 1;
      if (level <= 0) throw onyxError(6039);
      v.a_level = level; /* SY-R25 — المستوى آلي من طول الرقم */
      if (parent && parent !== "0") {
        const p = (await db.query(`SELECT code, a_level, kind, nature, report_type FROM erp.account WHERE code = $1`, [parent])).rows[0];
        if (!p) throw onyxError(4048);
        if (level !== Number(p.a_level ?? 0) + 1) throw onyxError(6039); /* رتبة الأب */
        if (!code.startsWith(parent)) throw onyxError(6039);
        if (s(p.kind) === "posting") throw onyxError(6039); /* SY-R27 — لا أبناء لحساب حركة */
        /* SY-R26 — الطبيعة ونوع التقرير يورَّثان من الأب لا يُدخَلان */
        v.nature = s(p.nature);
        v.report_type = s(p.report_type);
      } else if (level !== 1) {
        throw onyxError(6039);
      }
      const children = mode === "edit" ? await count(db, `SELECT count(*) c FROM erp.account WHERE parent_code = $1`, [code]) : 0;
      if (children > 0 && s(v.kind) !== "header") throw onyxError(6039); /* SY-R27 — الحركة على الفرعي فقط */
      if (mode === "edit" && before) {
        const moved = await accountMoved(db, code);
        if (moved > 0) {
          /* SY-R30 + SY-R26 — ما له حركة لا تتغيّر بنيته */
          if (s(before.parent_code) !== parent) throw onyxError(5798);
          if (s(before.nature) !== s(v.nature)) throw onyxError(5798);
          if (s(before.kind) !== s(v.kind)) throw onyxError(5798);
          if (s(before.report_type) !== s(v.report_type)) throw onyxError(5798);
        }
      }
    },
    async guardDelete(db, before) {
      const code = s(before.code);
      const children = await count(db, `SELECT count(*) c FROM erp.account WHERE parent_code = $1`, [code]);
      if (children > 0) throw onyxError(4050); /* SY-R30 */
      /* GL-R44 — حذف حساب مربوط بنشاط كان يترك سطر ربط يتيم في IAS_ACCOUNT_ACTV */
      const links = await count(db, `SELECT count(*) c FROM erp.account_activity WHERE account_code = $1`, [code]);
      if (links > 0) throw onyxError(3618, "نشاط");
      if ((await accountMoved(db, code)) > 0) throw onyxError(3618, "حركة مالية");
    },
  },

  /* op.1.1.12 — بيانات الفروع · S_BRN */
  branch: {
    table: "erp.branch",
    screen: "op.1.1.12",
    listSql: `SELECT no, company_id, name_ar, name_en, code, start_year, seq_no, is_main, vat_no, cr_no,
                     city, district, street, building_no, postal_code, einvoice_enabled, inactive,
                     created_by, to_char(created_at,'DD/MM/YYYY HH24:MI:SS') created_at,
                     updated_by, to_char(updated_at,'DD/MM/YYYY HH24:MI:SS') updated_at, update_count
              FROM erp.branch`,
    searchCols: ["name_ar", "code", "CAST(no AS text)"],
    fields: {
      no: { col: "no", kind: "int", required: true, key: true },
      company_id: { col: "company_id", kind: "int", required: true },
      name_ar: { col: "name_ar", kind: "text", required: true },
      name_en: { col: "name_en", kind: "text" },
      code: { col: "code", kind: "text" },
      start_year: { col: "start_year", kind: "int" },
      seq_no: { col: "seq_no", kind: "int" },
      is_main: { col: "is_main", kind: "bool" },
      vat_no: { col: "vat_no", kind: "text" },
      cr_no: { col: "cr_no", kind: "text" },
      city: { col: "city", kind: "text" },
      district: { col: "district", kind: "text" },
      street: { col: "street", kind: "text" },
      building_no: { col: "building_no", kind: "text" },
      postal_code: { col: "postal_code", kind: "text" },
      einvoice_enabled: { col: "einvoice_enabled", kind: "bool" },
      inactive: { col: "inactive", kind: "bool" },
    },
    async validate(db, mode, v, before) {
      const no = n(v.no) ?? 0;
      if (b(v.einvoice_enabled)) {
        /* SY-R23 — العنوان الوطني والرقم الضريبي شرط إصدار الفاتورة الإلكترونية */
        if (!s(v.vat_no)) throw onyxError(6272);
        if (!s(v.building_no) || !s(v.street) || !s(v.district) || !s(v.city) || !s(v.postal_code)) throw onyxError(4048);
      }
      /* SY-R22 — تسلسل الفرع جزء من رقم الفاتورة الإلكترونية ولا يُعدَّل بعد حركة */
      if (mode === "edit" && before && n(before.seq_no) !== n(v.seq_no)) {
        if ((await branchMovement(db, no)) > 0) throw onyxError(5119);
      }
      /* SY-R20 — الفرع يتبع شركة واحدة */
      if (mode === "edit" && before && n(before.company_id) !== n(v.company_id)) {
        if ((await branchMovement(db, no)) > 0) throw onyxError(5119);
      }
    },
    async guardDelete(db, before) {
      if ((await branchMovement(db, n(before.no) ?? 0)) > 0) throw onyxError(4921);
    },
  },

  /* op.1.1.2 — إعداد فترات النظام · S_PRD_DTL */
  fiscal_period: {
    table: "erp.fiscal_period",
    screen: "op.1.1.2",
    listSql: `SELECT no, name_ar, name_en, to_char(from_date,'YYYY-MM-DD') from_date, to_char(to_date,'YYYY-MM-DD') to_date,
                     fiscal_year_id, status, inactive, vat_period,
                     created_by, to_char(created_at,'DD/MM/YYYY HH24:MI:SS') created_at,
                     updated_by, to_char(updated_at,'DD/MM/YYYY HH24:MI:SS') updated_at, update_count
              FROM erp.fiscal_period`,
    searchCols: ["name_ar", "CAST(no AS text)"],
    scope: ACTIVE_SCOPE,
    fields: {
      no: { col: "no", kind: "int", required: true, key: true },
      name_ar: { col: "name_ar", kind: "text", required: true },
      name_en: { col: "name_en", kind: "text" },
      from_date: { col: "from_date", kind: "date", required: true },
      to_date: { col: "to_date", kind: "date", required: true },
      fiscal_year_id: { col: "fiscal_year_id", kind: "int" },
      status: { col: "status", kind: "text" },
      vat_period: { col: "vat_period", kind: "int" },
      inactive: { col: "inactive", kind: "bool" },
    },
    async validate(db, mode, v, before) {
      const from = s(v.from_date);
      const to = s(v.to_date);
      if (!from || !to || from > to) throw onyxError(4048);
      /* SY-R8 — الشهرية: كل فترة شهر ميلادي كامل */
      const fd = new Date(from + "T00:00:00Z");
      const td = new Date(to + "T00:00:00Z");
      const lastDay = new Date(Date.UTC(td.getUTCFullYear(), td.getUTCMonth() + 1, 0)).getUTCDate();
      if (fd.getUTCDate() !== 1 || td.getUTCDate() !== lastDay) throw onyxError(3462);
      const overlap = await count(
        db,
        `SELECT count(*) c FROM erp.fiscal_period
         WHERE no <> $1 AND company_id = $5 AND fiscal_year_id = $2 AND from_date <= $4::date AND to_date >= $3::date`,
        [n(v.no) ?? -1, ACTIVE_SCOPE.fiscal_year_id, from, to, ACTIVE_SCOPE.company_id],
      );
      if (overlap > 0) throw onyxError(3462);
      /* SY-R9 — الفترة المقفلة لا تُعدَّل (الإقفال من op.2.4.x لا من هنا) */
      if (mode === "edit" && before && s(before.status) === "closed") throw onyxError(3478);
    },
    async guardDelete(db, before) {
      if (s(before.status) === "closed") throw onyxError(3478);
      const used = await count(
        db,
        `SELECT count(*) c FROM erp.gl_entry WHERE date BETWEEN
           (SELECT from_date FROM erp.fiscal_period WHERE no = $1 AND fiscal_year_id = $2 AND company_id = $3)
           AND (SELECT to_date FROM erp.fiscal_period WHERE no = $1 AND fiscal_year_id = $2 AND company_id = $3)`,
        [n(before.no) ?? -1, ACTIVE_SCOPE.fiscal_year_id, ACTIVE_SCOPE.company_id],
      );
      if (used > 0) throw onyxError(3618, "قيود مرحّلة");
    },
  },
};

/* op.1.2.5 — مراكز التكلفة · COST_CENTERS */
ENTITIES.cost_center = {
  table: "erp.cost_center",
  screen: "op.1.2.5",
  listSql: `SELECT no, code, name_ar, name_en, parent_code, level, kind, sequence_no, group_no, project_use,
                   inactive, inactive_sales, inactive_reason,
                   created_by, to_char(created_at,'DD/MM/YYYY HH24:MI:SS') created_at,
                   updated_by, to_char(updated_at,'DD/MM/YYYY HH24:MI:SS') updated_at, update_count
            FROM erp.cost_center`,
  searchCols: ["code", "name_ar", "CAST(no AS text)"],
  fields: {
    no: { col: "no", kind: "int", required: true },
    code: { col: "code", kind: "text", required: true, key: true },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    parent_code: { col: "parent_code", kind: "text" },
    level: { col: "level", kind: "int" },
    kind: { col: "kind", kind: "text", required: true },
    sequence_no: { col: "sequence_no", kind: "int" },
    group_no: { col: "group_no", kind: "int" },
    project_use: { col: "project_use", kind: "int" },
    inactive: { col: "inactive", kind: "bool" },
    inactive_sales: { col: "inactive_sales", kind: "bool" },
    inactive_reason: { col: "inactive_reason", kind: "text" },
  },
  async validate(db, mode, v, before) {
    const code = s(v.code);
    const parent = s(v.parent_code);
    if (mode === "add" && (await count(db, `SELECT count(*) c FROM erp.cost_center WHERE no = $1`, [n(v.no) ?? -1])) > 0) {
      throw onyxError(2143);
    }
    if (parent && parent !== "0") {
      const p = (await db.query(`SELECT code, level, kind FROM erp.cost_center WHERE code = $1`, [parent])).rows[0];
      if (!p) throw onyxError(4048);
      if (!code.startsWith(parent) || code === parent) throw onyxError(6039); /* SY-R41 — الرمز من الأب */
      if (s(p.kind) !== "main") throw onyxError(6039); /* SY-R38 — لا أبناء لمركز حركة */
      v.level = Number(p.level ?? 1) + 1;
    } else {
      v.level = 1;
    }
    const children = await count(db, `SELECT count(*) c FROM erp.cost_center WHERE parent_code = $1`, [code]);
    if (children > 0 && s(v.kind) !== "main") throw onyxError(6039);
    /* SY-R40 — ما له حركة لا يتغيّر موضعه في الشجرة */
    if (mode === "edit" && before && s(before.parent_code) !== parent) {
      if ((await dimensionMovement(db, "CC_CODE", s(before.code))) > 0) throw onyxError(5119);
    }
  },
  async guardDelete(db, before) {
    const code = s(before.code);
    const children = await count(db, `SELECT count(*) c FROM erp.cost_center WHERE parent_code = $1`, [code]);
    if (children > 0) throw onyxError(4050); /* SY-R40 */
    if ((await dimensionMovement(db, "CC_CODE", code)) > 0) throw onyxError(3618, "حركة مالية");
  },
};

/* op.1.2.6 — بيانات المشاريع · IAS_PROJECTS */
ENTITIES.project = {
  table: "erp.project",
  screen: "op.1.2.6",
  listSql: `SELECT no, code, name_ar, name_en, parent_no, level, is_sub, sequence_no, group_no, activity_use,
                   inactive, inactive_reason,
                   created_by, to_char(created_at,'DD/MM/YYYY HH24:MI:SS') created_at,
                   updated_by, to_char(updated_at,'DD/MM/YYYY HH24:MI:SS') updated_at, update_count
            FROM erp.project`,
  searchCols: ["name_ar", "CAST(no AS text)"],
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    code: { col: "code", kind: "text" },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    parent_no: { col: "parent_no", kind: "int" },
    level: { col: "level", kind: "int" },
    is_sub: { col: "is_sub", kind: "bool" },
    sequence_no: { col: "sequence_no", kind: "int" },
    group_no: { col: "group_no", kind: "int" },
    activity_use: { col: "activity_use", kind: "int" },
    inactive: { col: "inactive", kind: "bool" },
    inactive_reason: { col: "inactive_reason", kind: "text" },
  },
  async validate(db, mode, v, before) {
    const no = s(v.no);
    const parent = s(v.parent_no);
    if (parent && parent !== "0") {
      const p = (await db.query(`SELECT no, level FROM erp.project WHERE no = $1`, [n(v.parent_no) ?? -1])).rows[0];
      if (!p) throw onyxError(4048);
      if (!no.startsWith(parent) || no === parent) throw onyxError(6039); /* SY-R43 — الرقم من الأب */
      v.level = Number(p.level ?? 1) + 1;
    } else {
      v.level = 1;
    }
    const children = await count(db, `SELECT count(*) c FROM erp.project WHERE parent_no = $1`, [n(v.no) ?? -1]);
    if (children > 0 && b(v.is_sub)) throw onyxError(6039); /* SY-R43 — الأب ليس مشروع حركة */
    if (mode === "edit" && before && s(before.parent_no) !== parent) {
      if ((await dimensionMovement(db, "PJ_NO", s(before.no))) > 0) throw onyxError(5119);
    }
  },
  async guardDelete(db, before) {
    const no = s(before.no);
    const children = await count(db, `SELECT count(*) c FROM erp.project WHERE parent_no = $1`, [n(before.no) ?? -1]);
    if (children > 0) throw onyxError(4050); /* SY-R44 */
    if ((await dimensionMovement(db, "PJ_NO", no)) > 0) throw onyxError(3618, "حركة مالية");
  },
};

/* مرجع الأنشطة (فارغ في بتروسبيشل) — تقرأه شاشة الربط */
ENTITIES.activity = {
  table: "erp.activity",
  screen: "op.4.1.2.9",
  listSql: `SELECT no, code, name_ar, name_en, parent_no, level, is_sub, group_no, project_no, cost_account, inactive,
                   created_by, to_char(created_at,'DD/MM/YYYY HH24:MI:SS') created_at,
                   updated_by, to_char(updated_at,'DD/MM/YYYY HH24:MI:SS') updated_at, update_count
            FROM erp.activity`,
  searchCols: ["name_ar", "CAST(no AS text)"],
  fields: {
    no: { col: "no", kind: "int", required: true, key: true },
    code: { col: "code", kind: "text" },
    name_ar: { col: "name_ar", kind: "text", required: true },
    name_en: { col: "name_en", kind: "text" },
    parent_no: { col: "parent_no", kind: "int" },
    level: { col: "level", kind: "int" },
    is_sub: { col: "is_sub", kind: "bool" },
    group_no: { col: "group_no", kind: "int" },
    project_no: { col: "project_no", kind: "int" },
    cost_account: { col: "cost_account", kind: "text" },
    inactive: { col: "inactive", kind: "bool" },
  },
  async validate(db, _mode, v) {
    const parent = s(v.parent_no);
    if (parent && parent !== "0") {
      const p = (await db.query(`SELECT no, level FROM erp.activity WHERE no = $1`, [n(v.parent_no) ?? -1])).rows[0];
      if (!p) throw onyxError(4048);
      v.level = Number(p.level ?? 1) + 1;
    } else {
      v.level = 1;
    }
  },
  async guardDelete(db, before) {
    const links = await count(db, `SELECT count(*) c FROM erp.account_activity WHERE activity_no = $1`, [n(before.no) ?? -1]);
    if (links > 0) throw onyxError(3618, "حسابات مربوطة");
    if ((await dimensionMovement(db, "ACTV_NO", s(before.no))) > 0) throw onyxError(3618, "حركة مالية");
  },
};

/* op.4.1.2.9 — ربط الحسابات بالأنشطة · IAS_ACCOUNT_ACTV (مفتاح مركّب) */
ENTITIES.account_activity = {
  table: "erp.account_activity",
  screen: "op.4.1.2.9",
  listSql: `SELECT account_code, activity_no,
                   created_by, to_char(created_at,'DD/MM/YYYY HH24:MI:SS') created_at,
                   updated_by, to_char(updated_at,'DD/MM/YYYY HH24:MI:SS') updated_at, update_count
            FROM erp.account_activity`,
  searchCols: ["account_code", "CAST(activity_no AS text)"],
  keyCols: ["account_code", "activity_no"],
  fields: {
    account_code: { col: "account_code", kind: "text", required: true, key: true },
    activity_no: { col: "activity_no", kind: "int", required: true },
  },
  async validate(db, _mode, v) {
    const acc = (await db.query(`SELECT code, kind FROM erp.account WHERE code = $1`, [s(v.account_code)])).rows[0];
    if (!acc) throw onyxError(4048);
    if (s(acc.kind) !== "posting") throw onyxError(6039); /* GL-R45 — الربط على حسابات الحركة فقط */
    const actv = await count(db, `SELECT count(*) c FROM erp.activity WHERE no = $1`, [n(v.activity_no) ?? -1]);
    if (!actv) throw onyxError(4048);
  },
  async guardDelete() {
    /* GL-R44 — الحذف يرفع الربط فقط ولا يمس النشاط */
  },
};

/* الطبقة ١ — التهيئة (بنود 13–27 في BUILD-ORDER.md) تُسجَّل هنا بنفس المحرّك */
Object.assign(ENTITIES, LAYER1);

export function isEntity(name: string): name is MasterEntity {
  return Object.prototype.hasOwnProperty.call(ENTITIES, name);
}

export function entityOf(name: MasterEntity): EntityDef {
  return ENTITIES[name];
}

/** أعمدة كل كيان كما تظهر في نتيجة القراءة — تُستخدم لفحص تطابق الواجهة مع الخادم. */
export function entityColumns(name: MasterEntity): string[] {
  const def = ENTITIES[name];
  const fields = Object.values(def.fields).map((f) => f.col);
  const listed = (def.listSql.match(/[a-z_]+(?=,|\s*FROM)/g) ?? []).filter((c) => c !== "FROM");
  return Array.from(new Set([...fields, ...listed, "created_by", "created_at", "updated_by", "updated_at", "update_count"]));
}

export function entityNames(): MasterEntity[] {
  return Object.keys(ENTITIES) as MasterEntity[];
}

function keyField(def: EntityDef): FieldDef & { name: string } {
  for (const [name, f] of Object.entries(def.fields)) if (f.key) return { ...f, name };
  throw new DomainError("NO_KEY", "entity without key");
}

/** جملة WHERE للمفتاح — عمود واحد، أو مفتاح مركّب يصل من الواجهة كنص «جزء|جزء». مقيَّدة بالنطاق. */
function keyClause(def: EntityDef, key: string, from = 1): { sql: string; params: unknown[] } {
  const cols = def.keyCols ?? [keyField(def).col];
  const parts = def.keyCols ? String(key).split("|") : [key];
  const byCol = new Map(Object.values(def.fields).map((f) => [f.col, f]));
  const sql = cols.map((c, i) => `${c} = $${from + i}`);
  const params: unknown[] = cols.map((c, i) => castValue(byCol.get(c) ?? { col: c, kind: "text" }, parts[i]));
  for (const [c, val] of Object.entries(def.scope ?? {})) {
    sql.push(`${c} = $${from + params.length}`);
    params.push(val);
  }
  return { sql: sql.join(" AND "), params };
}

function keyOf(def: EntityDef, values: Values): string {
  if (def.keyCols) {
    const byCol = new Map(Object.entries(def.fields).map(([name, f]) => [f.col, name]));
    return def.keyCols.map((c) => s(values[byCol.get(c) ?? c])).join("|");
  }
  return s(values[keyField(def).name]);
}

function castValue(f: FieldDef, raw: unknown): unknown {
  switch (f.kind) {
    case "int":
      return n(raw) == null ? null : Math.trunc(n(raw) as number);
    case "num":
      return n(raw) == null ? null : String(n(raw));
    case "bool":
      return b(raw);
    case "date":
      return s(raw) || null;
    case "json":
      return raw == null || s(raw) === "" ? null : typeof raw === "string" ? raw : JSON.stringify(raw);
    default:
      return s(raw) || null;
  }
}

export async function listMasters(
  db: Db,
  name: MasterEntity,
  opts: { q?: string; limit?: number } = {},
): Promise<{ rows: Row[]; total: number }> {
  const def = ENTITIES[name];
  const key = keyField(def);
  const params: unknown[] = [];
  const conds: string[] = [];
  const q = s(opts.q);
  if (q) {
    params.push("%" + q + "%");
    conds.push("(" + def.searchCols.map((c) => `${c} ILIKE $1`).join(" OR ") + ")");
  }
  for (const [c, val] of Object.entries(def.scope ?? {})) {
    params.push(val);
    conds.push(`${c} = $${params.length}`);
  }
  const where = conds.length ? " WHERE " + conds.join(" AND ") : "";
  const total = await count(db, `SELECT count(*) c FROM ${def.table}${where}`, params);
  const limit = Math.min(Math.max(Number(opts.limit ?? 500), 1), 5000);
  const r = await db.query(`${def.listSql}${where} ORDER BY ${def.orderBy ?? key.col} LIMIT ${limit}`, params);
  return { rows: r.rows, total };
}

export async function getMaster(db: Db, name: MasterEntity, key: string): Promise<Row | null> {
  const def = ENTITIES[name];
  const w = keyClause(def, key);
  const r = await db.query(`${def.listSql} WHERE ${w.sql}`, w.params);
  return r.rows[0] ?? null;
}

export async function saveMaster(
  db: Db,
  name: MasterEntity,
  mode: "add" | "edit",
  values: Values,
  user: string,
): Promise<Row> {
  const def = ENTITIES[name];
  const key = keyOf(def, values);
  if (key === "" || key.split("|").some((p) => p === "")) throw onyxError(4048);

  const before = await getMaster(db, name, key);
  /* شاشات الربط لا تُضيف سجلاً بل تعدّل ربطاً على سجل قائم [مساعدة: GENI006] */
  if (mode === "add" && def.noAdd) throw onyxError(3428);
  if (mode === "add" && before) throw onyxError(2143);
  if (mode === "edit" && !before) throw onyxError(3428);

  /**
   * التعديل تحديث جزئي: ما لم تُرسله الواجهة يبقى كما هو في السجل المحفوظ.
   * لذلك تُفحص الحقول الإجبارية وتُقيَّم القواعد على «المحفوظ + المُرسَل» لا على المُرسَل وحده،
   * وإلا رُفض كل تعديل لا يعيد إرسال كل حقل (كان يعطي ONYX-4048 دائماً).
   * أسماء الحقول هنا مطابقة لأسماء الأعمدة في كل الكيانات.
   */
  const payload: Values = mode === "edit" && before ? { ...before, ...values } : { ...values };

  for (const [fname, f] of Object.entries(def.fields)) {
    if (!f.required) continue;
    /* حقل موروث من الأب لا يُطلب إدخاله ما دام الأب محدَّداً (SY-R26) */
    if (f.inheritedWhen) {
      const parent = s(payload[f.inheritedWhen]);
      if (parent !== "" && parent !== "0") continue;
    }
    if (s(payload[fname]) === "") throw onyxError(4048);
  }

  await def.validate(db, mode, payload, before);

  /* يُكتب: ما أرسلته الواجهة + ما اشتقّته القواعد (المستوى · الطبيعة · نوع التقرير) */
  const writeKeys = new Set<string>(mode === "add" ? Object.keys(payload) : Object.keys(values));
  if (mode === "edit" && before) {
    for (const [fname, f] of Object.entries(def.fields)) {
      if (!Object.prototype.hasOwnProperty.call(payload, fname)) continue;
      if (s(payload[fname]) !== s(before[f.col])) writeKeys.add(fname);
    }
  }

  /* أعمدة النطاق لا تُعدَّل من الشاشة — وإلا خرج السجل من نطاقه وضاع */
  if (mode === "edit") for (const c of Object.keys(def.scope ?? {})) writeKeys.delete(c);

  const cols: string[] = [];
  const vals: unknown[] = [];
  for (const [fname, f] of Object.entries(def.fields)) {
    if (!writeKeys.has(fname)) continue;
    cols.push(f.col);
    vals.push(castValue(f, payload[fname]));
  }

  if (mode === "add") {
    for (const [c, val] of Object.entries(def.scope ?? {})) {
      if (cols.includes(c)) vals[cols.indexOf(c)] = val;
      else {
        cols.push(c);
        vals.push(val);
      }
    }
    cols.push("created_by", "created_at");
    vals.push(user, new Date().toISOString());
    const place = vals.map((_, i) => "$" + (i + 1)).join(", ");
    await db.query(`INSERT INTO ${def.table} (${cols.join(", ")}) VALUES (${place})`, vals);
  } else {
    const sets = cols.map((c, i) => `${c} = $${i + 1}`);
    sets.push(`updated_by = $${vals.length + 1}`, `updated_at = $${vals.length + 2}`, "update_count = update_count + 1");
    vals.push(user, new Date().toISOString());
    const w = keyClause(def, key, vals.length + 1);
    await db.query(`UPDATE ${def.table} SET ${sets.join(", ")} WHERE ${w.sql}`, [...vals, ...w.params]);
  }

  const saved = await getMaster(db, name, key);
  if (!saved) throw new DomainError("SAVE_FAILED", "لم يُحفظ السجل");
  return saved;
}

export async function deleteMaster(db: Db, name: MasterEntity, key: string): Promise<{ deleted: string }> {
  const def = ENTITIES[name];
  const before = await getMaster(db, name, key);
  if (!before) throw onyxError(3428);
  if (def.noDelete) throw onyxError(3428);
  await def.guardDelete(db, before);
  const w = keyClause(def, key);
  await db.query(`DELETE FROM ${def.table} WHERE ${w.sql}`, w.params);
  return { deleted: key };
}
