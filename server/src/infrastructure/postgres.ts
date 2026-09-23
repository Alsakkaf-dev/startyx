import fs from "node:fs";
import path from "node:path";
import type { Db } from "./db.ts";
import { serverRoot } from "./db.ts";
import type { MemoryTx } from "./memory.ts";
import { scopeKey } from "../engines/numbering.ts";
import type { PostDocumentRequest, PostDocumentResult } from "../engines/posting.ts";

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

export const SCHEMA_FILES = [
  "sql/001-erp.sql",
  "sql/002-masters.sql",
  "sql/003-dimensions.sql",
  "sql/004-layer1.sql",
  "sql/005-posting-foundation.sql",
] as const;

/**
 * كل ملف يُنفَّذ دفعة واحدة (بروتوكول الاستعلام البسيط يقبل عدة أوامر في Postgres وPGlite معاً).
 * التقسيم على «;» كان يكسر دوال plpgsql في 005.
 */
export async function applySchema(db: Db): Promise<void> {
  for (const file of SCHEMA_FILES) {
    await db.exec(fs.readFileSync(path.join(serverRoot(), file), "utf8"));
  }
}

export interface PersistInput {
  req: PostDocumentRequest;
  result: PostDocumentResult;
  screenRef: string;
  user: string;
}

export interface PersistOutput {
  liveDocumentId: number;
  glEntryIds: number[];
}

/**
 * يكتب الوثيقة وقيودها (قيد لكل فرع) وحركات مخزونها وآخر رقم في تسلسلها — معاملة واحدة.
 * أي فشل ⇒ لا يُكتب شيء (INV-3)، والمستدعي يرجع الذاكرة لما قبل الحجز.
 */
export async function persistDocument(db: Db, p: PersistInput): Promise<PersistOutput> {
  const { req, result } = p;
  const date = req.docDate.toISOString().slice(0, 10);
  const fy = result.fiscalYearId;
  await db.exec("BEGIN");
  try {
    const doc = await db.query(
      `INSERT INTO erp.live_document
         (document_number, doc_kind, screen_ref, status, imbalance, payload,
          branch_id, fiscal_year_id, doc_date, currency_id, fx_rate, fx_operator, created_by, icv)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [
        result.documentNumber,
        req.docKind,
        p.screenRef,
        result.status,
        result.status === "pending" ? result.imbalance.toString() : null,
        JSON.stringify({ lines: result.status === "posted" ? result.lines : [], at: new Date().toISOString() }),
        req.branchId,
        fy,
        date,
        req.currencyId,
        req.fxRate.toString(),
        req.fxOperator,
        p.user,
        result.icv,
      ],
    );
    const liveDocumentId = Number(doc.rows[0].id);
    const glEntryIds: number[] = [];
    if (result.status === "posted") {
      for (const entry of result.entries) {
        const ins = await db.query(
          `INSERT INTO erp.gl_entry
             (company_id, doc_kind, date, period_id, branch_id, status, doc_no, description, source_kind, posted_at,
              screen_ref, fiscal_year_id, currency_id, fx_rate, fx_operator, live_document_id, created_by)
           VALUES (COALESCE((SELECT company_id FROM erp.branch WHERE no = $4), 1), $1, $2, $3, $4, 'posted', $5, '', 'live', now(),
                   $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
          [
            req.docKind, date, result.periodId, entry.branchId, String(result.documentNumber),
            p.screenRef, fy, req.currencyId, req.fxRate.toString(), req.fxOperator, liveDocumentId, p.user,
          ],
        );
        const entryId = Number(ins.rows[0].id);
        glEntryIds.push(entryId);
        let n = 1;
        for (const ln of entry.lines) {
          await db.query(
            `INSERT INTO erp.gl_entry_line
               (company_id, entry_id, line_no, account_code, analytic_type, analytic_id, debit, credit,
                branch_id, cost_center_code, project_no, is_generated)
             VALUES (COALESCE((SELECT company_id FROM erp.branch WHERE no = $9), 1), $1,$2,$3,$4,$5,$6,$7,$8,$10,$11,$12)`,
            [
              entryId, n++, ln.accountCode, ln.analyticType, ln.analyticId,
              ln.debit.toString(), ln.credit.toString(), ln.branchId, ln.branchId,
              ln.costCenter, ln.project, ln.isGenerated,
            ],
          );
        }
      }
      let m = 1;
      for (const mv of result.movements) {
        await db.query(
          `INSERT INTO erp.stock_movement
             (live_document_id, gl_entry_id, branch_id, doc_kind, document_number, date, line_no,
              item_code, warehouse_code, qty_base, unit_cost, value, is_free)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            liveDocumentId, glEntryIds[0] ?? null, mv.branchId, req.docKind, result.documentNumber, date, m++,
            mv.itemCode, mv.warehouseCode, mv.qtyBase.toString(), mv.unitCost.toString(), mv.value.toString(), mv.isFree,
          ],
        );
      }
      await db.query(`UPDATE erp.live_document SET gl_entry_id = $1 WHERE id = $2`, [glEntryIds[0] ?? null, liveDocumentId]);
    }
    /* INV-10: الرقم محجوز للمعلّق كما للمرحّل — وإلا أعاد التشغيل التالي استخدامه */
    const key = scopeKey({
      entity: req.docKind,
      scope: { kind: "per_branch_year", branchId: req.branchId, fiscalYearId: fy },
    });
    await db.query(
      `INSERT INTO erp.document_sequence (company_id, branch_id, fiscal_year_id, doc_kind, sequence_group, last_value)
       VALUES (COALESCE((SELECT company_id FROM erp.branch WHERE no = $1), 1),$1,$2,$3,$4,$5)
       ON CONFLICT (company_id, branch_id, fiscal_year_id, doc_kind, sequence_group)
       DO UPDATE SET last_value = GREATEST(erp.document_sequence.last_value, EXCLUDED.last_value)`,
      [req.branchId, fy, req.docKind, key, result.documentNumber],
    );
    /* عدّاد الفاتورة الإلكترونية ICV تسلسل واحد للجهاز لا يتكرر أبداً (ZATCA) */
    if (result.icv != null && req.existingIcv == null) {
      const icvKey = scopeKey({
        entity: "einvoice_icv",
        scope: { kind: "group_sequence", groupCode: req.docKind === "sales_return" ? "note" : "invoice" },
      });
      await db.query(
        `INSERT INTO erp.document_sequence (company_id, branch_id, fiscal_year_id, doc_kind, sequence_group, last_value)
         VALUES (1, 0, 0, 'einvoice_icv', $1, $2)
         ON CONFLICT (company_id, branch_id, fiscal_year_id, doc_kind, sequence_group)
         DO UPDATE SET last_value = GREATEST(erp.document_sequence.last_value, EXCLUDED.last_value)`,
        [icvKey, result.icv],
      );
    }
    await db.exec("COMMIT");
    return { liveDocumentId, glEntryIds };
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }
}

export async function hydrateFromDb(db: Db, tx: MemoryTx, ledger: LedgerRow[]): Promise<void> {
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