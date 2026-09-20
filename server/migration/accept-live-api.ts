import fs from "node:fs";
import path from "node:path";
import { serverRoot } from "../src/infrastructure/db.ts";

const BASE = process.env.STARTYX_API ?? "http://127.0.0.1:8787";
const tax = { taxTypeId: 1, pct: "0.15", zatcaCategory: "S" };

const cases: { id: string; body: Record<string, unknown> }[] = [
  {
    id: "sales",
    body: {
      docKind: "sales_invoice", screenRef: "op.7.5.3.6", branchId: 1, docDate: "2026-09-20",
      paymentMethod: "credit", skipIcv: true, partyAnalyticId: 1,
      lines: [{ qty: "1", price: "100", currentAvg: "40", incomingUnitCost: "40", itemTaxLink: tax, taxPct: "0.15" }],
    },
  },
  {
    id: "sales-return",
    body: {
      docKind: "sales_return", screenRef: "op.7.5.3.7", branchId: 1, docDate: "2026-09-20",
      paymentMethod: "credit", skipIcv: true, partyAnalyticId: 1,
      lines: [{ qty: "1", price: "100", currentAvg: "40", incomingUnitCost: "40", itemTaxLink: tax, taxPct: "0.15" }],
    },
  },
  {
    id: "purchase",
    body: {
      docKind: "purchase_invoice", screenRef: "op.6.2.3.8", branchId: 1, docDate: "2026-09-20",
      paymentMethod: "credit", skipIcv: true, partyAnalyticId: 1,
      lines: [{ qty: "1", price: "80", incomingUnitCost: "80", supplierOriginalPrice: "80", itemTaxLink: tax, taxPct: "0.15" }],
    },
  },
  {
    id: "receipt",
    body: {
      docKind: "receipt_voucher", screenRef: "op.7.1.3.4", branchId: 1, docDate: "2026-09-20",
      paymentMethod: "cash", cashAccount: "1201010001", skipIcv: true, partyAnalyticId: 1,
      lines: [{ amount: "50", accountCode: "1203010001", analyticType: "customer", analyticId: 1 }],
    },
  },
  {
    id: "payment",
    body: {
      docKind: "payment_voucher", screenRef: "op.6.1.3.3", branchId: 1, docDate: "2026-09-20",
      paymentMethod: "cash", cashAccount: "1201010001", skipIcv: true, partyAnalyticId: 1,
      lines: [{ amount: "40", accountCode: "2101010001", analyticType: "vendor", analyticId: 1 }],
    },
  },
  {
    id: "journal",
    body: {
      docKind: "manual_journal", screenRef: "op.4.1.3.14", branchId: 1, docDate: "2026-09-20",
      skipIcv: true,
      lines: [
        { accountCode: "1201010001", side: "debit", amount: "25", analyticType: "cash", analyticId: 1 },
        { accountCode: "1203010001", side: "credit", amount: "25", analyticType: "customer", analyticId: 1 },
      ],
    },
  },
  {
    id: "stock-issue",
    body: {
      docKind: "stock_issue", screenRef: "op.5.1.3.4", branchId: 1, docDate: "2026-09-20",
      skipIcv: true,
      lines: [{ qty: "1", currentAvg: "10", incomingUnitCost: "10", headerAccount: "3101010001" }],
    },
  },
];

async function get(p: string) {
  const r = await fetch(BASE + p);
  const t = await r.text();
  const j = t ? JSON.parse(t) : {};
  if (!r.ok) throw new Error(p + " " + r.status + " " + t);
  return j as Record<string, unknown>;
}
async function post(p: string, body: unknown) {
  const r = await fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const t = await r.text();
  const j = t ? JSON.parse(t) : {};
  if (!r.ok) throw new Error(p + " " + r.status + " " + t);
  return j as Record<string, unknown>;
}

async function main() {
  const health = await get("/api/health");
  const checks: { id: string; pass: boolean; got: string; want: string; note: string }[] = [
    { id: "health", pass: health.ok === true, got: String(health.store), want: "pglite|postgres", note: "API up" },
  ];
  const posted: Record<string, unknown> = {};
  for (const c of cases) {
    const r = await post("/api/documents/post", c.body);
    const ok = r.status === "posted" && Number(r.glEntryId) > 0;
    checks.push({ id: c.id, pass: ok, got: String(r.status) + " #" + r.documentNumber, want: "posted", note: c.body.screenRef as string });
    posted[c.id] = { status: r.status, glEntryId: r.glEntryId, documentNumber: r.documentNumber };
  }
  const facts = await get("/api/migration/facts");
  const counts = await get("/api/masters/counts");
  const stored = (facts.stored || {}) as Record<string, { amount?: string }>;
  checks.push({ id: "GL-D4", pass: String(stored["GL-D4"]?.amount || "").startsWith("136647.87"), got: String(stored["GL-D4"]?.amount), want: "136647.87", note: "kept" });
  checks.push({ id: "IV-Q17", pass: String(stored["IV-Q17"]?.amount || "").startsWith("0.23"), got: String(stored["IV-Q17"]?.amount), want: "0.23", note: "kept" });
  checks.push({ id: "IC-PAIR", pass: String(stored["IC-PAIR"]?.amount || "").startsWith("2099.9"), got: String(stored["IC-PAIR"]?.amount), want: "2099.90", note: "kept" });
  checks.push({ id: "opening", pass: Number((counts as { openingLines?: number }).openingLines) === 3396, got: String((counts as { openingLines?: number }).openingLines), want: "3396", note: "opening lines" });
  const allPass = checks.every((c) => c.pass);
  const report = { source: "live API seven cycles", generatedAt: new Date().toISOString(), base: BASE, health, posted, counts, allPass, checks };
  const out = path.join(serverRoot(), "migration/out");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "accept-live-api.json"), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify({ allPass, store: health.store, posted }, null, 2) + "\n");
  if (!allPass) process.exit(1);
}

main().catch((e) => { process.stderr.write(String(e?.stack ?? e) + "\n"); process.exit(1); });