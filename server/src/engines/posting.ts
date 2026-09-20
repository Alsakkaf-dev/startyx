import { Decimal, d } from "../shared-kernel/decimal.ts";
import { DomainError } from "../shared-kernel/errors.ts";
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

export const ACCOUNTS = {
  customers: "1203010001",
  sales: "4101010001",
  vatOut: "2202070001",
  vatIn: "1204010001",
  cogs: "3101010001",
  inventory: "1202010001",
  cashAdmin: "1201010001",
  cashReps: "1201010002",
  chequeClearing: "1201020005",
  salesReturn: "4101020001",
  cogsReturn: "3101040001",
  priorYearReturn: "3101020001",
  freeQtyCost: "3101050001",
  freeQtyReturnCost: "3101050002",
  transferClearing: "1202010010",
  vendors: "2101010001",
  costDiff: "3101060001",
} as const;

export interface RawLine {
  qty: Decimal;
  price: Decimal;
  lineDiscountShare: Decimal;
  itemTaxLink: ItemTaxLink | null;
  inventoryAccount: string;
  cogsAccount: string;
  headerAccount: string;
  analyticType: AnalyticType;
  analyticId: number | null;
  accountCode: string;
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
  return {
    qty: Decimal.zero(),
    price: Decimal.zero(),
    lineDiscountShare: Decimal.zero(),
    itemTaxLink: null,
    inventoryAccount: ACCOUNTS.inventory,
    cogsAccount: ACCOUNTS.cogs,
    headerAccount: ACCOUNTS.inventory,
    analyticType: "general",
    analyticId: null,
    accountCode: ACCOUNTS.inventory,
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
    ...over,
  };
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
  interBranchAccount?: string;
  numbering: NumberingRequest;
  isExportZeroRated: boolean;
  salesReturnPriorYear: boolean;
  freeQtyCostAccount: string;
  issueEinvoice: boolean;
  existingIcv: number | null;
  cashAccount: string;
  partyAnalyticId: number | null;
  skipIcv: boolean;
}

export interface GlEntryLine {
  accountCode: string;
  debit: Decimal;
  credit: Decimal;
  analyticType: AnalyticType;
  analyticId: number | null;
  branchId: number;
  isGenerated: boolean;
}

export interface GlEntryDraft {
  branchId: number;
  lines: GlEntryLine[];
}

export type PostDocumentResult =
  | { status: "posted"; documentNumber: number; glEntryId: number; lines: GlEntryLine[]; entries: GlEntryDraft[]; icv: number | null }
  | { status: "pending"; documentNumber: number; imbalance: Decimal; icv: number | null };

export interface EngineDependencies {
  numbering: NumberingEngine;
  periodLock: PeriodAndLockEngine;
  currency: CurrencyEngine;
  tax: TaxEngine;
  pricing: PricingEngine;
  costing: CostingEngine;
}

export interface PostingStore {
  nextGlId(): number;
  savePosted(id: number, lines: GlEntryLine[]): void;
}

export interface DbTransaction {
  numberingStore: { lockAndNext(key: string): number };
}

const ANALYTIC_REQUIRED: ReadonlySet<AnalyticType> = new Set(["customer", "vendor", "cash", "bank", "employee"]);

function partyAccount(req: PostDocumentRequest, credit: boolean): { code: string; analyticType: AnalyticType } {
  const pm = req.paymentMethod ?? "credit";
  if (pm === "cash") return { code: req.cashAccount, analyticType: "cash" };
  if (pm === "bank") return { code: req.cashAccount, analyticType: "bank" };
  if (pm === "cheque") return { code: ACCOUNTS.chequeClearing, analyticType: "general" };
  if (credit) return { code: ACCOUNTS.vendors, analyticType: "vendor" };
  return { code: ACCOUNTS.customers, analyticType: "customer" };
}

function line(p: {
  accountCode: string;
  debit?: Decimal;
  credit?: Decimal;
  analyticType?: AnalyticType;
  analyticId?: number | null;
  branchId: number;
  generated?: boolean;
}): GlEntryLine {
  const debit = p.debit ?? Decimal.zero();
  const credit = p.credit ?? Decimal.zero();
  return {
    accountCode: p.accountCode,
    debit,
    credit,
    analyticType: p.analyticType ?? "general",
    analyticId: p.analyticId ?? null,
    branchId: p.branchId,
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
    throw new DomainError("ANALYTIC_REQUIRED", "GL-R37");
  }
}

