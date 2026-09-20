import { Decimal, d } from "../shared-kernel/decimal.ts";
import { DomainError } from "../shared-kernel/errors.ts";

export interface ItemTaxLink {
  taxTypeId: number;
  pct: Decimal;
  zatcaCategory: "S" | "Z" | "E" | "O";
  exemptionReasonCode?: string;
}

export interface LineTaxRequest {
  netAmount: Decimal;
  itemTaxLink: ItemTaxLink | null;
  isExportZeroRated: boolean;
}

export interface LineTaxResult {
  taxAmount: Decimal;
  appliedPct: Decimal;
  appliedCategory: "S" | "Z" | "E" | "O" | null;
}

export function computeLineTax(req: LineTaxRequest): LineTaxResult {
  if (req.isExportZeroRated || !req.itemTaxLink) {
    return { taxAmount: Decimal.zero(), appliedPct: Decimal.zero(), appliedCategory: req.isExportZeroRated ? "Z" : null };
  }
  const link = req.itemTaxLink;
  if (link.zatcaCategory !== "S" && !link.exemptionReasonCode) {
    throw new DomainError("TAX_EXEMPTION_REQUIRED", "TX-R12");
  }
  const taxAmount = req.netAmount.mul(link.pct);
  return {
    taxAmount,
    appliedPct: link.pct,
    appliedCategory: link.zatcaCategory,
  };
}

export interface InvoiceTotalsRequest {
  lines: { qty: Decimal; price: Decimal; lineDiscountShare: Decimal; lineTax: Decimal }[];
  headerDiscount: Decimal;
  headerCharges: Decimal;
}

export interface InvoiceTotals {
  value: Decimal;
  tax: Decimal;
  total: Decimal;
}

export function computeInvoiceTotals(req: InvoiceTotalsRequest): InvoiceTotals {
  let value = Decimal.zero();
  let tax = Decimal.zero();
  for (const ln of req.lines) {
    value = value.add(ln.qty.mul(ln.price));
    tax = tax.add(ln.lineTax);
  }
  const total = value.sub(req.headerDiscount).add(req.headerCharges).add(tax);
  return { value, tax, total };
}

export interface PurchaseTaxRequest {
  price: Decimal;
  discount: Decimal;
  pct: Decimal;
  inclusiveOfTax: boolean;
}

export function computePurchaseTax(req: PurchaseTaxRequest): Decimal {
  const base = req.price.sub(req.discount);
  if (req.inclusiveOfTax) {
    const one = d("1");
    const net = base.div(one.add(req.pct));
    return base.sub(net);
  }
  return base.mul(req.pct);
}

export function isValidVatNumber(vat: string): boolean {
  return /^3\d{13}3$/.test(vat);
}

export interface TaxEngine {
  computeLineTax(req: LineTaxRequest): LineTaxResult;
  computeInvoiceTotals(req: InvoiceTotalsRequest): InvoiceTotals;
  computePurchaseTax(req: PurchaseTaxRequest): Decimal;
}

export const taxEngine: TaxEngine = {
  computeLineTax,
  computeInvoiceTotals,
  computePurchaseTax,
};
