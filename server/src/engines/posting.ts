import { Decimal, d } from "../shared-kernel/decimal.ts";
import { DomainError } from "../shared-kernel/errors.ts";
import { onyxError } from "../shared-kernel/onyx-messages.ts";
import type { CurrencyEngine } from "./currency.ts";
import type { CostingEngine } from "./costing.ts";
import type { NumberingEngine, NumberingRequest } from "./numbering.ts";
import type { PeriodAndLockEngine } from "./period-and-lock.ts";
import type { PricingEngine } from "./pricing.ts";
import { computeInvoiceTotals, computeLineTax, type ItemTaxLink, type TaxEngine } from "./tax.ts";

export type GlEntryDocKind =
  | "stock_receipt"
  | "stock_issue"
  | "stock_transfer"
  | "stock_transfer_receipt"
  | "sales_invoice"
  | "sales_return"
  | "receipt_voucher"
  | "payment_voucher"
  | "purchase_invoice"
  | "purchase_return"
  | "manual_journal"
  | "opening_balance";

export type AnalyticType =
  | "general"
  | "cash"
  | "bank"
  | "customer"
  | "vendor"
  | "employee"
  | "other_debit"
  | "other_credit";

/** الوثائق التي تحرّك المخزون — يمنعها إقفال المخزون، وتُلزِم بالصنف والمخزن (INV-3) */
export const STOCK_KINDS: ReadonlySet<GlEntryDocKind> = new Set([
  "stock_receipt",
  "stock_issue",
  "stock_transfer",
  "stock_transfer_receipt",
  "sales_invoice",
  "sales_return",
  "purchase_invoice",
  "purchase_return",
]);

/**
 * حسابات الرأس المحلولة وقت الترحيل (INV-7) — لا رقم حساب ثابت في الكود.
 * النص الفارغ = الربط غير معرَّف ⇒ الترحيل يتوقف برسالة تسمّي الدور وشاشته (INV-8).
 */
export interface PostingAccounts {
  party: string;
  vatOutput: string;
  vatInput: string;
  costDiffPurchaseReturn: string;
  transferClearing: string;
  notesReceivable: string;
  interBranch: string;
}

export type AccountRole = keyof PostingAccounts | LineAccountRole;

export type LineAccountRole =
  | "inventoryAccount"
  | "cogsAccount"
  | "salesAccount"
  | "salesReturnAccount"
  | "pySalesReturnAccount"
  | "cogsReturnAccount"
  | "pyCogsReturnAccount"
  | "freeCogsAccount"
  | "freeReturnCogsAccount"
  | "headerAccount"
  | "accountCode";

/** مصدر كل دور في أونيكس — يُعرض في رسالة الرفض */
export const ROLE_SOURCE: Record<AccountRole, { label: string; screen: string; msg?: 4368 | 4801 | 4865 | 5473 }> = {
  party: { label: "حساب العميل/المورد", screen: "op.7.1.2.2 مجموعة العملاء · op.6.1.2.2 بيانات الموردين" },
  vatOutput: { label: "حساب ضريبة المخرجات", screen: "op.1.2.9 الحسابات الوسيطة", msg: 4801 },
  vatInput: { label: "حساب ضريبة المدخلات", screen: "op.1.2.9 الحسابات الوسيطة", msg: 4801 },
  costDiffPurchaseReturn: { label: "حساب فروق تكلفة مردود المشتريات", screen: "op.1.2.9 الحسابات الوسيطة" },
  transferClearing: { label: "حساب وسيط التحويلات المخزنية", screen: "op.5.1.2.9 بيانات المخازن" },
  notesReceivable: { label: "حساب أوراق القبض", screen: "op.1.2.9 الحسابات الوسيطة" },
  interBranch: { label: "حساب جاري الفرع", screen: "op.1.2.9 الحسابات الوسيطة", msg: 4368 },
  inventoryAccount: { label: "حساب المخزون", screen: "op.5.1.2.16 ربط حسابات المخزون" },
  cogsAccount: { label: "حساب تكلفة المبيعات", screen: "op.5.1.2.16 ربط حسابات المخزون" },
  salesAccount: { label: "حساب المبيعات", screen: "op.5.1.2.16 ربط حسابات المخزون" },
  salesReturnAccount: { label: "حساب مردود المبيعات", screen: "op.5.1.2.16 ربط حسابات المخزون" },
  pySalesReturnAccount: { label: "حساب مردودات سنوات سابقة", screen: "op.5.1.2.16 ربط حسابات المخزون" },
  cogsReturnAccount: { label: "حساب تكلفة مردود المبيعات", screen: "op.5.1.2.16 ربط حسابات المخزون" },
  pyCogsReturnAccount: { label: "حساب تكلفة مردودات سنوات سابقة", screen: "op.5.1.2.16 ربط حسابات المخزون" },
  freeCogsAccount: { label: "حساب تكلفة الكميات المجانية", screen: "op.5.1.2.16 ربط حسابات المخزون" },
  freeReturnCogsAccount: { label: "حساب تكلفة مردود الكميات المجانية", screen: "op.5.1.2.16 ربط حسابات المخزون" },
  headerAccount: { label: "الحساب المقابل", screen: "الوثيقة" },
  accountCode: { label: "رقم الحساب", screen: "الوثيقة" },
};

