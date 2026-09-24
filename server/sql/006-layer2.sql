-- ═══════════════════════════════════════════════════════════════════════════
-- الطبقة ٢ — البيانات الأساسية (بنود 28–36 في BUILD-ORDER.md)
-- إضافة فوق النموذج العام (PROJECT-STATE.md §٤ «لا تحويل جذري»): الجداول القائمة
-- (`erp.item` · `erp.warehouse` · `erp.vendor` · `erp.customer`) تُوسَّع بأعمدة، ولا يُعاد تصميمها.
-- كل عمود يقابل عمود أونيكس المذكور بجواره؛ ما خلف مركز الميزات يُحفظ كاملاً في `features`
-- بأسماء أونيكس نفسها (لا حذف إلا بقرار مسجَّل — IV-D19 للمطاعم والصحي).
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ 28 · op.5.1.2.10 — بيانات الأصناف · IAS_ITM_MST (231 عموداً: 37 أساسي + 145 ميزة + 39 محذوف + 2 محفوظ + 8 تدقيق) ═══
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS name_en            text;          -- I_E_NAME
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS short_name_ar      text;          -- SHRT_ITM_L_NM
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS short_name_en      text;          -- SHRT_ITM_F_NM
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS description_ar     text;          -- I_DESC
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS description_en     text;          -- I_F_DESC
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS image_ref          text;          -- I_IMG
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS initial_cost       numeric(28,10);-- INIT_PRIMARY_COST
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS primary_cost       numeric(28,10);-- PRIMARY_COST — يُقفل بعد الحركة (IV-R99)
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS avg_cost           numeric(28,10);-- I_CWTAVG — للقراءة (IV-R105)
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS last_receipt_date  date;          -- INCOME_DATE — للقراءة
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS is_stocked         boolean NOT NULL DEFAULT true;  -- ITEM_STORE — للقراءة
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS inactive           boolean NOT NULL DEFAULT false; -- INACTIVE
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS inactive_reason    text;          -- INACTIVE_RES
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS inactive_date      date;          -- INACTIVE_DATE (IV-R101 آلي)
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS inactive_by        text;          -- INACTIVE_U_ID (IV-R101 آلي)
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS is_blocked         boolean NOT NULL DEFAULT false; -- BLOCKED
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS no_sale            boolean NOT NULL DEFAULT false; -- NO_SALE
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS is_service         boolean NOT NULL DEFAULT false; -- SERVICE_ITM
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS cash_sale_only     boolean NOT NULL DEFAULT false; -- CASH_SALE
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS no_return          boolean NOT NULL DEFAULT false; -- NO_RETURN_SALE
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS return_period_days integer;       -- RETURN_PERIOD
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS is_kit             boolean NOT NULL DEFAULT false; -- KIT_ITM
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS used_in_kit        boolean NOT NULL DEFAULT false; -- USED_IN_KIT_ITM
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS allow_fraction     boolean NOT NULL DEFAULT false; -- USE_QTY_FRACTION
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS qty_decimals       integer;       -- ICODE_QTY_FRC
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS vat_type           integer;       -- VAT_TYPE (إرث — الفعلي في op.3.5)
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS vat_pct            numeric(28,10);-- VAT_PER (إرث — 0 في الكل)
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS tax_classification text;          -- CLSFCTN_CODE
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS gtin               text;          -- GTIN_CODE (فريد — IV-R96)
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS used_in_emp_requests boolean NOT NULL DEFAULT false; -- USE_EMP_FLG
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS imported_from_excel boolean NOT NULL DEFAULT false; -- IMP_XLS
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS import_doc_type    text;          -- DOC_TYPE_REF
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS import_doc_no      text;          -- DOC_NO_REF
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS import_doc_ser     text;          -- DOC_SER_REF
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS needs_review       boolean NOT NULL DEFAULT false; -- IV-D20 (مركب بلا مكونات)
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS features           jsonb;         -- F1–F12: 145 عموداً بأسماء أونيكس
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS legacy_item_size   numeric(28,10);-- ITEM_SIZE (د)
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS legacy_clc_avg_factor numeric(28,10); -- CLC_AVG_FCTR_FOR_NUM_QTY (د)
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS created_by         text;
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS created_at         timestamptz;
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS updated_by         text;
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS updated_at         timestamptz;
ALTER TABLE erp.item ADD COLUMN IF NOT EXISTS update_count       integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS item_gtin_uq ON erp.item (gtin) WHERE gtin IS NOT NULL;

