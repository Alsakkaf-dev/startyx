-- الطبقة ٢ (تكملة) — BUILD-ORDER 34–36: العملاء · الموردون · الموظفون.
-- نفس مبدأ 006: الجداول القائمة تُوسَّع بأعمدة (`ADD COLUMN IF NOT EXISTS`) ولا يُعاد تصميمها.
-- الأعمدة مولَّدة من المواصفة في `masters-sync-layer2b.ts` (مصدر واحد) — لا تُحرَّر يدوياً بعيداً عنها.

-- بصمة كل ملف مستخرج مُحمَّل: جدول أُعيد استخراجه (تصحيح قارئ LOB) يُعاد تحميله عند الإقلاع
CREATE TABLE IF NOT EXISTS erp.extract_file (
  name        text PRIMARY KEY,
  size        bigint NOT NULL,
  mtime_ms    bigint NOT NULL,
  rows_loaded bigint NOT NULL,
  loaded_at   timestamptz NOT NULL DEFAULT now()
);

-- ═══ op.1.1.12 — الفروع · S_BRN (92 عموداً) — صار مقروءاً بعد تصحيح قارئ LOB (SY-Q4) ═══
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS city_no       integer;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS additional_no text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS short_address text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS id_scheme     text;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS features      jsonb;
ALTER TABLE erp.branch ADD COLUMN IF NOT EXISTS legacy        jsonb;

-- ═══ 34 · op.7.1.2.8 — بيانات العملاء · CUSTOMER ═══
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS features           jsonb;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS legacy             jsonb;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS portal_secret_hash text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS usage_kind         text NOT NULL DEFAULT 'regular';
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS created_by         text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS created_at         timestamptz;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS updated_by         text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS updated_at         timestamptz;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS update_count       integer NOT NULL DEFAULT 0;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS name_en                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS customer_type              integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS account_code               text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS parent_code                text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS classification             integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS portal_user                text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS seq_no                     integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS grade_no                   integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS cost_center                text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS linked_vendor              text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS vat_no                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS vat_class                  integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS branch_no                  integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS is_rep                     boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS rep_code                   text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS collector_no               integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS is_agent                   boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS credit_days                integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS pending_cash_credit_days   integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS route_no                   integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS route_order                integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS marketer_code              text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS employee_no                integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS address                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS phone                      text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS mobile                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS whatsapp_no                text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS whatsapp_group             text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS po_box                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS fax                        text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS email                      text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS website                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS max_discount_pct           numeric(28,10);
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS opened_on                  date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS default_discount_pct       numeric(28,10);
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS referred_by                text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS gps                        text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS last_reconciled_on         date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS notes                      text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS inactive                   boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS sales_inactive             boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS inactive_date              date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS grace_days                 integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS inactive_reason            text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS active_from                date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS active_from_h              date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS active_to                  date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS active_to_h                date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS blacklisted                boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS blacklisted_at             date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS verify_msg_credit          boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS allow_sale_with_debt       integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS blacklist_reason           text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS license_no                 text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS license_owner              text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS responsible_person         text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS authorized_signatory       text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS notify_channel             integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS is_favorite                boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS exclude_promotions         boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS notify_installments        boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS auto_installments          boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS lead_source                integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS building_no                text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS street                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS district_name              text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS country_no                 integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS province_no                integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS city_no                    integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS region_no                  integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS postal_code                text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS additional_no              text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS cr_no                      text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS trade_name_ar              text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS trade_name_en              text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS short_address              text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS id_scheme                  text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS id_value                   text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS id_type                    integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS id_no                      text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS id_issue_date              date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS id_issue_date_h            date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS profession                 integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS birth_date                 date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS birth_place                text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS employer                   text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS income_source              text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS id_issue_place             text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS id_expiry_date             date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS id_expiry_date_h           date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS marital_status             integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS birth_date_h               date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS work_address               text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS gender                     integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS monthly_income             numeric(28,10);
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS nationality                integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS tax_calc_method            integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS activity_name              text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS registration_type          integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS statistical_no             text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS tax_article                text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS capital                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS is_gcc                     boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS is_vat_group               boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS sector                     integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS barcode                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS visit_open_type            integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS gln_code                   text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS auto_sync_vendor           boolean NOT NULL DEFAULT false;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS item_cap_type              integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field1                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field2                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field3                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field4                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field5                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field6                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field7                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field8                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field9                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field10                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field11                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field12                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field13                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field14                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field15                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field16                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field17                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field18                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field19                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS field20                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_status                   integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_type                     integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_start_date               date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_expire_date              date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_name                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_address                  text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_work                     text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_fin_center               text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_amount                   numeric(28,10);
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_doc_date                 date;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_court_reg                text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_chamber_reg              text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_cr_no                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_phone                    text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS g_fax                      text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS dlvr_city_no               integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS dlvr_province_no           integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS dlvr_region_no             integer;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS dlvr_phone                 text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS dlvr_address               text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS dlvr_fax                   text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS dlvr_email                 text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS dlvr_person                text;
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS dlvr_mobile                text;