export function mappingMissing(role: AccountRole): DomainError {
  const src = ROLE_SOURCE[role];
  const text = src.msg ? `${onyxError(src.msg).message} — ${src.label} · ${src.screen}` : `أدخل ${src.label} — ${src.screen}`;
  return new DomainError("ACCOUNT_MAPPING_MISSING", text);
}

function need(code: string | undefined | null, role: AccountRole): string {
  const c = (code ?? "").trim();
  if (!c) throw mappingMissing(role);
  return c;
}

export function blankAccounts(over: Partial<PostingAccounts> = {}): PostingAccounts {
  return {
    party: "",
    vatOutput: "",
    vatInput: "",
    costDiffPurchaseReturn: "",
    transferClearing: "",
    notesReceivable: "",
    interBranch: "",
    ...over,
  };
}

export interface RawLine {
  qty: Decimal;
  price: Decimal;
  lineDiscountShare: Decimal;
  itemTaxLink: ItemTaxLink | null;
  itemCode: string;
  warehouseCode: string;
  inventoryAccount: string;
  cogsAccount: string;
  salesAccount: string;
  salesReturnAccount: string;
  pySalesReturnAccount: string;
  cogsReturnAccount: string;
  pyCogsReturnAccount: string;
  freeCogsAccount: string;
  freeReturnCogsAccount: string;
  headerAccount: string;
  analyticType: AnalyticType;
  analyticId: number | null;
  accountCode: string;
  costCenter: string | null;
  project: string | null;
  side: "debit" | "credit";
  amount: Decimal;
  isFree: boolean;
  currentQty: Decimal;
  currentAvg: Decimal;
  incomingUnitCost: Decimal;
  packSize: Decimal;
  supplierOriginalPrice: Decimal;
  costMethod: "supplier_price" | "final_avg_cost" | "last_supply_price";
  inclusiveOfTax: boolean;
  taxPct: Decimal;
}

export function blankLine(over: Partial<RawLine> = {}): RawLine {
  const base: RawLine = {
    qty: Decimal.zero(),
    price: Decimal.zero(),
    lineDiscountShare: Decimal.zero(),
    itemTaxLink: null,
    itemCode: "",
    warehouseCode: "",
    inventoryAccount: "",
    cogsAccount: "",
    salesAccount: "",
    salesReturnAccount: "",
    pySalesReturnAccount: "",
    cogsReturnAccount: "",
    pyCogsReturnAccount: "",
    freeCogsAccount: "",
    freeReturnCogsAccount: "",
    headerAccount: "",
    analyticType: "general",
    analyticId: null,
    accountCode: "",
    costCenter: null,
    project: null,
    side: "debit",
    amount: Decimal.zero(),
    isFree: false,
    currentQty: Decimal.zero(),
    currentAvg: Decimal.zero(),
    incomingUnitCost: Decimal.zero(),
    packSize: d("1"),
    supplierOriginalPrice: Decimal.zero(),
    costMethod: "supplier_price",
    inclusiveOfTax: false,
    taxPct: Decimal.zero(),
  };
  /* undefined في over لا يمسح القيمة الافتراضية */
  for (const [k, v] of Object.entries(over)) if (v !== undefined) (base as unknown as Record<string, unknown>)[k] = v;
  return base;
}