-- وحدات الصنف · IAS_ITM_DTL (32 = 17 ظاهر + 10 ميزة + 5 تدقيق)
CREATE TABLE IF NOT EXISTS erp.item_unit (
  item_code         text NOT NULL,              -- I_CODE
  unit_code         text NOT NULL,              -- ITM_UNT
  pack_size         numeric(28,10) NOT NULL,    -- P_SIZE (الرئيسية = 1 — 5744)
  level_no          integer NOT NULL DEFAULT 1, -- LVL_UNIT (الرئيسية أولاً — 5743 · IV-R100)
  is_main           boolean NOT NULL DEFAULT false, -- MAIN_UNIT (واحدة فقط — 4723)
  is_sale           boolean NOT NULL DEFAULT false, -- SALE_UNIT
  is_purchase       boolean NOT NULL DEFAULT false, -- PUR_UNIT
  is_stock          boolean NOT NULL DEFAULT false, -- STOCK_UNIT
  is_transfer       boolean NOT NULL DEFAULT false, -- TRNS_UNIT
  no_sale           boolean NOT NULL DEFAULT false, -- NO_SALE
  inactive          boolean NOT NULL DEFAULT false, -- INACTIVE
  inactive_reason   text,
  inactive_by       text,
  inactive_date     date,
  barcode           text,                       -- BARCODE (فريد — IV-R96)
  desc_ar           text,                       -- ITM_UNT_L_DSC
  desc_en           text,                       -- ITM_UNT_F_DSC
  features          jsonb,                      -- PRICE_UNIT · CHF_UNT_FLG · STORE_UNIT · WEIGHT_UNIT · CSS_UNIT · … (10)
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (item_code, unit_code)
);
CREATE UNIQUE INDEX IF NOT EXISTS item_unit_barcode_uq ON erp.item_unit (barcode) WHERE barcode IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS item_unit_one_main_uq ON erp.item_unit (item_code) WHERE is_main;

-- أرصدة الصنف في المخازن · IAS_ITM_WCODE — ملخص للقراءة يُحسب من الحركة (IV-R105)؛ الموقف فقط يُعدَّل (IV-R101)
CREATE TABLE IF NOT EXISTS erp.item_warehouse (
  item_code         text NOT NULL,
  unit_code         text NOT NULL,
  pack_size         numeric(28,10) NOT NULL,
  warehouse_code    text NOT NULL,              -- W_CODE
  warehouse_group   text,                       -- WHG_CODE
  primary_cost      numeric(28,10),
  avg_cost          numeric(28,10),             -- I_CWTAVG
  available_qty     numeric(28,10),             -- AVL_QTY
  allow_negative    boolean NOT NULL DEFAULT false, -- NEG_QTY_FLG
  inactive          boolean NOT NULL DEFAULT false,
  min_cost_pct      numeric(28,10),
  max_cost_pct      numeric(28,10),
  last_reeval_serial text,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (item_code, warehouse_code, unit_code)
);

-- موردو الصنف · IAS_VNDR_ITM
CREATE TABLE IF NOT EXISTS erp.item_vendor (
  item_code         text NOT NULL,
  vendor_code       text NOT NULL,              -- V_CODE
  unit_code         text NOT NULL,              -- ITM_UNT
  pack_size         numeric(28,10) NOT NULL DEFAULT 1,
  price             numeric(28,10),             -- VNDR_PRICE (يُحدَّث آلياً مع الشراء — IV-R103)
  currency          text,                       -- A_CY
  is_main           boolean NOT NULL DEFAULT false, -- MAIN_VNDR
  vendor_item_code  text,                       -- I_CODE_VNDR (فريد — IV-R96)
  packing           text,                       -- I_PACKING
  min_qty           numeric(28,10),             -- ITM_MIN_QTY
  vendor_unit       text,                       -- UNT_VNDR
  use_in_vss        boolean NOT NULL DEFAULT false,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (item_code, vendor_code, unit_code, pack_size)
);