function sumSide(lines: GlEntryLine[], side: "debit" | "credit"): Decimal {
  return lines.reduce((a, ln) => a.add(side === "debit" ? ln.debit : ln.credit), Decimal.zero());
}

function buildStock(req: PostDocumentRequest, deps: EngineDependencies): GlEntryLine[] {
  const out: GlEntryLine[] = [];
  for (const ln of req.lines) {
    if (ln.analyticType === "customer" && (req.docKind === "stock_issue" || req.docKind === "stock_receipt")) {
      throw new DomainError("FORBIDDEN_STOCK_CUSTOMER", "IV-D37");
    }
    const qtyBase = ln.qty.mul(ln.packSize);
    const cost = req.docKind === "stock_receipt"
      ? qtyBase.mul(ln.incomingUnitCost.div(ln.packSize))
      : deps.costing.applyIssueCost(qtyBase, ln.currentAvg);
    const local = toLocalAmt(deps, req, cost);
    if (req.docKind === "stock_receipt") {
      out.push(line({ accountCode: ln.inventoryAccount, debit: local, branchId: req.branchId }));
      out.push(line({ accountCode: ln.headerAccount, credit: local, branchId: req.branchId, analyticType: ln.analyticType, analyticId: ln.analyticId }));
    } else if (req.docKind === "stock_issue") {
      out.push(line({ accountCode: ln.headerAccount, debit: local, branchId: req.branchId, analyticType: ln.analyticType, analyticId: ln.analyticId }));
      out.push(line({ accountCode: ln.inventoryAccount, credit: local, branchId: req.branchId }));
    } else if (req.docKind === "stock_transfer") {
      out.push(line({ accountCode: ACCOUNTS.transferClearing, debit: local, branchId: req.branchId }));
      out.push(line({ accountCode: ln.inventoryAccount, credit: local, branchId: req.branchId }));
    } else {
      out.push(line({ accountCode: ln.inventoryAccount, debit: local, branchId: req.branchId }));
      out.push(line({ accountCode: ACCOUNTS.transferClearing, credit: local, branchId: req.branchId }));
    }
    if (req.docKind === "stock_receipt") {
      deps.costing.recalcWeightedAverage({
        currentQty: ln.currentQty,
        currentAvg: ln.currentAvg,
        incomingQty: qtyBase,
        incomingUnitCost: ln.incomingUnitCost.div(ln.packSize),
      });
    }
  }
  return out;
}

function buildSales(req: PostDocumentRequest, deps: EngineDependencies): GlEntryLine[] {
  const out: GlEntryLine[] = [];
  const taxLines: { qty: Decimal; price: Decimal; lineDiscountShare: Decimal; lineTax: Decimal }[] = [];
  let netSum = Decimal.zero();
  let taxSum = Decimal.zero();
  let cogsSum = Decimal.zero();
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
    }
    const issue = deps.costing.applyIssueCost(ln.qty, ln.currentAvg);
    cogsSum = cogsSum.add(issue);
    const cogsAcc = ln.isFree ? req.freeQtyCostAccount : ln.cogsAccount;
    if (!issue.isZero()) {
      out.push(line({ accountCode: cogsAcc, debit: toLocalAmt(deps, req, issue), branchId: req.branchId }));
      out.push(line({ accountCode: ln.inventoryAccount, credit: toLocalAmt(deps, req, issue), branchId: req.branchId }));
    }
  }
  computeInvoiceTotals({
    lines: taxLines,
    headerDiscount: req.headerDiscount,
    headerCharges: req.headerCharges,
  });
  if (!free) {
    const ar = toLocalAmt(deps, req, netSum.add(taxSum).sub(req.headerDiscount).add(req.headerCharges));
    const party = partyAccount(req, false);
    out.unshift(
      line({
        accountCode: party.code,
        debit: ar,
        branchId: req.branchId,
        analyticType: party.analyticType,
        analyticId: party.analyticType === "customer" || party.analyticType === "cash" || party.analyticType === "bank" ? req.partyAnalyticId : null,
      }),
    );
    const sales = toLocalAmt(deps, req, netSum.sub(req.headerDiscount).add(req.headerCharges));
    if (!sales.isZero()) out.push(line({ accountCode: ACCOUNTS.sales, credit: sales, branchId: req.branchId }));
    const vat = toLocalAmt(deps, req, taxSum);
    if (!vat.isZero()) out.push(line({ accountCode: ACCOUNTS.vatOut, credit: vat, branchId: req.branchId }));
  }
  return out;
}