export interface PostDocumentRequest {
  docKind: GlEntryDocKind;
  branchId: number;
  docDate: Date;
  currencyId: number;
  fxRate: Decimal;
  fxOperator: "mul" | "div";
  paymentMethod?: "cash" | "bank" | "credit" | "cheque" | "to_account";
  lines: RawLine[];
  headerDiscount: Decimal;
  headerCharges: Decimal;
  beneficiaryBranchId?: number;
  accounts: PostingAccounts;
  numbering: NumberingRequest;
  isExportZeroRated: boolean;
  salesReturnPriorYear: boolean;
  issueEinvoice: boolean;
  existingIcv: number | null;
  /** حساب الصندوق/البنك للنقدي — من الصناديق op.4.1.2.2 والبنوك op.4.1.2.3 */
  cashAccount: string;
  /** رقم الصندوق/البنك التحليلي على سطر النقدية (GL-R37) */
  cashAnalyticId: number | null;
  partyAnalyticId: number | null;
  /** مركز التكلفة/المشروع الافتراضي للرأس — يرثه كل سطر لم يحدّد غيره */
  costCenter?: string | null;
  project?: string | null;
  skipIcv: boolean;
}

export interface GlEntryLine {
  accountCode: string;
  debit: Decimal;
  credit: Decimal;
  analyticType: AnalyticType;
  analyticId: number | null;
  costCenter: string | null;
  project: string | null;
  branchId: number;
  isGenerated: boolean;
}

export interface GlEntryDraft {
  branchId: number;
  lines: GlEntryLine[];
}

/** حركة مخزون تُكتب مع القيد في نفس المعاملة (INV-3) — الكمية بالوحدة الأساسية، موجبة وارد وسالبة صادر */
export interface StockMovement {
  branchId: number;
  itemCode: string;
  warehouseCode: string;
  qtyBase: Decimal;
  unitCost: Decimal;
  value: Decimal;
  isFree: boolean;
}

export type PostDocumentResult =
  | {
      status: "posted";
      documentNumber: number;
      fiscalYearId: number;
      periodId: number;
      glEntryId: number;
      lines: GlEntryLine[];
      entries: GlEntryDraft[];
      movements: StockMovement[];
      icv: number | null;
    }
  | {
      status: "pending";
      documentNumber: number;
      fiscalYearId: number;
      periodId: number;
      imbalance: Decimal;
      movements: StockMovement[];
      icv: number | null;
    };

export interface EngineDependencies {
  numbering: NumberingEngine;
  periodLock: PeriodAndLockEngine;
  currency: CurrencyEngine;
  tax: TaxEngine;
  pricing: PricingEngine;
  costing: CostingEngine;
  /** فحص كل سطر قيد مقابل الدليل (INV-5 · GL-R37 · SY-R39) — يُحقن من طبقة التطبيق */
  lineGuard?: (lines: GlEntryLine[]) => void;
}

export interface PostingStore {
  nextGlId(): number;
  savePosted(id: number, lines: GlEntryLine[]): void;
}

export interface DbTransaction {
  numberingStore: { lockAndNext(key: string): number };
}

const ANALYTIC_REQUIRED: ReadonlySet<AnalyticType> = new Set(["customer", "vendor", "cash", "bank", "employee"]);

function partyAccount(req: PostDocumentRequest): { code: string; analyticType: AnalyticType; analyticId: number | null } {
  const pm = req.paymentMethod ?? "credit";
  if (pm === "cash") return { code: need(req.cashAccount, "accountCode"), analyticType: "cash", analyticId: req.cashAnalyticId };
  if (pm === "bank") return { code: need(req.cashAccount, "accountCode"), analyticType: "bank", analyticId: req.cashAnalyticId };
  if (pm === "cheque") return { code: need(req.accounts.notesReceivable, "notesReceivable"), analyticType: "general", analyticId: null };
  const vendorSide = req.docKind === "purchase_invoice" || req.docKind === "purchase_return" || req.docKind === "payment_voucher";
  return {
    code: need(req.accounts.party, "party"),
    analyticType: vendorSide ? "vendor" : "customer",
    analyticId: req.partyAnalyticId,
  };
}

function line(
  req: PostDocumentRequest,
  p: {
    accountCode: string;
    debit?: Decimal;
    credit?: Decimal;
    analyticType?: AnalyticType;
    analyticId?: number | null;
    costCenter?: string | null;
    project?: string | null;
    branchId?: number;
    generated?: boolean;
  },
): GlEntryLine {
  return {
    accountCode: p.accountCode,
    debit: p.debit ?? Decimal.zero(),
    credit: p.credit ?? Decimal.zero(),
    analyticType: p.analyticType ?? "general",
    analyticId: p.analyticId ?? null,
    costCenter: p.costCenter ?? req.costCenter ?? null,
    project: p.project ?? req.project ?? null,
    branchId: p.branchId ?? req.branchId,
    isGenerated: p.generated ?? false,
  };
}

function toLocalAmt(deps: EngineDependencies, req: PostDocumentRequest, amount: Decimal): Decimal {
  if (amount.isZero()) return amount;
  return deps.currency.toLocal({
    amount,
    currencyId: req.currencyId,
    rate: req.fxRate,
    operator: req.fxOperator,
  });
}

