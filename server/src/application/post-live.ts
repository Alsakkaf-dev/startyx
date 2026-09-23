import type { Db } from "../infrastructure/db.ts";
import { deps, liveStore } from "../infrastructure/memory.ts";
import { persistDocument, type LedgerRow } from "../infrastructure/postgres.ts";
import { currencyEngine, type CurrencyLimits } from "../engines/currency.ts";
import {
  blankAccounts,
  blankLine,
  postDocument,
  type AnalyticType,
  type GlEntryDocKind,
  type PostDocumentRequest,
} from "../engines/posting.ts";
import { Decimal, d } from "../shared-kernel/decimal.ts";
import { DomainError } from "../shared-kernel/errors.ts";
import { onyxError } from "../shared-kernel/onyx-messages.ts";
import { accountNames, loadAccountBook, loadPeriods, makeLineGuard, resolvePosting } from "./posting-context.ts";

/**
 * نقطة الترحيل الوحيدة (الخدمة ٤): تحلّ الحسابات، تفحص الفترة والدليل، تحجز الرقم،
 * ثم تكتب كل شيء في معاملة قاعدة واحدة. الذاكرة لا تُعتمد إلا بعد التزام القاعدة.
 */

const KINDS: ReadonlySet<GlEntryDocKind> = new Set<GlEntryDocKind>([
  "stock_receipt", "stock_issue", "stock_transfer", "stock_transfer_receipt",
  "sales_invoice", "sales_return", "receipt_voucher", "payment_voucher",
  "purchase_invoice", "purchase_return", "manual_journal", "opening_balance",
]);

const ANALYTIC: ReadonlySet<AnalyticType> = new Set<AnalyticType>([
  "general", "cash", "bank", "customer", "vendor", "employee", "other_debit", "other_credit",
]);

function dec(v: unknown, fallback = "0"): Decimal {
  if (typeof v === "string" && v.trim() !== "") return Decimal.from(v.trim());
  if (typeof v === "number" && Number.isFinite(v)) return Decimal.from(String(v));
  return d(fallback);
}

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function optInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

function missing(what: string): DomainError {
  return new DomainError("ONYX-4048", `${onyxError(4048).message} — ${what}`);
}

