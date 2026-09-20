import fs from "node:fs";
import path from "node:path";
import type { Db } from "./db.ts";
import { serverRoot } from "./db.ts";
import type { MemoryTx } from "./memory.ts";
import { seedFy2026Periods } from "./memory.ts";
import { scopeKey } from "../engines/numbering.ts";
import type { GlEntryLine } from "../engines/posting.ts";

export type LedgerRow = {
  glEntryId: number | null;
  documentNumber: number;
  docKind: string;
  screenRef: string;
  status: string;
  imbalance?: string;
  lines: unknown;
  at: string;
};

export const FACTS = {
  "GL-D4": { amount: "136647.87", rule: "opening imbalance kept as-is" },
  "IV-Q17": { amount: "0.23", rule: "stock vs GL gap kept as-is" },
  "IC-PAIR": { amount: "2099.90", rule: "intercompany pair kept as-is" },
} as const;

export async function applySchema(db: Db): Promise<void> {
  const sql = fs.readFileSync(path.join(serverRoot(), "sql/001-erp.sql"), "utf8");
  if (db.kind === "pglite") {
    await db.exec(sql);
    return;
  }
  for (const part of sql.split(";")) {
    const stmt = part.replace(/^\s*--.*$/gm, "").trim();
    if (!stmt) continue;
    await db.exec(stmt);
  }
}

export async function persistLive(
  db: Db,
  row: LedgerRow,
  lines: GlEntryLine[],
  branchId: number,
  docDate: Date,
): Promise<void> {
  await db.exec("BEGIN");
  try {
    let entryId: number | null = null;
    if (row.status === "posted" && lines.length) {
      const ins = await db.query(
        `INSERT INTO erp.gl_entry (company_id, doc_kind, date, branch_id, status, doc_no, description, source_kind, posted_at, screen_ref)
         VALUES (1, $1, $2, $3, 'posted', $4, '', 'live', now(), $5) RETURNING id`,
        [row.docKind, docDate.toISOString().slice(0, 10), branchId, String(row.documentNumber), row.screenRef],
      );
      entryId = Number(ins.rows[0].id);
      let n = 1;
      for (const ln of lines) {
        await db.query(
          `INSERT INTO erp.gl_entry_line (entry_id, line_no, account_code, analytic_type, analytic_id, debit, credit)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            entryId,
            n++,
            ln.accountCode,
            ln.analyticType,
            ln.analyticId,
            ln.debit.toString(),
            ln.credit.toString(),
          ],
        );
      }
      const key = scopeKey({
        entity: row.docKind,
        scope: { kind: "per_branch_year", branchId, fiscalYearId: 2026 },
      });
      await db.query(
        `INSERT INTO erp.document_sequence (company_id, branch_id, fiscal_year_id, doc_kind, sequence_group, last_value)
         VALUES (1,$1,2026,$2,$3,$4)
         ON CONFLICT (company_id, branch_id, fiscal_year_id, doc_kind, sequence_group)
         DO UPDATE SET last_value = GREATEST(erp.document_sequence.last_value, EXCLUDED.last_value)`,
        [branchId, row.docKind, key, row.documentNumber],
      );
    }
    await db.query(
      `INSERT INTO erp.live_document (gl_entry_id, document_number, doc_kind, screen_ref, status, imbalance, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [
        entryId,
        row.documentNumber,
        row.docKind,
        row.screenRef,
        row.status,
        row.imbalance ?? null,
        JSON.stringify({ lines: row.lines, at: row.at }),
      ],
    );
    await db.exec("COMMIT");
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }
}

export async function hydrateFromDb(db: Db, tx: MemoryTx, ledger: LedgerRow[]): Promise<void> {
  seedFy2026Periods(tx);
  const maxId = await db.query("SELECT COALESCE(MAX(id),0)::text AS m FROM erp.gl_entry");
  tx.glSeq = Number(maxId.rows[0]?.m ?? 0) + 1;
  const seqs = await db.query(
    "SELECT branch_id, doc_kind, sequence_group, last_value FROM erp.document_sequence",
  );
  const setSeq = (k: string, v: number) => {
    tx.sequences.set(k, Math.max(tx.sequences.get(k) ?? 0, v));
  };
  for (const r of seqs.rows) {
    const key = String(r.sequence_group ?? "");
    const val = Number(r.last_value);
    if (key.includes("|")) setSeq(key, val);
    else {
      const k = scopeKey({
        entity: String(r.doc_kind),
        scope: { kind: "per_branch_year", branchId: Number(r.branch_id), fiscalYearId: 2026 },
      });
      setSeq(k, val);
    }
  }
  const docs = await db.query(
    "SELECT gl_entry_id, document_number, doc_kind, screen_ref, status, imbalance, payload, created_at FROM erp.live_document ORDER BY id DESC LIMIT 500",
  );
  ledger.length = 0;
  for (const r of docs.rows.reverse()) {
    const payload = typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload ?? {};
    ledger.push({
      glEntryId: r.gl_entry_id == null ? null : Number(r.gl_entry_id),
      documentNumber: Number(r.document_number),
      docKind: String(r.doc_kind),
      screenRef: String(r.screen_ref ?? ""),
      status: String(r.status),
      imbalance: r.imbalance == null ? undefined : String(r.imbalance),
      lines: (payload as { lines?: unknown }).lines ?? [],
      at: String((payload as { at?: string }).at ?? r.created_at ?? ""),
    });
  }
}

export async function readFacts(db: Db): Promise<Record<string, unknown>> {
  const rows = await db.query("SELECT code, amount::text, rule FROM erp.migration_fact ORDER BY code");
  const out: Record<string, unknown> = { official: FACTS, stored: {} };
  const stored: Record<string, { amount: string; rule: string }> = {};
  for (const r of rows.rows) {
    stored[String(r.code)] = { amount: String(r.amount), rule: String(r.rule) };
  }
  out.stored = stored;
  return out;
}

export async function mastersCounts(db: Db): Promise<Record<string, number>> {
  const q = async (sql: string) => Number((await db.query(sql)).rows[0]?.c ?? 0);
  return {
    accounts: await q("SELECT count(*)::int AS c FROM erp.account"),
    items: await q("SELECT count(*)::int AS c FROM erp.item"),
    warehouses: await q("SELECT count(*)::int AS c FROM erp.warehouse"),
    vendors: await q("SELECT count(*)::int AS c FROM erp.vendor"),
    customers: await q("SELECT count(*)::int AS c FROM erp.customer"),
    openingLines: await q("SELECT count(*)::int AS c FROM erp.opening_balance_line"),
    liveDocuments: await q("SELECT count(*)::int AS c FROM erp.live_document"),
  };
}