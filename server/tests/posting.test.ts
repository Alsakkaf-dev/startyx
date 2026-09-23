import assert from "node:assert/strict";
import { test } from "node:test";
import { Decimal, d } from "../src/shared-kernel/decimal.ts";
import { DomainError } from "../src/shared-kernel/errors.ts";
import { closePeriod } from "../src/engines/period-and-lock.ts";
import { blankAccounts, blankLine } from "../src/engines/posting.ts";
import type { PostDocumentRequest } from "../src/engines/posting.ts";
import { MemoryTx, numReq, openPeriod, runPost } from "../src/infrastructure/memory.ts";
import { makeLineGuard, type AccountBook } from "../src/application/posting-context.ts";
import { parsePostBody, serialPost } from "../src/application/post-live.ts";

/* الخدمات المشتركة ١–٥ — الحسابات كما في ربط أونيكس الحقيقي (op.1.2.9 · op.5.1.2.16) */

const vat15 = { taxTypeId: 1, pct: d("0.15"), zatcaCategory: "S" as const };
const LINK = {
  inventoryAccount: "1202010001",
  salesAccount: "4101010001",
  salesReturnAccount: "4101020001",
  pySalesReturnAccount: "3101020001",
  cogsAccount: "3101010001",
  cogsReturnAccount: "3101040001",
  pyCogsReturnAccount: "3101040001",
  freeCogsAccount: "3101050001",
  freeReturnCogsAccount: "3101050002",
};
const ACC = blankAccounts({
  party: "1203010001",
  vatOutput: "2202070001",
  vatInput: "1207030001",
  costDiffPurchaseReturn: "3101060002",
});
const item = (over: Parameters<typeof blankLine>[0] = {}) =>
  blankLine({ itemCode: "0101", warehouseCode: "1", ...LINK, ...over });

function base(over: Partial<PostDocumentRequest> = {}): PostDocumentRequest {
  return {
    docKind: "sales_invoice",
    branchId: 1,
    docDate: new Date(Date.UTC(2026, 8, 19)),
    currencyId: 1,
    fxRate: d("1"),
    fxOperator: "mul",
    paymentMethod: "credit",
    headerDiscount: Decimal.zero(),
    headerCharges: Decimal.zero(),
    accounts: ACC,
    numbering: numReq(),
    isExportZeroRated: false,
    salesReturnPriorYear: false,
    issueEinvoice: false,
    existingIcv: null,
    cashAccount: "1201010001",
    cashAnalyticId: 7,
    partyAnalyticId: 44,
    skipIcv: false,
    lines: [item({ qty: d("1"), price: d("100"), currentAvg: d("40"), itemTaxLink: vat15 })],
    ...over,
  };
}

const sum = (ls: { debit: Decimal; credit: Decimal }[], s: "debit" | "credit") =>
  ls.reduce((a, l) => a.add(l[s]), Decimal.zero());
const txWith = (...branches: number[]) => {
  const t = new MemoryTx();
  for (const b of branches) t.periods.push(openPeriod(b));
  return t;
};
const journal = (dr: string, cr: string, amt: string) => [
  blankLine({ accountCode: dr, side: "debit", amount: d(amt) }),
  blankLine({ accountCode: cr, side: "credit", amount: d(amt) }),
];

test("sales invoice balances on resolved accounts + stock movement", () => {
  const { result } = runPost(base());
  if (result.status !== "posted") throw new Error("not posted");
  assert.equal(sum(result.lines, "debit").eq(sum(result.lines, "credit")), true);
  assert.equal(result.documentNumber, 1);
  assert.equal(result.fiscalYearId, 2026);
  const ar = result.lines.find((l) => l.accountCode === "1203010001");
  assert.equal(ar?.debit.toString(), "115");
  assert.equal(ar?.analyticId, 44);
  assert.equal(result.lines.find((l) => l.accountCode === "2202070001")?.credit.toString(), "15");
  assert.equal(result.movements[0]!.qtyBase.toString(), "-1");
});

