-- ═══ الطبقة ٠ · الخدمات المشتركة ١–٥ — ضمانات الترحيل على مستوى القاعدة ═══
-- التطبيق يفحص قبل الكتابة، والقاعدة ترفض ما يفلت منه: لا ثابت محاسبي يعتمد على الكود وحده.

-- INV-2 · INV-9: القيد يحمل مصدره وسنته وسعر صرفه المجمَّد
ALTER TABLE erp.gl_entry ADD COLUMN IF NOT EXISTS fiscal_year_id   bigint;
ALTER TABLE erp.gl_entry ADD COLUMN IF NOT EXISTS currency_id      integer;
ALTER TABLE erp.gl_entry ADD COLUMN IF NOT EXISTS fx_rate          numeric(28,10);
ALTER TABLE erp.gl_entry ADD COLUMN IF NOT EXISTS fx_operator      text;
ALTER TABLE erp.gl_entry ADD COLUMN IF NOT EXISTS live_document_id bigint;
ALTER TABLE erp.gl_entry ADD COLUMN IF NOT EXISTS created_by       text;

-- الفرع على السطر (قيد الفرع المستفيد) والأبعاد (SY-R39)
ALTER TABLE erp.gl_entry_line ADD COLUMN IF NOT EXISTS branch_id        bigint;
ALTER TABLE erp.gl_entry_line ADD COLUMN IF NOT EXISTS cost_center_code text;
ALTER TABLE erp.gl_entry_line ADD COLUMN IF NOT EXISTS project_no       text;
ALTER TABLE erp.gl_entry_line ADD COLUMN IF NOT EXISTS is_generated     boolean NOT NULL DEFAULT false;

ALTER TABLE erp.live_document ADD COLUMN IF NOT EXISTS branch_id      bigint;
ALTER TABLE erp.live_document ADD COLUMN IF NOT EXISTS fiscal_year_id bigint;
ALTER TABLE erp.live_document ADD COLUMN IF NOT EXISTS doc_date       date;
ALTER TABLE erp.live_document ADD COLUMN IF NOT EXISTS currency_id    integer;
ALTER TABLE erp.live_document ADD COLUMN IF NOT EXISTS fx_rate        numeric(28,10);
ALTER TABLE erp.live_document ADD COLUMN IF NOT EXISTS fx_operator    text;
ALTER TABLE erp.live_document ADD COLUMN IF NOT EXISTS created_by     text;
ALTER TABLE erp.live_document ADD COLUMN IF NOT EXISTS icv            bigint;

-- INV-10: رقم الوثيقة فريد في نطاقه (النوع · الفرع · السنة) — الصفوف القديمة بلا فرع خارج الفهرس
CREATE UNIQUE INDEX IF NOT EXISTS live_document_number_uq
  ON erp.live_document (doc_kind, branch_id, fiscal_year_id, document_number)
  WHERE branch_id IS NOT NULL;

-- INV-3: حركة المخزون تُكتب مع القيد في نفس المعاملة
CREATE TABLE IF NOT EXISTS erp.stock_movement (
  id               bigserial PRIMARY KEY,
  company_id       bigint NOT NULL DEFAULT 1,
  live_document_id bigint NOT NULL REFERENCES erp.live_document(id),
  gl_entry_id      bigint REFERENCES erp.gl_entry(id),
  branch_id        bigint NOT NULL,
  doc_kind         text NOT NULL,
  document_number  bigint NOT NULL,
  date             date NOT NULL,
  line_no          integer NOT NULL,
  item_code        text NOT NULL,
  warehouse_code   text NOT NULL,
  qty_base         numeric(28,10) NOT NULL,
  unit_cost        numeric(28,10) NOT NULL,
  value            numeric(28,10) NOT NULL,
  is_free          boolean NOT NULL DEFAULT false,
  UNIQUE (live_document_id, line_no)
);
CREATE INDEX IF NOT EXISTS stock_movement_item_idx ON erp.stock_movement (item_code, warehouse_code, date);

CREATE INDEX IF NOT EXISTS gl_entry_line_account_idx ON erp.gl_entry_line (account_code);

-- INV-5: لا سطر قيد على حساب غير موجود أو رئيسي أو موقوف
CREATE OR REPLACE FUNCTION erp.gl_line_account_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a record;
BEGIN
  SELECT kind, inactive INTO a FROM erp.account WHERE code = NEW.account_code;
  IF NOT FOUND OR a.kind <> 'posting' OR a.inactive THEN
    RAISE EXCEPTION 'INV-5: رقم الحساب غير صحيح — %', NEW.account_code USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.debit < 0 OR NEW.credit < 0 THEN
    RAISE EXCEPTION 'INV-1: مبلغ سالب على السطر' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gl_line_account_guard ON erp.gl_entry_line;
CREATE TRIGGER gl_line_account_guard BEFORE INSERT ON erp.gl_entry_line
  FOR EACH ROW EXECUTE FUNCTION erp.gl_line_account_guard();

-- INV-1: كل قيد متوازن عند الالتزام (الافتتاحي مستثنى — GL-D4 فرق منقول كما هو)
CREATE OR REPLACE FUNCTION erp.gl_entry_balance_check() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE k text; diff numeric;
BEGIN
  SELECT doc_kind INTO k FROM erp.gl_entry WHERE id = NEW.entry_id;
  IF k = 'opening_balance' THEN RETURN NULL; END IF;
  SELECT COALESCE(sum(debit),0) - COALESCE(sum(credit),0) INTO diff FROM erp.gl_entry_line WHERE entry_id = NEW.entry_id;
  IF diff <> 0 THEN
    RAISE EXCEPTION 'INV-1: القيد % غير متوازن بفرق %', NEW.entry_id, diff USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS gl_entry_balance_check ON erp.gl_entry_line;
CREATE CONSTRAINT TRIGGER gl_entry_balance_check AFTER INSERT ON erp.gl_entry_line
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION erp.gl_entry_balance_check();

-- INV-6: المرحَّل لا يُعدَّل ولا يُحذف — يُعكس بقيد عكسي
CREATE OR REPLACE FUNCTION erp.gl_posted_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'INV-6: القيد المرحّل لا يُعدَّل ولا يُحذف — يُعكس بقيد عكسي' USING ERRCODE = 'check_violation';
END $$;
DROP TRIGGER IF EXISTS gl_line_immutable ON erp.gl_entry_line;
CREATE TRIGGER gl_line_immutable BEFORE UPDATE OR DELETE ON erp.gl_entry_line
  FOR EACH ROW EXECUTE FUNCTION erp.gl_posted_immutable();
DROP TRIGGER IF EXISTS gl_entry_immutable ON erp.gl_entry;
CREATE TRIGGER gl_entry_immutable BEFORE UPDATE OR DELETE ON erp.gl_entry
  FOR EACH ROW WHEN (OLD.status = 'posted') EXECUTE FUNCTION erp.gl_posted_immutable();
DROP TRIGGER IF EXISTS stock_movement_immutable ON erp.stock_movement;
CREATE TRIGGER stock_movement_immutable BEFORE UPDATE OR DELETE ON erp.stock_movement
  FOR EACH ROW EXECUTE FUNCTION erp.gl_posted_immutable();
