import { Decimal, COST_SCALE } from "../shared-kernel/decimal.ts";

export interface RecalcAverageRequest {
  currentQty: Decimal;
  currentAvg: Decimal;
  incomingQty: Decimal;
  incomingUnitCost: Decimal;
}

export function recalcWeightedAverage(req: RecalcAverageRequest): Decimal {
  if (req.currentQty.lte(Decimal.zero())) {
    return req.incomingUnitCost.round(COST_SCALE);
  }
  const num = req.currentQty.mul(req.currentAvg).add(req.incomingQty.mul(req.incomingUnitCost));
  const den = req.currentQty.add(req.incomingQty);
  if (den.isZero()) return req.currentAvg.round(COST_SCALE);
  return num.div(den).round(COST_SCALE);
}

export interface FreeQtyDistributionRequest {
  purchasedQty: Decimal;
  purchasedPrice: Decimal;
  freeQty: Decimal;
}

export function unitCostAfterFreeQtyDistribution(req: FreeQtyDistributionRequest): Decimal {
  const den = req.purchasedQty.add(req.freeQty);
  if (den.isZero()) return Decimal.zero();
  return req.purchasedQty.mul(req.purchasedPrice).div(den);
}

export interface HeaderDiscountAllocationRequest {
  lineValue: Decimal;
  totalLinesValue: Decimal;
  headerDiscount: Decimal;
}

export function lineDiscountShare(req: HeaderDiscountAllocationRequest): Decimal {
  if (req.totalLinesValue.isZero()) return Decimal.zero();
  return req.headerDiscount.mul(req.lineValue.div(req.totalLinesValue));
}

export interface PurchaseReturnCostDiffRequest {
  avgCostAtReturnTime: Decimal;
  supplierOriginalPrice: Decimal;
  costMethod: "supplier_price" | "final_avg_cost" | "last_supply_price";
}

export type CostDiffResult = { amount: Decimal; side: "debit" | "credit" } | { amount: Decimal };

export function purchaseReturnCostDiff(req: PurchaseReturnCostDiffRequest): CostDiffResult {
  if (req.costMethod === "final_avg_cost") return { amount: Decimal.zero() };
  const diff = req.avgCostAtReturnTime.sub(req.supplierOriginalPrice);
  if (diff.isZero()) return { amount: Decimal.zero() };
  if (diff.gt(Decimal.zero())) return { amount: diff, side: "debit" };
  return { amount: diff.abs(), side: "credit" };
}

export interface CostingEngine {
  recalcWeightedAverage(req: RecalcAverageRequest): Decimal;
  applyIssueCost(qty: Decimal, currentAvg: Decimal): Decimal;
  unitCostAfterFreeQtyDistribution(req: FreeQtyDistributionRequest): Decimal;
  lineDiscountShare(req: HeaderDiscountAllocationRequest): Decimal;
  purchaseReturnCostDiff(req: PurchaseReturnCostDiffRequest): CostDiffResult;
}

export const costingEngine: CostingEngine = {
  recalcWeightedAverage,
  applyIssueCost(qty, currentAvg) {
    return qty.mul(currentAvg);
  },
  unitCostAfterFreeQtyDistribution,
  lineDiscountShare,
  purchaseReturnCostDiff,
};
