import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Decimal, d } from "../shared-kernel/decimal.ts";
import { DomainError } from "../shared-kernel/errors.ts";
import { computeLineTax, computeInvoiceTotals, computePurchaseTax, isValidVatNumber } from "../engines/tax.ts";
import { recalcWeightedAverage, unitCostAfterFreeQtyDistribution, purchaseReturnCostDiff } from "../engines/costing.ts";
import { liveStore } from "../infrastructure/memory.ts";
import { postLive, serialPost } from "../application/post-live.ts";
import { loadPeriods } from "../application/posting-context.ts";
import { openDb, currentDb } from "../infrastructure/db.ts";
import { isEntity, listMasters, getMaster, saveMaster, deleteMaster, masterWarnings, nextMasterKey, type MasterEntity } from "../application/masters.ts";
import { syncMasters } from "../application/masters-sync.ts";
import { syncLayer1 } from "../application/masters-sync-layer1.ts";
import { syncLayer2 } from "../application/masters-sync-layer2.ts";
import { syncLayer2b } from "../application/masters-sync-layer2b.ts";
import { syncVendors } from "../application/masters-sync-vendors.ts";
import { syncEmployees } from "../application/masters-sync-employees.ts";
import { syncOpening, syncOpeningStock } from "../application/masters-sync-opening.ts";
import { docScreens, docSummary, getDoc, listDocs, peekNext, syncDocuments } from "../application/documents.ts";
import { hydrateFromDb, readFacts, mastersCounts, type LedgerRow } from "../infrastructure/postgres.ts";
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
      if (url.pathname === "/api/test/shutdown" && process.env.STARTYX_TEST_SHUTDOWN === "1") return;
      /* الطبقة ٤ — قراءة المستندات لشاشاتها: /api/docs/<شاشة>[/summary|/next|/<مفتاح>] */
      if (req.method === "GET" && url.pathname.startsWith("/api/docs/")) {
        const db = currentDb();
        if (!db) {
          json(res, 503, { error: "no_db" });
          return;
        }
        const parts = url.pathname.slice("/api/docs/".length).split("/").filter(Boolean).map(decodeURIComponent);
        const screen = parts[0] ?? "";
        if (!docScreens().includes(screen)) {
          json(res, 404, { error: "not_found" });
          return;
        }
        const int = (k: string): number | null => (url.searchParams.get(k) ? Number(url.searchParams.get(k)) : null);
        if (parts.length === 1) {
          json(res, 200, await listDocs(db, screen, { q: url.searchParams.get("q") ?? "", limit: int("limit") ?? 5000, branch: int("branch"), jvType: int("jvType") }));
        } else if (parts[1] === "summary") {
          json(res, 200, await docSummary(db, screen));
        } else if (parts[1] === "next") {
          json(res, 200, { next: await peekNext(db, liveStore, screen, int("branch") ?? 0, int("jvType")) });
        } else {
          const doc = await getDoc(db, screen, parts.slice(1).join("/"));
          if (!doc) json(res, 404, { error: "not_found", message: "المستند غير موجود" });
          else json(res, 200, doc);
        }
        return;
      }
      if (url.pathname.startsWith("/api/masters/")) {
        const db = currentDb();
        if (!db) {
          json(res, 503, { error: "no_db" });
          return;
        }
        const parts = url.pathname.slice("/api/masters/".length).split("/").filter(Boolean).map(decodeURIComponent);
        const name = parts[0] ?? "";
        if (!isEntity(name)) {
          json(res, 404, { error: "unknown_entity", message: name });
          return;
        }
        const entity = name as MasterEntity;
        if (req.method === "GET" && parts.length === 1) {
          const out = await listMasters(db, entity, {
            q: url.searchParams.get("q") ?? "",
            limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
            /* eq.<عمود>=قيمة — تفصيل برأسه (وحدات الصنف المعروض …) */
            eq: Object.fromEntries([...url.searchParams].filter(([k]) => k.startsWith("eq.")).map(([k, v]) => [k.slice(3), v])),
          });
          json(res, 200, out);
          return;
        }
        if (req.method === "GET" && parts.length === 2 && parts[1] === "next") {
          json(res, 200, { next: await nextMasterKey(db, entity, Object.fromEntries(url.searchParams)) });
          return;
        }
        if (req.method === "GET" && parts.length === 2) {
          const row = await getMaster(db, entity, String(parts[1]));
          if (!row) {
            json(res, 404, { error: "not_found" });
            return;
          }
          json(res, 200, row);
          return;
        }
        if (req.method === "POST" && parts.length === 2 && parts[1] === "delete") {
          const b = (await readBody(req)) as Record<string, unknown>;
          /* الكتابة في نفس طابور الترحيل: اتصال واحد ⇒ معاملتان لا تتداخلان */
          json(res, 200, await serialPost(() => deleteMaster(db, entity, String(b.key ?? ""), String(b.user ?? "1 · محسن السقاف"))));
          return;
        }
        if (req.method === "POST" && parts.length === 1) {
          const b = (await readBody(req)) as Record<string, unknown>;
          const mode = b.mode === "edit" ? "edit" : "add";
          const values = (b.values ?? {}) as Record<string, unknown>;
          const user = String(b.user ?? "1 · محسن السقاف");
          const saved = await serialPost(() => saveMaster(db, entity, mode, values, user));
          json(res, 200, { saved, warnings: await masterWarnings(db, entity, saved) });
          return;
        }
        json(res, 404, { error: "not_found" });
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
        const db = currentDb();
        if (!db) {
          json(res, 503, { error: "no_db", message: "الترحيل يتطلب القاعدة — لا ترحيل في الذاكرة وحدها" });
          return;
        }
        const b = (await readBody(req)) as Record<string, unknown>;
        const out = await serialPost(() => postLive(db, b, ledger));
        json(res, 200, out);
        return;
      }
      json(res, 404, { error: "not_found" });
    } catch (e) {
      const err = e as Error;
      /* رفض القاعدة (مشغّلات INV-* أو تفرّد الرقم) خطأ عمل لا خطأ خادم */
      const pgCode = (e as { code?: string }).code;
      const dbRule = pgCode === "23514" || pgCode === "23505" || /^INV-\d+/.test(err.message ?? "");
      const code = e instanceof DomainError || dbRule ? 400 : 500;
      json(res, code, { error: e instanceof DomainError ? err.code : dbRule ? "DB_RULE" : "INTERNAL", message: err.message });
    }
  });
}

