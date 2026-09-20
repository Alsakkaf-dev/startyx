export class DomainError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export class PeriodClosedError extends DomainError {
  constructor(reason: "not_generated" | "closed_inventory" | "closed_full") {
    super("PERIOD_CLOSED", reason);
  }
}
