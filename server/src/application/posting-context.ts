import type { Db } from "../infrastructure/db.ts";
import type { MemoryTx } from "../infrastructure/memory.ts";
import type { PeriodRow } from "../engines/period-and-lock.ts";
import {
  blankAccounts,
  type AnalyticType,
  type GlEntryLine,
  type PostDocumentRequest,
  type PostingAccounts,
  type RawLine,
} from "../engines/posting.ts";
import { DomainError } from "../shared-kernel/errors.ts";
import { onyxError } from "../shared-kernel/onyx-messages.ts";

/**
 * سياق الترحيل من القاعدة — الخدمات ٣ و٥ في BUILD-ORDER:
 * حلّ الحسابات من جداول ربط أونيكس الحقيقية (INV-7/INV-8)، وحارس الفترة من
 * op.1.1.2 نفسها (INV-4)، وفحص كل سطر قيد مقابل الدليل (INV-5 · GL-R37 · SY-R39).
 */

/* ═══════════ الفترات — من erp.fiscal_period لا من جدول ثابت ═══════════ */

export async function loadPeriods(db: Db, tx: MemoryTx): Promise<number> {
  const r = await db.query(
    `SELECT b.no AS branch_no, p.id, p.no, p.fiscal_year_id,
            to_char(p.from_date,'YYYY-MM-DD') f, to_char(p.to_date,'YYYY-MM-DD') t,
            p.status, p.inactive,
            COALESCE(c.inventory_closed,false) inv_closed, COALESCE(c.gl_closed,false) gl_closed
       FROM erp.branch b
       JOIN erp.fiscal_period p ON p.company_id = b.company_id
  LEFT JOIN erp.period_branch_close c
         ON c.company_id = p.company_id AND c.branch_id = b.no AND c.period_id = p.id`,
  );
  const rows: PeriodRow[] = r.rows.map((x) => ({
    periodId: Number(x.no),
    fiscalYearId: Number(x.fiscal_year_id),
    branchId: Number(x.branch_no),
    fromDate: new Date(String(x.f) + "T00:00:00Z"),
    toDate: new Date(String(x.t) + "T00:00:00Z"),
    suspended: x.inactive === true,
    inventoryClosed: x.inv_closed === true,
    glClosed: x.gl_closed === true || String(x.status) === "closed",
    closeStep: "none",
    pendingDocs: 0,
  }));
  tx.periods = rows;
  return rows.length;
}

/* ═══════════ دليل الحسابات والأبعاد ═══════════ */

export interface AccountInfo {
  code: string;
  nameAr: string;
  posting: boolean;
  inactive: boolean;
  analyticType: number;
  useCc: number;
  usePj: number;
  useActv: number;
}

export interface AccountBook {
  accounts: Map<string, AccountInfo>;
  costCenters: Map<string, { posting: boolean; inactive: boolean }>;
  projects: Map<string, { posting: boolean; inactive: boolean }>;
}

export async function loadAccountBook(db: Db): Promise<AccountBook> {
  const accounts = new Map<string, AccountInfo>();
  for (const x of (await db.query(
    `SELECT code, name_ar, kind, inactive, analytic_type, use_cc, use_pj, use_actv FROM erp.account`,
  )).rows) {
    accounts.set(String(x.code), {
      code: String(x.code),
      nameAr: String(x.name_ar ?? ""),
      posting: String(x.kind) === "posting",
      inactive: x.inactive === true,
      analyticType: Number(x.analytic_type ?? 0) || 0,
      useCc: Number(x.use_cc ?? 0) || 0,
      usePj: Number(x.use_pj ?? 0) || 0,
      useActv: Number(x.use_actv ?? 0) || 0,
    });
  }
  const costCenters = new Map<string, { posting: boolean; inactive: boolean }>();
  for (const x of (await db.query(`SELECT code, kind, inactive FROM erp.cost_center`)).rows) {
    costCenters.set(String(x.code), { posting: String(x.kind) === "sub", inactive: x.inactive === true });
  }
  const projects = new Map<string, { posting: boolean; inactive: boolean }>();
  for (const x of (await db.query(`SELECT no, is_sub, inactive FROM erp.project`)).rows) {
    projects.set(String(x.no), { posting: x.is_sub === true, inactive: x.inactive === true });
  }
  return { accounts, costCenters, projects };
}

