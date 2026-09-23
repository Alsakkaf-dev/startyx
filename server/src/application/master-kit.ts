import type { Db } from "../infrastructure/db.ts";

export { ONYX_MSG, onyxError, type MsgNo } from "../shared-kernel/onyx-messages.ts";
import { onyxError } from "../shared-kernel/onyx-messages.ts";

/**
 * النطاق الفعّال: شركة واحدة وسنة مالية واحدة.
 * `fiscal_period` مفتاحها في القاعدة `(company_id, fiscal_year_id, no)` — بدون تقييدها كان
 * التعديل/الحذف برقم الفترة وحده قد يصيب صف سنة أخرى. لاحقاً يأتي من جلسة المستخدم.
 */
export const ACTIVE_SCOPE = { company_id: 1, fiscal_year_id: 2026 } as const;

export type MasterEntity = string;
export type Values = Record<string, unknown>;
export type Row = Record<string, unknown>;
export type FieldKind = "text" | "int" | "num" | "bool" | "date" | "json";

export interface FieldDef {
  col: string;
  kind: FieldKind;
  required?: boolean;
  key?: boolean;
  /** حقل يورَّث من الأب (SY-R26) ⇒ لا يُطلب إدخاله ما دام هذا الحقل معبّأ */
  inheritedWhen?: string;
}

export interface EntityDef {
  table: string;
  screen: string;
  listSql: string;
  searchCols: string[];
  fields: Record<string, FieldDef>;
  /** مفتاح مركّب (مثل ربط حساب بنشاط) — يُمرَّر من الواجهة كنص «جزء|جزء» */
  keyCols?: string[];
  /** أعمدة تقيّد كل قراءة وكتابة على النطاق الفعّال (شركة/سنة مالية) */
  scope?: Record<string, number | string>;
  /** ترتيب القراءة إن اختلف عن عمود المفتاح */
  orderBy?: string;
  /**
   * شاشات أونيكس التي لا تُضيف ولا تحذف سجلات بل تعدّل ربطاً على سجل قائم
   * (op.1.2.4 «البيانات … غير قابلة للتعديل أو الإضافة» [مساعدة: GENI006]).
   */
  noAdd?: boolean;
  noDelete?: boolean;
  validate(db: Db, mode: "add" | "edit", v: Values, before: Row | null): Promise<void>;
  guardDelete(db: Db, before: Row): Promise<void>;
}

export function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

export function n(v: unknown): number | null {
  const t = s(v).replace(/,/g, "");
  if (t === "") return null;
  const x = Number(t);
  return Number.isFinite(x) ? x : null;
}

export function b(v: unknown): boolean {
  const t = s(v);
  return v === true || t === "1" || t === "true" || t === "نعم" || t === "☑";
}

export async function count(db: Db, sql: string, params: unknown[] = []): Promise<number> {
  const r = await db.query(sql, params);
  return Number(r.rows[0]?.c ?? 0);
}

/** أعمدة التدقيق المشتركة في كل شاشة — تذييل «مدخل السجل» */
export const AUDIT_SQL =
  `created_by, to_char(created_at,'DD/MM/YYYY HH24:MI:SS') created_at,
   updated_by, to_char(updated_at,'DD/MM/YYYY HH24:MI:SS') updated_at, update_count`;

/** الحساب موجود ويقبل الحركة (فرعي/تحليلي) — القيد الذي تفرضه نماذج أونيكس على كل ربط حسابي */
export async function requirePostingAccount(db: Db, code: string): Promise<Row> {
  const acc = (await db.query(`SELECT code, kind, analytic_type, inactive FROM erp.account WHERE code = $1`, [code])).rows[0];
  if (!acc) throw onyxError(497);
  if (s(acc.kind) !== "posting") throw onyxError(497);
  return acc as Row;
}

/** هل على هذا الحساب حركة فعلية (قيود حيّة أو أرصدة افتتاحية)؟ */
export async function accountMoved(db: Db, code: string): Promise<number> {
  const live = await count(db, `SELECT count(*) c FROM erp.gl_entry_line WHERE account_code = $1`, [code]);
  const open = await count(db, `SELECT count(*) c FROM erp.opening_balance_line WHERE account_code = $1`, [code]);
  return live + open;
}