function assertAnalytic(ln: GlEntryLine): void {
  if (ANALYTIC_REQUIRED.has(ln.analyticType) && (ln.analyticId === null || ln.analyticId === undefined)) {
    const e = onyxError(4559);
    throw new DomainError("ANALYTIC_REQUIRED", `${e.message} — ${ln.accountCode} (GL-R37)`);
  }
}

function sumSide(lines: GlEntryLine[], side: "debit" | "credit"): Decimal {
  return lines.reduce((a, ln) => a.add(side === "debit" ? ln.debit : ln.credit), Decimal.zero());
}

function assertStockLine(ln: RawLine): void {
  if (!ln.itemCode.trim()) throw onyxError(3319);
  if (!ln.warehouseCode.trim()) throw new DomainError("ONYX-4048", `${onyxError(4048).message} — المخزن`);
  if (ln.packSize.isZero()) throw new DomainError("ONYX-9754", onyxError(9754).message);
}

function movement(req: PostDocumentRequest, ln: RawLine, qtyBase: Decimal, value: Decimal, sign: 1 | -1): StockMovement {
  const q = sign === 1 ? qtyBase : qtyBase.neg();
  const v = sign === 1 ? value : value.neg();
  return {
    branchId: req.branchId,
    itemCode: ln.itemCode,
    warehouseCode: ln.warehouseCode,
    qtyBase: q,
    unitCost: qtyBase.isZero() ? Decimal.zero() : value.div(qtyBase),
    value: v,
    isFree: ln.isFree,
  };
}

interface Built {
  lines: GlEntryLine[];
  movements: StockMovement[];
}

function lineDims(ln: RawLine): { costCenter?: string | null; project?: string | null } {
  return {
    costCenter: ln.costCenter ?? undefined,
    project: ln.project ?? undefined,
  };
}

function buildStock(req: PostDocumentRequest, deps: EngineDependencies): Built {
  const out: GlEntryLine[] = [];
  const mv: StockMovement[] = [];
  for (const ln of req.lines) {
    if (ln.analyticType === "customer" && (req.docKind === "stock_issue" || req.docKind === "stock_receipt")) {
      throw new DomainError("FORBIDDEN_STOCK_CUSTOMER", "IV-D37");
    }
    const qtyBase = ln.qty.mul(ln.packSize);
    const cost = req.docKind === "stock_receipt"
      ? qtyBase.mul(ln.incomingUnitCost.div(ln.packSize))
      : deps.costing.applyIssueCost(qtyBase, ln.currentAvg);
    const local = toLocalAmt(deps, req, cost);
    const inv = need(ln.inventoryAccount, "inventoryAccount");
    const dims = lineDims(ln);
    if (req.docKind === "stock_receipt") {
      out.push(line(req, { accountCode: inv, debit: local, ...dims }));
      out.push(line(req, { accountCode: need(ln.headerAccount, "headerAccount"), credit: local, analyticType: ln.analyticType, analyticId: ln.analyticId, ...dims }));
      mv.push(movement(req, ln, qtyBase, local, 1));
      deps.costing.recalcWeightedAverage({
        currentQty: ln.currentQty,
        currentAvg: ln.currentAvg,
        incomingQty: qtyBase,
        incomingUnitCost: ln.incomingUnitCost.div(ln.packSize),
      });
    } else if (req.docKind === "stock_issue") {
      out.push(line(req, { accountCode: need(ln.headerAccount, "headerAccount"), debit: local, analyticType: ln.analyticType, analyticId: ln.analyticId, ...dims }));
      out.push(line(req, { accountCode: inv, credit: local, ...dims }));
      mv.push(movement(req, ln, qtyBase, local, -1));
    } else if (req.docKind === "stock_transfer") {
      out.push(line(req, { accountCode: need(req.accounts.transferClearing, "transferClearing"), debit: local, ...dims }));
      out.push(line(req, { accountCode: inv, credit: local, ...dims }));
      mv.push(movement(req, ln, qtyBase, local, -1));
    } else {
      out.push(line(req, { accountCode: inv, debit: local, ...dims }));
      out.push(line(req, { accountCode: need(req.accounts.transferClearing, "transferClearing"), credit: local, ...dims }));
      mv.push(movement(req, ln, qtyBase, local, 1));
    }
  }
  return { lines: out, movements: mv };
}