-- مكونات الصنف المركب · KIT_ITEMS (بلا عمودي المطاعم CHK_AVL_QTY_IN_RMS · USE_RMS_SLS_TYP — IV-D19)
CREATE TABLE IF NOT EXISTS erp.kit_component (
  kit_item_code     text NOT NULL,              -- KIT_ITEM_NO
  component_code    text NOT NULL,              -- I_CODE
  unit_code         text NOT NULL,              -- ITM_UNT
  pack_size         numeric(28,10) NOT NULL DEFAULT 1,
  qty               numeric(28,10) NOT NULL,    -- I_QTY
  pack_qty          numeric(28,10),             -- P_QTY
  cost_pct          numeric(28,10),             -- PER_COST_FROM_KIT_ITM
  min_qty           numeric(28,10),
  max_qty           numeric(28,10),
  note              text,
  exceed_qty        boolean NOT NULL DEFAULT false, -- EXCD_ITM_QTY
  allow_delete      boolean NOT NULL DEFAULT false, -- ALLW_DEL_ITM
  default_warehouse text,                       -- W_CODE_DFLT
  product_qty       numeric(28,10),             -- PRDCT_QTY
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (kit_item_code, component_code, unit_code)
);

-- الأرقام المرجعية · INV_REF_CODE_ITM (REF_CODE فريد)
CREATE TABLE IF NOT EXISTS erp.item_ref_code (
  ref_code          text PRIMARY KEY,
  item_code         text NOT NULL,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);

-- ═══ 29 · op.5.1.2.9 — بيانات المخازن · WAREHOUSE_DETAILS (69 = 29 ظاهر + 26 ميزة + 3 محفوظ + 3 محذوف رصد IV-D16 + 8 تدقيق) ═══
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS name_en              text;           -- W_E_NAME
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS branch_no            integer;        -- CONN_BRN_NO (إلزامي — IV-R79)
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS inactive             boolean NOT NULL DEFAULT false; -- INACTIVE
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS no_sale              boolean NOT NULL DEFAULT false; -- NO_SALE
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS doc_sequence_key     integer;        -- W_SER (IV-R89)
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS is_main              boolean NOT NULL DEFAULT false; -- MAIN_WCODE (IV-R87)
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS transfer_account     text;           -- TR_A_CODE — وسيط التحويل (IV-R82 · INV-8)
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS transfer_analytic    text;           -- AC_CODE_DTL
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS transfer_analytic_type integer;      -- AC_DTL_TYP
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS default_cost_center  text;           -- CC_CODE (IV-R91)
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS default_price_level  integer;        -- PRICE_LVL (IV-R90 · IV-D11)
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS stock_cost_limit     numeric(28,10); -- WH_CST_LMT (IV-R88)
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS is_damaged_goods     boolean NOT NULL DEFAULT false; -- USE_DMG_ITM_FLG
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS is_service_default   boolean NOT NULL DEFAULT false; -- SRVC_FLG
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS keeper_name          text;           -- WH_KEEPER
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS phone                text;           -- TEL_NO
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS location             text;           -- LOCATION
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS country_no           integer;        -- CNTRY_NO
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS province_no          integer;        -- PROV_NO
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS city_no              integer;        -- CITY_NO
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS region_code          text;           -- R_CODE
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS gln                  text;           -- GLN_CODE
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS latitude             text;           -- LATITUDE
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS longitude            text;           -- LONGITUDE
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS address_ar           text;           -- W_L_ADDRS
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS address_en           text;           -- W_F_ADDRS
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS features             jsonb;          -- ب + د + نشاط الصنف (26) بأسماء أونيكس — IV-D15
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS legacy               jsonb;          -- و: W_TYPE · GPS · DB_LINK_NAME
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS needs_review         boolean NOT NULL DEFAULT false; -- IV-D17 (1 «مخزن يحذف» · 300 الموقوف)
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS created_by           text;
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS created_at           timestamptz;
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS updated_by           text;
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS updated_at           timestamptz;
ALTER TABLE erp.warehouse ADD COLUMN IF NOT EXISTS update_count         integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_one_main_uq ON erp.warehouse (is_main) WHERE is_main;

