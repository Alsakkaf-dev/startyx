import type { Db } from "../infrastructure/db.ts";
import type { MemoryTx } from "../infrastructure/memory.ts";
import { scopeKey } from "../engines/numbering.ts";
import { DomainError } from "../shared-kernel/errors.ts";

/**
 * الطبقة ٤ — قراءة المستندات لشاشاتها (بحث · تنقّل · عرض · «إضافة من»): مستندات أونيكس 2026 من المستخرج + ما رُحِّل حياً في startyx،
 * بمفتاح واحد «onyx:<DOC_SER>» أو «live:<id>». الكتابة تبقى عبر /api/documents/post (الخدمة ٤) وحدها.
 * البند 39 — قيود اليومية op.4.1.3.14: IAS_POST_MST/DTL بـDOC_TYPE 1 [GO/04 §op.4.1.3.14].
 */

type Row = Record<string, unknown>;

interface DocKindDef {
  screen: string;
  liveKind: string;
  view: string;
  onyxDocType: string;
}

const DOCS: Record<string, DocKindDef> = {
  "op.4.1.3.14": { screen: "op.4.1.3.14", liveKind: "manual_journal", view: "erp.journal_doc", onyxDocType: "1" },
};

export function docScreens(): string[] {
  return Object.keys(DOCS);
}

function def(screen: string): DocKindDef {
  const d = DOCS[screen];
  if (!d) throw new DomainError("NOT_FOUND", "شاشة مستندات غير معروفة: " + screen);
  return d;
}

async function has(db: Db, table: string): Promise<boolean> {
  const r = await db.query(`SELECT count(*) c FROM information_schema.tables WHERE table_schema = 'extract' AND table_name = $1`, [table]);
  return Number(r.rows[0]?.c ?? 0) > 0;
}

/** اسم التحليلي على السطر بنوعه (رمز أونيكس AC_DTL_TYP) */
const ANALYTIC_NAME = (type: string, code: string): string => `CASE ${type}
    WHEN '1' THEN (SELECT x.name_ar FROM erp.cashbox x WHERE CAST(x.no AS text) = ${code})
    WHEN '2' THEN (SELECT x.name_ar FROM erp.bank x WHERE CAST(x.no AS text) = ${code})
    WHEN '3' THEN (SELECT x.name_ar FROM erp.customer x WHERE x.code = ${code})
    WHEN '4' THEN (SELECT x.name_ar FROM erp.vendor x WHERE x.code = ${code})
    WHEN '7' THEN (SELECT x.name_ar FROM erp.employee x WHERE x.code = ${code}) END`;

/** نوع التحليلي في startyx ⇒ رمز أونيكس (نفس جدول ANALYTIC_OF في posting-context) */
const LIVE_TYPE = `CASE l.analytic_type WHEN 'cash' THEN '1' WHEN 'bank' THEN '2' WHEN 'customer' THEN '3' WHEN 'vendor' THEN '4'
    WHEN 'other_debit' THEN '5' WHEN 'other_credit' THEN '6' WHEN 'employee' THEN '7' ELSE '0' END`;