function buildSalesReturn(req: PostDocumentRequest, deps: EngineDependencies): GlEntryLine[] {
  const out: GlEntryLine[] = [];
  let netSum = Decimal.zero();
  let taxSum = Decimal.zero();
  let allFree = true;
  const retAcc = req.salesReturnPriorYear ? ACCOUNTS.priorYearReturn : ACCOUNTS.salesReturn;
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
    }
    const cost = ln.qty.mul(ln.currentAvg);
    const localCost = toLocalAmt(deps, req, cost);
    const invAcc = ln.inventoryAccount;
    const costAcc = ln.isFree ? ACCOUNTS.freeQtyReturnCost : ACCOUNTS.cogsReturn;
    out.push(line({ accountCode: invAcc, debit: localCost, branchId: req.branchId }));
    out.push(line({ accountCode: costAcc, credit: localCost, branchId: req.branchId }));
  }
  if (!allFree) {
    const party = partyAccount(req, false);
    const ar = toLocalAmt(deps, req, netSum.add(taxSum));
    out.push(line({
      accountCode: party.code,
      credit: ar,
      branchId: req.branchId,
      analyticType: party.analyticType,
      analyticId: req.partyAnalyticId,
    }));
    out.push(line({ accountCode: retAcc, debit: toLocalAmt(deps, req, netSum), branchId: req.branchId }));
    if (!taxSum.isZero()) {
      out.push(line({ accountCode: ACCOUNTS.vatOut, debit: toLocalAmt(deps, req, taxSum), branchId: req.branchId }));
    }
  }
  return out;
}

function buildPurchase(req: PostDocumentRequest, deps: EngineDependencies): GlEntryLine[] {
  const out: GlEntryLine[] = [];
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
    out.push(line({ accountCode: ln.inventoryAccount, debit: toLocalAmt(deps, req, net), branchId: req.branchId }));
  }
  if (!vat.isZero()) {
    out.push(line({ accountCode: ACCOUNTS.vatIn, debit: toLocalAmt(deps, req, vat), branchId: req.branchId }));
  }
  const party = partyAccount(req, true);
  const cr = toLocalAmt(deps, req, stock.add(vat));
  out.push(line({
    accountCode: party.code,
    credit: cr,
    branchId: req.branchId,
    analyticType: party.analyticType,
    analyticId: party.analyticType === "vendor" || party.analyticType === "cash" || party.analyticType === "bank" ? req.partyAnalyticId : null,
  }));
  return out;
}

function buildPurchaseReturn(req: PostDocumentRequest, deps: EngineDependencies): GlEntryLine[] {
  const out: GlEntryLine[] = [];
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
    out.push(line({ accountCode: ln.inventoryAccount, credit: toLocalAmt(deps, req, net), branchId: req.branchId }));
  }
  if (!vat.isZero()) out.push(line({ accountCode: ACCOUNTS.vatIn, credit: toLocalAmt(deps, req, vat), branchId: req.branchId }));
  const party = partyAccount(req, true);
  out.push(line({
    accountCode: party.code,
    debit: toLocalAmt(deps, req, stock.add(vat)),
    branchId: req.branchId,
    analyticType: party.analyticType,
    analyticId: req.partyAnalyticId,
  }));
  if (!diffDr.isZero()) out.push(line({ accountCode: ACCOUNTS.costDiff, debit: toLocalAmt(deps, req, diffDr), branchId: req.branchId }));
  if (!diffCr.isZero()) out.push(line({ accountCode: ACCOUNTS.costDiff, credit: toLocalAmt(deps, req, diffCr), branchId: req.branchId }));
  return out;
}