/**
 * يجمع أسطر الإيراد حسب الحساب. خصم/أعباء الرأس يُقيَّدان على حساب المبيعات
 * كما كان — ولا يُوزَّعان على أكثر من حساب بلا قاعدة أونيكس صريحة (تُحسم مع op.7.5.3.6).
 */
function creditByAccount(
  req: PostDocumentRequest,
  deps: EngineDependencies,
  map: Map<string, Decimal>,
  adjust: Decimal,
  side: "debit" | "credit",
): GlEntryLine[] {
  if (!adjust.isZero() && map.size > 1) {
    throw new DomainError("HEADER_ADJUST_MULTI_ACCOUNT", "خصم/أعباء الرأس على أكثر من حساب مبيعات — لم تُحسم قاعدته بعد (op.7.5.3.6)");
  }
  const out: GlEntryLine[] = [];
  for (const [acc, amt] of map) {
    const v = toLocalAmt(deps, req, amt.add(adjust));
    if (!v.isZero()) out.push(line(req, { accountCode: acc, [side]: v }));
  }
  return out;
}

function addTo(map: Map<string, Decimal>, key: string, v: Decimal): void {
  map.set(key, (map.get(key) ?? Decimal.zero()).add(v));
}

function buildSales(req: PostDocumentRequest, deps: EngineDependencies): Built {
  const out: GlEntryLine[] = [];
  const mv: StockMovement[] = [];
  const taxLines: { qty: Decimal; price: Decimal; lineDiscountShare: Decimal; lineTax: Decimal }[] = [];
  const revenue = new Map<string, Decimal>();
  let netSum = Decimal.zero();
  let taxSum = Decimal.zero();
  let free = true;
  for (const ln of req.lines) {
    const net = ln.qty.mul(ln.price).sub(ln.lineDiscountShare);
    const tax = deps.tax.computeLineTax({
      netAmount: net,
      itemTaxLink: ln.itemTaxLink,
      isExportZeroRated: req.isExportZeroRated,
    });
    taxLines.push({ qty: ln.qty, price: ln.price, lineDiscountShare: ln.lineDiscountShare, lineTax: tax.taxAmount });
    if (!ln.isFree) {
      free = false;
      netSum = netSum.add(net);
      taxSum = taxSum.add(tax.taxAmount);
      addTo(revenue, need(ln.salesAccount, "salesAccount"), net);
    }
    const qtyBase = ln.qty.mul(ln.packSize);
    const issue = deps.costing.applyIssueCost(qtyBase, ln.currentAvg);
    const localIssue = toLocalAmt(deps, req, issue);
    const cogsAcc = ln.isFree ? need(ln.freeCogsAccount, "freeCogsAccount") : need(ln.cogsAccount, "cogsAccount");
    const inv = need(ln.inventoryAccount, "inventoryAccount");
    if (!issue.isZero()) {
      out.push(line(req, { accountCode: cogsAcc, debit: localIssue, ...lineDims(ln) }));
      out.push(line(req, { accountCode: inv, credit: localIssue, ...lineDims(ln) }));
    }
    mv.push(movement(req, ln, qtyBase, localIssue, -1));
  }
  computeInvoiceTotals({
    lines: taxLines,
    headerDiscount: req.headerDiscount,
    headerCharges: req.headerCharges,
  });
  if (!free) {
    const party = partyAccount(req);
    const ar = toLocalAmt(deps, req, netSum.add(taxSum).sub(req.headerDiscount).add(req.headerCharges));
    out.unshift(line(req, { accountCode: party.code, debit: ar, analyticType: party.analyticType, analyticId: party.analyticId }));
    out.push(...creditByAccount(req, deps, revenue, req.headerCharges.sub(req.headerDiscount), "credit"));
    const vat = toLocalAmt(deps, req, taxSum);
    if (!vat.isZero()) out.push(line(req, { accountCode: need(req.accounts.vatOutput, "vatOutput"), credit: vat }));
  }
  return { lines: out, movements: mv };
}

