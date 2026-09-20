import assert from "node:assert/strict";
import { test } from "node:test";
import { Decimal, d } from "../src/shared-kernel/decimal.ts";
import { DomainError } from "../src/shared-kernel/errors.ts";
import { nextNumber, numberingEngine } from "../src/engines/numbering.ts";
import { checkPeriod, closePeriod } from "../src/engines/period-and-lock.ts";
import { toLocal, deriveRateFromAmounts } from "../src/engines/currency.ts";
import { computeLineTax, computeInvoiceTotals, computePurchaseTax, isValidVatNumber } from "../src/engines/tax.ts";
import {
  recalcWeightedAverage,
  unitCostAfterFreeQtyDistribution,
  lineDiscountShare,
  purchaseReturnCostDiff,
} from "../src/engines/costing.ts";
import { checkPriceLimits, checkCreditLimit, autoPriceFromCost } from "../src/engines/pricing.ts";
import { ACCOUNTS, blankLine, postDocument } from "../src/engines/posting.ts";
import type { PostDocumentRequest } from "../src/engines/posting.ts";
import { MemoryTx, deps, numReq, openPeriod, runPost } from "../src/infrastructure/memory.ts";

const vat15 = { taxTypeId: 1, pct: d("0.15"), zatcaCategory: "S" as const };

test("decimal: 0.1+0.2 and money mul", () => {
  assert.equal(d("0.1").add(d("0.2")).toString(), "0.3");
  assert.equal(d("100").mul(d("0.15")).toString(), "15");
  assert.equal(d("2.5").round(0).toString(), "3");
  assert.equal(d("-2.5").round(0).toString(), "-3");
});

test("numbering: consecutive then rollback restores unused number", () => {
  const tx = new MemoryTx();
  tx.begin();
  const a = nextNumber({ entity: "sales_invoice", scope: { kind: "flat_max_plus_one" } }, tx);
  const b = nextNumber({ entity: "sales_invoice", scope: { kind: "flat_max_plus_one" } }, tx);
  assert.equal(a.number, 1);
  assert.equal(b.number, 2);
  tx.rollback();
  tx.begin();
  const c = nextNumber({ entity: "sales_invoice", scope: { kind: "flat_max_plus_one" } }, tx);
  assert.equal(c.number, 1);
  tx.commit();
});

test("numbering: independent scopes", () => {
  const n = numberingEngine(new MemoryTx());
  const x = n.nextNumber({ entity: "item", scope: { kind: "group_sequence", groupCode: "A" } });
  const y = n.nextNumber({ entity: "item", scope: { kind: "group_sequence", groupCode: "B" } });
  assert.equal(x.number, 1);
  assert.equal(y.number, 1);
});

test("costing: weighted average reference cases", () => {
  assert.equal(
    recalcWeightedAverage({
      currentQty: d("100"),
      currentAvg: d("10"),
      incomingQty: d("20"),
      incomingUnitCost: d("16"),
    }).toString(),
    "11",
  );
  assert.equal(
    recalcWeightedAverage({
      currentQty: d("0"),
      currentAvg: d("10"),
      incomingQty: d("10"),
      incomingUnitCost: d("12"),
    }).toString(),
    "12",
  );
  assert.equal(
    recalcWeightedAverage({
      currentQty: d("-10"),
      currentAvg: d("9"),
      incomingQty: d("10"),
      incomingUnitCost: d("12"),
    }).toString(),
    "12",
  );
  assert.equal(
    recalcWeightedAverage({
      currentQty: d("-20"),
      currentAvg: d("9"),
      incomingQty: d("5"),
      incomingUnitCost: d("12"),
    }).toString(),
    "12",
  );
});

test("costing: free qty and header discount and return diff", () => {
  assert.equal(
    unitCostAfterFreeQtyDistribution({ purchasedQty: d("10"), purchasedPrice: d("12"), freeQty: d("2") }).toString(),
    "10",
  );
  assert.equal(
    lineDiscountShare({ lineValue: d("40"), totalLinesValue: d("100"), headerDiscount: d("10") }).toString(),
    "4",
  );
  const z = purchaseReturnCostDiff({
    avgCostAtReturnTime: d("11"),
    supplierOriginalPrice: d("11"),
    costMethod: "final_avg_cost",
  });
  assert.equal(z.amount.isZero(), true);
  const dr = purchaseReturnCostDiff({
    avgCostAtReturnTime: d("12"),
    supplierOriginalPrice: d("10"),
    costMethod: "supplier_price",
  });
  assert.equal("side" in dr && dr.side === "debit", true);
});

test("tax: standard, export, no link, exemption, purchase inclusive", () => {
  const std = computeLineTax({ netAmount: d("100"), itemTaxLink: vat15, isExportZeroRated: false });
  assert.equal(std.taxAmount.toString(), "15");
  const exp = computeLineTax({ netAmount: d("100"), itemTaxLink: vat15, isExportZeroRated: true });
  assert.equal(exp.taxAmount.toString(), "0");
  const none = computeLineTax({ netAmount: d("100"), itemTaxLink: null, isExportZeroRated: false });
  assert.equal(none.taxAmount.toString(), "0");
  assert.throws(
    () =>
      computeLineTax({
        netAmount: d("100"),
        itemTaxLink: { taxTypeId: 1, pct: d("0"), zatcaCategory: "Z" },
        isExportZeroRated: false,
      }),
    DomainError,
  );
  const tot = computeInvoiceTotals({
    lines: [{ qty: d("2"), price: d("50"), lineDiscountShare: d("0"), lineTax: d("15") }],
    headerDiscount: d("10"),
    headerCharges: d("5"),
  });
  assert.equal(tot.value.toString(), "100");
  assert.equal(tot.total.toString(), "110");
  const incl = computePurchaseTax({ price: d("115"), discount: d("0"), pct: d("0.15"), inclusiveOfTax: true });
  assert.equal(incl.round(2).toString(), "15");
  assert.equal(isValidVatNumber("311300283900003"), true);
  assert.equal(isValidVatNumber("123"), false);
});

