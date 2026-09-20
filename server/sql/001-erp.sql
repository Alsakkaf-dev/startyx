CREATE SCHEMA IF NOT EXISTS erp;

CREATE TABLE IF NOT EXISTS erp.migration_fact (
  code   text PRIMARY KEY,
  amount numeric(28,10) NOT NULL,
  rule   text NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.extract_load_log (
  id            bigserial PRIMARY KEY,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  engine        text,
  tables_loaded integer,
  rows_loaded   bigint,
  all_pass      boolean,
  report        jsonb
);

CREATE TABLE IF NOT EXISTS erp.company (
  id      bigint PRIMARY KEY,
  no      integer NOT NULL UNIQUE,
  name_ar text NOT NULL,
  vat_no  text
);

CREATE TABLE IF NOT EXISTS erp.branch (
  id         bigint PRIMARY KEY,
  company_id bigint NOT NULL,
  no         integer NOT NULL UNIQUE,
  name_ar    text NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.account (
  id            bigserial PRIMARY KEY,
  code          text NOT NULL UNIQUE,
  name_ar       text NOT NULL DEFAULT '',
  a_level       integer,
  parent_code   text,
  analytic_type text,
  inactive      boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS erp.item (
  id         bigserial PRIMARY KEY,
  code       text NOT NULL UNIQUE,
  name_ar    text NOT NULL DEFAULT '',
  group_code text
);

CREATE TABLE IF NOT EXISTS erp.warehouse (
  id      bigserial PRIMARY KEY,
  code    text NOT NULL UNIQUE,
  name_ar text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS erp.vendor (
  id           bigserial PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  name_ar      text NOT NULL DEFAULT '',
  account_code text
);

CREATE TABLE IF NOT EXISTS erp.customer (
  id      bigserial PRIMARY KEY,
  code    text NOT NULL UNIQUE,
  name_ar text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS erp.opening_balance_line (
  id            bigserial PRIMARY KEY,
  company_id    integer NOT NULL,
  branch_id     integer NOT NULL,
  account_code  text NOT NULL,
  analytic_code text,
  analytic_type text,
  amount        numeric(28,10) NOT NULL,
  doc_sequence  text,
  currency      text NOT NULL DEFAULT 'SAR'
);

CREATE TABLE IF NOT EXISTS erp.item_cost (
  id         bigserial PRIMARY KEY,
  company_id bigint NOT NULL,
  item_code  text NOT NULL,
  qty_base   numeric(28,10) NOT NULL,
  avg_cost   numeric(28,10) NOT NULL,
  UNIQUE (company_id, item_code)
);

CREATE TABLE IF NOT EXISTS erp.document_sequence (
  id             bigserial PRIMARY KEY,
  company_id     bigint NOT NULL DEFAULT 1,
  branch_id      bigint NOT NULL,
  fiscal_year_id bigint NOT NULL DEFAULT 2026,
  doc_kind       text NOT NULL,
  sequence_group text NOT NULL DEFAULT 'default',
  last_value     bigint NOT NULL,
  UNIQUE (company_id, branch_id, fiscal_year_id, doc_kind, sequence_group)
);

CREATE TABLE IF NOT EXISTS erp.fiscal_period (
  id             bigserial PRIMARY KEY,
  company_id     bigint NOT NULL DEFAULT 1,
  fiscal_year_id bigint NOT NULL DEFAULT 2026,
  no             integer NOT NULL,
  name_ar        text NOT NULL,
  from_date      date NOT NULL,
  to_date        date NOT NULL,
  status         text NOT NULL DEFAULT 'open',
  inactive       boolean NOT NULL DEFAULT false,
  UNIQUE (company_id, fiscal_year_id, no)
);

CREATE TABLE IF NOT EXISTS erp.period_branch_close (
  id               bigserial PRIMARY KEY,
  company_id       bigint NOT NULL DEFAULT 1,
  branch_id        bigint NOT NULL,
  period_id        bigint NOT NULL,
  inventory_closed boolean NOT NULL DEFAULT false,
  gl_closed        boolean NOT NULL DEFAULT false,
  UNIQUE (company_id, branch_id, period_id)
);

CREATE TABLE IF NOT EXISTS erp.gl_entry (
  id          bigserial PRIMARY KEY,
  company_id  bigint NOT NULL DEFAULT 1,
  doc_kind    text NOT NULL,
  date        date NOT NULL,
  period_id   bigint,
  branch_id   bigint NOT NULL,
  status      text NOT NULL,
  doc_no      text NOT NULL,
  description text NOT NULL DEFAULT '',
  source_kind text NOT NULL,
  posted_at   timestamptz,
  screen_ref  text
);

CREATE TABLE IF NOT EXISTS erp.gl_entry_line (
  id            bigserial PRIMARY KEY,
  company_id    bigint NOT NULL DEFAULT 1,
  entry_id      bigint NOT NULL REFERENCES erp.gl_entry(id),
  line_no       integer NOT NULL,
  account_code  text NOT NULL,
  analytic_type text NOT NULL DEFAULT 'general',
  analytic_id   bigint,
  debit         numeric(28,10) NOT NULL DEFAULT 0,
  credit        numeric(28,10) NOT NULL DEFAULT 0,
  UNIQUE (entry_id, line_no)
);

CREATE TABLE IF NOT EXISTS erp.live_document (
  id               bigserial PRIMARY KEY,
  gl_entry_id      bigint,
  document_number  bigint NOT NULL,
  doc_kind         text NOT NULL,
  screen_ref       text,
  status           text NOT NULL,
  imbalance        text,
  payload          jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gl_entry_branch_date_idx ON erp.gl_entry (branch_id, date);
CREATE INDEX IF NOT EXISTS opening_account_idx ON erp.opening_balance_line (account_code);
CREATE INDEX IF NOT EXISTS live_doc_screen_idx ON erp.live_document (screen_ref, id DESC);