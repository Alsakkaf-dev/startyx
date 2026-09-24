-- الطبقة ٤ — المستندات. البند 39 قيود اليومية op.4.1.3.14 [GO/04-general-ledger.md §op.4.1.3.14]
-- إضافة فوق النموذج العام (لا جدول لكل نوع مستند): رأس الوثيقة يحمل نوع القيد والمرجع والبيان، والسطر بيانه (IAS_POST_DTL.DOC_DESC).
ALTER TABLE erp.live_document ADD COLUMN IF NOT EXISTS jv_type     integer;   -- JV_TYPE (op.4.1.1.6)
ALTER TABLE erp.live_document ADD COLUMN IF NOT EXISTS ref_no      text;      -- REF_NO
ALTER TABLE erp.live_document ADD COLUMN IF NOT EXISTS description text;      -- بيان الرأس
ALTER TABLE erp.gl_entry_line ADD COLUMN IF NOT EXISTS description text;      -- DOC_DESC
CREATE INDEX IF NOT EXISTS live_doc_kind_idx ON erp.live_document (doc_kind, branch_id, document_number);
