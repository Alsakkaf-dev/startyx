import { PeriodClosedError } from "../shared-kernel/errors.ts";

export interface PeriodCheckRequest {
  branchId: number;
  docDate: Date;
}

export type PeriodCheckResult =
  | { open: true; periodId: number }
  | { open: false; reason: "not_generated" | "closed_inventory" | "closed_full" };

export interface PeriodRow {
  periodId: number;
  fiscalYearId: number;
  branchId: number;
  fromDate: Date;
  toDate: Date;
  inventoryClosed: boolean;
  glClosed: boolean;
  closeStep: CloseStep | "none";
  pendingDocs: number;
}

export type CloseStep = "inventory" | "profit_and_loss" | "annual" | "open_new_year";

export interface PeriodStore {
  findCovering(branchId: number, docDate: Date): PeriodRow | null;
  lockPeriod(branchId: number, periodId: number): PeriodRow | null;
  applyClose(row: PeriodRow, step: CloseStep): void;
}

function inRange(d: Date, from: Date, to: Date): boolean {
  const x = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return x >= a && x <= b;
}

export function checkPeriod(req: PeriodCheckRequest, row: PeriodRow | null): PeriodCheckResult {
  if (!row || !inRange(req.docDate, row.fromDate, row.toDate)) {
    return { open: false, reason: "not_generated" };
  }
  if (row.glClosed) return { open: false, reason: "closed_full" };
  if (row.inventoryClosed) return { open: false, reason: "closed_inventory" };
  return { open: true, periodId: row.periodId };
}

export function assertPeriodOpen(req: PeriodCheckRequest, store: PeriodStore): PeriodCheckResult {
  const found = store.findCovering(req.branchId, req.docDate);
  const row = found ? store.lockPeriod(req.branchId, found.periodId) ?? found : null;
  const r = checkPeriod(req, row);
  if (!r.open) throw new PeriodClosedError(r.reason);
  return r;
}

const ORDER: CloseStep[] = ["inventory", "profit_and_loss", "annual", "open_new_year"];

export function closePeriod(
  branchId: number,
  fiscalYearId: number,
  step: CloseStep,
  store: PeriodStore,
  row: PeriodRow,
): void {
  if (row.branchId !== branchId || row.fiscalYearId !== fiscalYearId) {
    throw new Error("PERIOD_MISMATCH");
  }
  if (row.pendingDocs > 0) throw new Error("PERIOD_HAS_PENDING");
  const idx = ORDER.indexOf(step);
  const prev = idx === 0 ? "none" : ORDER[idx - 1];
  if (row.closeStep !== prev) throw new Error("PERIOD_STEP_SKIP");
  store.applyClose(row, step);
}

export interface PeriodAndLockEngine {
  assertPeriodOpen(req: PeriodCheckRequest): PeriodCheckResult;
}

export function periodEngine(store: PeriodStore): PeriodAndLockEngine {
  return {
    assertPeriodOpen(req) {
      return assertPeriodOpen(req, store);
    },
  };
}
