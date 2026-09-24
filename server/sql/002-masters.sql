-- الطبقة ٠ — البيانات الأساسية للشاشات الموثّقة في GO/01-system-setup.md
-- op.1.1.3 العملات · op.1.2.3 الدليل المحاسبي · op.1.1.12 الفروع · op.1.1.2 فترات النظام

CREATE TABLE IF NOT EXISTS erp.currency (
  id                bigserial PRIMARY KEY,
  no                integer NOT NULL UNIQUE,
  code              text NOT NULL,
  iso_code          text,
  name_ar           text NOT NULL,
  name_en           text,
  fraction_ar       text,
  fraction_en       text,
  is_local          boolean NOT NULL DEFAULT false,
  is_stock_currency boolean NOT NULL DEFAULT false,
  rate              numeric(28,10) NOT NULL DEFAULT 1,
  rate_min          numeric(28,10),
  rate_max          numeric(28,10),
  operator          text NOT NULL DEFAULT 'mul',
  decimals          integer NOT NULL DEFAULT 2,
  inactive          boolean NOT NULL DEFAULT false,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS name_en         text;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS kind            text;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS nature          text;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS report_type     text;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS use_cc          integer;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS use_pj          integer;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS use_actv        integer;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS manual_code     boolean;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS inactive_reason text;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS inactive_date   date;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS created_by      text;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS created_at      timestamptz;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS updated_by      text;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS updated_at      timestamptz;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS update_count    integer NOT NULL DEFAULT 0;

ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS code             text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS name_en          text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS start_year       integer;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS seq_no           integer;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS is_main          boolean NOT NULL DEFAULT false;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS vat_no           text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS cr_no            text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS city             text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS district         text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS street           text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS building_no      text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS postal_code      text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS einvoice_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS inactive         boolean NOT NULL DEFAULT false;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS created_by       text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS created_at       timestamptz;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS updated_by       text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS updated_at       timestamptz;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS update_count     integer NOT NULL DEFAULT 0;

ALTER TABLE erp.fiscal_period ADD COLUMN IF NOT EXISTS name_en      text;
ALTER TABLE erp.fiscal_period ADD COLUMN IF NOT EXISTS year_no      integer;
ALTER TABLE erp.fiscal_period ADD COLUMN IF NOT EXISTS vat_period   integer;
ALTER TABLE erp.fiscal_period ADD COLUMN IF NOT EXISTS created_by   text;
ALTER TABLE erp.fiscal_period ADD COLUMN IF NOT EXISTS created_at   timestamptz;
ALTER TABLE erp.fiscal_period ADD COLUMN IF NOT EXISTS updated_by   text;
ALTER TABLE erp.fiscal_period ADD COLUMN IF NOT EXISTS updated_at   timestamptz;
ALTER TABLE erp.fiscal_period ADD COLUMN IF NOT EXISTS update_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS account_parent_idx ON erp.account (parent_code);
CREATE INDEX IF NOT EXISTS gl_line_account_idx ON erp.gl_entry_line (account_code);

-- ═══ إصلاحات تدقيق الطبقة ٠ (2026-09-23) ═══

-- op.1.1.12: «إضافة فرع» كانت تفشل بـ NOT NULL على id (لا قيمة افتراضية) ⇒ تسلسل
CREATE SEQUENCE IF NOT EXISTS erp.branch_id_seq;
SELECT setval('erp.branch_id_seq', GREATEST(1, (SELECT COALESCE(max(id), 0) FROM erp.branch)));
ALTER TABLE erp.branch ALTER COLUMN id SET DEFAULT nextval('erp.branch_id_seq');

-- الشركة قد تكون مجهولة لفرع أُدخل بلا مصدر. فرع 6 «انشطة شقيقة» كان NULL لأن S_BRN لم يُقرأ (LOB)؛
-- بعد تصحيح القارئ صار مصدره S_BRN.CMP_NO = 1 وتملؤه المزامنة (masters-sync.ts) — لا تحديث هنا يعيده NULL كل إقلاع.
ALTER TABLE erp.branch ALTER COLUMN company_id DROP NOT NULL;

-- ONYX-2143 «هذا الكود موجود مسبقا» — كان يُقبل رمز عملة مكرر برقم مختلف
CREATE UNIQUE INDEX IF NOT EXISTS currency_code_uq ON erp.currency (code);