test("COGS uses base qty (pack size)", () => {
  const { result } = runPost(base({ lines: [item({ qty: d("2"), packSize: d("12"), price: d("100"), currentAvg: d("3") })] }));
  if (result.status !== "posted") throw new Error("not posted");
  assert.equal(result.lines.find((l) => l.accountCode === "3101010001")?.debit.toString(), "72");
  assert.equal(result.movements[0]!.qtyBase.toString(), "-24");
});

test("purchase VAT → input VAT 1207030001, never employee advances/capital", () => {
  const { result } = runPost(
    base({
      docKind: "purchase_invoice",
      numbering: numReq("purchase_invoice"),
      accounts: blankAccounts({ ...ACC, party: "2202020001" }),
      lines: [item({ qty: d("10"), incomingUnitCost: d("10"), taxPct: d("0.15") })],
    }),
  );
  if (result.status !== "posted") throw new Error("not posted");
  assert.equal(result.lines.find((l) => l.accountCode === "1207030001")?.debit.toString(), "15");
  assert.equal(result.lines.some((l) => l.accountCode === "1204010001" || l.accountCode === "2101010001"), false);
  const ap = result.lines.find((l) => l.accountCode === "2202020001");
  assert.equal(ap?.credit.toString(), "115");
  assert.equal(ap?.analyticType, "vendor");
});

test("INV-8: missing mapping names the role and its screen", () => {
  assert.throws(
    () => runPost(base({ accounts: blankAccounts({ ...ACC, vatOutput: "" }) })),
    (e: unknown) => e instanceof DomainError && e.code === "ACCOUNT_MAPPING_MISSING" && e.message.includes("op.1.2.9"),
  );
  assert.throws(
    () => runPost(base({ lines: [item({ salesAccount: "", qty: d("1"), price: d("5") })] })),
    (e: unknown) => e instanceof DomainError && e.message.includes("op.5.1.2.16"),
  );
});

test("INV-10: a rejected document does not consume a number", () => {
  const tx = txWith(1);
  assert.throws(() => runPost(base({ accounts: blankAccounts() }), tx));
  const { result } = runPost(base(), tx);
  assert.equal(result.documentNumber, 1);
  assert.equal(tx.gl.size, 1);
});

test("INV-4: inventory close blocks stock docs only; suspended/outside blocks all", () => {
  const tx = txWith(1);
  const p = tx.periods[0]!;
  p.inventoryClosed = true;
  assert.throws(() => runPost(base(), tx), (e: unknown) => e instanceof DomainError && e.message === "هذه الفترة مغلقة");
  const mj = runPost(base({ docKind: "manual_journal", numbering: numReq("manual_journal"), lines: journal("3101060001", "3201010032", "5") }), tx);
  assert.equal(mj.result.status, "posted");
  p.suspended = true;
  assert.throws(
    () => runPost(base({ docKind: "manual_journal", lines: journal("3101060001", "3201010032", "5") }), tx),
    (e: unknown) => e instanceof DomainError && e.message === "هذه الفترة موقفة",
  );
  assert.throws(() => runPost(base({ docDate: new Date(Date.UTC(2027, 0, 5)) })), (e: unknown) => e instanceof DomainError && e.code === "ONYX-3660");
});

test("SY-R9: P&L close locks the period financially", () => {
  const tx = txWith(1);
  closePeriod(1, 2026, "inventory", tx, tx.periods[0]!);
  closePeriod(1, 2026, "profit_and_loss", tx, tx.periods[0]!);
  assert.equal(tx.periods[0]!.glClosed, true);
});

