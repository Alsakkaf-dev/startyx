import { onyxError } from "../shared-kernel/onyx-messages.ts";

export interface PeriodCheckRequest {
  branchId: number;
  docDate: Date;
  /** الوثيقة تحرّك المخزون ⇒ يمنعها إقفال المخزون وحده؛ غيرها لا يمنعه إلا الإقفال المالي */
  affectsStock?: boolean;
}

export type PeriodBlock = "not_generated" | "suspended" | "closed_inventory" | "closed_full";

export type PeriodCheckResult =
  | { open: true; periodId: number; fiscalYearId: number }
  | { open: false; reason: PeriodBlock };

export interface PeriodRow {
  periodId: number;
  fiscalYearId: number;
  branchId: number;
  fromDate: Date;
  toDate: Date;
  /** «موقوفة» في op.1.1.2 (S_PRD_DTL.INACTIVE) — INV-4 */
  suspended?: boolean;
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
  if (!row || Number.isNaN(req.docDate.getTime()) || !inRange(req.docDate, row.fromDate, row.toDate)) {
    return { open: false, reason: "not_generated" };
  }
  if (row.suspended) return { open: false, reason: "suspended" };
  if (row.glClosed) return { open: false, reason: "closed_full" };
  /* SY-R9: إقفال المخزون يمنع وثائق المخزون في فرعه، والقيود المالية تبقى حتى الإقفال المالي */
  if (row.inventoryClosed && req.affectsStock !== false) return { open: false, reason: "closed_inventory" };
  return { open: true, periodId: row.periodId, fiscalYearId: row.fiscalYearId };
}

/** نص أونيكس لكل سبب منع [قاعدة: _msgs.tsv 3660 · 4398 · 3478] */
export function periodError(reason: PeriodBlock) {
  const e = reason === "not_generated" ? onyxError(3660) : reason === "suspended" ? onyxError(4398) : onyxError(3478);
  (e as { reason?: PeriodBlock }).reason = reason;
  return e;
}

export function assertPeriodOpen(req: PeriodCheckRequest, store: PeriodStore): PeriodCheckResult {
  const found = store.findCovering(req.branchId, req.docDate);
  const row = found ? store.lockPeriod(req.branchId, found.periodId) ?? found : null;
  const r = checkPeriod(req, row);
  if (!r.open) throw periodError(r.reason);
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
