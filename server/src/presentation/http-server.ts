import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Decimal, d } from "../shared-kernel/decimal.ts";
import { DomainError } from "../shared-kernel/errors.ts";
import { computeLineTax, computeInvoiceTotals, computePurchaseTax, isValidVatNumber } from "../engines/tax.ts";
import { recalcWeightedAverage, unitCostAfterFreeQtyDistribution, purchaseReturnCostDiff } from "../engines/costing.ts";
import { blankLine, type GlEntryDocKind, type PostDocumentRequest } from "../engines/posting.ts";
import { MemoryTx, deps, numReq, openPeriod, runPost, liveStore, seedFy2026Periods } from "../infrastructure/memory.ts";
import { openDb, currentDb } from "../infrastructure/db.ts";
import { persistLive, hydrateFromDb, readFacts, mastersCounts, type LedgerRow } from "../infrastructure/postgres.ts";
import { ensureLoaded } from "../../migration/load-2026.ts";

const PORT = Number(process.env.PORT ?? "8787");
const RECON_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migration/out/recon-2026.json");
const CENSUS_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migration/out/census-2026.json");
const ACCEPT_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migration/out/accept-2026.json");
const LOAD_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migration/out/load-2026.json");

const ledger: LedgerRow[] = [];

function json(res: http.ServerResponse, code: number, body: unknown): void {
  const data = JSON.stringify(body, (_k, v) => (v instanceof Decimal ? v.toString() : v));
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  });
  res.end(data);
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

function dec(v: unknown, fallback = "0"): Decimal {
  if (typeof v === "string" || typeof v === "number") return Decimal.from(String(v));
  return d(fallback);
}