function buildSalesReturn(req: PostDocumentRequest, deps: EngineDependencies): Built {
  const out: GlEntryLine[] = [];
  const mv: StockMovement[] = [];
  const returns = new Map<string, Decimal>();
  let netSum = Decimal.zero();
  let taxSum = Decimal.zero();
  let allFree = true;
  for (const ln of req.lines) {
    const net = ln.qty.mul(ln.price).sub(ln.lineDiscountShare);
    const tax = deps.tax.computeLineTax({
      netAmount: net,
      itemTaxLink: ln.itemTaxLink,
      isExportZeroRated: req.isExportZeroRated,
    });
    if (!ln.isFree) {
      allFree = false;
      netSum = netSum.add(net);
      taxSum = taxSum.add(tax.taxAmount);
      const retAcc = req.salesReturnPriorYear
        ? need(ln.pySalesReturnAccount, "pySalesReturnAccount")
        : need(ln.salesReturnAccount, "salesReturnAccount");
      addTo(returns, retAcc, net);
    }
    const qtyBase = ln.qty.mul(ln.packSize);
    const localCost = toLocalAmt(deps, req, qtyBase.mul(ln.currentAvg));
    const costAcc = ln.isFree
      ? need(ln.freeReturnCogsAccount, "freeReturnCogsAccount")
      : req.salesReturnPriorYear
        ? need(ln.pyCogsReturnAccount, "pyCogsReturnAccount")
        : need(ln.cogsReturnAccount, "cogsReturnAccount");
    out.push(line(req, { accountCode: need(ln.inventoryAccount, "inventoryAccount"), debit: localCost, ...lineDims(ln) }));
    out.push(line(req, { accountCode: costAcc, credit: localCost, ...lineDims(ln) }));
    mv.push(movement(req, ln, qtyBase, localCost, 1));
  }
  if (!allFree) {
    const party = partyAccount(req);
    const ar = toLocalAmt(deps, req, netSum.add(taxSum));
    out.push(line(req, { accountCode: party.code, credit: ar, analyticType: party.analyticType, analyticId: party.analyticId }));
    out.push(...creditByAccount(req, deps, returns, Decimal.zero(), "debit"));
    if (!taxSum.isZero()) {
      out.push(line(req, { accountCode: need(req.accounts.vatOutput, "vatOutput"), debit: toLocalAmt(deps, req, taxSum) }));
    }
  }
  return { lines: out, movements: mv };
}

function buildPurchase(req: PostDocumentRequest, deps: EngineDependencies): Built {
  const out: GlEntryLine[] = [];
  const mv: StockMovement[] = [];
  let stock = Decimal.zero();
  let vat = Decimal.zero();
  for (const ln of req.lines) {
    const qtyBase = ln.qty.mul(ln.packSize);
    const unit = ln.incomingUnitCost.div(ln.packSize);
    const lineVal = qtyBase.mul(unit).sub(ln.lineDiscountShare);
    const tax = deps.tax.computePurchaseTax({
      price: lineVal,
      discount: Decimal.zero(),
      pct: ln.taxPct,
      inclusiveOfTax: ln.inclusiveOfTax,
    });
    const net = ln.inclusiveOfTax ? lineVal.sub(tax) : lineVal;
    stock = stock.add(net);
    vat = vat.add(tax);
    deps.costing.recalcWeightedAverage({
      currentQty: ln.currentQty,
      currentAvg: ln.currentAvg,
      incomingQty: qtyBase,
      incomingUnitCost: qtyBase.isZero() ? Decimal.zero() : net.div(qtyBase),
    });
    const localNet = toLocalAmt(deps, req, net);
    out.push(line(req, { accountCode: need(ln.inventoryAccount, "inventoryAccount"), debit: localNet, ...lineDims(ln) }));
    mv.push(movement(req, ln, qtyBase, localNet, 1));
  }
  if (!vat.isZero()) {
    out.push(line(req, { accountCode: need(req.accounts.vatInput, "vatInput"), debit: toLocalAmt(deps, req, vat) }));
  }
  const party = partyAccount(req);
  out.push(line(req, {
    accountCode: party.code,
    credit: toLocalAmt(deps, req, stock.add(vat)),
    analyticType: party.analyticType,
    analyticId: party.analyticId,
  }));
  return { lines: out, movements: mv };
}

