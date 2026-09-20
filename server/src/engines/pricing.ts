import { Decimal, d } from "../shared-kernel/decimal.ts";

export function autoPriceFromCost(
  baseCost: Decimal,
  marginPct: Decimal,
  taxInclusive: boolean,
  taxPct: Decimal,
): Decimal {
  const one = d("1");
  const base = taxInclusive ? baseCost.mul(one.add(taxPct)) : baseCost;
  return base.mul(one.add(marginPct));
}

export interface PriceLimitCheck {
  enteredPrice: Decimal;
  min: Decimal;
  max: Decimal;
}

export type PriceLimitResult =
  | { withinLimits: true }
  | { withinLimits: false; snapshotMin: Decimal; snapshotMax: Decimal };

export function checkPriceLimits(req: PriceLimitCheck): PriceLimitResult {
  if (req.enteredPrice.lt(req.min) || req.enteredPrice.gt(req.max)) {
    return { withinLimits: false, snapshotMin: req.min, snapshotMax: req.max };
  }
  return { withinLimits: true };
}

export type OverridePolicy = "deny" | "allow" | "allow_with_warning";

export interface CreditLimitCheck {
  currentBalance: Decimal;
  newDocAmount: Decimal;
  hardLimit: Decimal;
  overridePct: Decimal;
  policy: OverridePolicy;
  userHasOverridePrivilege: boolean;
}

export type CreditLimitResult = { ok: true } | { ok: false; highestAvailable: Decimal };

export function checkCreditLimit(req: CreditLimitCheck): CreditLimitResult {
  if (req.userHasOverridePrivilege) return { ok: true };
  const one = d("1");
  const highest =
    req.policy === "deny" ? req.hardLimit : req.hardLimit.mul(one.add(req.overridePct));
  const next = req.currentBalance.add(req.newDocAmount);
  if (next.gt(highest)) return { ok: false, highestAvailable: highest };
  return { ok: true };
}

export interface PeriodicSalesCheck {
  periodTotal: Decimal;
  newDocAmount: Decimal;
  localCap: Decimal;
}

export function checkPeriodicSalesCap(req: PeriodicSalesCheck): boolean {
  return req.periodTotal.add(req.newDocAmount).lte(req.localCap);
}

export interface PricingEngine {
  checkPriceLimits(req: PriceLimitCheck): PriceLimitResult;
  checkCreditLimit(req: CreditLimitCheck): CreditLimitResult;
}

export const pricingEngine: PricingEngine = {
  checkPriceLimits,
  checkCreditLimit,
};