/**
 * AC_DTL_TYP في أونيكس ⇒ نوع التحليلي على السطر [قاعدة: ACCOUNT.AC_DTL_TYP · GO/01 §الدليل بند 8].
 * 5/6 «مدينة/دائنة أخرى» من رسالة 4544 [مستنتج في الرقم] — لا حساب عليهما اليوم.
 */
const ANALYTIC_OF: Record<number, AnalyticType> = {
  0: "general",
  1: "cash",
  2: "bank",
  3: "customer",
  4: "vendor",
  5: "other_debit",
  6: "other_credit",
  7: "employee",
};

export function makeLineGuard(book: AccountBook): (lines: GlEntryLine[]) => void {
  return (lines) => {
    for (const ln of lines) {
      const acc = book.accounts.get(ln.accountCode);
      /* INV-5: الحساب موجود، فرعي، غير موقوف */
      if (!acc || !acc.posting || acc.inactive) {
        throw new DomainError("ONYX-497", `${onyxError(497).message} — ${ln.accountCode}${acc?.inactive ? " (موقوف)" : ""}`);
      }
      /* GL-R37: نوع التحليلي على السطر = نوع الحساب */
      const expected = ANALYTIC_OF[acc.analyticType] ?? "general";
      if (ln.analyticType !== expected) {
        throw new DomainError("ONYX-5114", `${onyxError(5114).message} — ${ln.accountCode}`);
      }
      /* SY-R39: 0 غير مستخدم (الحقل مقفول في أونيكس فلا قيمة له) · 1 اختياري · 2 إجباري */
      if (acc.useCc === 0) ln.costCenter = null;
      if (acc.useCc === 2 && !ln.costCenter) {
        throw new DomainError("ONYX-4048", `${onyxError(4048).message} — مركز التكلفة للحساب ${ln.accountCode} (SY-R39)`);
      }
      if (ln.costCenter) {
        const cc = book.costCenters.get(ln.costCenter);
        if (!cc || !cc.posting || cc.inactive) {
          throw new DomainError("CC_INVALID", `مركز التكلفة ${ln.costCenter} غير صحيح — op.1.2.5`);
        }
      }
      if (acc.usePj === 0) ln.project = null;
      if (acc.usePj === 2 && !ln.project) {
        throw new DomainError("ONYX-2115", `${onyxError(2115).message} — ${ln.accountCode}`);
      }
      if (ln.project) {
        const pj = book.projects.get(ln.project);
        if (!pj || !pj.posting || pj.inactive) throw new DomainError("ONYX-2112", onyxError(2112).message);
      }
      if (acc.useActv === 2) {
        throw new DomainError("ONYX-4048", `${onyxError(4048).message} — النشاط للحساب ${ln.accountCode}`);
      }
    }
  };
}

/* ═══════════ حلّ الحسابات — INV-7 · INV-8 ═══════════ */

type LinkRow = Record<string, unknown>;

async function one(db: Db, sql: string, params: unknown[]): Promise<LinkRow | null> {
  return ((await db.query(sql, params)).rows[0] as LinkRow | undefined) ?? null;
}