/** عرض رؤوس القيود — يُبنى عند الإقلاع (مجاميع 18,790 سطراً مرة واحدة لا في كل طلب) */
export async function syncDocuments(db: Db): Promise<void> {
  const ok = (await has(db, "IAS_POST_MST")) && (await has(db, "IAS_POST_DTL"));
  await db.exec(`DROP VIEW IF EXISTS erp.journal_doc`);
  if (ok) {
    await db.exec(`CREATE INDEX IF NOT EXISTS x_post_dtl_type_ser ON extract."IAS_POST_DTL" ("DOC_TYPE", "DOC_SER")`);
    await db.exec(`CREATE INDEX IF NOT EXISTS x_post_mst_type_ser ON extract."IAS_POST_MST" ("DOC_TYPE", "DOC_SER")`);
  }
  const n = (c: string) => `COALESCE(CAST(NULLIF(${c},'') AS numeric), 0)`;
  const onyx = ok
    ? `SELECT 'onyx:' || m."DOC_SER" doc_key, 'onyx' source, CAST(m."DOC_NO" AS bigint) doc_no, CAST(NULLIF(m."JV_TYPE",'') AS integer) jv_type,
              CAST(NULLIF(m."DOC_DATE",'') AS date) doc_date, CAST(NULLIF(m."BRN_NO",'') AS integer) branch_no,
              CAST(NULLIF(m."CMP_NO",'') AS integer) company_id, NULLIF(m."REF_NO",'') ref_no,
              (SELECT d."DOC_DESC" FROM extract."IAS_POST_DTL" d WHERE d."DOC_TYPE" = m."DOC_TYPE" AND d."DOC_SER" = m."DOC_SER"
                ORDER BY CAST(NULLIF(d."RCRD_NO",'') AS integer) NULLS LAST LIMIT 1) description,
              a.debit, a.credit, a.line_count, CASE WHEN m."DOC_POST" = '1' THEN 'posted_onyx' ELSE 'saved' END status,
              NULLIF(m."AD_U_ID",'') created_by, CAST(NULLIF(m."AD_DATE",'') AS timestamptz) created_at,
              NULLIF(m."UP_U_ID",'') updated_by, CAST(NULLIF(m."UP_DATE",'') AS timestamptz) updated_at,
              COALESCE(CAST(NULLIF(m."UP_CNT",'') AS integer), 0) update_count
         FROM extract."IAS_POST_MST" m
         LEFT JOIN (SELECT "DOC_SER", sum(${n('"DR_AMT"')}) debit, sum(${n('"CR_AMT"')}) credit, count(*) line_count
                      FROM extract."IAS_POST_DTL" WHERE "DOC_TYPE" = '1' GROUP BY 1) a ON a."DOC_SER" = m."DOC_SER"
        WHERE m."DOC_TYPE" = '1'
       UNION ALL `
    : "";
  await db.exec(`CREATE VIEW erp.journal_doc AS
    ${onyx}
    SELECT 'live:' || d.id, 'live', d.document_number, d.jv_type, d.doc_date, CAST(d.branch_id AS integer),
           (SELECT CAST(b.company_id AS integer) FROM erp.branch b WHERE b.no = d.branch_id), d.ref_no, d.description,
           COALESCE((SELECT sum(l.debit) FROM erp.gl_entry_line l JOIN erp.gl_entry e ON e.id = l.entry_id WHERE e.live_document_id = d.id), 0),
           COALESCE((SELECT sum(l.credit) FROM erp.gl_entry_line l JOIN erp.gl_entry e ON e.id = l.entry_id WHERE e.live_document_id = d.id), 0),
           COALESCE((SELECT count(*) FROM erp.gl_entry_line l JOIN erp.gl_entry e ON e.id = l.entry_id WHERE e.live_document_id = d.id), 0),
           d.status, d.created_by, d.created_at, NULL::text, NULL::timestamptz, 0
      FROM erp.live_document d WHERE d.doc_kind = 'manual_journal'`);
}

const LIST_COLS = `doc_key, source, doc_no, jv_type, to_char(doc_date,'YYYY-MM-DD') doc_date, branch_no, company_id, ref_no, description,
  trim_scale(round(debit, 2))::text debit, trim_scale(round(credit, 2))::text credit, line_count, status,
  created_by, to_char(created_at,'DD/MM/YYYY HH24:MI:SS') created_at, updated_by, to_char(updated_at,'DD/MM/YYYY HH24:MI:SS') updated_at,
  update_count`;

export async function listDocs(
  db: Db,
  screen: string,
  opts: { q?: string; limit?: number; branch?: number | null; jvType?: number | null } = {},
): Promise<{ rows: Row[]; total: number }> {
  const d = def(screen);
  const conds: string[] = [];
  const params: unknown[] = [];
  const q = (opts.q ?? "").trim();
  if (q) {
    params.push("%" + q + "%");
    conds.push(`(CAST(doc_no AS text) ILIKE $${params.length} OR description ILIKE $${params.length} OR ref_no ILIKE $${params.length})`);
  }
  if (opts.branch != null) {
    params.push(opts.branch);
    conds.push(`branch_no = $${params.length}`);
  }
  if (opts.jvType != null) {
    params.push(opts.jvType);
    conds.push(`jv_type = $${params.length}`);
  }
  const where = conds.length ? " WHERE " + conds.join(" AND ") : "";
  const total = Number((await db.query(`SELECT count(*) c FROM ${d.view}${where}`, params)).rows[0]?.c ?? 0);
  const limit = Math.min(Math.max(Number(opts.limit ?? 5000), 1), 5000);
  const r = await db.query(`SELECT ${LIST_COLS} FROM ${d.view}${where} ORDER BY doc_date, branch_no, jv_type, doc_no LIMIT ${limit}`, params);
  return { rows: r.rows, total };
}