CREATE TABLE IF NOT EXISTS erp.customer_currency (
  customer_code          text,
  currency               text,
  price_level_credit     integer,
  price_level_cash       integer,
  is_default             boolean NOT NULL DEFAULT false,
  inactive               boolean NOT NULL DEFAULT false,
  sales_inactive         boolean NOT NULL DEFAULT false,
  inactive_date          date,
  credit_limit           numeric(28,10),
  invoice_limit          numeric(28,10),
  overrun_pct            numeric(28,10),
  overrun_policy         integer,
  last_confirmed_on      date,
  external_post          integer,
  transfer_flag          integer,
  mobile_txn_max         numeric(28,10),
  mobile_txn_min         numeric(28,10),
  created_by   text,
  created_at   timestamptz,
  updated_by   text,
  updated_at   timestamptz,
  update_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (customer_code, currency)
);

CREATE TABLE IF NOT EXISTS erp.account_limit (
  rcrd_sq                integer,
  account_code           text,
  currency               text,
  cost_center            text,
  project_no             text,
  activity_no            text,
  balance_min            numeric(28,10),
  balance_max            numeric(28,10),
  txn_min                numeric(28,10),
  txn_max                numeric(28,10),
  overrun_pct            numeric(28,10),
  overrun_possible       numeric(28,10),
  overrun_policy         integer,
  side                   integer,
  description            text,
  analytic_code          text,
  analytic_sub           text,
  analytic_type          integer,
  facility_amount        numeric(28,10),
  facility_status        integer,
  inactive               boolean NOT NULL DEFAULT false,
  daily_amount           numeric(28,10),
  monthly_amount         numeric(28,10),
  annual_amount          numeric(28,10),
  branch_no              integer,
  company_no             integer,
  external_post          integer,
  legacy       jsonb,
  created_by   text,
  created_at   timestamptz,
  updated_by   text,
  updated_at   timestamptz,
  update_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (rcrd_sq)
);

CREATE TABLE IF NOT EXISTS erp.customer_account (
  rcrd_no                integer,
  customer_code          text,
  account_code           text,
  account_type           integer,
  inactive               boolean NOT NULL DEFAULT false,
  inactive_date          date,
  inactive_reason        text,
  inactive_by            text,
  created_by   text,
  created_at   timestamptz,
  updated_by   text,
  updated_at   timestamptz,
  update_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (rcrd_no)
);

CREATE TABLE IF NOT EXISTS erp.customer_sales_cap (
  rcrd_no                integer,
  customer_code          text,
  from_date              date,
  to_date                date,
  currency               text,
  amount                 numeric(28,10),
  note                   text,
  created_by   text,
  created_at   timestamptz,
  updated_by   text,
  updated_at   timestamptz,
  update_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (rcrd_no)
);

CREATE TABLE IF NOT EXISTS erp.customer_driver (
  customer_code          text,
  driver_no              integer,
  is_default             boolean NOT NULL DEFAULT false,
  inactive               boolean NOT NULL DEFAULT false,
  inactive_date          date,
  inactive_by            text,
  inactive_reason        text,
  created_by   text,
  created_at   timestamptz,
  updated_by   text,
  updated_at   timestamptz,
  update_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (customer_code, driver_no)
);