export function parsePostBody(b: Record<string, unknown>): PostDocumentRequest {
  const kind = str(b.docKind) as GlEntryDocKind;
  if (!KINDS.has(kind)) throw missing("نوع الوثيقة");
  const branchId = optInt(b.branchId);
  if (branchId == null) throw missing("الفرع");
  const dateStr = str(b.docDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw missing("التاريخ");
  const lines = Array.isArray(b.lines) ? (b.lines as Record<string, unknown>[]) : [];
  return {
    docKind: kind,
    branchId,
    docDate: new Date(dateStr + "T00:00:00Z"),
    currencyId: optInt(b.currencyId) ?? 1,
    fxRate: dec(b.fxRate, "1"),
    fxOperator: "mul",
    paymentMethod: (str(b.paymentMethod) || "credit") as PostDocumentRequest["paymentMethod"],
    headerDiscount: dec(b.headerDiscount),
    headerCharges: dec(b.headerCharges),
    beneficiaryBranchId: optInt(b.beneficiaryBranchId) ?? undefined,
    accounts: blankAccounts(),
    numbering: { entity: kind, scope: { kind: "per_branch_year", branchId, fiscalYearId: 0 } },
    isExportZeroRated: b.isExportZeroRated === true,
    salesReturnPriorYear: b.salesReturnPriorYear === true,
    issueEinvoice: b.issueEinvoice === true,
    existingIcv: optInt(b.existingIcv),
    cashAccount: str(b.cashAccount),
    cashAnalyticId: optInt(b.cashAnalyticId),
    partyAnalyticId: optInt(b.partyAnalyticId),
    costCenter: str(b.costCenter) || null,
    project: str(b.project) || null,
    skipIcv: b.skipIcv !== false,
    lines: lines.map((ln) => {
      const at = str(ln.analyticType) as AnalyticType;
      const link = ln.itemTaxLink as { pct?: string; zatcaCategory?: "S" | "Z" | "E" | "O"; exemptionReasonCode?: string } | undefined;
      return blankLine({
        qty: dec(ln.qty),
        price: dec(ln.price),
        lineDiscountShare: dec(ln.lineDiscountShare),
        itemCode: str(ln.itemCode),
        warehouseCode: str(ln.warehouseCode),
        packSize: dec(ln.packSize, "1"),
        currentQty: dec(ln.currentQty),
        currentAvg: dec(ln.currentAvg),
        incomingUnitCost: dec(ln.incomingUnitCost, str(ln.price) || "0"),
        supplierOriginalPrice: dec(ln.supplierOriginalPrice, str(ln.price) || "0"),
        amount: dec(ln.amount),
        taxPct: dec(ln.taxPct, link ? str(link.pct) || "0" : "0"),
        isFree: ln.isFree === true,
        headerAccount: str(ln.headerAccount),
        accountCode: str(ln.accountCode),
        analyticType: ANALYTIC.has(at) ? at : "general",
        analyticId: optInt(ln.analyticId),
        costCenter: str(ln.costCenter) || null,
        project: str(ln.project) || null,
        side: str(ln.side) === "credit" ? "credit" : "debit",
        inclusiveOfTax: ln.inclusiveOfTax === true,
        itemTaxLink: link
          ? {
              taxTypeId: 1,
              pct: dec(link.pct, "0"),
              zatcaCategory: link.zatcaCategory ?? "S",
              exemptionReasonCode: link.exemptionReasonCode,
            }
          : null,
      });
    }),
  };
}

/** العملة من op.1.1.3: المحلية سعرها 1 دائماً، والمعامل والحدود من البطاقة لا من الطلب (INV-9) */
async function currencyRules(db: Db, req: PostDocumentRequest): Promise<Record<number, CurrencyLimits>> {
  const c = (await db.query(
    `SELECT no, is_local, rate_min, rate_max, operator, inactive FROM erp.currency WHERE no = $1`,
    [req.currencyId],
  )).rows[0];
  if (!c || c.inactive === true) throw missing("العملة");
  req.fxOperator = String(c.operator) === "div" ? "div" : "mul";
  if (c.is_local === true) {
    if (!req.fxRate.eq(d("1"))) throw new DomainError("FX_LOCAL_RATE", "سعر صرف العملة المحلية = 1");
    return {};
  }
  if (req.fxRate.isZero() || req.fxRate.isNegative()) throw missing("سعر الصرف");
  if (c.rate_min == null || c.rate_max == null) return {};
  return { [req.currencyId]: { min: Decimal.from(String(c.rate_min)), max: Decimal.from(String(c.rate_max)) } };
}

let chain: Promise<unknown> = Promise.resolve();

/** طابور ترحيل واحد: الحجز في الذاكرة ثم الكتابة في القاعدة لا يتداخلان بين طلبين */
export function serialPost<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

export async function postLive(db: Db, b: Record<string, unknown>, ledger: LedgerRow[]) {
  const parsed = parsePostBody(b);
  const limits = await currencyRules(db, parsed);
  await loadPeriods(db, liveStore);
  const book = await loadAccountBook(db);
  const req = await resolvePosting(db, parsed);
  const engine = { ...deps(liveStore), currency: currencyEngine(limits), lineGuard: makeLineGuard(book) };

  liveStore.begin();
  try {
    const result = postDocument(req, engine, liveStore);
    const saved = await persistDocument(db, {
      req,
      result,
      screenRef: str(b.screenRef),
      user: str(b.user),
    });
    liveStore.commit();
    const glEntryId = saved.glEntryIds[0] ?? null;
    if (result.status === "posted" && glEntryId != null) {
      liveStore.gl.delete(result.glEntryId);
      liveStore.gl.set(glEntryId, result.lines);
      liveStore.glSeq = Math.max(liveStore.glSeq, ...saved.glEntryIds) + 1;
    }
    const names = accountNames(book, result.status === "posted" ? result.lines.map((l) => l.accountCode) : []);
    ledger.push({
      glEntryId,
      documentNumber: result.documentNumber,
      docKind: req.docKind,
      screenRef: str(b.screenRef),
      status: result.status,
      imbalance: result.status === "pending" ? String(result.imbalance) : undefined,
      lines: result.status === "posted" ? result.lines : [],
      at: new Date().toISOString(),
    });
    return result.status === "posted"
      ? { ...result, glEntryId, glEntryIds: saved.glEntryIds, liveDocumentId: saved.liveDocumentId, accountNames: names }
      : { ...result, liveDocumentId: saved.liveDocumentId };
  } catch (e) {
    liveStore.rollback();
    throw e;
  }
}
