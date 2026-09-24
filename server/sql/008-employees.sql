-- الطبقة ٢ — BUILD-ORDER 36: بيانات الموظفين op.1.2.8 · S_EMP [GO/01-system-setup.md §op.1.2.8]
-- الأعمدة من المواصفة في `masters-sync-employees.ts` (مصدر واحد). أعمدة الرواتب والموارد البشرية في features (SY-R54).
CREATE TABLE IF NOT EXISTS erp.employee (
  code                    text PRIMARY KEY,  -- EMP_NO
  name_ar                 text NOT NULL DEFAULT '',  -- EMP_L_NM
  name_en                 text,  -- EMP_F_NM
  first_ar                text,  -- FRST_L_NM
  first_en                text,  -- FRST_F_NM
  second_ar               text,  -- SCND_L_NM
  second_en               text,  -- SCND_F_NM
  third_ar                text,  -- THRD_L_NM
  third_en                text,  -- THRD_F_NM
  last_ar                 text,  -- LST_L_NM
  last_en                 text,  -- LST_F_NM
  currency                text,  -- CUR_CODE
  branch_no               integer,  -- BRN_NO
  company_no              integer,  -- CMP_NO
  hierarchy_no            integer,  -- HRCHY_NO
  manager_no              text,  -- EMP_NO_MNGR
  manager2_no             text,  -- EMP_NO_MNGR2
  hired_on                date,  -- STRT_WRK_DATE
  current_job_on          date,  -- CRNT_JOB_DATE
  reinstated_on           date,  -- REINSTTMNT_DATE
  job_title_no            integer,  -- EMP_JOB_NO
  major_no                integer,  -- MJR_NO
  grade_no                integer,  -- GRD_NO
  qualification_no        integer,  -- CRNT_QLFCTN
  employment_type         integer,  -- EMPLYMNT_TYP
  job_status              integer,  -- EMP_ST
  class_no                integer,  -- CLASS_NO
  current_status          integer,  -- EMP_CRNT_ST
  group_no                integer,  -- GRP_NO
  admin_title_no          integer,  -- MNGRL_NO
  category_no             integer,  -- CTGRY_NO
  level_no                integer,  -- LVL_NO
  work_location_no        integer,  -- CRNT_EMP_LOC_ASSGN
  work_period_type        integer,  -- WRK_PRD_TYP
  gender                  integer,  -- GNDR
  nationality_no          integer,  -- NTNLTY_NO
  citizenship             integer,  -- CTZNSHP
  marital_status          integer,  -- SCL_ST
  religion_no             integer,  -- RLGN_NO
  blood_type              integer,  -- BLD_TYP
  language_no             integer,  -- EMP_LANG_NO
  birth_date              text,  -- BRTH_AD_DATE
  birth_date_hijri        text,  -- BRTH_HG_DATE
  birth_place             text,  -- BRTH_PLC
  id_type                 integer,  -- CRD_TYP
  id_no                   text,  -- CRD_NO
  national_no             text,  -- NTNL_NO
  id_issue_place          text,  -- PLC_CRD_ISSUE
  id_issue_date           date,  -- CRD_DATE
  id_expiry_date          date,  -- CRD_EXP_DATE
  border_no               text,  -- BORDER_NO
  self_service            boolean NOT NULL DEFAULT false,  -- USE_SLF_SRVC_SYS
  notes                   text,  -- NOTES
  email                   text,  -- E_MAIL
  phone                   text,  -- TEL_NO
  mobile                  text,  -- MOBILE_NO
  fax                     text,  -- FAX_NO
  po_box                  text,  -- PO_BOX_NO
  address                 text,  -- ADDRS
  website                 text,  -- WEB_SITE
  country_no              integer,  -- CNTRY_NO
  province_no             integer,  -- PROV_NO
  city_no                 integer,  -- CITY_NO
  region_no               integer,  -- R_CODE
  account_code            text,  -- AC_CODE
  bank_account_code       text,  -- BNK_AC_CODE
  cost_center             text,  -- CC_CODE
  project_no              text,  -- PJ_NO
  activity_no             text,  -- ACTV_NO
  pay_method              integer,  -- PAY_MTHD
  salary_pay_way          integer,  -- SLRY_PAY_WAY
  salary_status           integer,  -- SLRY_ST
  taxable                 boolean NOT NULL DEFAULT false,  -- TAX_FLG
  social_insurance_no     text,  -- SCL_INSRNCE_NO
  work_days_month         numeric(28,10),  -- WRK_DY_MNTH
  work_hours_day          numeric(28,10),  -- WRK_HRS_DY
  work_hours_month        numeric(28,10),  -- WRK_HRS_MNTH
  work_hours_year         numeric(28,10),  -- WRK_HRS_YR
  work_days_year          numeric(28,10),  -- WRK_DY_YR
  inactive                boolean NOT NULL DEFAULT false,  -- INACTIVE
  inactive_by             text,  -- INACTIVE_U_ID
  inactive_date           date,  -- INACTIVE_DATE
  inactive_reason         text,  -- INACTIVE_RES
  self_service_secret_hash text,          -- EMP_PSWRD (بصمة لا نص)
  features                 jsonb,
  legacy                   jsonb,
  created_by               text,
  created_at               timestamptz,
  updated_by               text,
  updated_at               timestamptz,
  update_count             integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS employee_branch_idx ON erp.employee (branch_no);
CREATE INDEX IF NOT EXISTS employee_manager_idx ON erp.employee (manager_no);