-- الصلاحيات · IAS_PRIV_CUSTOMER (تبويب ١٠) — 49,152 صفاً في أونيكس
CREATE TABLE IF NOT EXISTS erp.customer_user (
  customer_code text NOT NULL,
  user_id       integer NOT NULL,
  currency      text NOT NULL DEFAULT 'SAR',
  can_add       boolean NOT NULL DEFAULT false,
  can_view      boolean NOT NULL DEFAULT false,
  created_by    text,
  created_at    timestamptz,
  updated_by    text,
  updated_at    timestamptz,
  update_count  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (customer_code, user_id, currency)
);

CREATE SEQUENCE IF NOT EXISTS erp.account_limit_rcrd_seq;
ALTER TABLE erp.account_limit ALTER COLUMN rcrd_sq SET DEFAULT nextval('erp.account_limit_rcrd_seq');
CREATE INDEX IF NOT EXISTS account_limit_analytic_idx ON erp.account_limit (analytic_type, analytic_code);
CREATE INDEX IF NOT EXISTS customer_group_idx ON erp.customer (group_no);
CREATE INDEX IF NOT EXISTS customer_user_user_idx ON erp.customer_user (user_id);

-- ═══ 35 · op.6.1.2.2 — بيانات الموردين · V_DETAILS (89) + IAS_VENDOR_BANK · IAS_VNDR_ACCNT · IAS_PRIV_VENDOR ═══
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS name_en                  text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS seq_no                   integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS vendor_class             integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS degree_no                integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS cost_center              text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS cost_center_no           integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS branch_no                integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS inactive                 boolean NOT NULL DEFAULT false;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS purchase_inactive        boolean NOT NULL DEFAULT false;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS blacklisted              boolean NOT NULL DEFAULT false;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS blacklist_reason         text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS vat_no                   text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS is_taxpayer              boolean NOT NULL DEFAULT false;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS tax_calc_method          integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS price_vat_type           integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS vat_base                 integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS cr_no                    text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS activity_name            text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS credit_days              integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS parent_code              text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS purchaser_code           text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS is_favorite              boolean NOT NULL DEFAULT false;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS address                  text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS country_no               integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS province_no              integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS city_no                  integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS region_no                integer;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS po_box                   text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS phone                    text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS fax                      text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS mobile                   text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS email                    text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS website                  text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS referred_by              text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS since                    date;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS notes                    text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS last_reconciled_on       date;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS statistical_no           text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS tax_article              text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS capital                  text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS features                 jsonb;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS legacy                   jsonb;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS portal_secret_hash       text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS webservice_secret_hash   text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS created_by               text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS created_at               timestamptz;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS updated_by               text;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS updated_at               timestamptz;
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS update_count             integer NOT NULL DEFAULT 0;

-- رقم سطر من startyx: لا مفتاح طبيعي في IAS_VENDOR_BANK (4 تكرارات مورد + آيبان في أونيكس)
CREATE TABLE IF NOT EXISTS erp.vendor_bank (
  line_no                bigserial PRIMARY KEY,
  vendor_code            text,
  bank_no                integer,
  bank_account           text,
  bank_name              text,
  swift_code             text,
  country_no             integer,
  city_no                integer,
  beneficiary_name       text,
  bank_key               text,
  iban                   text,
  currency               text,
  created_by   text,
  created_at   timestamptz,
  updated_by   text,
  updated_at   timestamptz,
  update_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp.vendor_account (
  rcrd_no                integer,
  vendor_code            text,
  account_code           text,
  account_type           integer,
  inactive               boolean NOT NULL DEFAULT false,
  inactive_date          date,
  inactive_reason        text,
  inactive_by            text,
  created_by   text,
  created_at   timestamptz,
  updated_by   text,
  updated_at   timestamptz,
  update_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (rcrd_no)
);

CREATE TABLE IF NOT EXISTS erp.vendor_user (
  vendor_code  text NOT NULL,
  user_id      integer NOT NULL,
  currency     text NOT NULL DEFAULT 'SAR',
  can_add      boolean NOT NULL DEFAULT false,
  can_view     boolean NOT NULL DEFAULT false,
  created_by   text,
  created_at   timestamptz,
  updated_by   text,
  updated_at   timestamptz,
  update_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (vendor_code, user_id, currency)
);
CREATE INDEX IF NOT EXISTS vendor_bank_vendor_idx ON erp.vendor_bank (vendor_code);
CREATE INDEX IF NOT EXISTS vendor_group_idx ON erp.vendor (group_no);
