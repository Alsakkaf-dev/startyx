/**
 * شاشات البيانات الأساسية — الطبقة ٠ (GO/01-system-setup.md) + الطبقة ١ (التهيئة، بنود 13–27)
 * تقرأ وتكتب من الخادم فقط: /api/masters/<entity>. لا قيم أمثلة.
 * شاشة بأكثر من جدول (نوع الضريبة/جهاتها/شرائحها …) تُعرَّف بـ sets: لكل جدول لوحته (panel = عنوانها)
 * وشريط تبويب يبدّل الجدول النشط — الحقول تُبحث داخل لوحة الجدول النشط فقط.
 */
(function (root) {
  "use strict";

  var ANALYTIC = { "0": "عام", "1": "صندوق", "2": "بنك", "3": "عميل", "4": "مورد", "7": "موظف" };
  var USE = { "0": "غير مستخدم", "1": "اختياري", "2": "إجباري" };

  var MAP = {
    /* ═══ op.1.1.3 — تهيئة العملات · EX_RATE ═══ */
    "op.1.1.3": {
      entity: "currency",
      key: "no",
      keyLabel: "الرقم",
      autoKey: true,
      title: "العملات",
      cols: [
        { c: "no", t: "الرقم", n: true },
        { c: "code", t: "الرمز" },
        { c: "iso_code", t: "الرمز الدولي" },
        { c: "name_ar", t: "الاسم" },
        { c: "rate", t: "سعر التحويل", n: true },
        { c: "is_local", t: "محلية", bool: true },
        { c: "is_stock_currency", t: "عملة المخزون", bool: true },
        { c: "decimals", t: "عشرية", n: true }
      ],
      fields: {
        "الرقم": { f: "no" },
        "الاسم": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "الرمز": { f: "code" },
        "الرمز الدولي": { f: "iso_code" },
        "الكسر": { f: "fraction_ar" },
        "الكسر الأجنبي": { f: "fraction_en" },
        "محلية": { f: "is_local", bool: true },
        "عملة المخزون": { f: "is_stock_currency", bool: true },
        "المعامل": { f: "operator", map: { "×": "mul", "÷": "div" } },
        "سعر التحويل": { f: "rate" },
        "أدنى سعر": { f: "rate_min" },
        "أعلى سعر": { f: "rate_max" },
        "الأرقام العشرية": { f: "decimals" },
        "موقوفة": { f: "inactive", bool: true }
      }
    },

    /* ═══ op.1.2.3 — الدليل المحاسبي · ACCOUNT ═══ */
    "op.1.2.3": {
      entity: "account",
      key: "code",
      keyLabel: "رقم الحساب",
      title: "الدليل",
      parent: { label: "الحساب الأعلى", codeLabel: "رقم الحساب", levelLabel: "المستوى", levels: [1, 2, 4, 6, 10], inherit: true },
      cols: [
        { c: "code", t: "الرقم" },
        { c: "name_ar", t: "الاسم" },
        { c: "a_level", t: "المستوى", n: true },
        { c: "kind", t: "النوع", map: { header: "رئيسي", posting: "فرعي (حركة)" } },
        { c: "nature", t: "الطبيعة", map: { debit: "مدين", credit: "دائن" } },
        { c: "report_type", t: "التقرير", map: { balance_sheet: "ميزانية", pnl: "أرباح وخسائر" } },
        { c: "analytic_type", t: "التحليلي", map: ANALYTIC },
        { c: "use_cc", t: "المراكز", map: USE },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "الحساب الأعلى": { f: "parent_code" },
        "رقم الحساب": { f: "code" },
        "الاسم": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "المستوى": { f: "a_level", ro: true },
        "النوع": { f: "kind", map: { "فرعي (حركة)": "posting", "رئيسي": "header" } },
        "الطبيعة": { f: "nature", map: { "مدين": "debit", "دائن": "credit" }, inherited: true },
        "التقرير": { f: "report_type", map: { "ميزانية": "balance_sheet", "أرباح وخسائر": "pnl" }, inherited: true },
        "التحليلي": { f: "analytic_type", map: { "عام": "0", "صندوق": "1", "بنك": "2", "عميل": "3", "مورد": "4", "موظف": "7" } },
        "استخدام المراكز": { f: "use_cc", map: { "غير مستخدم": "0", "اختياري": "1", "إجباري": "2" } },
        "موقوف": { f: "inactive", bool: true },
        "سبب التوقيف": { f: "inactive_reason" }
      }
    },

    /* ═══ op.1.1.12 — بيانات الفروع · S_BRN ═══ */
    "op.1.1.12": {
      entity: "branch",
      key: "no",
      keyLabel: "رقم الفرع",
      autoKey: true,
      title: "الفروع",
      cols: [
        { c: "no", t: "الفرع", n: true },
        { c: "name_ar", t: "الاسم" },
        { c: "company_id", t: "الشركة", n: true },
        { c: "vat_no", t: "الرقم الضريبي" },
        { c: "einvoice_enabled", t: "فاتورة إلكترونية", bool: true },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "الشركة": { f: "company_id" },
        "رقم الفرع": { f: "no" },
        "الاسم": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "سنة البدء": { f: "start_year" },
        "تسلسل الفرع": { f: "seq_no" },
        "الرقم الضريبي": { f: "vat_no" },
        "السجل التجاري": { f: "cr_no" },
        "المدينة": { f: "city" },
        "الحي": { f: "district" },
        "الشارع": { f: "street" },
        "رقم المبنى": { f: "building_no" },
        "الرمز البريدي": { f: "postal_code" },
        "فاتورة إلكترونية": { f: "einvoice_enabled", bool: true },
        "موقوف": { f: "inactive", bool: true }
      }
    },

    /* ═══ op.1.1.2 — إعداد فترات النظام · S_PRD_DTL ═══ */
    "op.1.1.2": {
      entity: "fiscal_period",
      key: "no",
      keyLabel: "الرقم",
      autoKey: true,
      title: "الفترات",
      cols: [
        { c: "no", t: "الرقم", n: true },
        { c: "name_ar", t: "الاسم المخزّن" },
        { c: "from_date", t: "من" },
        { c: "to_date", t: "إلى" },
        { c: "status", t: "الحالة", map: { open: "مفتوحة", closed: "مقفلة" } },
        { c: "inactive", t: "موقوفة", bool: true }
      ],
      fields: {
        "الرقم": { f: "no" },
        "الاسم": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "من": { f: "from_date" },
        "إلى": { f: "to_date" },
        "السنة المالية": { f: "fiscal_year_id" },
        "الحالة": { f: "status", map: { "مفتوحة": "open", "مقفلة": "closed" }, ro: true },
        "الفترة الضريبية": { f: "vat_period" },
        "موقوفة": { f: "inactive", bool: true }
      },
      summary: function (rows) {
        var from = "", to = "";
        rows.forEach(function (r) {
          if (!from || String(r.from_date) < from) from = String(r.from_date || "");
          if (!to || String(r.to_date) > to) to = String(r.to_date || "");
        });
        return { "عدد الفترات": String(rows.length), "بداية السنة": from, "نهاية السنة": to };
      }
    },

    /* ═══ op.1.2.5 — مراكز التكلفة · COST_CENTERS ═══ */
    "op.1.2.5": {
      entity: "cost_center",
      key: "code",
      keyLabel: "رمز المركز",
      title: "المراكز",
      parent: { label: "المركز الأعلى", codeField: "code", levelLabel: "المستوى" },
      cols: [
        { c: "code", t: "الرمز" },
        { c: "name_ar", t: "الاسم" },
        { c: "parent_code", t: "الأعلى" },
        { c: "level", t: "المستوى", n: true },
        { c: "kind", t: "النوع", map: { main: "رئيسي", sub: "فرعي (حركة)" } },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "المركز الأعلى": { f: "parent_code" },
        "رمز المركز": { f: "code" },
        "الرقم": { f: "no" },
        "الاسم": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "المستوى": { f: "level", ro: true },
        "النوع": { f: "kind", map: { "فرعي (حركة)": "sub", "رئيسي": "main" } },
        "التسلسل": { f: "sequence_no" },
        "المجموعة": { f: "group_no" },
        "موقوف": { f: "inactive", bool: true },
        "موقوف في المبيعات": { f: "inactive_sales", bool: true },
        "سبب التوقيف": { f: "inactive_reason" }
      }
    },

    /* ═══ op.1.2.6 — بيانات المشاريع · IAS_PROJECTS ═══ */
    "op.1.2.6": {
      entity: "project",
      key: "no",
      keyLabel: "رقم المشروع",
      title: "المشاريع",
      parent: { label: "المشروع الأعلى", codeField: "no", levelLabel: "المستوى" },
      cols: [
        { c: "no", t: "الرقم", n: true },
        { c: "name_ar", t: "الاسم" },
        { c: "parent_no", t: "الأعلى", n: true },
        { c: "level", t: "المستوى", n: true },
        { c: "is_sub", t: "حركة", bool: true },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "المشروع الأعلى": { f: "parent_no" },
        "رقم المشروع": { f: "no" },
        "الاسم": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "المستوى": { f: "level", ro: true },
        "مشروع حركة": { f: "is_sub", bool: true },
        "التسلسل": { f: "sequence_no" },
        "المجموعة": { f: "group_no" },
        "موقوف": { f: "inactive", bool: true },
        "سبب التوقيف": { f: "inactive_reason" }
      }
    },

    /* ═══ op.4.1.2.9 — ربط الحسابات بالأنشطة · IAS_ACCOUNT_ACTV ═══ */
    "op.4.1.2.9": {
      entity: "account_activity",
      key: "account_code",
      keyCols: ["account_code", "activity_no"],
      keyLabel: "رقم الحساب",
      title: "الروابط",
      emptyNote: "لا أنشطة معرّفة — عرّف الأنشطة أولاً",
      cols: [
        { c: "account_code", t: "رقم الحساب" },
        { c: "activity_no", t: "رقم النشاط", n: true }
      ],
      fields: {
        "رقم الحساب": { f: "account_code" },
        "رقم النشاط": { f: "activity_no" }
      }
    },

    /* ══════════════ الطبقة ١ — التهيئة (BUILD-ORDER بنود 13–27) ══════════════ */

    /* ═══ op.3.2 — أنواع الضرائب · GNR_TAX_CODE_MST / _DTL / GNR_TAX_SLICE [GO/03-tax.md] ═══ */
    "op.3.2": { sets: [
      {
        entity: "tax_type", panel: "نوع الضريبة", title: "الأنواع",
        key: "no", keyLabel: "رقم النوع", autoKey: true,
        cols: [
          { c: "no", t: "الرقم", n: true },
          { c: "name_ar", t: "الاسم" },
          { c: "code", t: "الرمز" },
          { c: "applies_to", t: "طريقة الاحتساب", map: { "1": "مبيعات", "2": "مشتريات", "3": "الكل" } },
          { c: "agency_count", t: "الجهات", n: true },
          { c: "is_default", t: "افتراضي", bool: true },
          { c: "inactive", t: "موقوف", bool: true }
        ],
        fields: {
          "رقم النوع": { f: "no" },
          "الاسم": { f: "name_ar" },
          "الاسم الأجنبي": { f: "name_en" },
          "رمز النوع": { f: "code" },
          "طريقة الاحتساب": { f: "applies_to", map: { "الكل": "3", "مبيعات": "1", "مشتريات": "2" } },
          "عدد الجهات": { f: "agency_count", ro: true },
          "افتراضي": { f: "is_default", bool: true },
          "الشركة": { f: "company_id" },
          "الاحتساب على المستند": { f: "calc_on_document", bool: true },
          "صنف الضريبة": { f: "tax_kind" },
          "فئة الضريبة": { f: "tax_class" },
          "خصم من المنبع": { f: "tds", bool: true },
          "الحد الأدنى": { f: "min_amount" },
          "نسبة على الدفعة المقدمة": { f: "pct_on_prepaid" },
          "مزامنة": { f: "sync", bool: true },
          "موقوف": { f: "inactive", bool: true },
          "سبب التوقيف": { f: "inactive_reason" }
        }
      },
      {
        entity: "tax_agency", panel: "الجهة", title: "الجهات",
        key: "agency_no", keyCols: ["tax_no", "agency_no"], keyLabel: "رقم الجهة",
        cols: [
          { c: "tax_no", t: "النوع", n: true },
          { c: "agency_no", t: "الجهة", n: true },
          { c: "name_ar", t: "الاسم" },
          { c: "sales_account", t: "حساب المبيعات" },
          { c: "purchase_account", t: "حساب المشتريات" },
          { c: "due_tax_account", t: "الضريبة المستحقة" }
        ],
        fields: {
          "رقم النوع": { f: "tax_no" },
          "رقم الجهة": { f: "agency_no" },
          "الاسم": { f: "name_ar" },
          "الاسم الأجنبي": { f: "name_en" },
          "حساب المبيعات": { f: "sales_account" },
          "حساب المشتريات": { f: "purchase_account" },
          "حساب الضريبة المستحقة": { f: "due_tax_account" },
          "النسبة": { f: "pct" }
        }
      },
      {
        entity: "tax_slice", panel: "الشريحة", title: "الشرائح",
        key: "no", keyLabel: "رقم الشريحة", autoKey: true,
        cols: [
          { c: "no", t: "الرقم", n: true },
          { c: "name_ar", t: "الاسم" },
          { c: "pct", t: "النسبة", n: true },
          { c: "is_default", t: "افتراضي", bool: true },
          { c: "inactive", t: "موقوف", bool: true }
        ],
        fields: {
          "رقم الشريحة": { f: "no" },
          "الاسم": { f: "name_ar" },
          "الاسم الأجنبي": { f: "name_en" },
          "النسبة": { f: "pct" },
          "افتراضي": { f: "is_default", bool: true },
          "موقوف": { f: "inactive", bool: true },
          "سبب التوقيف": { f: "inactive_reason" }
        }
      }
    ]},

    /* ═══ op.5.1.1.2 — وحدات القياس · MEASUREMENT / IAS_UNTS_CONV [GO/05-warehouse.md] ═══ */
    "op.5.1.1.2": { sets: [
      {
        entity: "unit", panel: "الوحدة", title: "الوحدات",
        key: "code", keyLabel: "رمز الوحدة",
        cols: [
          { c: "code", t: "الرمز" },
          { c: "name_ar", t: "الاسم" },
          { c: "unit_kind", t: "النوع", map: { "1": "عددية", "2": "مقاسة" } },
          { c: "sale_scope", t: "نوع وحدة القياس", map: { "1": "تجزئة", "2": "جملة", "3": "كلي" } },
          { c: "lock_pack_size", t: "غير قابل للتعديل", bool: true }
        ],
        fields: {
          "رمز الوحدة": { f: "code" },
          "اسم الوحدة": { f: "name_ar" },
          "الاسم الأجنبي": { f: "name_en" },
          "رمز وحدة القياس العالمية": { f: "global_code" },
          "العبوة الافتراضية": { f: "default_pack_size" },
          "غير قابل للتعديل": { f: "lock_pack_size", bool: true },
          "نوع الوحدة": { f: "unit_kind", map: { "عددية": "1", "مقاسة": "2" } },
          "تصنيف الوحدة": { f: "measure_class", map: { "—": "", "وزن": "1", "حجم": "2", "مساحة": "3", "أطوال": "4", "سوائل": "5", "عدد": "6" } },
          "مرتبطة بوحدات عددية": { f: "linked_to_counted", bool: true },
          "نوع وحدة القياس": { f: "sale_scope", map: { "كلي": "3", "تجزئة": "1", "جملة": "2" } }
        }
      },
      {
        entity: "unit_conversion", panel: "التحويل بين الوحدات", title: "التحويلات",
        key: "from_code", keyCols: ["from_code", "to_code"], keyLabel: "من وحدة",
        cols: [
          { c: "group_no", t: "المجموعة", n: true },
          { c: "from_code", t: "من وحدة" },
          { c: "to_code", t: "إلى وحدة" },
          { c: "factor", t: "المعامل", n: true }
        ],
        fields: {
          "المجموعة": { f: "group_no" },
          "من وحدة": { f: "from_code" },
          "إلى وحدة": { f: "to_code" },
          "المعامل": { f: "factor" }
        }
      }
    ]},

    /* ═══ op.5.1.2.1 — بيانات المجموعة الرئيسية · GROUP_DETAILS [GO/05-warehouse.md] ═══ */
    "op.5.1.2.1": {
      entity: "item_group",
      key: "code",
      keyLabel: "رقم المجموعة",
      title: "المجموعات",
      cols: [
        { c: "code", t: "الرقم" },
        { c: "name_ar", t: "الاسم" },
        { c: "item_code_prefix", t: "بادئة الصنف" },
        { c: "default_tax_pct", t: "نسبة الضريبة", n: true },
        { c: "sort_no", t: "الترتيب", n: true }
      ],
      fields: {
        "رقم المجموعة": { f: "code" },
        "اسم المجموعة": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "كود رقم الصنف": { f: "item_code_prefix" },
        "نسبة الضريبة الافتراضية": { f: "default_tax_pct" },
        "مزامنة إلى موقع الويب": { f: "sync_to_web", bool: true },
        "إستخدام سعر البيع كسعر شراء": { f: "use_sale_as_purchase_price", bool: true },
        "يسمح بالخصم — مبيعات": { f: "allow_disc_sales", bool: true },
        "يسمح بالخصم — مشتريات": { f: "allow_disc_purch", bool: true },
        "الحد الأدنى لسعر البيع من": { f: "min_price_base" },
        "الإشارة": { f: "min_price_sign" },
        "نوع القيمة": { f: "min_price_val_typ", map: { "—": "", "نسبة": "1", "قيمة": "2" } },
        "المعامل": { f: "min_price_value" },
        "حد كمية المجموعة": { f: "qty_limit" },
        "الترتيب": { f: "sort_no" }
      }
    },

    /* ═══ op.5.1.2.8 — مجموعات المخازن · WAREHOUSE_GROUP [مساعدة: INVI004] ═══ */
    "op.5.1.2.8": {
      entity: "warehouse_group",
      key: "code",
      keyLabel: "رقم المجموعة",
      autoKey: true,
      title: "مجموعات المخازن",
      cols: [
        { c: "code", t: "الرقم" },
        { c: "name_ar", t: "الاسم" },
        { c: "name_en", t: "الاسم الأجنبي" }
      ],
      fields: {
        "رقم المجموعة": { f: "code" },
        "اسم المجموعة": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" }
      }
    },

    /* ═══ op.1.2.11 — ربط الحسابات المدينة والدائنة الأخرى · GLS_AC_CODE_DTL_GRPS [مساعدة: GENI025] ═══ */
    "op.1.2.11": {
      entity: "account_detail_link",
      key: "code",
      keyLabel: "الرقم",
      autoKey: true,
      title: "الروابط",
      cols: [
        { c: "code", t: "الرقم" },
        { c: "name_ar", t: "الاسم" },
        { c: "account_code", t: "رقم الحساب" },
        { c: "analytic_type", t: "نوع الحساب", map: { "5": "مدينة أخرى", "6": "دائنة أخرى" } }
      ],
      fields: {
        "الرقم": { f: "code" },
        "الاسم": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "رقم الحساب": { f: "account_code" },
        "نوع الحساب": { f: "analytic_type", ro: true, map: { "": "", "مدينة أخرى": "5", "دائنة أخرى": "6" } },
        "النوع التفصيلي": { f: "conn_code", map: { "مدينة ودائنة أخرى": "1" } }
      }
    },

    /* ═══ op.1.2.4 — ربط الحسابات بالحسابات العامة والتدفقات النقدية [مساعدة: GENI006] ═══ */
    "op.1.2.4": { sets: [
      {
        entity: "general_flow", panel: "الحساب العام ← نوع التدفق", title: "الحسابات العامة",
        key: "no", keyLabel: "رقم الحساب العام",
        noAdd: "الحسابات العامة تُضاف من «الدليل المحاسبي العام للوحدات» (op.1.2.1) — هنا الربط فقط",
        noDelete: "هذه الشاشة للربط فقط — لا حذف",
        cols: [
          { c: "no", t: "الرقم", n: true },
          { c: "name_ar", t: "الاسم" },
          { c: "level", t: "المستوى", n: true },
          { c: "flow_type", t: "نوع التدفق", map: { "1": "تشغيلي", "2": "استثماري", "3": "تمويلي" } }
        ],
        fields: {
          "رقم الحساب العام": { f: "no", ro: true },
          "نوع التدفق": { f: "flow_type", map: { "—": "", "تشغيلي": "1", "استثماري": "2", "تمويلي": "3" } },
          "تحديث دليل الحسابات": { f: "update_accounts", bool: true }
        }
      },
      {
        entity: "account_flow", panel: "حساب الدليل ← الحساب العام", title: "حسابات الحركة",
        key: "code", keyLabel: "رقم الحساب",
        noAdd: "الحسابات تُضاف من «الدليل المحاسبي» (op.1.2.3) — هنا الربط فقط",
        noDelete: "هذه الشاشة للربط فقط — لا حذف",
        cols: [
          { c: "code", t: "رقم الحساب" },
          { c: "name_ar", t: "الاسم" },
          { c: "analysis_no", t: "الحساب العام", n: true },
          { c: "flow_type", t: "نوع التدفق", map: { "1": "تشغيلي", "2": "استثماري", "3": "تمويلي" } }
        ],
        fields: {
          "رقم الحساب": { f: "code", ro: true },
          "الحساب العام": { f: "analysis_no" },
          "نوع التدفق": { f: "flow_type", ro: true, map: { "": "", "تشغيلي": "1", "استثماري": "2", "تمويلي": "3" } }
        }
      }
    ]},

    /* ═══ op.3.4 — ربط الحسابات بالأنواع الضريبية · GLS_TAX_ACC [GO/03-tax.md] ═══ */
    "op.3.4": {
      entity: "account_tax",
      key: "account_code",
      keyLabel: "الحساب",
      title: "الحسابات المربوطة",
      cols: [
        { c: "account_code", t: "الحساب" },
        { c: "tax_no", t: "نوع الضريبة", n: true },
        { c: "agency_no", t: "الجهة", n: true },
        { c: "pct", t: "النسبة", n: true }
      ],
      fields: {
        "الحساب": { f: "account_code" },
        "نوع الضريبة": { f: "tax_no" },
        "الجهة": { f: "agency_no" },
        "النسبة": { f: "pct" }
      }
    },

    /* ═══ op.3.5 — ربط الأصناف بالأنواع الضريبية · GNR_TAX_ITM [GO/03-tax.md] ═══ */
    "op.3.5": {
      entity: "item_tax",
      key: "item_code",
      keyLabel: "الصنف",
      title: "الأصناف المربوطة",
      cols: [
        { c: "item_code", t: "الصنف" },
        { c: "tax_no", t: "النوع", n: true },
        { c: "tax_code", t: "الرمز" },
        { c: "agency_no", t: "الجهة", n: true },
        { c: "pct", t: "النسبة", n: true },
        { c: "vat_category", t: "فئة الضريبة" }
      ],
      fields: {
        "الصنف": { f: "item_code" },
        "نوع الضريبة": { f: "tax_no" },
        "رمز النوع": { f: "tax_code", ro: true },
        "الجهة": { f: "agency_no" },
        "النسبة": { f: "pct" },
        "فئة الضريبة (الهيئة)": { f: "vat_category", map: { "S": "S", "Z": "Z", "E": "E", "O": "O" } },
        "رمز سبب الإعفاء": { f: "exempt_reason_code" },
        "نص سبب الإعفاء": { f: "exempt_reason_text" },
        "حد أدنى": { f: "min_amount" },
        "إعفاء مبلغ الحمولة حسب الجنسية": { f: "exempt_load_by_nationality", bool: true }
      }
    },

    /* ═══ op.5.1.2.16 — ربط حسابات المخزون بالأستاذ العام · IAS_CONN_ACC_INV_BY_GL [GO/05-warehouse.md] ═══ */
    "op.5.1.2.16": {
      entity: "inventory_gl_link",
      key: "group_code",
      keyCols: ["link_type", "group_code"],
      keyLabel: "المجموعة",
      title: "الروابط",
      cols: [
        { c: "link_type", t: "حسب", map: { "1": "مجموعات الأصناف", "2": "مجموعات المخازن" } },
        { c: "group_code", t: "المجموعة" },
        { c: "inventory_acc", t: "المخزون" },
        { c: "sales_acc", t: "المبيعات" },
        { c: "cogs_acc", t: "تكلفة المبيعات" }
      ],
      fields: {
        "حسب": { f: "link_type", map: { "مجموعات الأصناف": "1", "مجموعات المخازن": "2" } },
        "المجموعة": { f: "group_code" },
        "حساب المخزون": { f: "inventory_acc" },
        "المبيعات": { f: "sales_acc" },
        "مردود المبيعات": { f: "sales_return_acc" },
        "خصم مسموح به": { f: "discount_allowed_acc" },
        "خصم مكتسب": { f: "discount_earned_acc" },
        "تكلفة المبيعات": { f: "cogs_acc" },
        "تكلفة المردود": { f: "cogs_return_acc" },
        "مردود مبيعات سنوات سابقة": { f: "py_sales_return_acc" },
        "تكلفة مردود سنوات سابقة": { f: "py_cogs_return_acc" },
        "تكلفة المجاني": { f: "free_cogs_acc" },
        "تكلفة المجاني — مشتريات": { f: "free_purchase_cost_acc" },
        "تكلفة مردود المجاني": { f: "free_return_cogs_acc" },
        "المشتريات": { f: "purchase_acc" },
        "إيرادات مقدمة": { f: "prepaid_revenue_acc" },
        "مشتريات الخدمات": { f: "service_purchase_acc" },
        "مبيعات مؤجلة": { f: "deferred_sales_acc" },
        "تكلفة مبيعات مؤجلة": { f: "deferred_cogs_acc" },
        "مبيعات دفعة مقدمة": { f: "advance_sales_acc" },
        "مردود دفعة مقدمة": { f: "advance_return_acc" },
        "تكلفة التعويض": { f: "compensation_cogs_acc" },
        "فروق الأسعار": { f: "price_diff_acc" }
      }
    },

    /* ═══ op.7.1.2.2 — مجموعة العملاء · CUSTOMER_GROUP / IAS_CST_GRP_LMT [GO/07-customers-sales.md] ═══ */
    "op.7.1.2.2": { sets: [
      {
        entity: "customer_group", panel: "المجموعة", title: "المجموعات",
        key: "no", keyLabel: "رقم المجموعة", autoKey: true,
        cols: [
          { c: "no", t: "الرقم", n: true },
          { c: "name_ar", t: "الاسم" },
          { c: "account_code", t: "رقم الحساب" }
        ],
        fields: {
          "رقم المجموعة": { f: "no" },
          "اسم المجموعة": { f: "name_ar" },
          "الاسم الأجنبي": { f: "name_en" },
          "رقم حساب المجموعة": { f: "account_code" },
          "حساب إضافي": { f: "extra_account" }
        }
      },
      {
        entity: "customer_group_limit", panel: "حد الدين", title: "حدود الدين",
        key: "group_no", keyCols: ["group_no", "currency", "side"], keyLabel: "رقم المجموعة",
        cols: [
          { c: "group_no", t: "المجموعة", n: true },
          { c: "currency", t: "العملة" },
          { c: "balance_min", t: "الحد الأدنى", n: true },
          { c: "balance_max", t: "الحد الأعلى", n: true },
          { c: "overrun_policy", t: "التجاوز", map: { "1": "لا يسمح", "2": "يسمح", "3": "يسمح مع التنبيه" } },
          { c: "overrun_possible", t: "اعلى حد متاح", n: true },
          { c: "branch_no", t: "الفرع", n: true }
        ],
        fields: {
          "رقم المجموعة": { f: "group_no" },
          "العملة": { f: "currency" },
          "النوع": { f: "side", map: { "مدين": "1", "دائن": "2", "كلاهما": "3" } },
          "الحد الأدنى": { f: "balance_min" },
          "الحد الأعلى": { f: "balance_max" },
          "أدنى حد للعملية": { f: "txn_min" },
          "أعلى حد للعملية": { f: "txn_max" },
          "تجاوز حدود الحسابات": { f: "overrun_policy", map: { "لا يسمح": "1", "يسمح": "2", "يسمح مع التنبيه": "3" } },
          "نسبة التجاوز": { f: "overrun_pct" },
          "اعلى حد متاح": { f: "overrun_possible", ro: true },
          "الفرع": { f: "branch_no" },
          "موقوف": { f: "inactive", bool: true }
        }
      }
    ]},

    /* ═══ op.6.1.2.1 — مجموعة الموردين · VENDOR_GROUP [GO/06-suppliers-purchasing.md] ═══ */
    "op.6.1.2.1": {
      entity: "supplier_group",
      key: "no",
      keyLabel: "رقم المجموعة",
      autoKey: true,
      title: "المجموعات",
      cols: [
        { c: "no", t: "الرقم", n: true },
        { c: "name_ar", t: "الاسم" },
        { c: "account_code", t: "الحساب" }
      ],
      fields: {
        "رقم المجموعة": { f: "no" },
        "اسم المجموعة": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "حساب المجموعة": { f: "account_code" }
      }
    },

    /* ═══ op.1.1.13 — تهيئة الدليل المحاسبي · 4 جداول [مساعدة: GENS021] ═══ */
    "op.1.1.13": { sets: [
      {
        entity: "account_type", panel: "أنواع الحسابات", title: "أنواع الحسابات",
        key: "no", keyLabel: "الرقم", autoKey: true,
        cols: [
          { c: "no", t: "الرقم", n: true },
          { c: "name_ar", t: "الاسم" },
          { c: "affected_by_trans", t: "يتأثر بالحركة", bool: true }
        ],
        fields: {
          "الرقم": { f: "no" },
          "الاسم": { f: "name_ar" },
          "الاسم الأجنبي": { f: "name_en" },
          "يتأثر بالحركة": { f: "affected_by_trans", bool: true }
        }
      },
      {
        entity: "account_report_type", panel: "أنواع التقارير الختامية", title: "أنواع التقارير",
        key: "no", keyLabel: "الرقم", autoKey: true,
        cols: [
          { c: "no", t: "الرقم", n: true },
          { c: "name_ar", t: "الاسم" },
          { c: "is_balance_sheet", t: "ميزانية", bool: true }
        ],
        fields: {
          "الرقم": { f: "no" },
          "الاسم": { f: "name_ar" },
          "الاسم الأجنبي": { f: "name_en" },
          "ميزانية": { f: "is_balance_sheet", bool: true }
        }
      },
      {
        entity: "account_group", panel: "مجموعات الحسابات", title: "المجموعات",
        key: "no", keyLabel: "الرقم", autoKey: true,
        cols: [
          { c: "no", t: "الرقم", n: true },
          { c: "name_ar", t: "الاسم" }
        ],
        fields: {
          "الرقم": { f: "no" },
          "الاسم": { f: "name_ar" },
          "الاسم الأجنبي": { f: "name_en" }
        }
      },
      {
        entity: "account_class", panel: "تصنيفات الحسابات", title: "التصنيفات",
        key: "no", keyLabel: "الرقم", autoKey: true,
        cols: [
          { c: "no", t: "الرقم", n: true },
          { c: "name_ar", t: "الاسم" }
        ],
        fields: {
          "الرقم": { f: "no" },
          "الاسم": { f: "name_ar" },
          "الاسم الأجنبي": { f: "name_en" }
        }
      }
    ]},

    /* ═══ op.1.2.1 — الدليل المحاسبي العام للوحدات · IAS_ACCOUNT_ANLSYS [نموذج: GENI008] ═══ */
    "op.1.2.1": {
      entity: "general_account",
      key: "no",
      keyLabel: "رقم الحساب",
      title: "الحسابات العامة",
      parent: { label: "الحساب الأعلى", codeField: "no", levelLabel: "المستوى" },
      cols: [
        { c: "no", t: "الرقم", n: true },
        { c: "name_ar", t: "الاسم" },
        { c: "parent_no", t: "الأعلى", n: true },
        { c: "level", t: "المستوى", n: true },
        { c: "report_type", t: "التقرير", map: { "1": "ميزانية", "2": "أرباح وخسائر" } },
        { c: "is_debit", t: "مدين", bool: true }
      ],
      fields: {
        "الحساب الأعلى": { f: "parent_no" },
        "رقم الحساب": { f: "no" },
        "الاسم": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "المستوى": { f: "level", ro: true },
        "رئيسي": { f: "is_main", bool: true },
        "التقرير": { f: "report_type", map: { "ميزانية": "1", "أرباح وخسائر": "2" } },
        "الطبيعة مدين": { f: "is_debit", bool: true },
        "نوع التدفق": { f: "flow_type", map: { "—": "", "تشغيلي": "1", "استثماري": "2", "تمويلي": "3" } },
        "نوع التحليلي": { f: "analytic_type" },
        "الترتيب": { f: "order_no" },
        "رمز الترتيب": { f: "order_code" },
        "ملاحظات": { f: "notes" }
      }
    },

    /* ═══ op.1.2.9 — الحسابات الوسيطة · INTERFACE_ACC [GO/01-system-setup.md] ═══ */
    "op.1.2.9": {
      entity: "branch_posting_accounts",
      key: "branch_no",
      keyLabel: "الفرع",
      title: "الفروع",
      cols: [
        { c: "branch_no", t: "الفرع", n: true },
        { c: "vat_output", t: "VAT مخرجات" },
        { c: "vat_input", t: "VAT مدخلات" },
        { c: "rounding_diff", t: "فروق الكسور" },
        { c: "fx_diff", t: "فروق العملة" }
      ],
      fields: {
        "الفرع": { f: "branch_no" },
        "VAT مخرجات": { f: "vat_output" },
        "VAT مدخلات": { f: "vat_input" },
        "فروق العملة": { f: "fx_diff" },
        "فروق الكسور": { f: "rounding_diff" },
        "فروق الكسور بعد الضريبة": { f: "rounding_after_vat" },
        "فروق التحويل المخزني": { f: "wh_transfer_diff" },
        "فروق تكلفة مردود المشتريات": { f: "cost_diff_purchase_return" },
        "فروق الصرف المخزني": { f: "issue_diff" }
      }
    },

    /* ═══ op.4.1.2.8 — ربط الحسابات بالمشاريع · IAS_ACCOUNT_PJ [مساعدة: GLSI009] ═══ */
    "op.4.1.2.8": {
      entity: "account_project",
      key: "account_code",
      keyCols: ["account_code", "project_no"],
      keyLabel: "رقم الحساب",
      title: "الروابط",
      emptyNote: "لا ربط في أونيكس (0 صف) — F6 لإضافة ربط",
      cols: [
        { c: "account_code", t: "رقم الحساب" },
        { c: "project_no", t: "رقم المشروع", n: true }
      ],
      fields: {
        "رقم الحساب": { f: "account_code" },
        "رقم المشروع": { f: "project_no" }
      }
    }
  };

  var st = { ref: null, cfg: null, set: 0, rows: [], idx: -1, h: null, q: "" };

  /* إعداد الجدول النشط: الشاشة نفسها أو المجموعة المختارة من sets */
  function entry(ref) {
    var e = MAP[ref];
    return e && e.sets ? e.sets[st.set] || e.sets[0] : e;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function host() { return st.h && st.h.st && st.h.st.host; }
  function api() { return root.StartyxApi; }
  function cur() { return st.idx >= 0 ? st.rows[st.idx] : null; }

  /* مفتاح السجل كما يفهمه الخادم — مركّب يُرسل «جزء|جزء» */
  function rowKey(row) {
    if (!row) return "";
    var cfg = st.cfg;
    if (cfg.keyCols) return cfg.keyCols.map(function (c) { return row[c] == null ? "" : String(row[c]); }).join("|");
    return row[cfg.key] == null ? "" : String(row[cfg.key]);
  }
  function valuesKey(values) {
    var cfg = st.cfg;
    if (cfg.keyCols) return cfg.keyCols.map(function (c) { return values[c] == null ? "" : String(values[c]); }).join("|");
    return values[cfg.key] == null ? "" : String(values[cfg.key]);
  }

  function fmtDateTime(v) {
    if (!v) return "—";
    var d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    function p(x) { return ("0" + x).slice(-2); }
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* قيمة العمود كما تُعرض */
  function show(col, row) {
    var v = row[col.c];
    if (col.bool) return v ? "☑" : "☐";
    if (col.map) return col.map[String(v)] || (v == null ? "" : String(v));
    if (v == null) return "—";
    return String(v);
  }

  /* قيمة الحقل في اللوحة */
  function fieldShow(fc, row) {
    var v = row ? row[fc.f] : "";
    if (fc.bool) return v ? "نعم" : "لا";
    if (fc.map) {
      for (var lbl in fc.map) if (String(fc.map[lbl]) === String(v == null ? "" : v)) return lbl;
      return "";
    }
    if (v == null) return "";
    if (fc.f === "rate" || fc.f === "rate_min" || fc.f === "rate_max") return String(Number(v));
    return String(v);
  }

  /* لوحة الجدول النشط (عند sets) — وإلا الشاشة كلها */
  function panelEl() {
    var h = host();
    if (!h || !st.cfg || !st.cfg.panel) return h;
    var found = null;
    Array.prototype.forEach.call(h.querySelectorAll(".scr__col .pnl"), function (p) {
      var t = p.querySelector("header h2");
      if (!found && t && t.textContent === st.cfg.panel) found = p;
    });
    return found || h;
  }

  function fieldBox(label) {
    var h = panelEl();
    return h ? h.querySelector('.fld[data-k="' + label + '"]') : null;
  }

  /* شريط التبويب للجداول المتعددة + إظهار لوحة الجدول النشط وحدها */
  function renderSets() {
    var e = MAP[st.ref], h = host();
    if (!e || !e.sets || !h) return;
    var col = h.querySelector(".scr__col");
    if (!col) return;
    var bar = col.querySelector(".msets");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "msets";
      bar.setAttribute("role", "tablist");
      col.insertBefore(bar, col.firstChild);
    }
    bar.innerHTML = e.sets.map(function (s, i) {
      return '<button type="button" role="tab" data-set="' + i + '" aria-selected="' + (i === st.set) + '">' + esc(s.title) + "</button>";
    }).join("");
    Array.prototype.forEach.call(bar.querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () {
        if (st.h.st.mode !== "view") { st.h.note("احفظ أو تراجع أولاً"); return; }
        switchSet(Number(b.getAttribute("data-set")));
      });
    });
    var titles = e.sets.map(function (s) { return s.panel; });
    Array.prototype.forEach.call(col.querySelectorAll(".pnl"), function (p) {
      var t = p.querySelector("header h2");
      var name = t ? t.textContent : "";
      if (titles.indexOf(name) >= 0) p.style.display = name === st.cfg.panel ? "" : "none";
    });
  }

  function switchSet(i) {
    st.set = i;
    st.cfg = entry(st.ref);
    st.q = "";
    var qi = host() && host().querySelector(".scr__quick input");
    if (qi) { qi.value = ""; qi.placeholder = "بحث في " + st.cfg.title + "…"; }
    renderSets();
    renderTable();
    wireParent();
    return load();
  }

  function bind(row) {
    var cfg = st.cfg;
    Object.keys(cfg.fields).forEach(function (label) {
      var box = fieldBox(label);
      if (!box) return;
      var fc = cfg.fields[label];
      var sel = box.querySelector("select");
      var inp = box.querySelector("input");
      var val = fieldShow(fc, row);
      if (sel) {
        var found = false;
        Array.prototype.forEach.call(sel.options, function (o) { if (o.value === val || o.text === val) found = true; });
        sel.value = found ? val : (sel.options[0] ? sel.options[0].value : "");
      } else if (inp) {
        inp.value = val;
      }
    });
    if (cfg.summary) {
      var sums = cfg.summary(st.rows);
      Object.keys(sums).forEach(function (label) {
        var box = fieldBox(label);
        var inp = box && box.querySelector("input");
        if (inp) inp.value = sums[label];
      });
    }
    paintAudit(row);
    paintState(row);
    st.h.applyMode();
  }

  function paintAudit(row) {
    var ver = (st.h.st.def.audit && st.h.st.def.audit.ver) || "V8.1.14";
    st.h.audit(row ? {
      by: row.created_by || "—",
      at: fmtDateTime(row.created_at),
      dev: "—",
      upd: row.updated_by || "—",
      updc: row.update_count == null ? 0 : row.update_count,
      prints: "—",
      ver: ver
    } : { by: "—", at: "—", dev: "—", upd: "—", updc: 0, prints: "—", ver: ver });
  }

  function paintState(row) {
    var d = st.h.st.def;
    if (!row) d.state = { label: "لا سجل معروض", cls: "s-pending" };
    else if (row.inactive) d.state = { label: "موقوف", cls: "s-pending" };
    else if (row.status === "closed") d.state = { label: "مقفلة", cls: "s-pending" };
    else d.state = { label: "نشط", cls: "s-posted" };
    st.h.state();
  }

  function renderTable() {
    var h = host();
    if (!h) return;
    var wrap = h.querySelector(".scr__col .tblwrap");
    if (!wrap) return;
    var cfg = st.cfg;
    var html = "<thead><tr>" + cfg.cols.map(function (c) {
      return '<th class="' + (c.n ? "n" : "") + '">' + esc(c.t) + "</th>";
    }).join("") + "</tr></thead><tbody>" +
      (st.rows.length
        ? st.rows.map(function (r, i) {
            return '<tr data-i="' + i + '"' + (i === st.idx ? ' aria-selected="true"' : "") + ">" +
              cfg.cols.map(function (c) {
                return '<td class="' + (c.n ? "n" : "") + '">' + esc(show(c, r)) + "</td>";
              }).join("") + "</tr>";
          }).join("")
        : '<tr><td colspan="' + cfg.cols.length + '">' + esc(cfg.emptyNote || "لا سجلات — F6 للإضافة") + "</td></tr>") +
      "</tbody>";
    var tbl = wrap.querySelector("table");
    if (!tbl) {
      tbl = document.createElement("table");
      wrap.appendChild(tbl);
    }
    tbl.innerHTML = html;
    var head = wrap.parentNode && wrap.parentNode.querySelector("header h2");
    if (head && MAP[st.ref] && MAP[st.ref].sets) head.textContent = cfg.title;
    Array.prototype.forEach.call(tbl.querySelectorAll("tbody tr[data-i]"), function (tr) {
      tr.addEventListener("click", function () {
        if (st.h.st.mode !== "view") { st.h.note("احفظ أو تراجع أولاً"); return; }
        select(Number(tr.getAttribute("data-i")));
      });
    });
  }

  function select(i) {
    st.idx = st.rows.length ? Math.min(st.rows.length - 1, Math.max(0, i)) : -1;
    st.h.rec(st.idx + 1, st.rows.length);
    renderTable();
    bind(cur());
  }

  function load(selectKey) {
    var q = st.q ? "?q=" + encodeURIComponent(st.q) : "";
    return api().masters(st.cfg.entity, q).then(function (j) {
      st.rows = j.rows || [];
      var i = 0;
      if (selectKey != null) {
        st.rows.forEach(function (r, k) { if (rowKey(r) === String(selectKey)) i = k; });
      }
      select(st.rows.length ? i : -1);
      return j;
    }).catch(function () {
      st.rows = [];
      select(-1);
      st.h.note("تعذّر الوصول للخادم — الشاشة فاضية حتى يعمل");
    });
  }

  function collect() {
    var cfg = st.cfg, out = {};
    Object.keys(cfg.fields).forEach(function (label) {
      var fc = cfg.fields[label];
      if (fc.ro) return;
      var box = fieldBox(label);
      if (!box) return;
      var sel = box.querySelector("select");
      var inp = box.querySelector("input");
      var raw = sel ? sel.value : inp ? inp.value.trim() : "";
      if (fc.bool) out[fc.f] = raw === "نعم" || raw === "true" || raw === "1";
      else if (fc.map) out[fc.f] = fc.map[raw] == null ? "" : fc.map[raw];
      else out[fc.f] = raw;
    });
    return out;
  }

  function blank() {
    var cfg = st.cfg;
    Object.keys(cfg.fields).forEach(function (label) {
      var box = fieldBox(label);
      if (!box) return;
      var sel = box.querySelector("select");
      var inp = box.querySelector("input");
      if (sel) sel.selectedIndex = 0;
      else if (inp) inp.value = "";
    });
    if (cfg.autoKey) {
      var max = 0;
      st.rows.forEach(function (r) { max = Math.max(max, Number(r[cfg.key]) || 0); });
      var box = fieldBox(cfg.keyLabel);
      var inp = box && box.querySelector("input");
      if (inp) inp.value = String(max + 1);
    }
    paintAudit(null);
    paintState(null);
    st.h.rec(0, st.rows.length);
  }

  /* SY-R25 — رقم الحساب آلي: رقم الأب + تسلسل بطول المستوى */
  function nextChildCode(parent) {
    var levels = st.cfg.parent && st.cfg.parent.levels;
    if (!levels) return "";
    var pLen = parent.length;
    var i = levels.indexOf(pLen);
    if (i < 0 || i + 1 >= levels.length) return "";
    var childLen = levels[i + 1];
    var max = 0;
    st.rows.forEach(function (r) {
      var c = String(r.code || "");
      if (c.length === childLen && c.indexOf(parent) === 0) max = Math.max(max, Number(c.slice(pLen)) || 0);
    });
    var seq = String(max + 1);
    while (seq.length < childLen - pLen) seq = "0" + seq;
    return parent + seq;
  }

  /* اختيار الأب يملأ ما يُشتق منه: الرقم (إن كان آلياً) · المستوى · الخصائص الموروثة */
  function wireParent() {
    var pc = st.cfg.parent;
    if (!pc) return;
    var box = fieldBox(pc.label);
    var inp = box && box.querySelector("input");
    if (!inp || inp.getAttribute("data-auto") === "1") return;
    inp.setAttribute("data-auto", "1");
    inp.addEventListener("change", function () {
      if (st.h.st.mode !== "add") return;
      var parent = inp.value.trim();
      var field = pc.codeField || "code";
      var parentRow = null;
      st.rows.forEach(function (r) { if (String(r[field]) === parent) parentRow = r; });
      var lvlInp = pc.levelLabel && fieldBox(pc.levelLabel) && fieldBox(pc.levelLabel).querySelector("input");
      if (pc.levels && pc.codeLabel) {
        var codeInp = fieldBox(pc.codeLabel) && fieldBox(pc.codeLabel).querySelector("input");
        if (codeInp && parent) codeInp.value = nextChildCode(parent);
        if (lvlInp && codeInp) lvlInp.value = codeInp.value ? String(pc.levels.indexOf(codeInp.value.length) + 1) : "";
      } else if (lvlInp) {
        lvlInp.value = parentRow ? String((Number(parentRow.level) || 1) + 1) : "";
      }
      if (parentRow && pc.inherit) {
        /* SY-R26 — الطبيعة ونوع التقرير يورَّثان من الأب */
        var nat = fieldBox("الطبيعة"), rep = fieldBox("التقرير");
        var natSel = nat && nat.querySelector("select"), repSel = rep && rep.querySelector("select");
        if (natSel) natSel.value = parentRow.nature === "credit" ? "دائن" : "مدين";
        if (repSel) repSel.value = parentRow.report_type === "pnl" ? "أرباح وخسائر" : "ميزانية";
      }
    });
  }

  function wireQuick() {
    var h = host();
    var inp = h && h.querySelector(".scr__quick input");
    if (!inp || inp.getAttribute("data-masters") === "1") return;
    inp.setAttribute("data-masters", "1");
    inp.placeholder = "بحث في " + st.cfg.title + "…";
    inp.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      st.q = inp.value.trim();
      load().then(function () {
        st.h.note(st.q ? ("نتائج البحث: " + st.rows.length) : ("كل السجلات: " + st.rows.length));
      });
    }, true);
  }

  function errText(e) {
    if (!e) return "تعذّر الحفظ";
    if (e.message) return e.message;
    if (e.error) return e.error;
    return "تعذّر الحفظ";
  }

  function save() {
    var mode = st.h.st.mode === "add" ? "add" : "edit";
    var values = collect();
    var key = valuesKey(values);
    return api().saveMaster(st.cfg.entity, mode, values).then(function (j) {
      st.h.setMode("view");
      return load(j.saved ? rowKey(j.saved) : key).then(function () {
        st.h.note("حُفظ — " + st.cfg.keyLabel + " " + (j.saved ? j.saved[st.cfg.key] : key));
      });
    }).catch(function (e) {
      st.h.note(errText(e));
    });
  }

  function del() {
    if (st.cfg.noDelete) { st.h.note(st.cfg.noDelete); return; }
    var row = cur();
    if (!row) { st.h.note("لا سجل معروض"); return; }
    if (!window.confirm("هل تريد حذف السجل ?")) return;
    api().deleteMaster(st.cfg.entity, rowKey(row)).then(function () {
      st.h.note("حُذف السجل " + row[st.cfg.key]);
      load();
    }).catch(function (e) {
      st.h.note(errText(e));
    });
  }

  function command(id, h) {
    st.h = h;
    switch (id) {
      case "add":
        if (st.cfg.noAdd) { h.note(st.cfg.noAdd); return true; }
        h.setMode("add");
        blank();
        h.note("سجل جديد — الحقول فاضية");
        return true;
      case "edit":
        if (!cur()) { h.note("لا سجل معروض للتعديل"); return true; }
        h.setMode("edit");
        h.note("تعديل السجل " + cur()[st.cfg.key]);
        return true;
      case "save":
        save();
        return true;
      case "cancelEntry":
        h.setMode("view");
        bind(cur());
        h.note("تم التراجع");
        return true;
      case "delete":
        del();
        return true;
      case "search": {
        var inp = host() && host().querySelector(".scr__quick input");
        if (inp) { inp.focus(); h.note("اكتب ثم Enter للبحث في الخادم"); }
        return true;
      }
      case "navFirst": select(0); return true;
      case "navPrev": select(st.idx - 1); return true;
      case "navNext": select(st.idx + 1); return true;
      case "navLast": select(st.rows.length - 1); return true;
      /* لا وصف لسلوك غير مبني: الطباعة والتقارير لم تُنفَّذ بعد لشاشات جدول الرموز */
      case "print":
      case "openReport":
        h.note("الطباعة لهذه الشاشة غير مبنيّة بعد — لا عدّاد طباعة ولا قالب");
        return true;
      case "addFrom":
        h.note("«إضافة من» لا تنطبق على جدول رموز — استخدم «إضافة»");
        return true;
      default:
        return false;
    }
  }

  function mount(h) {
    st.h = h;
    st.ref = h.st.ref;
    st.set = 0;
    st.cfg = entry(st.ref);
    st.rows = [];
    st.idx = -1;
    st.q = "";
    if (!api() || !api().masters) return;
    renderSets();
    renderTable();
    wireQuick();
    wireParent();
    load();
  }

  root.StartyxMasters = {
    MAP: MAP,
    handles: function (ref) { return !!MAP[ref]; },
    mount: mount,
    command: command
  };
})(window);