function buildPurchaseReturn(req: PostDocumentRequest, deps: EngineDependencies): Built {
  const out: GlEntryLine[] = [];
  const mv: StockMovement[] = [];
  let stock = Decimal.zero();
  let vat = Decimal.zero();
  let diffDr = Decimal.zero();
  let diffCr = Decimal.zero();
  for (const ln of req.lines) {
    const qtyBase = ln.qty.mul(ln.packSize);
    const unit = ln.supplierOriginalPrice;
    const lineVal = qtyBase.mul(unit);
    const tax = deps.tax.computePurchaseTax({
      price: lineVal,
      discount: Decimal.zero(),
      pct: ln.taxPct,
      inclusiveOfTax: ln.inclusiveOfTax,
    });
    const net = ln.inclusiveOfTax ? lineVal.sub(tax) : lineVal;
    stock = stock.add(net);
    vat = vat.add(tax);
    const diff = deps.costing.purchaseReturnCostDiff({
      avgCostAtReturnTime: ln.currentAvg,
      supplierOriginalPrice: unit,
      costMethod: ln.costMethod,
    });
    if ("side" in diff && !diff.amount.isZero()) {
      const amt = diff.amount.mul(qtyBase);
      if (diff.side === "debit") diffDr = diffDr.add(amt);
      else diffCr = diffCr.add(amt);
    }
    const localNet = toLocalAmt(deps, req, net);
    out.push(line(req, { accountCode: need(ln.inventoryAccount, "inventoryAccount"), credit: localNet, ...lineDims(ln) }));
    mv.push(movement(req, ln, qtyBase, localNet, -1));
  }
  if (!vat.isZero()) out.push(line(req, { accountCode: need(req.accounts.vatInput, "vatInput"), credit: toLocalAmt(deps, req, vat) }));
  const party = partyAccount(req);
  out.push(line(req, {
    accountCode: party.code,
    debit: toLocalAmt(deps, req, stock.add(vat)),
    analyticType: party.analyticType,
    analyticId: party.analyticId,
  }));
  if (!diffDr.isZero() || !diffCr.isZero()) {
    const acc = need(req.accounts.costDiffPurchaseReturn, "costDiffPurchaseReturn");
    if (!diffDr.isZero()) out.push(line(req, { accountCode: acc, debit: toLocalAmt(deps, req, diffDr) }));
    if (!diffCr.isZero()) out.push(line(req, { accountCode: acc, credit: toLocalAmt(deps, req, diffCr) }));
  }
  return { lines: out, movements: mv };
}

function buildVoucher(req: PostDocumentRequest, deps: EngineDependencies): Built {
  const out: GlEntryLine[] = [];
  const cashType: AnalyticType = (req.paymentMethod ?? "cash") === "bank" ? "bank" : "cash";
  const cash = need(req.cashAccount, "accountCode");
  for (const ln of req.lines) {
    const amt = toLocalAmt(deps, req, ln.amount);
    const partyCode = ln.accountCode.trim() || need(req.accounts.party, "party");
    const partyAnalytic = ln.analyticId ?? req.partyAnalyticId;
    const cashLine = { accountCode: cash, analyticType: cashType, analyticId: req.cashAnalyticId };
    const partyLine = { accountCode: partyCode, analyticType: ln.analyticType, analyticId: partyAnalytic, ...lineDims(ln) };
    if (req.docKind === "receipt_voucher") {
      out.push(line(req, { ...cashLine, debit: amt }));
      out.push(line(req, { ...partyLine, credit: amt }));
    } else {
      out.push(line(req, { ...partyLine, debit: amt }));
      out.push(line(req, { ...cashLine, credit: amt }));
    }
  }
  return { lines: out, movements: [] };
}

function buildManual(req: PostDocumentRequest, deps: EngineDependencies): Built {
  const lines = req.lines.map((ln) => {
    const amt = toLocalAmt(deps, req, ln.amount);
    return line(req, {
      accountCode: need(ln.accountCode, "accountCode"),
      debit: ln.side === "debit" ? amt : Decimal.zero(),
      credit: ln.side === "credit" ? amt : Decimal.zero(),
      analyticType: ln.analyticType,
      analyticId: ln.analyticId,
      ...lineDims(ln),
    });
  });
  return { lines, movements: [] };
}

function applyInterBranch(req: PostDocumentRequest, lines: GlEntryLine[]): GlEntryDraft[] {
  const ben = req.beneficiaryBranchId;
  if (ben === undefined || ben === req.branchId) {
    return [{ branchId: req.branchId, lines }];
  }
  const acc = need(req.accounts.interBranch, "interBranch");
  const party = lines.filter((l) => l.analyticType === "customer" || l.analyticType === "vendor");
  const rest = lines.filter((l) => l.analyticType !== "customer" && l.analyticType !== "vendor");
  const dr = sumSide(party, "debit");
  const cr = sumSide(party, "credit");
  const mainIb =
    dr.gt(cr) || dr.eq(cr)
      ? line(req, { accountCode: acc, debit: dr.sub(cr), generated: true })
      : line(req, { accountCode: acc, credit: cr.sub(dr), generated: true });
  const main = rest.concat([mainIb]);
  const secondIb =
    cr.gt(dr)
      ? line(req, { accountCode: acc, debit: cr.sub(dr), branchId: ben, generated: true })
      : line(req, { accountCode: acc, credit: dr.sub(cr), branchId: ben, generated: true });
  const second: GlEntryLine[] = party.map((l) => ({ ...l, branchId: ben, isGenerated: true })).concat([secondIb]);
  return [
    { branchId: req.branchId, lines: main },
    { branchId: ben, lines: second },
  ];
}

