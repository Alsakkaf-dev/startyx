-- الأبعاد التحليلية — الطبقة ٠ (GO/01-system-setup.md op.1.2.5/op.1.2.6 · GO/04-general-ledger.md op.4.1.2.9)

CREATE TABLE IF NOT EXISTS erp.cost_center_type (
  no                integer PRIMARY KEY,
  name_ar           text NOT NULL,
  name_en           text,
  affected_by_trans boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS erp.cost_center (
  id              bigserial PRIMARY KEY,
  no              integer NOT NULL UNIQUE,
  code            text NOT NULL UNIQUE,
  name_ar         text NOT NULL,
  name_en         text,
  parent_code     text,
  level           integer,
  kind            text NOT NULL DEFAULT 'sub',
  sequence_no     integer,
  group_no        integer,
  project_use     integer,
  inactive        boolean NOT NULL DEFAULT false,
  inactive_sales  boolean NOT NULL DEFAULT false,
  inactive_reason text,
  inactive_date   date,
  created_by      text,
  created_at      timestamptz,
  updated_by      text,
  updated_at      timestamptz,
  update_count    integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp.project (
  id              bigserial PRIMARY KEY,
  no              bigint NOT NULL UNIQUE,
  code            text,
  name_ar         text NOT NULL,
  name_en         text,
  parent_no       bigint,
  level           integer,
  is_sub          boolean NOT NULL DEFAULT false,
  sequence_no     integer,
  group_no        integer,
  activity_use    integer,
  inactive        boolean NOT NULL DEFAULT false,
  inactive_reason text,
  inactive_date   date,
  created_by      text,
  created_at      timestamptz,
  updated_by      text,
  updated_at      timestamptz,
  update_count    integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp.activity (
  id              bigserial PRIMARY KEY,
  no              bigint NOT NULL UNIQUE,
  code            text,
  name_ar         text NOT NULL,
  name_en         text,
  parent_no       bigint,
  level           integer,
  is_sub          boolean NOT NULL DEFAULT false,
  group_no        integer,
  project_no      bigint,
  cost_account    text,
  inactive        boolean NOT NULL DEFAULT false,
  inactive_reason text,
  inactive_date   date,
  created_by      text,
  created_at      timestamptz,
  updated_by      text,
  updated_at      timestamptz,
  update_count    integer NOT NULL DEFAULT 0
);

-- GL-R44: سطر واحد لكل (حساب · نشاط)
CREATE TABLE IF NOT EXISTS erp.account_activity (
  id           bigserial PRIMARY KEY,
  account_code text NOT NULL,
  activity_no  bigint NOT NULL,
  created_by   text,
  created_at   timestamptz,
  updated_by   text,
  updated_at   timestamptz,
  update_count integer NOT NULL DEFAULT 0,
  UNIQUE (account_code, activity_no)
);

CREATE INDEX IF NOT EXISTS cost_center_parent_idx ON erp.cost_center (parent_code);
CREATE INDEX IF NOT EXISTS project_parent_idx ON erp.project (parent_no);