function buildVoucher(req: PostDocumentRequest): GlEntryLine[] {
  const out: GlEntryLine[] = [];
  for (const ln of req.lines) {
    const amt = ln.amount;
    if (req.docKind === "receipt_voucher") {
      out.push(line({
        accountCode: req.cashAccount,
        debit: amt,
        branchId: req.branchId,
        analyticType: (req.paymentMethod ?? "cash") === "bank" ? "bank" : "cash",
        analyticId: ln.analyticId,
      }));
      out.push(line({
        accountCode: ln.accountCode || ACCOUNTS.customers,
        credit: amt,
        branchId: req.branchId,
        analyticType: ln.analyticType,
        analyticId: ln.analyticId ?? req.partyAnalyticId,
      }));
    } else {
      out.push(line({
        accountCode: ln.accountCode || ACCOUNTS.vendors,
        debit: amt,
        branchId: req.branchId,
        analyticType: ln.analyticType,
        analyticId: ln.analyticId ?? req.partyAnalyticId,
      }));
      out.push(line({
        accountCode: req.cashAccount,
        credit: amt,
        branchId: req.branchId,
        analyticType: (req.paymentMethod ?? "cash") === "bank" ? "bank" : "cash",
        analyticId: ln.analyticId,
      }));
    }
  }
  return out;
}

function buildManual(req: PostDocumentRequest): GlEntryLine[] {
  return req.lines.map((ln) =>
    line({
      accountCode: ln.accountCode,
      debit: ln.side === "debit" ? ln.amount : Decimal.zero(),
      credit: ln.side === "credit" ? ln.amount : Decimal.zero(),
      analyticType: ln.analyticType,
      analyticId: ln.analyticId,
      branchId: req.branchId,
    }),
  );
}

function applyInterBranch(req: PostDocumentRequest, lines: GlEntryLine[]): GlEntryDraft[] {
  const ben = req.beneficiaryBranchId;
  if (ben === undefined || ben === req.branchId) {
    return [{ branchId: req.branchId, lines }];
  }
  const acc = req.interBranchAccount;
  if (!acc) throw new DomainError("INTER_BRANCH_ACCOUNT", "GL-R38");
  const party = lines.filter((l) => l.analyticType === "customer" || l.analyticType === "vendor");
  const rest = lines.filter((l) => l.analyticType !== "customer" && l.analyticType !== "vendor");
  const dr = sumSide(party, "debit");
  const cr = sumSide(party, "credit");
  const mainIb =
    dr.gt(cr) || dr.eq(cr)
      ? line({ accountCode: acc, debit: dr.sub(cr), branchId: req.branchId, generated: true })
      : line({ accountCode: acc, credit: cr.sub(dr), branchId: req.branchId, generated: true });
  const main = rest.concat([mainIb]);
  const secondIb =
    cr.gt(dr)
      ? line({ accountCode: acc, debit: cr.sub(dr), branchId: ben, generated: true })
      : line({ accountCode: acc, credit: dr.sub(cr), branchId: ben, generated: true });
  const second: GlEntryLine[] = party.map((l) => ({ ...l, branchId: ben, isGenerated: true })).concat([secondIb]);
  return [
    { branchId: req.branchId, lines: main },
    { branchId: ben, lines: second },
  ];
}

export function postDocument(
  req: PostDocumentRequest,
  deps: EngineDependencies,
  store: PostingStore,
): PostDocumentResult {
  const numbered = deps.numbering.nextNumber(req.numbering);
  deps.periodLock.assertPeriodOpen({ branchId: req.branchId, docDate: req.docDate });
  const lim = deps.currency.assertWithinRateLimits({ currencyId: req.currencyId, rateUsed: req.fxRate });
  if (!lim.ok) throw new DomainError("FX_LIMIT", "rate");

  let built: GlEntryLine[];
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
      built = buildVoucher(req);
      break;
    case "manual_journal":
    case "opening_balance":
      built = buildManual(req);
      break;
  }

  for (const ln of built) assertAnalytic(ln);

  const entries = applyInterBranch(req, built);
  const allLines = entries.flatMap((e) => e.lines);
  const dr = sumSide(allLines, "debit");
  const cr = sumSide(allLines, "credit");
  const imbalance = dr.sub(cr);
  const allowUnbalanced = req.docKind === "opening_balance";

  let icv: number | null = req.existingIcv;
  if (req.issueEinvoice && !req.skipIcv && req.existingIcv === null) {
    icv = deps.numbering.nextNumber({
      entity: "einvoice_icv",
      scope: { kind: "group_sequence", groupCode: req.docKind === "sales_return" ? "note" : "invoice" },
    }).number;
  }

  if (!imbalance.isZero() && !allowUnbalanced) {
    return { status: "pending", documentNumber: numbered.number, imbalance, icv };
  }

  const glEntryId = store.nextGlId();
  store.savePosted(glEntryId, allLines);
  return { status: "posted", documentNumber: numbered.number, glEntryId, lines: allLines, entries, icv };
}

void computeLineTax;
void d;