function withFiscalYear(n: NumberingRequest, fiscalYearId: number): NumberingRequest {
  const s = n.scope;
  if (s.kind === "per_branch_year" || s.kind === "per_branch_year_type") {
    return { ...n, scope: { ...s, fiscalYearId } };
  }
  return n;
}

/**
 * الترتيب مقصود: كل فحص يسبق حجز الرقم، فالرفض لا يستهلك رقماً (INV-10)،
 * والرقم يُحجز للمعلّق والمرحّل كليهما لأن الوثيقة تُحفظ في الحالتين.
 */
export function postDocument(
  req: PostDocumentRequest,
  deps: EngineDependencies,
  store: PostingStore,
): PostDocumentResult {
  if (!Number.isInteger(req.branchId) || req.branchId <= 0) throw new DomainError("ONYX-4048", `${onyxError(4048).message} — الفرع`);
  const period = deps.periodLock.assertPeriodOpen({
    branchId: req.branchId,
    docDate: req.docDate,
    affectsStock: STOCK_KINDS.has(req.docKind),
  });
  if (!period.open) throw new DomainError("PERIOD_CLOSED", "period");
  if (req.beneficiaryBranchId !== undefined && req.beneficiaryBranchId !== req.branchId) {
    deps.periodLock.assertPeriodOpen({
      branchId: req.beneficiaryBranchId,
      docDate: req.docDate,
      affectsStock: false,
    });
  }
  const lim = deps.currency.assertWithinRateLimits({ currencyId: req.currencyId, rateUsed: req.fxRate });
  if (!lim.ok) throw new DomainError("FX_LIMIT", "rate");
  if (req.lines.length === 0) throw new DomainError("ONYX-4048", `${onyxError(4048).message} — لا أسطر`);
  if (STOCK_KINDS.has(req.docKind)) for (const ln of req.lines) assertStockLine(ln);

  let built: Built;
  switch (req.docKind) {
    case "stock_receipt":
    case "stock_issue":
    case "stock_transfer":
    case "stock_transfer_receipt":
      built = buildStock(req, deps);
      break;
    case "sales_invoice":
      built = buildSales(req, deps);
      break;
    case "sales_return":
      built = buildSalesReturn(req, deps);
      break;
    case "purchase_invoice":
      built = buildPurchase(req, deps);
      break;
    case "purchase_return":
      built = buildPurchaseReturn(req, deps);
      break;
    case "receipt_voucher":
    case "payment_voucher":
      built = buildVoucher(req, deps);
      break;
    case "manual_journal":
    case "opening_balance":
      built = buildManual(req, deps);
      break;
  }

  for (const ln of built.lines) {
    if (ln.debit.isNegative() || ln.credit.isNegative()) throw new DomainError("ONYX-7438", onyxError(7438).message);
    assertAnalytic(ln);
  }

  const entries = applyInterBranch(req, built.lines);
  const allLines = entries.flatMap((e) => e.lines);
  deps.lineGuard?.(allLines);

  /* INV-1 لكل قيد على حدة — القيد الفرعي للفرع المستفيد يتوازن وحده */
  let imbalance = Decimal.zero();
  for (const e of entries) {
    const diff = sumSide(e.lines, "debit").sub(sumSide(e.lines, "credit"));
    if (!diff.isZero()) imbalance = diff;
  }
  const allowUnbalanced = req.docKind === "opening_balance";

  const numbered = deps.numbering.nextNumber(withFiscalYear(req.numbering, period.fiscalYearId));

  let icv: number | null = req.existingIcv;
  if (req.issueEinvoice && !req.skipIcv && req.existingIcv === null) {
    icv = deps.numbering.nextNumber({
      entity: "einvoice_icv",
      scope: { kind: "group_sequence", groupCode: req.docKind === "sales_return" ? "note" : "invoice" },
    }).number;
  }

  if (!imbalance.isZero() && !allowUnbalanced) {
    return { status: "pending", documentNumber: numbered.number, fiscalYearId: period.fiscalYearId, periodId: period.periodId, imbalance, movements: built.movements, icv };
  }

  const glEntryId = store.nextGlId();
  store.savePosted(glEntryId, allLines);
  return {
    status: "posted",
    documentNumber: numbered.number,
    fiscalYearId: period.fiscalYearId,
    periodId: period.periodId,
    glEntryId,
    lines: allLines,
    entries,
    movements: built.movements,
    icv,
  };
}

void computeLineTax;