export async function bootServer(port = PORT): Promise<http.Server> {
  const db = await openDb();
  await ensureLoaded();
  await syncMasters(db);
  await syncLayer1(db);
  await syncLayer2(db);
  await syncLayer2b(db);
  await syncVendors(db);
  await syncEmployees(db);
  await syncOpening(db);
  await syncOpeningStock(db);
  await syncDocuments(db);
  await hydrateFromDb(db, liveStore, ledger);
  await loadPeriods(db, liveStore);
  return await new Promise((resolve) => {
    const s = createServer();
    /* إغلاق نظيف: قتل العملية وPGlite مفتوح يترك مجلد البيانات تالفاً ولا يُفتح بعدها */
    let closing = false;
    const shutdown = (): void => {
      if (closing) return;
      closing = true;
      s.close();
      void db.close().catch(() => undefined).finally(() => process.exit(0));
    };
    for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"] as const) {
      process.on(sig, shutdown);
    }
    /* فحوص القبول على نسخة من القاعدة: ويندوز لا يوصل SIGINT لعملية منفصلة، والقتل القسري يُتلف PGlite.
       المسار موجود فقط حين STARTYX_TEST_SHUTDOWN=1 — لا يُفعَّل في تشغيل الشركة. */
    if (process.env.STARTYX_TEST_SHUTDOWN === "1") {
      s.on("request", (req, res) => {
        if (req.method === "POST" && req.url === "/api/test/shutdown") {
          res.writeHead(200, { "content-type": "application/json" });
          res.end('{"ok":true}');
          shutdown();
        }
      });
    }
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