export async function getDoc(db: Db, screen: string, key: string): Promise<{ header: Row; lines: Row[] } | null> {
  const d = def(screen);
  const h = (await db.query(`SELECT ${LIST_COLS} FROM ${d.view} WHERE doc_key = $1`, [key])).rows[0];
  if (!h) return null;
  let lines: Row[];
  if (key.startsWith("onyx:")) {
    lines = (await db.query(
      `SELECT CAST(NULLIF(p."RCRD_NO",'') AS integer) line_no, p."A_CODE" account_code,
              (SELECT a.name_ar FROM erp.account a WHERE a.code = p."A_CODE") account_name,
              p."AC_DTL_TYP" analytic_type, NULLIF(p."AC_CODE_DTL",'') analytic_code,
              ${ANALYTIC_NAME('p."AC_DTL_TYP"', 'p."AC_CODE_DTL"')} analytic_name, p."DOC_DESC" description,
              trim_scale(CAST(NULLIF(p."DR_AMT",'') AS numeric))::text debit, trim_scale(CAST(NULLIF(p."CR_AMT",'') AS numeric))::text credit,
              NULLIF(p."CC_CODE",'') cost_center, NULLIF(p."PJ_NO",'') project_no, p."A_CY" currency, NULLIF(p."REF_NO",'') ref_no,
              NULLIF(p."CHEQUE_NO",'') cheque_no, CAST(NULLIF(p."F_BRN_NO",'') AS integer) beneficiary_branch, false is_generated
         FROM extract."IAS_POST_DTL" p WHERE p."DOC_TYPE" = $1 AND p."DOC_SER" = $2
        ORDER BY CAST(NULLIF(p."RCRD_NO",'') AS integer) NULLS LAST`,
      [d.onyxDocType, key.slice(5)],
    )).rows;
  } else {
    lines = (await db.query(
      `SELECT l.line_no, l.account_code, (SELECT a.name_ar FROM erp.account a WHERE a.code = l.account_code) account_name,
              ${LIVE_TYPE} analytic_type, CAST(l.analytic_id AS text) analytic_code,
              ${ANALYTIC_NAME(LIVE_TYPE, "CAST(l.analytic_id AS text)")} analytic_name, l.description,
              trim_scale(l.debit)::text debit, trim_scale(l.credit)::text credit, l.cost_center_code cost_center, l.project_no,
              'SAR' currency, NULL ref_no, NULL cheque_no, CAST(l.branch_id AS integer) beneficiary_branch, l.is_generated
         FROM erp.gl_entry_line l JOIN erp.gl_entry e ON e.id = l.entry_id
        WHERE e.live_document_id = $1 ORDER BY e.id, l.line_no`,
      [Number(key.slice(5))],
    )).rows;
  }
  return { header: h, lines };
}

/** الرقم التالي كما سيُحجز (لا يُستهلك) — نفس مفتاح نطاق الترقيم في الخدمة ٢ */
export async function peekNext(db: Db, tx: MemoryTx, screen: string, branch: number, jvType: number | null): Promise<number> {
  def(screen);
  const jv = (await db.query(`SELECT "SEQUENCED" s FROM extract."JV_TYPES" WHERE "JV_TYPE" = $1`, [String(jvType ?? "")])).rows[0];
  if (!jv) throw new DomainError("ONYX-5093", "هذا الرقم غير موجود — نوع القيد");
  const key = scopeKey({
    entity: "manual_journal",
    scope: { kind: "per_branch_year_type", branchId: branch, fiscalYearId: 2026, docTypeId: Number(jv.s) },
  });
  return (tx.sequences.get(key) ?? 0) + 1;
}

/** ملخص الشاشة (اللوحة الجانبية): العدد والسطور بالنوع والمرحّل — من البيانات لا مكتوب */
export async function docSummary(db: Db, screen: string): Promise<Row> {
  const d = def(screen);
  const r = await db.query(`SELECT count(*) docs, COALESCE(sum(line_count), 0) lines,
                                   count(*) FILTER (WHERE jv_type = 1) jv1, count(*) FILTER (WHERE jv_type = 11) jv11,
                                   count(*) FILTER (WHERE status = 'posted_onyx') posted_onyx,
                                   count(*) FILTER (WHERE source = 'live') live
                              FROM ${d.view}`);
  const types = (await db.query(`SELECT "JV_TYPE" no, "JV_NAME" name, "SEQUENCED" seq FROM extract."JV_TYPES" ORDER BY CAST("JV_TYPE" AS integer)`)).rows;
  return { ...r.rows[0], jvTypes: types };
}
