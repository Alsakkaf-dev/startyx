-- الطبقة ٣ — BUILD-ORDER 38: المخزون الافتتاحي op.5.1.2.15 · IAS_OPEN_STOCK [GO/05-warehouse.md §op.5.1.2.15]
-- الأعمدة من المواصفة في `masters-sync-opening.ts` (مصدر واحد): 41 = 33 + 8 تدقيق.
-- «لا شيء» في أونيكس (EXPIRE_DATE 1900-01-01 · BATCH_NO 0) يُنقل NULL كما قرّر GO §٣ (نمط IV-D21).
CREATE TABLE IF NOT EXISTS erp.opening_stock (
  doc_sequence      text PRIMARY KEY,             -- DOC_SEQUENCE
  item_code         text NOT NULL,                -- I_CODE
  qty               numeric(28,10) NOT NULL,      -- I_QTY
  unit_code         text NOT NULL,                -- ITM_UNT
  pack_size         numeric(28,10) NOT NULL,      -- P_SIZE
  base_qty          numeric(28,10),               -- P_QTY = I_QTY × P_SIZE
  barcode           text,                         -- BARCODE
  warehouse_code    text NOT NULL,                -- W_CODE
  warehouse_group   text,                         -- WHG_CODE (من المخزن)
  unit_cost         numeric(28,10) NOT NULL DEFAULT 0,  -- STK_COST
  expire_date       date,                         -- EXPIRE_DATE (1900-01-01 ⇒ NULL)
  batch_no          text,                         -- BATCH_NO ('0' ⇒ NULL)
  uses_serials      boolean NOT NULL DEFAULT false,  -- USE_SERIALNO
  vendor_code       text,                         -- V_CODE
  customer_code     text,                         -- C_CODE
  line_no           integer,                      -- RCRD_NO
  uses_attachments  boolean NOT NULL DEFAULT false,  -- USE_ATTCH
  attachment_rec    text,                         -- REC_ATTCH
  length            numeric(28,10),               -- I_LENGTH
  width             numeric(28,10),               -- I_WIDTH
  height            numeric(28,10),               -- I_HEIGHT
  piece_count       numeric(28,10),               -- I_NUMBER
  wt_qty            numeric(28,10),               -- WT_QTY
  wt_unit           text,                         -- WT_UNT
  wt_factor         numeric(28,10),               -- ARGMNT_NO
  carried_forward   boolean NOT NULL DEFAULT false,  -- MOV_PY_FLG
  stock_age         integer,                      -- ITM_AGE
  price_level       integer,                      -- LEV_NO
  price             numeric(28,10),               -- I_PRICE
  company_id        integer,                      -- CMP_NO
  branch_id         integer,                      -- BRN_NO
  fiscal_year       integer,                      -- BRN_YEAR
  branch_user       integer,                      -- BRN_USR
  source            text NOT NULL DEFAULT 'manual',  -- جديد: carried_forward (MOV_PY_FLG=1) · manual
  legacy            jsonb,
  created_by        text,
  created_at        timestamptz,
  updated_by        text,
  updated_at        timestamptz,
  update_count      integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS opening_stock_item_idx ON erp.opening_stock (item_code, warehouse_code);
CREATE INDEX IF NOT EXISTS opening_stock_wh_idx ON erp.opening_stock (warehouse_code);