function t(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

const CUSTOMER_KINDS = new Set(["sales_invoice", "sales_return", "receipt_voucher"]);
const VENDOR_KINDS = new Set(["purchase_invoice", "purchase_return", "payment_voucher"]);

/** حساب الطرف: العميل ⇒ حساب مجموعته (V-R6) · المورد ⇒ الحساب في بطاقته */
async function partyAccount(db: Db, req: PostDocumentRequest): Promise<string> {
  const pm = req.paymentMethod ?? "credit";
  const partyNeeded = pm === "credit" || pm === "to_account" || req.docKind.endsWith("_voucher");
  if (!partyNeeded || req.partyAnalyticId == null) return "";
  const code = String(req.partyAnalyticId);
  if (CUSTOMER_KINDS.has(req.docKind)) {
    const c = await one(
      db,
      `SELECT c.code, g.account_code FROM erp.customer c LEFT JOIN erp.customer_group g ON g.no = c.group_no WHERE c.code = $1`,
      [code],
    );
    if (!c) throw new DomainError("ONYX-4559", `${onyxError(4559).message} — العميل ${code} غير موجود (op.7.1.2.8)`);
    return t(c.account_code);
  }
  if (VENDOR_KINDS.has(req.docKind)) {
    const v = await one(db, `SELECT code, account_code FROM erp.vendor WHERE code = $1`, [code]);
    if (!v) throw new DomainError("ONYX-4559", `${onyxError(4559).message} — المورد ${code} غير موجود (op.6.1.2.2)`);
    return t(v.account_code);
  }
  return "";
}

/** ربط الصنف: مجموعة الصنف ⇒ ربط حسابات المخزون (op.5.1.2.16 · POST_TYPE 1) */
async function resolveLine(db: Db, ln: RawLine): Promise<void> {
  if (!ln.itemCode.trim()) return;
  const item = await one(db, `SELECT code, group_code FROM erp.item WHERE code = $1`, [ln.itemCode.trim()]);
  if (!item) throw new DomainError("ITEM_NOT_FOUND", `رقم الصنف ${ln.itemCode} غير موجود — op.5.1.2.10`);
  const wh = ln.warehouseCode.trim()
    ? await one(db, `SELECT code FROM erp.warehouse WHERE code = $1`, [ln.warehouseCode.trim()])
    : null;
  if (ln.warehouseCode.trim() && !wh) throw new DomainError("WAREHOUSE_NOT_FOUND", `رقم المخزن ${ln.warehouseCode} غير صحيح — op.5.1.2.9`);
  const link = item.group_code
    ? await one(db, `SELECT * FROM erp.inventory_gl_link WHERE link_type = 1 AND group_code = $1`, [t(item.group_code)])
    : null;
  /* الحساب يُحلّ من الربط ويُجمَّد في القيد — أي قيمة من العميل تُستبدل (INV-7) */
  ln.inventoryAccount = t(link?.inventory_acc);
  ln.salesAccount = t(link?.sales_acc);
  ln.salesReturnAccount = t(link?.sales_return_acc);
  ln.pySalesReturnAccount = t(link?.py_sales_return_acc);
  ln.cogsAccount = t(link?.cogs_acc);
  ln.cogsReturnAccount = t(link?.cogs_return_acc);
  ln.pyCogsReturnAccount = t(link?.py_cogs_return_acc);
  ln.freeCogsAccount = t(link?.free_cogs_acc);
  ln.freeReturnCogsAccount = t(link?.free_return_cogs_acc);
}

let warehouseTransferCol: string | null | undefined;

async function transferClearing(db: Db, req: PostDocumentRequest): Promise<string> {
  if (req.docKind !== "stock_transfer" && req.docKind !== "stock_transfer_receipt") return "";
  /* TR_A_CODE في بيانات المخازن (op.5.1.2.9 · IAS GO/05 §بيانات المخازن بند 13) — يُبنى في الطبقة ٢ */
  if (warehouseTransferCol === undefined) {
    const c = await one(
      db,
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'erp' AND table_name = 'warehouse' AND column_name = 'transfer_account'`,
      [],
    );
    warehouseTransferCol = c ? "transfer_account" : null;
  }
  if (!warehouseTransferCol) return "";
  const wh = t(req.lines[0]?.warehouseCode);
  if (!wh) return "";
  const r = await one(db, `SELECT transfer_account FROM erp.warehouse WHERE code = $1`, [wh]);
  return t(r?.transfer_account);
}

export async function resolvePosting(db: Db, req: PostDocumentRequest): Promise<PostDocumentRequest> {
  const brn = await one(db, `SELECT * FROM erp.branch_posting_accounts WHERE branch_no = $1`, [req.branchId]);
  const accounts: PostingAccounts = blankAccounts({
    party: await partyAccount(db, req),
    vatOutput: t(brn?.vat_output),
    vatInput: t(brn?.vat_input),
    costDiffPurchaseReturn: t(brn?.cost_diff_purchase_return),
    notesReceivable: t(brn?.notes_receivable),
    interBranch: t(brn?.branch_current),
    transferClearing: await transferClearing(db, req),
  });
  for (const ln of req.lines) await resolveLine(db, ln);
  return { ...req, accounts };
}

/** أسماء الحسابات للعرض — من الدليل نفسه لا من قائمة في الواجهة */
export function accountNames(book: AccountBook, codes: Iterable<string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of codes) {
    const a = book.accounts.get(c);
    if (a) out[c] = a.nameAr;
  }
  return out;
}