test("currency and pricing", () => {
  assert.equal(toLocal({ amount: d("10"), currencyId: 2, rate: d("3.75"), operator: "mul" }).toString(), "37.5");
  assert.equal(deriveRateFromAmounts(d("37.5"), d("10")).toString(), "3.75");
  assert.equal(checkPriceLimits({ enteredPrice: d("5"), min: d("10"), max: d("20") }).withinLimits, false);
  assert.equal(
    checkCreditLimit({
      currentBalance: d("90"),
      newDocAmount: d("20"),
      hardLimit: d("100"),
      overridePct: d("0"),
      policy: "deny",
      userHasOverridePrivilege: false,
    }).ok,
    false,
  );
  assert.equal(autoPriceFromCost(d("100"), d("0.1"), false, d("0.15")).toString(), "110");
});

test("period closed / close order", () => {
  const row = openPeriod(1);
  row.inventoryClosed = true;
  const r = checkPeriod({ branchId: 1, docDate: new Date(Date.UTC(2026, 8, 10)) }, row);
  assert.equal(r.open, false);
  const tx = new MemoryTx();
  tx.periods.push(openPeriod(1));
  closePeriod(1, 2026, "inventory", tx, tx.periods[0]!);
  assert.equal(tx.periods[0]!.inventoryClosed, true);
  assert.throws(() => closePeriod(1, 2026, "annual", tx, tx.periods[0]!));
});

function baseSales(over: Partial<PostDocumentRequest> = {}): PostDocumentRequest {
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
    numbering: numReq(),
    isExportZeroRated: false,
    salesReturnPriorYear: false,
    freeQtyCostAccount: ACCOUNTS.freeQtyCost,
    issueEinvoice: false,
    existingIcv: null,
    cashAccount: ACCOUNTS.cashAdmin,
    partyAnalyticId: 44,
    skipIcv: false,
    lines: [
      blankLine({
        qty: d("1"),
        price: d("100"),
        currentAvg: d("40"),
        itemTaxLink: vat15,
      }),
    ],
    ...over,
  };
}

test("posting: sales invoice balances (AR + COGS)", () => {
  const { result } = runPost(baseSales());
  assert.equal(result.status, "posted");
  if (result.status !== "posted") return;
  const dr = result.lines.reduce((a, l) => a.add(l.debit), Decimal.zero());
  const cr = result.lines.reduce((a, l) => a.add(l.credit), Decimal.zero());
  assert.equal(dr.eq(cr), true);
  assert.equal(result.documentNumber, 1);
  const ar = result.lines.find((l) => l.accountCode === ACCOUNTS.customers);
  assert.equal(ar?.debit.toString(), "115");
  assert.equal(ar?.analyticId, 44);
});

test("posting: imbalance is pending without gl", () => {
  const { result, tx } = runPost(
    baseSales({
      docKind: "manual_journal",
      lines: [
        blankLine({ accountCode: "4101010001", side: "debit", amount: d("10") }),
        blankLine({ accountCode: "1203010001", side: "credit", amount: d("7"), analyticType: "customer", analyticId: 1 }),
      ],
    }),
  );
  assert.equal(result.status, "pending");
  assert.equal(tx.gl.size, 0);
});

test("posting: missing analytic rejected", () => {
  assert.throws(
    () =>
      runPost(
        baseSales({
          docKind: "manual_journal",
          lines: [blankLine({ accountCode: ACCOUNTS.customers, side: "debit", amount: d("10"), analyticType: "customer", analyticId: null })],
        }),
      ),
    (e: unknown) => e instanceof DomainError && e.code === "ANALYTIC_REQUIRED",
  );
});

test("posting: stock issue to customer forbidden", () => {
  assert.throws(
    () =>
      runPost(
        baseSales({
          docKind: "stock_issue",
          lines: [
            blankLine({
              qty: d("1"),
              currentAvg: d("10"),
              analyticType: "customer",
              analyticId: 9,
              headerAccount: ACCOUNTS.customers,
            }),
          ],
        }),
      ),
    (e: unknown) => e instanceof DomainError && e.code === "FORBIDDEN_STOCK_CUSTOMER",
  );
});

test("posting: einvoice ICV not regenerated on edit", () => {
  const { result } = runPost(baseSales({ issueEinvoice: true, existingIcv: 17, skipIcv: true }));
  assert.equal(result.icv, 17);
});

test("posting: stock receipt uses costing and balances", () => {
  const { result } = runPost(
    baseSales({
      docKind: "stock_receipt",
      numbering: numReq("stock_receipt"),
      lines: [
        blankLine({
          qty: d("10"),
          packSize: d("1"),
          incomingUnitCost: d("12"),
          headerAccount: "4102010001",
        }),
      ],
    }),
  );
  assert.equal(result.status, "posted");
});
