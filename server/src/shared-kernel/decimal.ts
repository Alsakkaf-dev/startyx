/** عشري دقيق — ممنوع number/float لأي مبلغ. تقريب الأنصاف بعيداً عن الصفر (Oracle ROUND). */

const INTERNAL = 18;

export class Decimal {
  /** قيمة غير مقيّسة على 10^INTERNAL */
  readonly unscaled: bigint;

  private constructor(unscaled: bigint) {
    this.unscaled = unscaled;
  }

  static zero(): Decimal {
    return new Decimal(0n);
  }

  static from(input: string | Decimal): Decimal {
    if (input instanceof Decimal) return input;
    const t = input.trim();
    if (!t || t === "+" || t === "-") {
      throw new Error("DECIMAL_EMPTY");
    }
    const neg = t.startsWith("-");
    const raw = neg || t.startsWith("+") ? t.slice(1) : t;
    if (!/^\d+(\.\d+)?$/.test(raw)) {
      throw new Error("DECIMAL_BAD:" + t);
    }
    const [ip, fp = ""] = raw.split(".");
    const frac = (fp + "0".repeat(INTERNAL)).slice(0, INTERNAL);
    const dropped = fp.slice(INTERNAL);
    let n = BigInt(ip || "0") * pow10(INTERNAL) + BigInt(frac || "0");
    if (dropped.length > 0 && halfUpExtra(dropped, n !== 0n || ip !== "0")) {
      n += 1n;
    }
    return new Decimal(neg ? -n : n);
  }

  static fromInt(n: number): Decimal {
    if (!Number.isInteger(n)) throw new Error("DECIMAL_NOT_INT");
    return new Decimal(BigInt(n) * pow10(INTERNAL));
  }

  add(o: Decimal): Decimal {
    return new Decimal(this.unscaled + o.unscaled);
  }

  sub(o: Decimal): Decimal {
    return new Decimal(this.unscaled - o.unscaled);
  }

  mul(o: Decimal): Decimal {
    const p = this.unscaled * o.unscaled;
    return new Decimal(divRoundHalfAway(p, pow10(INTERNAL)));
  }

  div(o: Decimal): Decimal {
    if (o.unscaled === 0n) throw new Error("DECIMAL_DIV0");
    const p = this.unscaled * pow10(INTERNAL);
    return new Decimal(divRoundHalfAway(p, o.unscaled));
  }

  neg(): Decimal {
    return new Decimal(-this.unscaled);
  }

  abs(): Decimal {
    return this.unscaled < 0n ? this.neg() : this;
  }

  cmp(o: Decimal): number {
    if (this.unscaled < o.unscaled) return -1;
    if (this.unscaled > o.unscaled) return 1;
    return 0;
  }

  eq(o: Decimal): boolean {
    return this.unscaled === o.unscaled;
  }

  lt(o: Decimal): boolean {
    return this.cmp(o) < 0;
  }

  lte(o: Decimal): boolean {
    return this.cmp(o) <= 0;
  }

  gt(o: Decimal): boolean {
    return this.cmp(o) > 0;
  }

  gte(o: Decimal): boolean {
    return this.cmp(o) >= 0;
  }

  isZero(): boolean {
    return this.unscaled === 0n;
  }

  isNegative(): boolean {
    return this.unscaled < 0n;
  }

  /** Oracle ROUND(n, places) — نصف بعيد عن الصفر. */
  round(places: number): Decimal {
    if (places < 0 || places > INTERNAL) throw new Error("DECIMAL_PLACES");
    const drop = INTERNAL - places;
    if (drop === 0) return this;
    const f = pow10(drop);
    return new Decimal(divRoundHalfAway(this.unscaled, f) * f);
  }

  toFixed(places: number): string {
    const r = this.round(places);
    const neg = r.unscaled < 0n;
    const a = neg ? -r.unscaled : r.unscaled;
    const ip = a / pow10(INTERNAL);
    let fp = (a % pow10(INTERNAL)).toString().padStart(INTERNAL, "0").slice(0, places);
    if (places === 0) return (neg ? "-" : "") + ip.toString();
    return (neg ? "-" : "") + ip.toString() + "." + fp;
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    const neg = this.unscaled < 0n;
    const a = neg ? -this.unscaled : this.unscaled;
    const ip = a / pow10(INTERNAL);
    let fp = (a % pow10(INTERNAL)).toString().padStart(INTERNAL, "0").replace(/0+$/, "");
    const s = fp.length ? ip.toString() + "." + fp : ip.toString();
    return neg ? "-" + s : s;
  }
}

function pow10(n: number): bigint {
  return 10n ** BigInt(n);
}

function divRoundHalfAway(n: bigint, d: bigint): bigint {
  const neg = n < 0n !== d < 0n;
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const q = an / ad;
  const r = an % ad;
  const extra = r * 2n >= ad ? q + 1n : q;
  return neg ? -extra : extra;
}

function halfUpExtra(dropped: string, _nonzero: boolean): boolean {
  if (!dropped.length) return false;
  const first = dropped.charCodeAt(0) - 48;
  if (first > 5) return true;
  if (first < 5) return false;
  return dropped.slice(1).split("").some((c) => c !== "0") || true;
}

export const D0 = Decimal.zero();
export const COST_SCALE = 6;
export function d(s: string): Decimal {
  return Decimal.from(s);
}