test("imbalance → pending, no GL, number reserved", () => {
  const { result, tx } = runPost(
    base({
      docKind: "manual_journal",
      lines: [
        blankLine({ accountCode: "4101010001", side: "debit", amount: d("10") }),
        blankLine({ accountCode: "1203010001", side: "credit", amount: d("7"), analyticType: "customer", analyticId: 1 }),
      ],
    }),
  );
  assert.equal(result.status, "pending");
  assert.equal(result.documentNumber, 1);
  assert.equal(tx.gl.size, 0);
});

test("missing analytic → Onyx 4559", () => {
  assert.throws(
    () => runPost(base({ docKind: "manual_journal", lines: [blankLine({ accountCode: "1203010001", side: "debit", amount: d("10"), analyticType: "customer" })] })),
    (e: unknown) => e instanceof DomainError && e.code === "ANALYTIC_REQUIRED" && e.message.startsWith("ادخل الحساب التحليلي"),
  );
});

test("stock issue to customer forbidden; stock line needs item (3319)", () => {
  assert.throws(
    () => runPost(base({ docKind: "stock_issue", lines: [item({ qty: d("1"), currentAvg: d("10"), analyticType: "customer", analyticId: 9, headerAccount: "1203010001" })] })),
    (e: unknown) => e instanceof DomainError && e.code === "FORBIDDEN_STOCK_CUSTOMER",
  );
  assert.throws(
    () => runPost(base({ docKind: "stock_issue", lines: [blankLine({ qty: d("1"), headerAccount: "3101060001" })] })),
    (e: unknown) => e instanceof DomainError && e.code === "ONYX-3319",
  );
});

test("einvoice ICV not regenerated on edit", () => {
  assert.equal(runPost(base({ issueEinvoice: true, existingIcv: 17, skipIcv: true })).result.icv, 17);
});

test("stock receipt balances and writes +movement", () => {
  const { result } = runPost(
    base({ docKind: "stock_receipt", numbering: numReq("stock_receipt"), lines: [item({ qty: d("10"), incomingUnitCost: d("12"), headerAccount: "4102010001" })] }),
  );
  if (result.status !== "posted") throw new Error("not posted");
  assert.equal(result.movements[0]!.value.toString(), "120");
});

test("transfer without warehouse clearing account stops (op.5.1.2.9)", () => {
  assert.throws(
    () => runPost(base({ docKind: "stock_transfer", lines: [item({ qty: d("1"), currentAvg: d("3") })] })),
    (e: unknown) => e instanceof DomainError && e.message.includes("op.5.1.2.9"),
  );
});

test("voucher: cash line carries cashbox id, party line the party id", () => {
  const { result } = runPost(
    base({
      docKind: "receipt_voucher",
      paymentMethod: "cash",
      numbering: numReq("receipt_voucher"),
      lines: [blankLine({ amount: d("50"), analyticType: "customer", analyticId: 44 })],
    }),
  );
  if (result.status !== "posted") throw new Error("not posted");
  const cash = result.lines.find((l) => l.accountCode === "1201010001");
  assert.equal(cash?.analyticType, "cash");
  assert.equal(cash?.analyticId, 7);
  assert.equal(result.lines.find((l) => l.accountCode === "1203010001")?.analyticId, 44);
});

test("INV-9: foreign amounts on journals converted to local", () => {
  const { result } = runPost(base({ docKind: "manual_journal", currencyId: 2, fxRate: d("3.75"), lines: journal("3101060001", "3201010032", "100") }));
  if (result.status !== "posted") throw new Error("not posted");
  assert.equal(result.lines[0]!.debit.toString(), "375");
});

test("inter-branch: each entry balances alone; needs branch-current account (4368)", () => {
  assert.throws(
    () => runPost(base({ beneficiaryBranchId: 2 }), txWith(1, 2)),
    (e: unknown) => e instanceof DomainError && e.message.startsWith("ادخل رقم حساب جاري الفرع"),
  );
  const { result } = runPost(base({ beneficiaryBranchId: 2, accounts: blankAccounts({ ...ACC, interBranch: "3101060001" }) }), txWith(1, 2));
  if (result.status !== "posted") throw new Error("not posted");
  assert.equal(result.entries.length, 2);
  for (const e of result.entries) assert.equal(sum(e.lines, "debit").eq(sum(e.lines, "credit")), true);
  assert.equal(result.entries[1]!.lines.every((l) => l.branchId === 2), true);
});

