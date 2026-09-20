export type SequenceScope =
  | { kind: "group_sequence"; groupCode: string }
  | { kind: "flat_max_plus_one" }
  | { kind: "per_branch_year"; branchId: number; fiscalYearId: number }
  | {
      kind: "per_branch_year_type";
      branchId: number;
      fiscalYearId: number;
      docTypeId: number;
      cashBoxId?: number;
    }
  | { kind: "per_doc_kind_list"; listKind: "receipt" | "payment" }
  | { kind: "shared_journal_type_group"; sequenceGroupId: number };

export type DocEntityName = string;

export interface NumberingRequest {
  entity: DocEntityName;
  scope: SequenceScope;
}

export interface NumberingResult {
  number: number;
}

export interface SequenceStore {
  lockAndNext(key: string): number;
}

export function scopeKey(req: NumberingRequest): string {
  const s = req.scope;
  switch (s.kind) {
    case "group_sequence":
      return `${req.entity}|g|${s.groupCode}`;
    case "flat_max_plus_one":
      return `${req.entity}|flat`;
    case "per_branch_year":
      return `${req.entity}|by|${s.branchId}|${s.fiscalYearId}`;
    case "per_branch_year_type":
      return `${req.entity}|byt|${s.branchId}|${s.fiscalYearId}|${s.docTypeId}|${s.cashBoxId ?? 0}`;
    case "per_doc_kind_list":
      return `${req.entity}|list|${s.listKind}`;
    case "shared_journal_type_group":
      return `${req.entity}|jg|${s.sequenceGroupId}`;
  }
}

export function nextNumber(req: NumberingRequest, store: SequenceStore): NumberingResult {
  const number = store.lockAndNext(scopeKey(req));
  return { number };
}

export interface NumberingEngine {
  nextNumber(req: NumberingRequest): NumberingResult;
}

export function numberingEngine(store: SequenceStore): NumberingEngine {
  return {
    nextNumber(req) {
      return nextNumber(req, store);
    },
  };
}
