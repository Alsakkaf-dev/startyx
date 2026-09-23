-- ═══════════════════════════════════════════════════════════════════════════
-- الطبقة ١ — التهيئة (بنود 13–27 في BUILD-ORDER.md)
-- إضافة فوق النموذج العام (PROJECT-STATE.md §٤ «لا تحويل جذري») — لا إعادة تصميم.
-- كل جدول يقابل جدول أونيكس المذكور بجواره، وأعمدته محفوظة كاملة (لا حذف إلا بقرار مسجَّل).
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ 13 · op.3.2 — أنواع الضرائب · GNR_TAX_CODE_MST (27 عموداً) ═══
CREATE TABLE IF NOT EXISTS erp.tax_type (
  no                integer PRIMARY KEY,
  name_ar           text NOT NULL,
  name_en           text,
  code              text NOT NULL,              -- TAX_TYP_CODE: VAT (يُرسل للهيئة — TX-R5)
  applies_to        integer NOT NULL DEFAULT 3, -- CLC_DOC_TYP: 1 مبيعات · 2 مشتريات · 3 الكل
  agency_count      integer NOT NULL DEFAULT 0, -- AGNCY_CNT — آلي بعد حفظ الجهات
  is_default        boolean NOT NULL DEFAULT false,
  company_id        integer,
  calc_on_document  boolean NOT NULL DEFAULT false, -- CLC_TAX_BY_DOC
  tax_kind          integer,                    -- TAX_TYP
  tax_class         text,                       -- TAX_CLSS
  tds               boolean NOT NULL DEFAULT false,
  min_amount        numeric(28,10),
  pct_on_prepaid    numeric(28,10),
  sync              boolean NOT NULL DEFAULT false,
  inactive          boolean NOT NULL DEFAULT false,
  inactive_reason   text,
  inactive_date     date,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS tax_type_code_uq ON erp.tax_type (code);

-- الجهات وحساباتها · GNR_TAX_CODE_DTL (15 عموداً) — TX-R2
CREATE TABLE IF NOT EXISTS erp.tax_agency (
  tax_no            integer NOT NULL,
  agency_no         integer NOT NULL,
  name_ar           text NOT NULL,
  name_en           text,
  sales_account     text,                       -- AC_CODE_AR — دائن عند البيع
  purchase_account  text,                       -- AC_CODE_AP — مدين عند الشراء
  due_tax_account   text,                       -- AC_CODE_DUE_TAX
  pct               numeric(28,10),
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (tax_no, agency_no)
);

-- الشرائح · GNR_TAX_SLICE — TX-R11: النسبة تُختار من الشرائح المعرّفة فقط
CREATE TABLE IF NOT EXISTS erp.tax_slice (
  no                integer PRIMARY KEY,
  name_ar           text NOT NULL,
  name_en           text,
  pct               numeric(28,10) NOT NULL,
  is_default        boolean NOT NULL DEFAULT false,
  inactive          boolean NOT NULL DEFAULT false,
  inactive_reason   text,
  inactive_date     date,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

-- ═══ 14 · op.5.1.1.2 — وحدات القياس · MEASUREMENT (18) + IAS_UNTS_CONV (12) ═══
CREATE TABLE IF NOT EXISTS erp.unit (
  code              text PRIMARY KEY,           -- MEASURE_CODE
  name_ar           text NOT NULL,              -- MEASURE — يُرسل حرفياً للهيئة (IV-R30)
  name_en           text,
  global_code       text,                       -- MEASURE_CODE_GB — فريد إن أُدخل (IV-R22)، لا يدخل XML (IV-D12)
  default_pack_size numeric(28,10),             -- DFLT_SIZE
  lock_pack_size    boolean NOT NULL DEFAULT false, -- ALLOW_UPD
  unit_kind         integer NOT NULL DEFAULT 1, -- MEASURE_TYPE: 1 عددية · 2 مقاسة
  measure_class     integer,                    -- MEASURE_WT_TYPE: 1 وزن … 6 عدد
  linked_to_counted boolean NOT NULL DEFAULT false, -- MEASURE_WT_CONN
  sale_scope        integer NOT NULL DEFAULT 3, -- UNT_SALE_TYP: 1 تجزئة · 2 جملة · 3 كلي
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS unit_global_code_uq ON erp.unit (global_code) WHERE global_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS erp.unit_conversion (
  id                bigserial PRIMARY KEY,
  group_no          integer,                    -- MSUR_MAN_NO
  from_code         text NOT NULL,              -- MSUR_MAN_CODE
  to_code           text NOT NULL,              -- MSUR_OBS_CODE
  factor            numeric(28,10) NOT NULL,    -- ARGMNT_NO: 1 from = factor × to
  needs_review      boolean NOT NULL DEFAULT false, -- IV-D6: 9 من 13 صفاً افتراضياً خاطئة
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0,
  UNIQUE (from_code, to_code)
);

-- ═══ 15 · op.5.1.2.1 — بيانات المجموعة الرئيسية · GROUP_DETAILS (23) ═══
CREATE TABLE IF NOT EXISTS erp.item_group (
  code              text PRIMARY KEY,           -- G_CODE
  name_ar           text NOT NULL,              -- G_A_NAME
  name_en           text,
  item_code_prefix  text,                       -- G_I_CODE
  default_tax_pct   numeric(28,10),             -- TAX_PRCNT_DFLT — شريحة معرّفة فقط (IV-R74)
  sort_no           integer,                    -- G_ORDR
  qty_limit         numeric(28,10),             -- ROL_LMT_QTY
  sync_to_web       boolean NOT NULL DEFAULT false,
  use_sale_as_purchase_price boolean NOT NULL DEFAULT false,
  allow_disc_sales  boolean NOT NULL DEFAULT false,
  allow_disc_purch  boolean NOT NULL DEFAULT false,
  min_price_base    integer,                    -- LOW_SAL_PRICE_ALLW_TYP
  min_price_sign    text,                       -- LOW_SAL_PRICE_ALLW_SGN
  min_price_val_typ integer,                    -- LOW_SAL_PRICE_ALLW_VAL_TYP
  min_price_value   numeric(28,10),
  needs_review      boolean NOT NULL DEFAULT false, -- IV-D13 (المجموعة 012 «الخام» المكررة)
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

-- ═══ 16 · op.5.1.2.8 — مجموعات المخازن · WAREHOUSE_GROUP (11) ═══
CREATE TABLE IF NOT EXISTS erp.warehouse_group (
  code              text PRIMARY KEY,           -- WHG_CODE
  name_ar           text NOT NULL,              -- WHG_A_NAME
  name_en           text,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS group_code text;

-- ═══ 17 · op.1.2.11 — ربط الحسابات المدينة والدائنة الأخرى · GLS_AC_CODE_DTL_GRPS (14) ═══
CREATE TABLE IF NOT EXISTS erp.account_detail_link (
  code              text PRIMARY KEY,           -- GRP_CODE — رقم الربط
  name_ar           text NOT NULL,              -- GRP_L_NM
  name_en           text,
  conn_code         integer,                    -- GRP_CONN_CODE — النوع التفصيلي
  account_code      text NOT NULL,              -- AC_CODE — حساب تحليليه 5 أو 6 فقط
  analytic_type     integer,                    -- AC_DTL_TYP — 5 مدينة أخرى · 6 دائنة أخرى
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

-- مجموعات الحسابات التحليلية وتفاصيلها (شاشة لاحقة) — تُحفظ للحراسة على الحذف
CREATE TABLE IF NOT EXISTS erp.account_detail_group (
  code              text PRIMARY KEY,           -- GRP_CODE (GLS_ACCNT_DTL_GRPS)
  name_ar           text NOT NULL,
  name_en           text,
  account_code      text,
  analytic_type     integer,
  detail_type       integer,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp.account_detail (
  code              text PRIMARY KEY,           -- AC_CODE_DTL (GLS_ACCNT_DTL)
  name_ar           text NOT NULL,
  name_en           text,
  group_code        text,
  account_code      text,
  analytic_type     integer,
  detail_type       integer,
  branch_no         integer,
  inactive          boolean NOT NULL DEFAULT false,
  inactive_reason   text,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

-- ═══ 18 · op.1.2.4 + 25 · op.1.2.1 — الدليل العام للوحدات والتدفقات · IAS_ACCOUNT_ANLSYS (21) ═══
CREATE TABLE IF NOT EXISTS erp.general_account (
  no                bigint PRIMARY KEY,         -- ANLS_NO
  name_ar           text NOT NULL,              -- ANLS_L_NM
  name_en           text,                       -- ANLS_F_NM
  parent_no         bigint,                     -- ANLS_PARNT_NO
  order_code        text,                       -- CH_ORDR_NO
  notes             text,
  order_no          bigint,                     -- ORDR_NO
  analytic_type     integer,                    -- AC_DTL_TYP
  flow_type         integer,                    -- FLOW_TYPE: 1 تشغيلي · 2 استثماري · 3 تمويلي
  is_main           boolean NOT NULL DEFAULT false, -- MN_SUB
  level             integer,                    -- A_LEVEL
  report_type       integer,                    -- AC_RPRT_TYP: 1 ميزانية · 2 أرباح وخسائر
  is_debit          boolean NOT NULL DEFAULT true,  -- DR
  update_accounts   boolean NOT NULL DEFAULT false, -- UPDT_ACCNTS — «تحديث دليل الحسابات»
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

-- op.1.2.4 يكتب هذين العمودين على الدليل الحقيقي (ACCOUNT.A_ANALYSIS · ACCOUNT.FLOW_TYPE)
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS analysis_no     bigint;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS flow_type       integer;
-- op.1.1.13 يرمّز هذين، والدليل يشير إليهما برقمهما لا بالنص
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS type_no         integer;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS report_type_no  integer;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS grouping_no     integer;
ALTER TABLE erp.account ADD COLUMN IF NOT EXISTS class_no        integer;

-- ═══ 19 · op.3.4 — ربط الحسابات بالأنواع الضريبية · GLS_TAX_ACC (12) ═══
CREATE TABLE IF NOT EXISTS erp.account_tax (
  account_code      text PRIMARY KEY,           -- A_CODE
  tax_no            integer NOT NULL,
  agency_no         integer NOT NULL DEFAULT 1,
  pct               numeric(28,10) NOT NULL,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

-- ═══ 20 · op.3.5 — ربط الأصناف بالأنواع الضريبية · GNR_TAX_ITM (18) ═══
CREATE TABLE IF NOT EXISTS erp.item_tax (
  item_code         text PRIMARY KEY,           -- I_CODE
  tax_no            integer NOT NULL,
  agency_no         integer NOT NULL DEFAULT 1,
  pct               numeric(28,10) NOT NULL,
  min_amount        numeric(28,10),
  exempt_reason_code text,                      -- VAT_EXMPT_RSN_CODE (VATEX-SA-*)
  exempt_reason_text text,
  tax_code          text,                       -- TAX_TYP_CODE
  vat_category      text NOT NULL DEFAULT 'S',  -- VAT_CAT_CODE: S · Z · E · O
  exempt_load_by_nationality boolean NOT NULL DEFAULT false,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

-- ═══ 21 · op.5.1.2.16 — ربط حسابات المخزون بالأستاذ · IAS_CONN_ACC_INV_BY_GL (31) ═══
CREATE TABLE IF NOT EXISTS erp.inventory_gl_link (
  link_type         integer NOT NULL DEFAULT 1, -- POST_TYPE: 1 مجموعة أصناف · 2 مجموعة مخازن
  group_code        text NOT NULL,              -- POST_CODE
  inventory_acc     text,                       -- INV_A_CODE — لا يُعدَّل بعد أول حركة (IV-R131)
  sales_acc         text,
  sales_return_acc  text,
  discount_allowed_acc text,
  discount_earned_acc  text,
  cogs_acc          text,
  cogs_return_acc   text,
  py_sales_return_acc  text,
  py_cogs_return_acc   text,
  free_cogs_acc     text,
  free_purchase_cost_acc text,
  free_return_cogs_acc   text,
  purchase_acc      text,
  prepaid_revenue_acc text,
  service_purchase_acc text,
  deferred_sales_acc   text,
  deferred_cogs_acc    text,
  advance_sales_acc    text,
  advance_return_acc   text,
  compensation_cogs_acc text,
  price_diff_acc    text,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (link_type, group_code)
);

-- ═══ 22 · op.7.1.2.2 — مجموعة العملاء · CUSTOMER_GROUP (13) + IAS_CST_GRP_LMT (20) ═══
CREATE TABLE IF NOT EXISTS erp.customer_group (
  no                integer PRIMARY KEY,        -- C_GROUP_CODE
  name_ar           text NOT NULL,              -- C_GROUP_A_NAME
  name_en           text,
  account_code      text NOT NULL,              -- C_A_CODE — حساب رقابة العملاء (CG-R2)
  extra_account     text,                       -- A_CODE (فارغ في الـ29)
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);
ALTER TABLE erp.customer ADD COLUMN IF NOT EXISTS group_no integer;

CREATE TABLE IF NOT EXISTS erp.customer_group_limit (
  group_no          integer NOT NULL,
  currency          text NOT NULL,
  side              integer NOT NULL DEFAULT 1, -- DR_CR: 1 مدين · 2 دائن · 3 كلاهما
  balance_min       numeric(28,10),
  balance_max       numeric(28,10),
  txn_min           numeric(28,10),
  txn_max           numeric(28,10),
  overrun_pct       numeric(28,10),             -- MAX_LMT_PER
  overrun_possible  numeric(28,10),             -- MAX_LMT_PSBL
  overrun_policy    integer NOT NULL DEFAULT 1, -- EXCEED_LMT: 1 لا يسمح · 2 يسمح · 3 يسمح مع التنبيه
  inactive          boolean NOT NULL DEFAULT false,
  branch_no         integer,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (group_no, currency, side)
);

-- ═══ 23 · op.6.1.2.1 — مجموعة الموردين · VENDOR_GROUP (12) ═══
CREATE TABLE IF NOT EXISTS erp.supplier_group (
  no                integer PRIMARY KEY,        -- V_GROUP_CODE
  name_ar           text NOT NULL,
  name_en           text,
  account_code      text NOT NULL,              -- V_A_CODE — حساب الذمة (AP-R10/R11)
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);
ALTER TABLE erp.vendor ADD COLUMN IF NOT EXISTS group_no integer;

-- ═══ 24 · op.1.1.13 — تهيئة الدليل المحاسبي · ACCOUNT_TYPES · ACCOUNT_REPORT_TYPE
--                      · ACCOUNT_GROUPING · IAS_ACCOUNT_CLASS ═══
CREATE TABLE IF NOT EXISTS erp.account_type (
  no                integer PRIMARY KEY,        -- ACCOUNT_TYPE
  name_ar           text NOT NULL,
  name_en           text,
  affected_by_trans boolean NOT NULL DEFAULT false, -- نوع واحد فقط يقبل الحركة
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp.account_report_type (
  no                integer PRIMARY KEY,        -- REPORT_TYPE
  name_ar           text NOT NULL,
  name_en           text,
  is_balance_sheet  boolean NOT NULL DEFAULT false, -- REPORT_BS
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp.account_group (
  no                integer PRIMARY KEY,        -- ACCOUNT_GROUPING (0 صف في بتروسبيشل)
  name_ar           text NOT NULL,
  name_en           text,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp.account_class (
  no                integer PRIMARY KEY,        -- IAS_ACCOUNT_CLASS (0 صف)
  name_ar           text NOT NULL,
  name_en           text,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

-- ═══ 26 · op.1.2.9 — الحسابات الوسيطة · INTERFACE_ACC (126 عموداً · 5 صفوف) ═══
-- SY-D4: حُذف 14 عموداً قطاعياً (مطاعم RMS_* 9 · مستشفيات HPS_* 5) بقرار المستخدم.
-- القطاعي الباقي (عقارات · شحن/أسطول · صيانة · زراعة) يبقى محفوظاً في sector_accounts خلف الميزات.
CREATE TABLE IF NOT EXISTS erp.branch_posting_accounts (
  branch_no         integer PRIMARY KEY,        -- BRN_NO
  interface_no      integer,
  -- المعبّأ فعلياً في الفروع 1–5 (8 حسابات متطابقة)
  fx_diff           text,                       -- CURR_DIFF
  vat_output        text,                       -- VAT_AC
  vat_input         text,                       -- VAT_PUR_A_CODE
  rounding_diff     text,                       -- FRC_DIFF_AC
  rounding_after_vat text,                      -- FRC_DIFF_DISC_AFTR_VAT_AC
  wh_transfer_diff  text,                       -- DIFF_WHTRNS_A_CODE
  cost_diff_purchase_return text,               -- DIFF_PR_A_CODE
  issue_diff        text,                       -- DIFF_OUTGOING_A_CODE
  -- عام ومالي (فارغ اليوم)
  lost_extra_goods  text, notes_payable text, notes_receivable text, lc_diff text, commission text,
  empty_acc         text, rounding_cc text, rounding_pj text, rounding_activity text,
  purchase_discount_intermediary text, balanced_cc text, branch_current text,
  stock_diff_purchase text, kit_item_diff text, wh_transfer_return_diff text, promissory_notes text,
  cashier_deficit text, cashier_excess text, bank_deposit text, advance_payment text,
  stock_adjustment text, purchase_income text, tax_due text, lc text,
  -- ضريبة أخرى
  profit_tax_credit text, profit_tax_debit text, shipping_vat text,
  -- مبيعات وعمولات
  rep_commission text, collector_commission text, marketer_commission text, employee_commission text,
  daily_sales text, return_replace text, return_replace_free text, coupon text, coupon_replace_diff text,
  points_replace text, delivery_sales text, delivery_sales_detail text,
  -- أصول ثابتة
  fa_increase text, fa_decrease text, fa_transfer text, fa_cc text, fa_activity text, fa_project text,
  fa_maintenance text, fa_lost text, fa_profit text,
  -- موارد بشرية
  hr_end_of_service text, hr_loan text, hr_custody text, hr_travel text, hr_medical_tax text,
  -- قطاعي خلف الميزات (عقارات · شحن · صيانة · زراعة) — فارغ في الفروع الخمسة
  sector_accounts   jsonb,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

-- ═══ 27 · op.4.1.2.8 — ربط الحسابات بالمشاريع · IAS_ACCOUNT_PJ (10 · 0 صف) ═══
CREATE TABLE IF NOT EXISTS erp.account_project (
  account_code      text NOT NULL,
  project_no        bigint NOT NULL,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (account_code, project_no)
);

CREATE INDEX IF NOT EXISTS item_group_code_idx ON erp.item (group_code);
CREATE INDEX IF NOT EXISTS general_account_parent_idx ON erp.general_account (parent_no);
