-- الطبقة ٣ — BUILD-ORDER 37: الأرصدة الافتتاحية op.4.1.2.10 · OPEN_BAL [GO/04-general-ledger.md §op.4.1.2.10]
-- نفس مبدأ 006/007: الجدول القائم (يعبّئه load-2026.ts) يُوسَّع بأعمدة ولا يُعاد تصميمه.
-- الأعمدة من المواصفة في `masters-sync-opening.ts` (مصدر واحد) — OPEN_BAL 40 = 32 ظاهر/محفوظ + 8 تدقيق.

ALTER TABLE erp.opening_balance_line ALTER COLUMN amount SET DEFAULT 0;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS analytic_sub      text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS cost_center       text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS from_cost_center  text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS lc_no             text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS project_no        text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS activity_no       text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS rep_code          text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS amount_fc         numeric(28,10) NOT NULL DEFAULT 0;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS fx_rate           numeric(28,10);
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS dir_code1         text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS dir_code2         text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS dir_code3         text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS dir_code4         text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS dir_code5         text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS verified          text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS ob_py             integer;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS collector_no      text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS ref_no            text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS description       text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS external_post     integer;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS from_branch_no    integer;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS value_date        date;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS fiscal_year       integer;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS branch_user       integer;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS legacy            jsonb;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS created_by        text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS created_at        timestamptz;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS updated_by        text;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS updated_at        timestamptz;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS update_count      integer NOT NULL DEFAULT 0;
-- الشاشة تُدخل مديناً ودائناً؛ أونيكس يخزّن J_AMT بإشارة (+ مدين · − دائن). الأربعة تبقى متسقة بالمشغّل أدناه.
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS debit             numeric(28,10) NOT NULL DEFAULT 0;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS credit            numeric(28,10) NOT NULL DEFAULT 0;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS debit_fc          numeric(28,10) NOT NULL DEFAULT 0;
ALTER TABLE erp.opening_balance_line ADD COLUMN IF NOT EXISTS credit_fc         numeric(28,10) NOT NULL DEFAULT 0;

-- DOC_SEQUENCE مفتاح السطر في أونيكس (3,396 قيمة مميزة من 3,396)
CREATE UNIQUE INDEX IF NOT EXISTS opening_doc_sequence_uq ON erp.opening_balance_line (doc_sequence);
CREATE INDEX IF NOT EXISTS opening_analytic_idx ON erp.opening_balance_line (analytic_type, analytic_code);

-- المبلغ الموقَّع ⇄ مدين/دائن: إدخال الشاشة (مدين/دائن) يحسب المبلغ، والتحميل من أونيكس (المبلغ فقط) يحسب مدين/دائن
CREATE OR REPLACE FUNCTION erp.opening_sides() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.debit = 0 AND NEW.credit = 0 AND COALESCE(NEW.amount, 0) <> 0 THEN
      NEW.debit := GREATEST(NEW.amount, 0);
      NEW.credit := GREATEST(-NEW.amount, 0);
    ELSE
      NEW.amount := NEW.debit - NEW.credit;
    END IF;
    IF NEW.debit_fc = 0 AND NEW.credit_fc = 0 AND COALESCE(NEW.amount_fc, 0) <> 0 THEN
      NEW.debit_fc := GREATEST(NEW.amount_fc, 0);
      NEW.credit_fc := GREATEST(-NEW.amount_fc, 0);
    ELSE
      NEW.amount_fc := NEW.debit_fc - NEW.credit_fc;
    END IF;
  ELSE
    IF NEW.debit IS DISTINCT FROM OLD.debit OR NEW.credit IS DISTINCT FROM OLD.credit THEN
      NEW.amount := NEW.debit - NEW.credit;
    ELSIF NEW.amount IS DISTINCT FROM OLD.amount THEN
      NEW.debit := GREATEST(NEW.amount, 0);
      NEW.credit := GREATEST(-NEW.amount, 0);
    END IF;
    IF NEW.debit_fc IS DISTINCT FROM OLD.debit_fc OR NEW.credit_fc IS DISTINCT FROM OLD.credit_fc THEN
      NEW.amount_fc := NEW.debit_fc - NEW.credit_fc;
    ELSIF NEW.amount_fc IS DISTINCT FROM OLD.amount_fc THEN
      NEW.debit_fc := GREATEST(NEW.amount_fc, 0);
      NEW.credit_fc := GREATEST(-NEW.amount_fc, 0);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS opening_sides ON erp.opening_balance_line;
CREATE TRIGGER opening_sides BEFORE INSERT OR UPDATE ON erp.opening_balance_line
  FOR EACH ROW EXECUTE FUNCTION erp.opening_sides();

-- سطور حُمِّلت قبل هذا الملف: مدين/دائن من المبلغ الموقَّع
UPDATE erp.opening_balance_line SET debit = GREATEST(amount, 0), credit = GREATEST(-amount, 0)
 WHERE debit = 0 AND credit = 0 AND amount <> 0;
UPDATE erp.opening_balance_line SET debit_fc = GREATEST(amount_fc, 0), credit_fc = GREATEST(-amount_fc, 0)
 WHERE debit_fc = 0 AND credit_fc = 0 AND amount_fc <> 0;