function fileJson(res: http.ServerResponse, file: string, hint: string): void {
  if (!fs.existsSync(file)) {
    json(res, 404, { error: "not_found", message: hint });
    return;
  }
  json(res, 200, JSON.parse(fs.readFileSync(file, "utf8")) as unknown);
}

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      json(res, 204, {});
      return;
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    try {
      if (req.method === "GET" && url.pathname === "/api/migration/recon") {
        fileJson(res, RECON_FILE, "run recon-open-bal.ps1");
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/migration/census") {
        fileJson(res, CENSUS_FILE, "run census-docs.ps1");
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/migration/accept") {
        fileJson(res, ACCEPT_FILE, "run accept-cycles.ps1");
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/migration/load") {
        fileJson(res, LOAD_FILE, "run load-2026.ts");
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/migration/facts") {
        const db = currentDb();
        if (!db) {
          json(res, 503, { error: "no_db" });
          return;
        }
        json(res, 200, await readFacts(db));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/masters/counts") {
        const db = currentDb();
        if (!db) {
          json(res, 503, { error: "no_db" });
          return;
        }
        json(res, 200, await mastersCounts(db));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/health") {
        json(res, 200, {
          ok: true,
          store: currentDb()?.kind ?? "memory",
          posted: liveStore.gl.size,
          documents: ledger.length,
          engines: ["numbering", "period", "currency", "tax", "pricing", "costing", "posting"],
          facts: { "GL-D4": "136647.87", "IV-Q17": "0.23", "IC-PAIR": "2099.90" },
          numbering: Object.fromEntries(liveStore.sequences),
        });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/documents") {
        const screen = url.searchParams.get("screen");
        const last = url.searchParams.get("last");
        let rows = ledger;
        if (screen) rows = rows.filter((r) => r.screenRef === screen);
        if (last === "1" || last === "true") rows = rows.slice(-1);
        json(res, 200, { documents: rows });
        return;
      }
      if (req.method === "GET" && url.pathname.startsWith("/api/documents/")) {
        const rest = url.pathname.slice("/api/documents/".length);
        if (!/^\d+$/.test(rest)) {
          json(res, 404, { error: "not_found" });
          return;
        }
        const id = Number(rest);
        const fromLedger = ledger.find((r) => r.glEntryId === id);
        if (fromLedger) {
          json(res, 200, fromLedger);
          return;
        }
        if (liveStore.gl.has(id)) {
          json(res, 200, { glEntryId: id, status: "posted", lines: liveStore.gl.get(id) });
          return;
        }
        json(res, 404, { error: "not_found" });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/engines/tax") {
        const b = (await readBody(req)) as Record<string, unknown>;
        const tax = computeLineTax({
          netAmount: dec(b.netAmount),
          itemTaxLink: b.itemTaxLink
            ? {
                taxTypeId: Number((b.itemTaxLink as { taxTypeId: number }).taxTypeId),
                pct: dec((b.itemTaxLink as { pct: string }).pct),
                zatcaCategory: (b.itemTaxLink as { zatcaCategory: "S" }).zatcaCategory,
                exemptionReasonCode: (b.itemTaxLink as { exemptionReasonCode?: string }).exemptionReasonCode,
              }
            : null,
          isExportZeroRated: Boolean(b.isExportZeroRated),
        });
        json(res, 200, tax);
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/engines/costing") {
        const b = (await readBody(req)) as Record<string, unknown>;
        json(res, 200, {
          avg: recalcWeightedAverage({
            currentQty: dec(b.currentQty),
            currentAvg: dec(b.currentAvg),
            incomingQty: dec(b.incomingQty),
            incomingUnitCost: dec(b.incomingUnitCost),
          }),
        });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/documents/post") {
        const b = (await readBody(req)) as Record<string, unknown>;
        const kind = String(b.docKind ?? "sales_invoice") as GlEntryDocKind;
        const branchId = Number(b.branchId ?? 1);
        const reqDoc: PostDocumentRequest = {
          docKind: kind,
          branchId,
          docDate: new Date(String(b.docDate ?? "2026-09-20")),
          currencyId: Number(b.currencyId ?? 1),
          fxRate: dec(b.fxRate, "1"),
          fxOperator: (b.fxOperator as "mul" | "div") ?? "mul",
          paymentMethod: (b.paymentMethod as PostDocumentRequest["paymentMethod"]) ?? "credit",
          headerDiscount: dec(b.headerDiscount),
          headerCharges: dec(b.headerCharges),
          numbering: numReq(kind, branchId),
          isExportZeroRated: Boolean(b.isExportZeroRated),
          salesReturnPriorYear: Boolean(b.salesReturnPriorYear),
          freeQtyCostAccount: String(b.freeQtyCostAccount ?? "3101050001"),
          issueEinvoice: Boolean(b.issueEinvoice),
          existingIcv: b.existingIcv == null ? null : Number(b.existingIcv),
          cashAccount: String(b.cashAccount ?? "1201010001"),
          partyAnalyticId: b.partyAnalyticId == null ? 1 : Number(b.partyAnalyticId),
          skipIcv: b.skipIcv !== false,
          lines: Array.isArray(b.lines)
            ? (b.lines as Record<string, unknown>[]).map((ln) =>
                blankLine({
                  qty: dec(ln.qty),
                  price: dec(ln.price),
                  lineDiscountShare: dec(ln.lineDiscountShare),
                  currentAvg: dec(ln.currentAvg),
                  incomingUnitCost: dec(ln.incomingUnitCost, ln.price as string | undefined),
                  supplierOriginalPrice: dec(ln.supplierOriginalPrice, ln.price as string | undefined),
                  amount: dec(ln.amount),
                  taxPct: dec(ln.taxPct, ln.itemTaxLink ? String((ln.itemTaxLink as { pct?: string }).pct ?? "0.15") : "0"),
                  isFree: Boolean(ln.isFree),
                  headerAccount: ln.headerAccount ? String(ln.headerAccount) : undefined,
                  accountCode: ln.accountCode ? String(ln.accountCode) : undefined,
                  analyticType: (ln.analyticType as "customer") ?? undefined,
                  analyticId: ln.analyticId == null || ln.analyticId === "" ? undefined : Number(ln.analyticId),
                  side: (ln.side as "debit") ?? undefined,
                  inclusiveOfTax: Boolean(ln.inclusiveOfTax),
                  itemTaxLink: ln.itemTaxLink
                    ? {
                        taxTypeId: 1,
                        pct: dec((ln.itemTaxLink as { pct: string }).pct, "0.15"),
                        zatcaCategory: ((ln.itemTaxLink as { zatcaCategory?: "S" }).zatcaCategory ?? "S"),
                        exemptionReasonCode: (ln.itemTaxLink as { exemptionReasonCode?: string }).exemptionReasonCode,
                      }
                    : undefined,
                }),
              )
            : [],
        };
        const { result } = runPost(reqDoc, liveStore);
        const row: LedgerRow = {
          glEntryId: result.status === "posted" ? result.glEntryId : null,
          documentNumber: result.documentNumber,
          docKind: kind,
          screenRef: String(b.screenRef ?? ""),
          status: result.status,
          imbalance: result.status === "pending" ? String(result.imbalance) : undefined,
          lines: result.status === "posted" ? result.lines : [],
          at: new Date().toISOString(),
        };
        ledger.push(row);
        const db = currentDb();
        if (db) {
          await persistLive(db, row, result.status === "posted" ? result.lines : [], branchId, reqDoc.docDate);
        }
        json(res, 200, result);
        return;
      }
      json(res, 404, { error: "not_found" });
    } catch (e) {
      const err = e as Error;
      const code = e instanceof DomainError ? 400 : 500;
      json(res, code, { error: err instanceof DomainError ? err.code : "INTERNAL", message: err.message });
    }
  });
}

export async function bootServer(port = PORT): Promise<http.Server> {
  seedFy2026Periods(liveStore);
  const db = await openDb();
  await ensureLoaded();
  await hydrateFromDb(db, liveStore, ledger);
  return await new Promise((resolve) => {
    const s = createServer();
    s.listen(port, "127.0.0.1", () => {
      process.stdout.write(`startyx-server http://127.0.0.1:${port} store=${db.kind}\n`);
      resolve(s);
    });
  });
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("http-server");
if (isMain) {
  bootServer().catch((e) => {
    process.stderr.write(String(e?.stack ?? e) + "\n");
    process.exit(1);
  });
}

void computeInvoiceTotals;
void computePurchaseTax;
void isValidVatNumber;
void unitCostAfterFreeQtyDistribution;
void purchaseReturnCostDiff;
void MemoryTx;
void deps;
void openPeriod;