/* حارس السطر — INV-5 · GL-R37 · SY-R39 */

const acct = (code: string, o: Partial<{ posting: boolean; inactive: boolean; analyticType: number; useCc: number }>) => ({
  code, nameAr: code, posting: true, inactive: false, analyticType: 0, useCc: 1, usePj: 1, useActv: 0, ...o,
});
const book: AccountBook = {
  accounts: new Map([
    ["1203010001", acct("1203010001", { analyticType: 3 })],
    ["4101010001", acct("4101010001", { useCc: 2 })],
    ["1201", acct("1201", { posting: false })],
    ["9", acct("9", { inactive: true })],
  ]),
  costCenters: new Map([["031", { posting: true, inactive: false }], ["1", { posting: false, inactive: false }]]),
  projects: new Map(),
};
const guard = makeLineGuard(book);
const gl = (over: Record<string, unknown>) =>
  ({ accountCode: "4101010001", debit: d("1"), credit: Decimal.zero(), analyticType: "general", analyticId: null, costCenter: "031", project: null, branchId: 1, isGenerated: false, ...over }) as never;

test("guard: header/inactive/unknown account → 497", () => {
  for (const code of ["1201", "9", "0000"]) {
    assert.throws(() => guard([gl({ accountCode: code })]), (e: unknown) => e instanceof DomainError && e.code === "ONYX-497");
  }
});

test("guard: analytic type must match account (5114)", () => {
  assert.throws(() => guard([gl({ accountCode: "1203010001", analyticType: "vendor", analyticId: 1 })]), (e: unknown) => e instanceof DomainError && e.code === "ONYX-5114");
  guard([gl({ accountCode: "1203010001", analyticType: "customer", analyticId: 1 })]);
});

test("guard: mandatory cost center, posting-level only (SY-R39)", () => {
  assert.throws(() => guard([gl({ costCenter: null })]), (e: unknown) => e instanceof DomainError && e.message.includes("SY-R39"));
  assert.throws(() => guard([gl({ costCenter: "1" })]), (e: unknown) => e instanceof DomainError && e.code === "CC_INVALID");
  guard([gl({})]);
});

/* مدخل الترحيل — لا قيم افتراضية صامتة */

test("parse: no silent defaults for branch/date/party/cash; client accounts ignored", () => {
  assert.throws(() => parsePostBody({ docKind: "sales_invoice", docDate: "2026-09-20" }), (e: unknown) => e instanceof DomainError && e.message.includes("الفرع"));
  assert.throws(() => parsePostBody({ docKind: "sales_invoice", branchId: 1 }), (e: unknown) => e instanceof DomainError && e.message.includes("التاريخ"));
  assert.throws(() => parsePostBody({ docKind: "bogus", branchId: 1, docDate: "2026-09-20" }));
  const r = parsePostBody({ docKind: "sales_invoice", branchId: 1, docDate: "2026-09-20", lines: [{ qty: "1", inventoryAccount: "2101010001" }] });
  assert.equal(r.partyAnalyticId, null);
  assert.equal(r.cashAccount, "");
  assert.equal(r.lines[0]!.inventoryAccount, "");
});

test("serialPost: one at a time, in order, failures don't break the queue", async () => {
  const seen: number[] = [];
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await Promise.all([
    serialPost(async () => { await wait(20); seen.push(1); }),
    serialPost(async () => { seen.push(2); }),
    serialPost(async () => { throw new Error("x"); }).catch(() => seen.push(3)),
    serialPost(async () => { seen.push(4); }),
  ]);
  assert.deepEqual(seen, [1, 2, 3, 4]);
});
