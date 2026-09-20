import { Decimal, d } from "../shared-kernel/decimal.ts";
import { DomainError } from "../shared-kernel/errors.ts";

export interface ConvertRequest {
  amount: Decimal;
  currencyId: number;
  rate: Decimal;
  operator: "mul" | "div";
}

export function toLocal(req: ConvertRequest): Decimal {
  if (req.operator === "div") {
    if (req.rate.isZero()) throw new DomainError("FX_RATE", "zero rate");
    return req.amount.div(req.rate);
  }
  return req.amount.mul(req.rate);
}

export interface RateLimitCheck {
  currencyId: number;
  rateUsed: Decimal;
}

export type RateLimitResult = { ok: true } | { ok: false; min: Decimal; max: Decimal };

export interface CurrencyLimits {
  min: Decimal;
  max: Decimal;
}

export function assertWithinRateLimits(
  req: RateLimitCheck,
  limits: Record<number, CurrencyLimits>,
): RateLimitResult {
  const lim = limits[req.currencyId];
  if (!lim) return { ok: true };
  if (req.rateUsed.lt(lim.min) || req.rateUsed.gt(lim.max)) {
    return { ok: false, min: lim.min, max: lim.max };
  }
  return { ok: true };
}

export function deriveRateFromAmounts(localAmount: Decimal, foreignAmount: Decimal): Decimal {
  if (foreignAmount.isZero()) throw new DomainError("FX_RATE", "foreign zero");
  return localAmount.div(foreignAmount);
}

export interface CurrencyEngine {
  toLocal(req: ConvertRequest): Decimal;
  assertWithinRateLimits(req: RateLimitCheck): RateLimitResult;
}

export function currencyEngine(limits: Record<number, CurrencyLimits>): CurrencyEngine {
  return {
    toLocal,
    assertWithinRateLimits(req) {
      const r = assertWithinRateLimits(req, limits);
      if (!r.ok) throw new DomainError("FX_LIMIT", `${r.min.toString()}..${r.max.toString()}`);
      return r;
    },
  };
}

void d;
