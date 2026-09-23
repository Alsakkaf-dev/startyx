import type { NumberingRequest } from "../engines/numbering.ts";
import { numberingEngine, type SequenceStore } from "../engines/numbering.ts";
import { periodEngine, type PeriodRow, type PeriodStore, type CloseStep } from "../engines/period-and-lock.ts";
import { currencyEngine, type CurrencyLimits } from "../engines/currency.ts";
import { taxEngine } from "../engines/tax.ts";
import { costingEngine } from "../engines/costing.ts";
import { pricingEngine } from "../engines/pricing.ts";
import { postDocument, type EngineDependencies, type PostDocumentRequest, type PostingStore, type GlEntryLine } from "../engines/posting.ts";

export class MemoryTx implements SequenceStore, PeriodStore, PostingStore {
  sequences = new Map<string, number>();
  periods: PeriodRow[] = [];
  gl = new Map<number, GlEntryLine[]>();
  glSeq = 1;
  private snap: { sequences: Map<string, number>; glSeq: number; glKeys: Set<number> } | null = null;

  begin(): void {
    this.snap = { sequences: new Map(this.sequences), glSeq: this.glSeq, glKeys: new Set(this.gl.keys()) };
  }

  commit(): void {
    this.snap = null;
  }

  /** الرفض يعيد كل ما حُجز في الذاكرة: الأرقام وعدّاد القيود والقيد المؤقت */
  rollback(): void {
    if (this.snap) {
      this.sequences = this.snap.sequences;
      this.glSeq = this.snap.glSeq;
      for (const k of [...this.gl.keys()]) if (!this.snap.glKeys.has(k)) this.gl.delete(k);
    }
    this.snap = null;
  }

  lockAndNext(key: string): number {
    const n = (this.sequences.get(key) ?? 0) + 1;
    this.sequences.set(key, n);
    return n;
  }

  findCovering(branchId: number, docDate: Date): PeriodRow | null {
    return (
      this.periods.find((p) => {
        const x = Date.UTC(docDate.getUTCFullYear(), docDate.getUTCMonth(), docDate.getUTCDate());
        const a = Date.UTC(p.fromDate.getUTCFullYear(), p.fromDate.getUTCMonth(), p.fromDate.getUTCDate());
        const b = Date.UTC(p.toDate.getUTCFullYear(), p.toDate.getUTCMonth(), p.toDate.getUTCDate());
        return p.branchId === branchId && x >= a && x <= b;
      }) ?? null
    );
  }

  lockPeriod(branchId: number, periodId: number): PeriodRow | null {
    if (periodId === 0) return null;
    return this.periods.find((p) => p.branchId === branchId && p.periodId === periodId) ?? null;
  }

  applyClose(row: PeriodRow, step: CloseStep): void {
    row.closeStep = step;
    if (step === "inventory") row.inventoryClosed = true;
    /* SY-R9: إقفال الأرباح والخسائر يقفل الفترة مالياً */
    if (step === "profit_and_loss" || step === "annual") row.glClosed = true;
  }

  nextGlId(): number {
    return this.glSeq++;
  }

  savePosted(id: number, lines: GlEntryLine[]): void {
    this.gl.set(id, lines);
  }
}

export function openPeriod(branchId = 1): PeriodRow {
  return {
    periodId: 1,
    fiscalYearId: 2026,
    branchId,
    fromDate: new Date(Date.UTC(2026, 8, 1)),
    toDate: new Date(Date.UTC(2026, 8, 30)),
    inventoryClosed: false,
    glClosed: false,
    closeStep: "none",
    pendingDocs: 0,
  };
}

export function deps(tx: MemoryTx, limits: Record<number, CurrencyLimits> = {}): EngineDependencies {
  return {
    numbering: numberingEngine(tx),
    periodLock: periodEngine(tx),
    currency: currencyEngine(limits),
    tax: taxEngine,
    pricing: pricingEngine,
    costing: costingEngine,
  };
}

export function runPost(req: PostDocumentRequest, tx = new MemoryTx()) {
  if (tx.periods.length === 0) tx.periods.push(openPeriod(req.branchId));
  tx.begin();
  try {
    const result = postDocument(req, deps(tx), tx);
    tx.commit();
    return { result, tx };
  } catch (e) {
    tx.rollback();
    throw e;
  }
}

export function numReq(entity = "sales_invoice", branchId = 1): NumberingRequest {
  return { entity, scope: { kind: "per_branch_year", branchId, fiscalYearId: 2026 } };
}

/** مخزن عملية الخادم — يبقى ما دام العملية شغّالة (بدون Postgres). */
export const liveStore = new MemoryTx();

const FY2026 = [
  { no: 1, nameAr: "اكتوبر", fromM: 0, fromD: 1, toM: 0, toD: 31 },
  { no: 2, nameAr: "نوفمبر", fromM: 1, fromD: 1, toM: 1, toD: 28 },
  { no: 3, nameAr: "ديسمبر", fromM: 2, fromD: 1, toM: 2, toD: 31 },
  { no: 4, nameAr: "يناير", fromM: 3, fromD: 1, toM: 3, toD: 30 },
  { no: 5, nameAr: "فبراير", fromM: 4, fromD: 1, toM: 4, toD: 31 },
  { no: 6, nameAr: "مارس", fromM: 5, fromD: 1, toM: 5, toD: 30 },
  { no: 7, nameAr: "ابريل", fromM: 6, fromD: 1, toM: 6, toD: 31 },
  { no: 8, nameAr: "مايو", fromM: 7, fromD: 1, toM: 7, toD: 31 },
  { no: 9, nameAr: "يونيو", fromM: 8, fromD: 1, toM: 8, toD: 30 },
  { no: 10, nameAr: "يوليو", fromM: 9, fromD: 1, toM: 9, toD: 31 },
  { no: 11, nameAr: "اغسطس", fromM: 10, fromD: 1, toM: 10, toD: 30 },
  { no: 12, nameAr: "سبتمبر", fromM: 11, fromD: 1, toM: 11, toD: 31 },
];

export function seedFy2026Periods(tx: MemoryTx, branches: number[] = [1, 2, 3, 4, 5, 6]): void {
  if (tx.periods.length >= 12) return;
  tx.periods = [];
  for (const b of branches) {
    for (const p of FY2026) {
      tx.periods.push({
        periodId: p.no,
        fiscalYearId: 2026,
        branchId: b,
        fromDate: new Date(Date.UTC(2026, p.fromM, p.fromD)),
        toDate: new Date(Date.UTC(2026, p.toM, p.toD)),
        inventoryClosed: false,
        glClosed: false,
        closeStep: "none",
        pendingDocs: 0,
      });
    }
  }
}