-- ═══ 30 · op.4.1.2.2 — الصناديق · CASH_IN_HAND (27 = 19 + 8 تدقيق) + IAS_CASH_IN_HAND_DTL (20) ═══
CREATE TABLE IF NOT EXISTS erp.cashbox (
  no                   integer PRIMARY KEY,        -- CASH_NO
  name_ar              text NOT NULL,              -- CASH_NAME
  name_en              text,                       -- CASH_E_NAME
  account_code         text NOT NULL,              -- A_CODE — تحليلي «صندوق» (GL-R18)
  sequence_group       integer,                    -- CASH_SR (GL-R21)
  receipt_seq_type     integer NOT NULL DEFAULT 1, -- RCPT_SRL_TYP: 1 عام · 2 محصل · 3 مندوب
  cash_type            integer NOT NULL DEFAULT 3, -- CASH_TYPE: 1 قبض · 2 صرف · 3 قبض وصرف · 4 بيع وشراء · 98/126/127 عملات (GL-R20)
  use_cash_income      boolean NOT NULL DEFAULT false, -- USE_CASH_INCOME
  is_mediator          boolean NOT NULL DEFAULT false, -- MEDIATOR
  pos_sys              boolean NOT NULL DEFAULT false, -- POS_SYS (ميزة نقاط البيع)
  default_payment_type integer,                    -- PYMNT_TYP_NO_DFLT
  default_receipt_type integer,                    -- RCVD_TYP_NO_DFLT
  group_no             integer,                    -- GROUP_NO
  branch_no            integer NOT NULL,           -- CONN_BRN_NO (إلزامي — GL-R19)
  last_reconciled_at   date,                       -- CONF_LAST_DATE
  inactive             boolean NOT NULL DEFAULT false,
  inactive_date        date,
  inactive_reason      text,
  favourite            boolean NOT NULL DEFAULT false, -- FAV_AC
  created_by           text,
  created_at           timestamptz,
  updated_by           text,
  updated_at           timestamptz,
  update_count         integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp.cashbox_currency (
  cash_no              integer NOT NULL,           -- CASH_NO
  currency             text NOT NULL,              -- A_CY
  account_code         text,                       -- A_CODE (نسخة حساب الصندوق)
  opening_local        numeric(28,10),             -- OPEN_BAL_L
  opening_foreign      numeric(28,10),             -- OPEN_BAL_F
  current_local        numeric(28,10),             -- CURR_BAL_L (للقراءة)
  current_foreign      numeric(28,10),             -- CURR_BAL_F (للقراءة)
  is_default           boolean NOT NULL DEFAULT false, -- DFLT
  inactive             boolean NOT NULL DEFAULT false,
  inactive_date        date,
  min_balance          numeric(28,10),             -- MIN_LMT_AMT (GL-R22)
  max_balance          numeric(28,10),             -- MAX_LMT_AMT
  min_txn              numeric(28,10),             -- MIN_LMT_TRNS_AMT
  max_txn              numeric(28,10),             -- MAX_LMT_TRNS_AMT
  pass_limit           integer,                    -- PASS_LMT: 1 لا يسمح · 2 يسمح · 3 يسمح مع تنبيه
  created_by           text,
  created_at           timestamptz,
  updated_by           text,
  updated_at           timestamptz,
  update_count         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (cash_no, currency)
);

-- ═══ 31 · op.4.1.2.3 — البنوك · CASH_AT_BANK (52 = 44 + 8 تدقيق) + IAS_CASH_AT_BANK_DTL (21) ═══
CREATE TABLE IF NOT EXISTS erp.bank (
  no                   integer PRIMARY KEY,        -- BANK_NO
  name_ar              text NOT NULL,              -- BANK_NAME
  name_en              text,                       -- BANK_E_NAME
  account_code         text NOT NULL,              -- A_CODE — حساب الدليل، تحليلي «بنك» (GL-R24)
  sequence_group       integer NOT NULL,           -- BANK_SR (مشترك 200 لخمسة بنوك)
  receipt_seq_type     integer NOT NULL DEFAULT 1, -- RCPT_SRL_TYP
  default_payment_type integer,                    -- PYMNT_TYP_NO_DFLT
  default_receipt_type integer,                    -- RCVD_TYP_NO_DFLT
  group_no             integer,                    -- GROUP_NO
  bank_account_no      text,                       -- BANK_ACC — رقم الحساب عند البنك ≠ حساب الدليل
  description          text,                       -- BANK_DSC
  branch_no            integer,                    -- CONN_BRN_NO (اختياري — BNK_CONN_BRN = 0)
  phone                text,                       -- B_TEL
  fax                  text,                       -- B_FAX
  po_box               text,                       -- B_BOX
  address              text,                       -- B_ADDRESS
  email                text,                       -- B_E_MAIL
  website              text,                       -- B_WEB_SITE
  country_no           integer,                    -- CNTRY_NO
  city_no              integer,                    -- CITY_NO
  is_mediator          boolean NOT NULL DEFAULT false, -- MEDIATOR (GL-R25)
  network_code         text,                       -- BNK_NTWRK_CODE
  inactive             boolean NOT NULL DEFAULT false,
  inactive_by          text,                       -- INACTIVE_U_ID
  inactive_date        date,
  inactive_reason      text,
  logo_ref             text,                       -- BANK_IMG
  notes_receivable_account text,                   -- REC_LETTER (GL-R26)
  notes_payable_account    text,                   -- PAY_LETTER
  cheque_intermediary_account text,                -- CHQ_PAY_INTRM_AC
  notes_payable_analytic      text,                -- PAY_LETTER_DTL
  notes_receivable_analytic   text,                -- REC_LETTER_DTL
  cheque_intermediary_analytic text,               -- CHQ_PAY_INTRM_AC_DTL
  cheque_intermediary_analytic_type integer,       -- CHQ_PAY_INTRM_AC_DTL_TYP
  notes_payable_analytic_type  integer,            -- PAY_LETTER_DTL_TYP
  notes_receivable_analytic_type integer,          -- REC_LETTER_DTL_TYP
  card_amount_post_type integer,                   -- CRD_CARD_AMT_PST_TYP
  commission_vat       boolean NOT NULL DEFAULT false, -- COMM_TAX_FRC
  print_template       text,                       -- REP_SMPLE
  bank_class           integer NOT NULL DEFAULT 1, -- BNK_CLSS_TYP: 1 بنك · 2 صراف
  favourite            boolean NOT NULL DEFAULT false, -- FAV_AC
  last_reconciled_at   date,                       -- CONF_LAST_DATE
  cheque_auto_seq      boolean NOT NULL DEFAULT false, -- OCHK_AUTO_SER
  bank_code            text,                       -- BANK_CODE
  created_by           text,
  created_at           timestamptz,
  updated_by           text,
  updated_at           timestamptz,
  update_count         integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp.bank_currency (
  bank_no              integer NOT NULL,
  currency             text NOT NULL,
  account_code         text,
  opening_local        numeric(28,10),
  opening_foreign      numeric(28,10),
  current_local        numeric(28,10),
  current_foreign      numeric(28,10),
  is_default           boolean NOT NULL DEFAULT false,
  inactive             boolean NOT NULL DEFAULT false,
  inactive_date        date,
  min_balance          numeric(28,10),
  max_balance          numeric(28,10),
  min_txn              numeric(28,10),
  max_txn              numeric(28,10),
  pass_limit           integer,
  bank_account_no      text,                       -- BNK_AC — رقم الحساب لكل عملة
  created_by           text,
  created_at           timestamptz,
  updated_by           text,
  updated_at           timestamptz,
  update_count         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bank_no, currency)
);

-- ═══ 32 · op.5.1.2.14 — تسعيرة الأصناف · IAS_ITEM_PRICE (24 = 9 ظاهر + 1 معلومة + 5 ميزة + 1 محذوف IV-D22 + 8 تدقيق) ═══
CREATE TABLE IF NOT EXISTS erp.item_price (
  id                bigserial PRIMARY KEY,
  price_level       integer NOT NULL,           -- LEV_NO
  item_code         text NOT NULL,              -- I_CODE
  unit_code         text NOT NULL,              -- ITM_UNT
  pack_size         numeric(28,10) NOT NULL DEFAULT 1, -- P_SIZE (لقطة من وحدة الصنف)
  price             numeric(28,10) NOT NULL,    -- I_PRICE
  min_price         numeric(28,10),             -- MIN_ITM_PRICE
  max_price         numeric(28,10),             -- MAX_ITM_PRICE
  branch_no         integer,                    -- BRN_NO
  imported_from_excel boolean NOT NULL DEFAULT false, -- IMP_XLS
  note              text,                       -- NOTE
  -- خلف الميزات (IV-D21) — فارغة في أونيكس (1900-01-01 و'0' تُنقل NULL):
  warehouse_code    text,                       -- W_CODE
  from_qty          numeric(28,10),             -- FROM_QTY
  to_qty            numeric(28,10),             -- TO_QTY
  expire_date       date,                       -- EXPIRE_DATE
  batch_no          text,                       -- BATCH_NO
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0,
  CONSTRAINT item_price_limits CHECK ((min_price IS NULL OR min_price <= price) AND (max_price IS NULL OR price <= max_price))
);
-- IV-R108 — سعر واحد لكل مفتاح
CREATE UNIQUE INDEX IF NOT EXISTS item_price_key_uq ON erp.item_price
  (price_level, item_code, unit_code, COALESCE(warehouse_code,''), COALESCE(from_qty,-1), COALESCE(to_qty,-1),
   COALESCE(expire_date, DATE '1900-01-01'), COALESCE(batch_no,''));

-- رقابة الأسعار · IAS_ITEM_PRICE_HISTORY (31 = 23 + 8) — إضافة فقط (IV-R109)
CREATE TABLE IF NOT EXISTS erp.item_price_audit (
  audit_no          bigint PRIMARY KEY,         -- AUD_NO
  action            integer NOT NULL,           -- AUD_TYPE: 1 إضافة · 2 تعديل · 3 حذف
  input_method      integer,                    -- INPT_MTHD
  audited_by        text,                       -- AUD_U_ID
  audited_at        timestamptz,                -- AUD_DATE
  doc_no            text,                       -- DOC_NO
  doc_date          date,                       -- DOC_DATE
  branch_no         integer,                    -- BRN_NO
  price_level       integer,
  item_code         text,
  unit_code         text,
  pack_size         numeric(28,10),
  warehouse_code    text,
  expire_date       date,
  batch_no          text,
  from_qty          numeric(28,10),
  to_qty            numeric(28,10),
  price             numeric(28,10),
  prev_price        numeric(28,10),
  min_price         numeric(28,10),
  prev_min_price    numeric(28,10),
  max_price         numeric(28,10),
  prev_max_price    numeric(28,10),
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS item_price_audit_key_idx ON erp.item_price_audit (price_level, item_code, unit_code);

-- لا تعديل ولا حذف لسجل الرقابة (IV-R109) — ضمان في القاعدة لا في التطبيق وحده
CREATE OR REPLACE FUNCTION erp.item_price_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'IV-R109: سجل رقابة الأسعار للإضافة فقط' USING ERRCODE = 'check_violation';
END $$;
DROP TRIGGER IF EXISTS item_price_audit_immutable ON erp.item_price_audit;
CREATE TRIGGER item_price_audit_immutable BEFORE UPDATE OR DELETE ON erp.item_price_audit
  FOR EACH ROW EXECUTE FUNCTION erp.item_price_audit_immutable();

-- ═══════════ 33 · op.7.1.2.4 — بيانات مندوبي المبيعات · SALES_MAN [GO/07-customers-sales.md] ═══════════
-- 119 عموداً: ما له حقل في تبويبات الشاشة (الرئيسية · الضمانات · نظام التوزيع) عمود هنا،
-- والباقي (إعدادات تطبيق الجوال بلا حقل في الشاشة) في features بأسماء أونيكس. التقسيم يفحصه verify-layer2-records.
CREATE TABLE IF NOT EXISTS erp.salesman (
  code                   text PRIMARY KEY,           -- REPRS_CODE (أونيكس: MAX+1)
  name_ar                text NOT NULL,              -- REPRS_A_NAME
  name_en                text,                       -- REPRS_E_NAME
  parent_code            text,                       -- REP_CODE_PARENT — هرم المشرف (SR-R2)
  rep_type               integer,                    -- SMAN_TYPE ⇐ أنواع المندوبين (IAS_SALESMAN_TYPES — فارغ)
  classification         integer NOT NULL DEFAULT 0, -- CONN_SP_SMAN · S_FLAGS SMAN_SP_TYP: 0 مبيعات · 1 علمي · 2 مبيعات وعلمي · 3 ترويج
  account_code           text,                       -- R_A_CODE (SR-R3)
  account_analytic_type  integer,                    -- AC_DTL_TYP
  account_analytic       text,                       -- AC_CODE_DTL
  address                text,                       -- R_ADDRESS
  phone                  text,                       -- R_PHONE
  po_box                 text,                       -- R_BOX
  fax                    text,                       -- R_FAX
  mobile                 text,                       -- R_MOBILE
  country_no             integer,                    -- CNTRY_NO
  city_no                integer,                    -- CITY_NO
  region_no              integer,                    -- R_CODE «رقم الحي» ⇐ REGIONS
  commission_pct         numeric(9,4),               -- COMM_PER (SR-R4)
  route_no               integer,                    -- ROUTE_NO ⇐ op.7.1.2.6
  route_order            integer,                    -- SORTINROUTE
  last_sale_date         date,                       -- آخر فاتورة مبيعات للمندوب (SR-R12) — محسوب
  notes                  text,                       -- R_NOTE
  warehouse_code         text,                       -- W_CODE (SR-R6)
  return_warehouse_code  text,                       -- RT_W_CODE
  cash_no                integer,                    -- CASH_NO
  cost_center            text,                       -- CC_CODE
  project_no             integer,                    -- PJ_NO
  activity_no            integer,                    -- ACTV_NO
  credit_limit           numeric(28,10),             -- CR_LMT (SR-R7)
  bank_no                integer,                    -- BANK_NO «البنك الوسيط»
  sales_plan_amount_no   integer,                    -- PLAN_NO_AMOUNT
  sales_plan_amount_ser  integer,                    -- PLAN_SER_AMOUNT
  employee_no            text,                       -- EMP_NO ⇐ S_EMP
  sales_plan_qty_no      integer,                    -- PLAN_NO
  sales_plan_qty_ser     integer,                    -- PLAN_SER
  collection_plan_no     integer,                    -- COL_PLAN_NO
  inactive               boolean NOT NULL DEFAULT false,
  inactive_by            text,                       -- INACTIVE_U_ID
  inactive_date          date,
  inactive_reason        text,
  -- تبويب ٢ «بيانات الضمانات» (36–50)
  g_status               integer,                    -- G_STATUS · S_FLAGS: 1 فعال · 0 غير فعال
  g_type                 integer,                    -- G_TYPE · S_FLAGS 1–9
  g_start_date           date,
  g_expire_date          date,
  g_name                 text,
  g_address              text,
  g_work                 text,                       -- طبيعة نشاط الضامن
  g_fin_center           text,                       -- المركز المالي
  g_amount               numeric(28,10),
  g_doc_date             date,                       -- تاريخ توثيق الضمان
  g_court_reg            text,
  g_chamber_reg          text,
  g_cr_no                text,                       -- G_FILE_TRADA
  g_phone                text,
  g_fax                  text,
  -- تبويب ٣ «نظام التوزيع» (51–83)
  tax_calc_method        integer,                    -- CLC_TYP_NO_TAX ⇐ GNR_TAX_TYP_CLC_MST
  distribution_group     text,                       -- GRP_CODE ⇐ DTS_GRP_MST
  cheque_post_type       integer NOT NULL DEFAULT 0, -- CHEQ_TYPE · S_FLAGS CHEQ_TYPE_REC 0–3
  visit_open_distance    integer DEFAULT 100,        -- VST_OPN_DSTNC (DEFAULT 100 في أونيكس)
  district_radius        integer,                    -- REGN_RNG
  route_deviation_max    integer,                    -- APP_ROUT_MAX_LMT_EXPCTN
  plan_customer_max      integer,                    -- APP_CSTMR_PLN_INSRT_MAX_LMT
  cash_cumulative_limit  numeric(28,10),             -- CASH_AMT_LMT
  cash_daily_limit       numeric(28,10),             -- CASH_AMT_DAILY_LMT
  visit_open_type        integer DEFAULT 1,          -- VST_OPN_TYP · S_FLAGS 1–5 (DEFAULT 1)
  app_last_update_at     timestamptz,                -- LAST_UP_DATE_DTS
  app_last_post_at       timestamptz,                -- LAST_POST_DATE_DTS
  allow_edit_customer_location boolean NOT NULL DEFAULT false, -- ALLW_MOD_CST_LOCTN #63
  allow_return_all_items boolean NOT NULL DEFAULT false, -- ALLW_RTRN_ALL_ITM_FLG #64
  work_without_plan      boolean NOT NULL DEFAULT false, -- WRK_WITHOUT_PLN #65
  allow_cancel_docs      boolean NOT NULL DEFAULT false, -- ALLW_CNCL_DOC #66
  no_sale                boolean NOT NULL DEFAULT false, -- NO_SAL #67
  no_collect             boolean NOT NULL DEFAULT false, -- NO_COLCT #68
  allow_file_share       boolean NOT NULL DEFAULT false, -- ALLW_FILE_SHARE #69
  no_sales_return        boolean NOT NULL DEFAULT false, -- NOT_ALLW_ENTR_RTRN_SAL #70
  return_request_required boolean NOT NULL DEFAULT false, -- USE_RT_BILL_RQ_TYP #71
  daily_close            boolean NOT NULL DEFAULT false, -- USE_CLOSE_UPDT_DAILY #72
  print_by_ultimate_app  boolean NOT NULL DEFAULT false, -- PRINT_BY_ULT_APP #73
  allow_issue_transfer_requests boolean NOT NULL DEFAULT false, -- ALLW_INPUT_OUT_TRNS_REQ #74
  allow_return_other_rep boolean NOT NULL DEFAULT false, -- ALLW_RTRN_BILL_OTHER_SMAN #75
  no_partial_update      boolean NOT NULL DEFAULT false, -- NOT_ALLW_UPDT_PARTIAL_DATA #76
  stop_if_plan_missed    boolean NOT NULL DEFAULT false, -- INACTV_NONE_ADHERE_PLAN_FLG #77
  allow_direct_transfer  boolean NOT NULL DEFAULT false, -- ALLW_WHTRNS_DIRCT #78
  auto_reserve_orders    boolean NOT NULL DEFAULT false, -- USE_RES_IN_SO_APP #79
  close_visit_by_gps     boolean NOT NULL DEFAULT false, -- CLS_VST_BY_GPS #80
  allow_approve_target_customer boolean NOT NULL DEFAULT false, -- ALLW_APPROV_CSTMR_TRGT #81
  no_sale_outside_locations boolean NOT NULL DEFAULT false, -- NOT_ALLW_SAL_OUT_LOCTN_GEO #82
  receipt_request_in_app boolean NOT NULL DEFAULT false, -- USE_VCHR_RCPT_RQ #83
  features               jsonb,                      -- بقية أعمدة SALES_MAN بأسماء أونيكس (بلا حقل في الشاشة)
  created_by             text,
  created_at             timestamptz,
  updated_by             text,
  updated_at             timestamptz,
  update_count           integer NOT NULL DEFAULT 0
);

-- تبويب ٤ «ربط العملاء بالمندوبين» · IAS_CST_SMAN (العميل عند أكثر من مندوب: CONN_CST_MULTI_SMAN ☑)
CREATE TABLE IF NOT EXISTS erp.salesman_customer (
  rep_code        text NOT NULL,                     -- REP_CODE
  customer_code   text NOT NULL,                     -- C_CODE
  visit_day1      boolean NOT NULL DEFAULT false,    -- FLD_DAY1 السبت … FLD_DAY7 الجمعة (ترتيب ملف الإكسل)
  visit_day2      boolean NOT NULL DEFAULT false,
  visit_day3      boolean NOT NULL DEFAULT false,
  visit_day4      boolean NOT NULL DEFAULT false,
  visit_day5      boolean NOT NULL DEFAULT false,
  visit_day6      boolean NOT NULL DEFAULT false,
  visit_day7      boolean NOT NULL DEFAULT false,
  is_default      boolean NOT NULL DEFAULT false,    -- DFLT_FLG
  inactive        boolean NOT NULL DEFAULT false,
  inactive_date   timestamptz,
  inactive_by     text,
  inactive_reason text,
  features        jsonb,                             -- PR_REP · AD_TRMNL_NM · UP_TRMNL_NM
  created_by      text,
  created_at      timestamptz,
  updated_by      text,
  updated_at      timestamptz,
  update_count    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (rep_code, customer_code)
);
CREATE INDEX IF NOT EXISTS salesman_customer_cust_idx ON erp.salesman_customer (customer_code);

-- تبويب ٦ «الصلاحيات» · IAS_PRIV_SMAN (مفتاح أونيكس U_ID + REP_CODE) — SR-R10 إضافة/عرض
CREATE TABLE IF NOT EXISTS erp.salesman_user (
  rep_code     text NOT NULL,
  user_id      integer NOT NULL,
  can_add      boolean NOT NULL DEFAULT false,       -- ADD_FLAG
  can_view     boolean NOT NULL DEFAULT false,       -- VIEW_FLAG
  created_by   text,
  created_at   timestamptz,
  updated_by   text,
  updated_at   timestamptz,
  update_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (rep_code, user_id)
);

-- تبويب ٥ «المواقع الجغرافية» · ARS_LOCTN_GEO_SMAN (فارغ في أونيكس) — CHK_LOCTN_PRC: 1 دولة · 2 محافظة · 3 مدينة · 4 منطقة · 5 خط سير
CREATE TABLE IF NOT EXISTS erp.salesman_location (
  rep_code     text NOT NULL,
  loc_type     integer NOT NULL,
  code_no      integer NOT NULL,
  created_by   text,
  created_at   timestamptz,
  updated_by   text,
  updated_at   timestamptz,
  update_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (rep_code, loc_type, code_no)
);
