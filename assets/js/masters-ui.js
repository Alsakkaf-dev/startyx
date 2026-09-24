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
        "رقم المدينة": { f: "city_no" },
        "الرقم الاضافي": { f: "additional_no" },
        "العنوان المختصر": { f: "short_address" },
        "نوع المعرف": { f: "id_scheme" },
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

  /* ═══════════ الطبقة ٢ — البيانات الأساسية (بنود 28–36) ═══════════ */

  /* ═══ op.5.1.2.10 — بيانات الأصناف · IAS_ITM_MST + تفاصيله [GO/05-warehouse.md] ═══
     تبويب «الصنف» رأس، والبقية تفاصيل الصنف المعروض (detailOf: تُقرأ بـ eq.<عمود> = رقمه) */
  MAP["op.5.1.2.10"] = { sets: [
    {
      entity: "item", panel: "الصنف", title: "الأصناف",
      key: "code", keyLabel: "رقم الصنف",
      /* IV-R75 · IV-R95 — المجموعة ذات البادئة تُنزّل الرقم التالي، والبقية يُكتب الرقم يدوياً */
      autoCode: { groupLabel: "المجموعة", codeLabel: "رقم الصنف" },
      addFrom: true,
      cols: [
        { c: "code", t: "الرقم" },
        { c: "name_ar", t: "الاسم" },
        { c: "group_code", t: "المجموعة" },
        { c: "units", t: "الوحدات" },
        { c: "available_qty", t: "المتوفر", n: true },
        { c: "avg_cost", t: "المتوسط", n: true },
        { c: "last_receipt_date", t: "آخر وارد" },
        { c: "is_kit", t: "مركب", bool: true },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "رقم الصنف": { f: "code" },
        "اسم الصنف": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "المجموعة": { f: "group_code" },
        "الوحدة الرئيسية": { f: "main_unit", addOnly: true },
        "الوحدات": { f: "units", ro: true },
        "الاسم المختصر": { f: "short_name_ar" },
        "الاسم المختصر الأجنبي": { f: "short_name_en" },
        "المواصفات": { f: "description_ar" },
        "المواصفات بالأجنبي": { f: "description_en" },
        "صورة الصنف": { f: "image_ref" },
        "تكلفة بداية التعامل": { f: "initial_cost" },
        "التكلفة الأولية": { f: "primary_cost" },
        "متوسط التكلفة": { f: "avg_cost", ro: true },
        "الكمية المتوفرة": { f: "available_qty", ro: true },
        "تاريخ آخر وارد": { f: "last_receipt_date", ro: true },
        "خدمي": { f: "is_service", bool: true },
        "مركب": { f: "is_kit", bool: true },
        "يستخدم في تكوين المركب": { f: "used_in_kit", bool: true },
        "محجوز": { f: "is_blocked", bool: true },
        "غير قابل للبيع": { f: "no_sale", bool: true },
        "يباع نقداً": { f: "cash_sale_only", bool: true },
        "غير قابل للإرتجاع": { f: "no_return", bool: true },
        "فترة الإرتجاع": { f: "return_period_days" },
        "إستخدام الكسور": { f: "allow_fraction", bool: true },
        "الأرقام العشرية": { f: "qty_decimals" },
        "التصنيف الضريبي": { f: "tax_classification" },
        "رقم الصنف العالمي GTIN": { f: "gtin" },
        "مستخدم في طلبات الموظفين": { f: "used_in_emp_requests", bool: true },
        "مستورد من إكسل": { f: "imported_from_excel", bool: true, ro: true },
        "تحتاج مراجعة": { f: "needs_review", bool: true, ro: true },
        "موقوف": { f: "inactive", bool: true },
        "سبب التوقيف": { f: "inactive_reason" },
        "تاريخ التوقيف": { f: "inactive_date", ro: true },
        "الموقِف": { f: "inactive_by", ro: true }
      }
    },
    {
      entity: "item_unit", panel: "وحدة الصنف", title: "الوحدات",
      key: "unit_code", keyCols: ["item_code", "unit_code"], keyLabel: "الوحدة",
      detailOf: { col: "item_code", from: "code", label: "رقم الصنف" },
      cols: [
        { c: "level_no", t: "الترتيب", n: true },
        { c: "unit_code", t: "الوحدة" },
        { c: "pack_size", t: "العبوة", n: true },
        { c: "is_main", t: "رئيسية", bool: true },
        { c: "is_sale", t: "بيع", bool: true },
        { c: "is_purchase", t: "شراء", bool: true },
        { c: "is_stock", t: "جرد", bool: true },
        { c: "is_transfer", t: "تحويل", bool: true },
        { c: "barcode", t: "الباركود" },
        { c: "inactive", t: "موقوفة", bool: true }
      ],
      fields: {
        "رقم الصنف": { f: "item_code" },
        "الوحدة": { f: "unit_code" },
        "العبوة": { f: "pack_size" },
        "الترتيب": { f: "level_no", ro: true },
        "رئيسية": { f: "is_main", bool: true },
        "وحدة بيع": { f: "is_sale", bool: true },
        "وحدة شراء": { f: "is_purchase", bool: true },
        "وحدة جرد": { f: "is_stock", bool: true },
        "وحدة تحويل": { f: "is_transfer", bool: true },
        "غير قابلة للبيع": { f: "no_sale", bool: true },
        "الباركود": { f: "barcode" },
        "الوصف": { f: "desc_ar" },
        "الوصف الأجنبي": { f: "desc_en" },
        "موقوفة": { f: "inactive", bool: true },
        "سبب التوقيف": { f: "inactive_reason" }
      }
    },
    {
      entity: "item_vendor", panel: "مورد الصنف", title: "الموردون",
      key: "vendor_code", keyCols: ["item_code", "vendor_code", "unit_code", "pack_size"], keyLabel: "المورد",
      detailOf: { col: "item_code", from: "code", label: "رقم الصنف" },
      cols: [
        { c: "vendor_code", t: "المورد" },
        { c: "vendor_name", t: "الاسم" },
        { c: "unit_code", t: "الوحدة" },
        { c: "pack_size", t: "العبوة", n: true },
        { c: "price", t: "السعر", n: true },
        { c: "currency", t: "العملة" },
        { c: "vendor_item_code", t: "رقمه عند المورد" },
        { c: "is_main", t: "رئيسي", bool: true }
      ],
      fields: {
        "رقم الصنف": { f: "item_code" },
        "المورد": { f: "vendor_code" },
        "الوحدة": { f: "unit_code" },
        "العبوة": { f: "pack_size" },
        "السعر": { f: "price" },
        "العملة": { f: "currency" },
        "رقم الصنف عند المورد": { f: "vendor_item_code" },
        "مورد رئيسي": { f: "is_main", bool: true }
      }
    },
    {
      entity: "kit_component", panel: "مكوّن المركب", title: "المكونات",
      key: "component_code", keyCols: ["kit_item_code", "component_code", "unit_code"], keyLabel: "المكوّن",
      detailOf: { col: "kit_item_code", from: "code", label: "الصنف المركب" },
      emptyNote: "لا مكونات — الصنف ليس مركباً أو مركب بلا مكونات (IV-Q15)",
      cols: [
        { c: "component_code", t: "المكوّن" },
        { c: "component_name", t: "الاسم" },
        { c: "unit_code", t: "الوحدة" },
        { c: "qty", t: "الكمية", n: true },
        { c: "cost_pct", t: "نسبة التكلفة", n: true },
        { c: "default_warehouse", t: "المخزن الافتراضي" }
      ],
      fields: {
        "الصنف المركب": { f: "kit_item_code" },
        "المكوّن": { f: "component_code" },
        "الوحدة": { f: "unit_code" },
        "الكمية": { f: "qty" },
        "نسبة التكلفة": { f: "cost_pct" },
        "أدنى كمية": { f: "min_qty" },
        "أقصى كمية": { f: "max_qty" },
        "المخزن الافتراضي": { f: "default_warehouse" },
        "ملاحظة": { f: "note" }
      }
    },
    {
      entity: "item_ref_code", panel: "الرقم المرجعي", title: "الأرقام المرجعية",
      key: "ref_code", keyLabel: "الرقم المرجعي",
      detailOf: { col: "item_code", from: "code", label: "رقم الصنف" },
      cols: [
        { c: "ref_code", t: "الرقم المرجعي" },
        { c: "item_code", t: "الصنف" }
      ],
      fields: {
        "رقم الصنف": { f: "item_code" },
        "الرقم المرجعي": { f: "ref_code" }
      }
    },
    {
      entity: "item_warehouse", panel: "رصيد المخزن", title: "المخازن",
      key: "warehouse_code", keyCols: ["item_code", "warehouse_code", "unit_code"], keyLabel: "المخزن",
      detailOf: { col: "item_code", from: "code", label: "رقم الصنف" },
      noAdd: "الأرصدة تُحسب من الحركة (IV-R105) — لا إضافة يدوية",
      noDelete: "الأرصدة تُحسب من الحركة (IV-R105) — لا حذف",
      cols: [
        { c: "warehouse_code", t: "المخزن" },
        { c: "warehouse_name", t: "الاسم" },
        { c: "unit_code", t: "الوحدة" },
        { c: "available_qty", t: "المتوفر", n: true },
        { c: "avg_cost", t: "المتوسط", n: true },
        { c: "primary_cost", t: "التكلفة الأولية", n: true },
        { c: "inactive", t: "موقوف أمامه", bool: true }
      ],
      fields: {
        "رقم الصنف": { f: "item_code", ro: true },
        "المخزن": { f: "warehouse_code", ro: true },
        "الوحدة": { f: "unit_code", ro: true },
        "الكمية المتوفرة": { f: "available_qty", ro: true },
        "متوسط التكلفة": { f: "avg_cost", ro: true },
        "موقوف أمام المخزن": { f: "inactive", bool: true }
      }
    }
  ]};

  /* ═══ op.5.1.2.9 — بيانات المخازن · WAREHOUSE_DETAILS [GO/05-warehouse.md] ═══ */
  MAP["op.5.1.2.9"] = {
    entity: "warehouse",
    key: "code",
    keyLabel: "رقم المخزن",
    autoKey: true,
    addFrom: true,
    title: "المخازن",
    cols: [
      { c: "code", t: "الرقم", n: true },
      { c: "name_ar", t: "الاسم" },
      { c: "branch_no", t: "الفرع", n: true },
      { c: "group_code", t: "المجموعة" },
      { c: "transfer_account", t: "وسيط التحويل" },
      { c: "default_price_level", t: "المستوى السعري", n: true },
      { c: "stock_cost_limit", t: "حد التكلفة", n: true },
      { c: "item_count", t: "أصناف", n: true },
      { c: "inactive", t: "موقوف", bool: true }
    ],
    fields: {
      "رقم المخزن": { f: "code" },
      "اسم المخزن": { f: "name_ar" },
      "الاسم الأجنبي": { f: "name_en" },
      "رقم الفرع": { f: "branch_no" },
      "مجموعة المخازن": { f: "group_code" },
      "موقف": { f: "inactive", bool: true },
      "غير قابل للبيع": { f: "no_sale", bool: true },
      "مخزن رئيسي": { f: "is_main", bool: true },
      "مخزن مواد تالفة": { f: "is_damaged_goods", bool: true },
      "مخزن الخدمات الإفتراضي": { f: "is_service_default", bool: true },
      "وسيط التحويلات المخزنية": { f: "transfer_account" },
      "الحساب التحليلي": { f: "transfer_analytic" },
      "المركز الافتراضي": { f: "default_cost_center" },
      "مستوى التسعيرة": { f: "default_price_level" },
      "حد تكلفة المخزن": { f: "stock_cost_limit" },
      "التسلسل": { f: "doc_sequence_key" },
      "أمين المخزن": { f: "keeper_name" },
      "رقم الهاتف": { f: "phone" },
      "الموقع": { f: "location" },
      "الدولة": { f: "country_no" },
      "المحافظة": { f: "province_no" },
      "المدينة": { f: "city_no" },
      "المنطقة": { f: "region_code" },
      "العنوان": { f: "address_ar" },
      "العنوان الأجنبي": { f: "address_en" },
      "رقم الموقع العالمي GLN": { f: "gln" },
      "خط العرض": { f: "latitude" },
      "خط الطول": { f: "longitude" },
      "أصناف مربوطة": { f: "item_count", ro: true },
      "تحتاج مراجعة": { f: "needs_review", bool: true, ro: true }
    }
  };

  /* ═══ op.4.1.2.2 الصناديق · op.4.1.2.3 البنوك [GO/04-general-ledger.md] — رأس + عملاته ═══ */
  var RCPT_SEQ = { "عام": "1", "حسب المحصل": "2", "حسب المندوب": "3" };
  var PASS_LMT = { "—": "", "لا يسمح": "1", "يسمح": "2", "يسمح مع تنبيه": "3" };
  function treasuryCurrencySet(keyCol, panel) {
    var fields = {
      "الرقم": { f: keyCol },
      "العملة": { f: "currency" },
      "الحساب": { f: "account_code", ro: true },
      "افتراضية": { f: "is_default", bool: true },
      "الرصيد الافتتاحي": { f: "opening_local", ro: true },
      "الرصيد الحالي": { f: "current_local", ro: true },
      "أدنى رصيد": { f: "min_balance" },
      "أعلى رصيد": { f: "max_balance" },
      "أدنى مبلغ للعملية": { f: "min_txn" },
      "أعلى مبلغ للعملية": { f: "max_txn" },
      "تجاوز الحد": { f: "pass_limit", map: PASS_LMT },
      "موقوفة": { f: "inactive", bool: true }
    };
    if (keyCol === "bank_no") fields["رقم الحساب في البنك"] = { f: "bank_account_no" };
    return {
      entity: keyCol === "cash_no" ? "cashbox_currency" : "bank_currency", panel: panel, title: "العملات",
      key: "currency", keyCols: [keyCol, "currency"], keyLabel: "العملة",
      detailOf: { col: keyCol, from: "no", label: "الرقم" },
      cols: [
        { c: "currency", t: "العملة" },
        { c: "is_default", t: "افتراضية", bool: true },
        { c: "current_local", t: "الرصيد", n: true },
        { c: "min_balance", t: "أدنى رصيد", n: true },
        { c: "max_balance", t: "أعلى رصيد", n: true },
        { c: "pass_limit", t: "تجاوز الحد", map: { "1": "لا يسمح", "2": "يسمح", "3": "يسمح مع تنبيه" } }
      ],
      fields: fields
    };
  }

  MAP["op.4.1.2.2"] = { sets: [
    {
      entity: "cashbox", panel: "الصندوق", title: "الصناديق",
      key: "no", keyLabel: "رقم الصندوق", autoKey: true, addFrom: true,
      cols: [
        { c: "no", t: "الرقم", n: true },
        { c: "name_ar", t: "الاسم" },
        { c: "account_code", t: "الحساب" },
        { c: "branch_no", t: "الفرع", n: true },
        { c: "cash_type", t: "النوع", map: { "1": "قبض", "2": "صرف", "3": "قبض وصرف", "4": "بيع وشراء" } },
        { c: "sequence_group", t: "التسلسل", n: true },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "رقم الصندوق": { f: "no" },
        "الاسم": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "حساب الصندوق": { f: "account_code" },
        "اسم الحساب": { f: "account_name", ro: true },
        "الفرع": { f: "branch_no" },
        "التسلسل": { f: "sequence_group" },
        "النوع": { f: "cash_type", map: { "قبض وصرف": "3", "قبض": "1", "صرف": "2", "بيع وشراء": "4" } },
        "تسلسل القبض": { f: "receipt_seq_type", map: RCPT_SEQ },
        "نوع القبض الافتراضي": { f: "default_receipt_type" },
        "نوع الصرف الافتراضي": { f: "default_payment_type" },
        "المجموعة": { f: "group_no" },
        "صندوق وسيط": { f: "is_mediator", bool: true },
        "إذن التوريد النقدي": { f: "use_cash_income", bool: true },
        "نقاط البيع": { f: "pos_sys", bool: true },
        "مفضل": { f: "favourite", bool: true },
        "آخر مطابقة": { f: "last_reconciled_at", ro: true },
        "موقوف": { f: "inactive", bool: true },
        "سبب التوقيف": { f: "inactive_reason" },
        "تاريخ التوقيف": { f: "inactive_date", ro: true }
      }
    },
    treasuryCurrencySet("cash_no", "عملة الصندوق")
  ]};

  MAP["op.4.1.2.3"] = { sets: [
    {
      entity: "bank", panel: "البنك", title: "البنوك",
      key: "no", keyLabel: "رقم البنك", autoKey: true, addFrom: true,
      cols: [
        { c: "no", t: "الرقم", n: true },
        { c: "name_ar", t: "الاسم" },
        { c: "account_code", t: "حساب الدليل" },
        { c: "bank_account_no", t: "رقم الحساب في البنك" },
        { c: "branch_no", t: "الفرع", n: true },
        { c: "sequence_group", t: "التسلسل", n: true },
        { c: "is_mediator", t: "وسيط", bool: true },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "رقم البنك": { f: "no" },
        "الاسم": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "حساب البنك في الدليل": { f: "account_code" },
        "اسم الحساب": { f: "account_name", ro: true },
        "رقم الحساب في البنك": { f: "bank_account_no" },
        "صنف البنك": { f: "bank_class", map: { "بنك": "1", "صراف": "2" } },
        "بنك وسيط": { f: "is_mediator", bool: true },
        "الفرع": { f: "branch_no" },
        "التسلسل": { f: "sequence_group" },
        "تسلسل القبض": { f: "receipt_seq_type", map: RCPT_SEQ },
        "نوع القبض الافتراضي": { f: "default_receipt_type" },
        "نوع الصرف الافتراضي": { f: "default_payment_type" },
        "المجموعة": { f: "group_no" },
        "رمز البنك": { f: "bank_code" },
        "الوصف": { f: "description" },
        "الهاتف": { f: "phone" },
        "الفاكس": { f: "fax" },
        "صندوق البريد": { f: "po_box" },
        "العنوان": { f: "address" },
        "البريد الإلكتروني": { f: "email" },
        "الموقع الإلكتروني": { f: "website" },
        "الدولة": { f: "country_no" },
        "المدينة": { f: "city_no" },
        "حساب أوراق القبض": { f: "notes_receivable_account" },
        "حساب أوراق الدفع": { f: "notes_payable_account" },
        "وسيط شيكات الصرف": { f: "cheque_intermediary_account" },
        "رمز الشبكة": { f: "network_code" },
        "ضريبة العمولة": { f: "commission_vat", bool: true },
        "التسلسل الآلي للشيكات": { f: "cheque_auto_seq", bool: true },
        "مفضل": { f: "favourite", bool: true },
        "آخر مطابقة": { f: "last_reconciled_at", ro: true },
        "موقوف": { f: "inactive", bool: true },
        "سبب التوقيف": { f: "inactive_reason" },
        "تاريخ التوقيف": { f: "inactive_date", ro: true },
        "الموقِف": { f: "inactive_by", ro: true }
      }
    },
    treasuryCurrencySet("bank_no", "عملة البنك")
  ]};

  /* ═══ op.5.1.2.14 — تسعيرة الأصناف · IAS_ITEM_PRICE + رقابة الأسعار [GO/05-warehouse.md] ═══ */
  MAP["op.5.1.2.14"] = { sets: [
    {
      entity: "item_price", panel: "السعر", title: "الأسعار",
      key: "item_code", keyCols: ["price_level", "item_code", "unit_code"], keyLabel: "رقم الصنف",
      cols: [
        { c: "price_level", t: "المستوى", n: true },
        { c: "item_code", t: "الصنف" },
        { c: "item_name", t: "الاسم" },
        { c: "unit_code", t: "الوحدة" },
        { c: "pack_size", t: "العبوة", n: true },
        { c: "price", t: "السعر", n: true },
        { c: "min_price", t: "أدنى سعر", n: true },
        { c: "max_price", t: "أعلى سعر", n: true },
        { c: "branch_no", t: "الفرع", n: true }
      ],
      fields: {
        "المستوى": { f: "price_level" },
        "رقم الصنف": { f: "item_code" },
        "اسم الصنف": { f: "item_name", ro: true },
        "الوحدة": { f: "unit_code" },
        "العبوة": { f: "pack_size", ro: true },
        "السعر": { f: "price" },
        "أدنى سعر": { f: "min_price" },
        "أعلى سعر": { f: "max_price" },
        "الفرع": { f: "branch_no" },
        "ملاحظة": { f: "note" },
        "مستورد من إكسل": { f: "imported_from_excel", bool: true, ro: true }
      }
    },
    {
      entity: "item_price_audit", panel: "حركة الرقابة", title: "رقابة الأسعار",
      key: "audit_no", keyLabel: "رقم الحركة",
      noAdd: "رقابة الأسعار تُكتب آلياً مع كل إضافة وتعديل وحذف (IV-R109)",
      noDelete: "سجل الرقابة للإضافة فقط (IV-R109)",
      cols: [
        { c: "audit_no", t: "الحركة", n: true },
        { c: "action", t: "النوع", map: { "1": "إضافة", "2": "تعديل", "3": "حذف" } },
        { c: "audited_at", t: "التاريخ" },
        { c: "audited_by", t: "المستخدم" },
        { c: "price_level", t: "المستوى", n: true },
        { c: "item_code", t: "الصنف" },
        { c: "unit_code", t: "الوحدة" },
        { c: "prev_price", t: "السعر السابق", n: true },
        { c: "price", t: "السعر", n: true }
      ],
      fields: {
        "رقم الحركة": { f: "audit_no", ro: true },
        "النوع": { f: "action", ro: true, map: { "إضافة": "1", "تعديل": "2", "حذف": "3" } },
        "التاريخ": { f: "audited_at", ro: true },
        "المستخدم": { f: "audited_by", ro: true },
        "السعر السابق": { f: "prev_price", ro: true },
        "السعر الجديد": { f: "price", ro: true },
        "الأدنى السابق": { f: "prev_min_price", ro: true },
        "الأدنى": { f: "min_price", ro: true },
        "الأعلى السابق": { f: "prev_max_price", ro: true },
        "الأعلى": { f: "max_price", ro: true }
      }
    }
  ]};

  /* ═══ op.7.1.2.4 — بيانات مندوبي المبيعات · SALES_MAN + IAS_CST_SMAN · IAS_PRIV_SMAN · ARS_LOCTN_GEO_SMAN
     [GO/07-customers-sales.md] — تبويبات أونيكس السبعة؛ الضمانات ونظام التوزيع أعمدة في سجل المندوب نفسه
     (تعديل جزئي بنفس الرقم)، والباقي تفاصيل تُقرأ برقم المندوب. القوائم من S_FLAGS. ═══ */
  var REP_OF = { col: "code", from: "code", label: "رقم المندوب" };
  var REP_DTL = { col: "rep_code", from: "code", label: "رقم المندوب" };
  var SMAN_SP_TYP = { "مندوب مبيعات": "0", "مندوب علمي": "1", "مندوب مبيعات وعلمي": "2", "مندوب ترويج": "3" };
  var G_STATUS = { "—": "", "فعال": "1", "غير فعال": "0" };
  var G_TYPE = { "—": "", "إعتبارية": "1", "تجارية": "2", "بنكية": "3", "عقارية": "4", "لايوجد": "5",
    "سند لأمر": "6", "ملف من كفيل": "7", "إيصال أمانة": "8", "شيك": "9" };
  var CHEQ_TYPE_REC = { "تاريخ المستند": "0", "تاريخ الإستحقاق": "1", "توسيط أوراق القبض - ترحيل آلي": "2",
    "إدخال الإستحقاق يدوياً": "3" };
  var VST_OPN_TYP = { "يدويا": "1", "باركود العميل": "2", "بواسطة الخريطة لنطاق المنطقة": "3",
    "بواسطة موقع العميل جي بي اس": "4", "الموقع جي بي اس او الباركود او يدويا": "5" };
  var LOC_TYP = { "دولة": "1", "محافظة": "2", "مدينة": "3", "منطقة": "4", "خط سير": "5" };
  var REP_SAME_ROW = "بيانات هذا التبويب جزء من سجل المندوب — أضف المندوب من «البيانات الرئيسية» ثم «تعديل» هنا";

  MAP["op.7.1.2.4"] = { sets: [
    {
      entity: "salesman", panel: "المندوب", title: "البيانات الرئيسية",
      key: "code", keyLabel: "رقم مندوب المبيعات", autoKey: true, addFrom: true,
      cols: [
        { c: "code", t: "الرقم", n: true },
        { c: "name_ar", t: "المندوب" },
        { c: "parent_code", t: "الرئيسي" },
        { c: "warehouse_code", t: "المخزن" },
        { c: "cash_no", t: "الصندوق", n: true },
        { c: "bank_no", t: "البنك الوسيط", n: true },
        { c: "last_sale_date", t: "آخر بيع" },
        { c: "customer_count", t: "عملاء", n: true },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "رقم مندوب المبيعات": { f: "code" },
        "اسم المندوب": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "رقم المندوب الرئيسي": { f: "parent_code" },
        "اسم المندوب الرئيسي": { f: "parent_name", ro: true },
        "نوع المندوب": { f: "rep_type" },
        "التصنيف": { f: "classification", map: SMAN_SP_TYP },
        "رقم الحساب": { f: "account_code" },
        "اسم الحساب": { f: "account_name", ro: true },
        "الحساب التحليلي": { f: "account_analytic" },
        "عنوانه": { f: "address" },
        "رقم التلفون": { f: "phone" },
        "رقم صندوق البريد": { f: "po_box" },
        "رقم الفاكس": { f: "fax" },
        "رقم الجوال": { f: "mobile" },
        "الدولة": { f: "country_no" },
        "المدينه": { f: "city_no" },
        "رقم الحي": { f: "region_no" },
        "نسبة العمولة": { f: "commission_pct" },
        "خط السير": { f: "route_no" },
        "ترتيب خط السير": { f: "route_order" },
        "اخر تاريخ بيع": { f: "last_sale_date", ro: true },
        "ملاحظات": { f: "notes" },
        "رقم المخزن": { f: "warehouse_code" },
        "اسم المخزن": { f: "warehouse_name", ro: true },
        "رقم الصندوق": { f: "cash_no" },
        "اسم الصندوق": { f: "cash_name", ro: true },
        "رقم مركز التكلفه": { f: "cost_center" },
        "رقم المشروع": { f: "project_no" },
        "حد الدين بالعملة المحلية": { f: "credit_limit" },
        "البنك الوسيط": { f: "bank_no" },
        "اسم البنك": { f: "bank_name", ro: true },
        "رقم مخطط المبيعات مبالغ": { f: "sales_plan_amount_no" },
        "رقم الموظف": { f: "employee_no" },
        "رقم مخطط المبيعات كميات": { f: "sales_plan_qty_no" },
        "رقم مخطط التحصيل": { f: "collection_plan_no" },
        "الفريق (مندوبون تابعون)": { f: "team_count", ro: true },
        "العملاء المربوطون": { f: "customer_count", ro: true },
        "توقيف": { f: "inactive", bool: true },
        "المستخدم الموقف": { f: "inactive_by", ro: true },
        "تاريخ التوقيف": { f: "inactive_date", ro: true },
        "سبب التوقيف": { f: "inactive_reason" }
      }
    },
    {
      entity: "salesman", panel: "الضمانة", title: "بيانات الضمانات",
      key: "code", keyLabel: "رقم المندوب", detailOf: REP_OF,
      noAdd: REP_SAME_ROW, noDelete: "الضمانة تُفرَّغ بالتعديل — حذف المندوب من «البيانات الرئيسية»",
      cols: [
        { c: "code", t: "المندوب", n: true },
        { c: "g_status", t: "الحالة", map: { "1": "فعال", "0": "غير فعال" } },
        { c: "g_type", t: "النوع", n: true },
        { c: "g_expire_date", t: "الانتهاء" },
        { c: "g_amount", t: "القيمة", n: true }
      ],
      fields: {
        "رقم المندوب": { f: "code" },
        "حالة الضمانة": { f: "g_status", map: G_STATUS },
        "نوع الضمانة": { f: "g_type", map: G_TYPE },
        "تاريخ بدء الضمانة": { f: "g_start_date" },
        "تاريخ إنتهاء الضمانة": { f: "g_expire_date" },
        "اسم الضامن": { f: "g_name" },
        "عنوان الضامن": { f: "g_address" },
        "طبيعة نشاط الضامن": { f: "g_work" },
        "المركز المالي": { f: "g_fin_center" },
        "قيمة الضمانة": { f: "g_amount" },
        "تاريخ توثيق الضمان": { f: "g_doc_date" },
        "رقم التسجيل فى المحكمة": { f: "g_court_reg" },
        "رقم التسجيل بالغرفة التجارية": { f: "g_chamber_reg" },
        "رقم السجل التجاري للضامن": { f: "g_cr_no" },
        "رقم تلفون الضامن": { f: "g_phone" },
        "رقم فاكس الضامن": { f: "g_fax" }
      }
    },
    {
      entity: "salesman", panel: "نظام التوزيع", title: "نظام التوزيع",
      key: "code", keyLabel: "رقم المندوب", detailOf: REP_OF,
      noAdd: REP_SAME_ROW, noDelete: "حذف المندوب من «البيانات الرئيسية»",
      cols: [
        { c: "code", t: "المندوب", n: true },
        { c: "tax_calc_method", t: "الضريبة", n: true },
        { c: "distribution_group", t: "مجموعة التوزيع" },
        { c: "app_last_update_at", t: "آخر تحديث للتطبيق" },
        { c: "app_last_post_at", t: "آخر ترحيل منه" }
      ],
      fields: {
        "رقم المندوب": { f: "code" },
        "طريقة إحتساب الضريبة": { f: "tax_calc_method" },
        "مجموعة التوزيع": { f: "distribution_group" },
        "طريقة ترحيل الشيكات": { f: "cheque_post_type", map: CHEQ_TYPE_REC },
        "مسافة فتح الزيارة لموقع العميل بالمتر": { f: "visit_open_distance" },
        "نطاق الحي بالمتر": { f: "district_radius" },
        "الحد الاعلى للتجاوز فى خط السير": { f: "route_deviation_max" },
        "الحد الاعلى لادراج عميل فى الخطة": { f: "plan_customer_max" },
        "حد الصندوق التراكمي بالعملة المحلية": { f: "cash_cumulative_limit" },
        "حد الصندوق اليومي بالعملة المحلية": { f: "cash_daily_limit" },
        "طريقة فتح الزيارة": { f: "visit_open_type", map: VST_OPN_TYP },
        "تاريخ أخر تحديث للتطبيق": { f: "app_last_update_at", ro: true },
        "تاريخ أخر ترحيل من التطبيق": { f: "app_last_post_at", ro: true },
        "السماح بتعديل موقع العميل": { f: "allow_edit_customer_location", bool: true },
        "السماح بالتعامل مع كل الاصناف في المردود": { f: "allow_return_all_items", bool: true },
        "العمل خارج الخطة": { f: "work_without_plan", bool: true },
        "السماح بإلغاء الوثائق": { f: "allow_cancel_docs", bool: true },
        "عدم إمكانية البيع": { f: "no_sale", bool: true },
        "عدم إمكانية التحصيل": { f: "no_collect", bool: true },
        "السماح بمشاركة الملفات في التطبيق": { f: "allow_file_share", bool: true },
        "عدم السماح بالتعامل مع مردود المبيعات": { f: "no_sales_return", bool: true },
        "إستخدام طلب مردود مبيعات إجباري": { f: "return_request_required", bool: true },
        "استخدام الإقفال اليومي لحركة المندوب وتحديث البيانات": { f: "daily_close", bool: true },
        "الطباعة باستخدام تطبيق التميت": { f: "print_by_ultimate_app", bool: true },
        "السماح بادخال طلبات الصرف والتحويل": { f: "allow_issue_transfer_requests", bool: true },
        "السماح بإرجاع فواتير مندوب اخر حسب الصلاحيات": { f: "allow_return_other_rep", bool: true },
        "عدم السماح بالتحديث الجزئي للبيانات في التطبيق": { f: "no_partial_update", bool: true },
        "توقيف المندوب في حالة عدم الإلتزام بالخطة": { f: "stop_if_plan_missed", bool: true },
        "السماح بعمل تحويل مخزني مباشر الى اي مخزن اخر": { f: "allow_direct_transfer", bool: true },
        "استخدام الحجز الالي لطلبات العملاء في التطبيق": { f: "auto_reserve_orders", bool: true },
        "إغلاق الزيارة بواسطة الجي بي اس": { f: "close_visit_by_gps", bool: true },
        "السماح باعتماد عميل مستهدف": { f: "allow_approve_target_customer", bool: true },
        "عدم السماح بالبيع للعملاء خارج المواقع الجغرافية للمندوب": { f: "no_sale_outside_locations", bool: true },
        "استخدام طلب سند قبض في التطبيق": { f: "receipt_request_in_app", bool: true }
      }
    },
    {
      entity: "salesman_customer", panel: "ربط العملاء", title: "ربط العملاء بالمندوبين",
      key: "customer_code", keyCols: ["rep_code", "customer_code"], keyLabel: "رقم العميل", detailOf: REP_DTL,
      cols: [
        { c: "customer_code", t: "رقم العميل" },
        { c: "customer_name", t: "اسم العميل" },
        { c: "visit_day1", t: "السبت", bool: true },
        { c: "visit_day2", t: "الأحد", bool: true },
        { c: "visit_day3", t: "الإثنين", bool: true },
        { c: "visit_day4", t: "الثلاثاء", bool: true },
        { c: "visit_day5", t: "الأربعاء", bool: true },
        { c: "visit_day6", t: "الخميس", bool: true },
        { c: "visit_day7", t: "الجمعة", bool: true },
        { c: "other_reps", t: "مندوبون آخرون" },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "رقم المندوب": { f: "rep_code" },
        "رقم العميل": { f: "customer_code" },
        "اسم العميل": { f: "customer_name", ro: true },
        "السبت": { f: "visit_day1", bool: true },
        "الأحد": { f: "visit_day2", bool: true },
        "الإثنين": { f: "visit_day3", bool: true },
        "الثلاثاء": { f: "visit_day4", bool: true },
        "الأربعاء": { f: "visit_day5", bool: true },
        "الخميس": { f: "visit_day6", bool: true },
        "الجمعة": { f: "visit_day7", bool: true },
        "افتراضي": { f: "is_default", bool: true },
        "مربوط بمندوبين آخرين": { f: "other_reps", ro: true },
        "موقوف": { f: "inactive", bool: true },
        "سبب التوقيف": { f: "inactive_reason" },
        "تاريخ التوقيف": { f: "inactive_date", ro: true }
      }
    },
    {
      entity: "salesman_location", panel: "المواقع الجغرافية", title: "المواقع الجغرافية",
      key: "code_no", keyCols: ["rep_code", "loc_type", "code_no"], keyLabel: "رقم الموقع", detailOf: REP_DTL,
      cols: [
        { c: "loc_type", t: "نوع الموقع", map: { "1": "دولة", "2": "محافظة", "3": "مدينة", "4": "منطقة", "5": "خط سير" } },
        { c: "code_no", t: "رقم الموقع", n: true }
      ],
      fields: {
        "رقم المندوب": { f: "rep_code" },
        "نوع الموقع": { f: "loc_type", map: LOC_TYP },
        "رقم الموقع": { f: "code_no" }
      }
    },
    {
      entity: "salesman_user", panel: "الصلاحيات", title: "الصلاحيات",
      key: "user_id", keyCols: ["rep_code", "user_id"], keyLabel: "رقم المستخدم", detailOf: REP_DTL,
      cols: [
        { c: "user_id", t: "رقم المستخدم", n: true },
        { c: "can_add", t: "إضافه", bool: true },
        { c: "can_view", t: "عرض", bool: true }
      ],
      fields: {
        "رقم المندوب": { f: "rep_code" },
        "رقم المستخدم": { f: "user_id" },
        "إضافه": { f: "can_add", bool: true },
        "عرض": { f: "can_view", bool: true }
      }
    },
    {
      entity: "salesman_operation", panel: "العمليات", title: "العمليات",
      key: "doc_no", keyCols: ["rep_code", "op_kind", "doc_no"], keyLabel: "رقم الفاتورة", detailOf: REP_DTL,
      noAdd: "العمليات استعلام من فواتير المندوب ومردوداتها (IAS_V_SM_MOVE) — لا إضافة",
      noDelete: "العمليات استعلام — لا حذف",
      cols: [
        { c: "op_kind_name", t: "النوع" },
        { c: "doc_no", t: "رقم الفاتورة" },
        { c: "doc_type_name", t: "نوع الفاتورة" },
        { c: "doc_date", t: "التاريخ" },
        { c: "customer_name", t: "اسم العميل" },
        { c: "amount", t: "مبلغ الفاتورة", n: true },
        { c: "commission", t: "مبلغ العمولة", n: true },
        { c: "currency", t: "العملة" }
      ],
      fields: {
        "رقم المندوب": { f: "rep_code", ro: true },
        "النوع": { f: "op_kind_name", ro: true },
        "رقم الفاتورة": { f: "doc_no", ro: true },
        "نوع الفاتورة": { f: "doc_type_name", ro: true },
        "التاريخ": { f: "doc_date", ro: true },
        "رقم العميل": { f: "customer_code", ro: true },
        "اسم العميل": { f: "customer_name", ro: true },
        "العملة": { f: "currency", ro: true },
        "مبلغ الفاتورة": { f: "amount", ro: true },
        "مبلغ العمولة": { f: "commission", ro: true }
      }
    }
  ]};

  /* ═══ op.7.1.2.8 — بيانات العملاء · CUSTOMER + CUSTOMER_CURR · IAS_AC_CC_LMT · IAS_CST_ACCNT · IAS_PRIV_CUSTOMER ·
     IAS_CST_LMT_SAL · IAS_CST_SMAN · IAS_CST_DRVR [GO/07-customers-sales.md] — تبويبات أونيكس؛ «بيانات أخرى»
     والعنوان الوطني والشخصية والإضافية والضمانات ومكان التسليم أعمدة في سجل العميل نفسه (تعديل جزئي بنفس الرقم)،
     والباقي تفاصيل تُقرأ برقم العميل. القوائم من S_FLAGS. ═══ */
  var CST_OF = { col: "code", from: "code", label: "رقم العميل" };
  var CST_DTL = { col: "customer_code", from: "code", label: "رقم العميل" };
  var C_CLASS_VAT = { "شخصي": "1", "أعمال": "2", "شركات أجنبية": "3", "ضريبة مؤجلة الإستحقاق": "4", "جهة حكومية": "5" };
  var PRIV_LEVEL = { "لا يسمح": "0", "يسمح": "1", "يسمح مع التنبيه": "2" };
  var AUTO_SEND = { "عدم ارسال": "0", "ارسال تلقائي": "1", "ارسال اختياري": "3" };
  var CST_RGSTR_TYP = { "—": "", "منتظم": "1", "مستهلك": "2", "غير مسجل": "3", "غير معروف": "4" };
  var CST_SCTR_TYP = { "—": "", "حكومي": "1", "خاص": "2" };
  var CUST_GNDR = { "—": "", "ذكر": "1", "أنثى": "2" };
  var VST_OPN_TYP_CST = { "—": "", "يدوي": "1", "باركود العميل": "2", "باركود ويدوي": "3", "باركود مع التحقق من الجي بي اس": "4" };
  var LMT_ITM_QTY = { "غير مستخدم": "0", "على مستوى العميل": "1", "على مستوى الأصناف": "2" };
  var LOW_PRICE = { "لا يسمح": "1", "يسمح": "2", "يسمح مع التنبيه": "3" };
  var DR_CR = { "مدين": "1", "دائن": "2", "مدين ودائن": "3" };
  var CST_ACCNT_TYP = { "عام": "1", "وسيط استلام المبيعات": "2", "دفعة مقدمة": "3", "تأمين عقار": "4",
    "وديعة صيانة بيع العقار": "5", "نقدية معلقة": "6", "إيراد مؤجل الدفع": "7", "عمولات مستحقة": "8" };
  var USAGE = { "عادي": "regular", "مبيعات نقدية": "cash_sales", "كميات مجانية": "free_qty", "مبالغ غير معروفة": "unallocated",
    "تحصيل متعثر": "doubtful", "عميل عام": "general" };
  var CST_SAME_ROW = "بيانات هذا التبويب جزء من سجل العميل — أضف العميل من «البيانات الرئيسية» ثم «تعديل» هنا";
  var CST_Q = "استعلام من القيود والمستندات — لا إضافة ولا حذف";
  function cstRow(panel, fields, cols) {
    return {
      entity: "customer", panel: panel, title: panel, key: "code", keyLabel: "رقم العميل", detailOf: CST_OF,
      noAdd: CST_SAME_ROW, noDelete: "حذف العميل من «البيانات الرئيسية»",
      cols: [{ c: "code", t: "رقم العميل" }, { c: "name_ar", t: "اسم العميل" }].concat(cols),
      fields: Object.assign({ "رقم العميل": { f: "code" } }, fields)
    };
  }
  var CST_EXTRA = {};
  for (var fx = 1; fx <= 20; fx++) CST_EXTRA["حقل إضافي" + fx] = { f: "field" + fx };

  /* ═══ op.6.1.2.2 — بيانات الموردين · V_DETAILS + IAS_VENDOR_BANK · IAS_VNDR_ACCNT · IAS_PRIV_VENDOR [GO/06]
     تبويبات أونيكس (APSI002): الأساسية · الرئيسية · بيانات أخرى · بيانات إضافية؛ «حقول إضافية» 1–10 خلف مركز الميزات (GO §٣).
     «الرصيد والحركات» قراءة (GO §٦). الحساب من المجموعة دائماً (AP_AC_LINK_TYPE = 2). ═══ */
  var VND_OF = { col: "code", from: "code", label: "رقم المورد" };
  var VND_DTL = { col: "vendor_code", from: "code", label: "رقم المورد" };
  var VAT_PRICE = { "السعر بدون ضريبة": "1", "السعر شامل الضريبة": "2" };
  var VAT_BASE = { "—": "", "السعر": "1", "السعر - الخصم": "2", "السعر + الضريبة": "3", "السعر - الخصم + الضريبة": "4" };
  var VND_SAME_ROW = "بيانات هذا التبويب جزء من سجل المورد — أضف المورد من «البيانات الرئيسية» ثم «تعديل» هنا";
  var VND_Q = "استعلام من القيود — لا إضافة ولا حذف";
  function vndRow(panel, fields, cols) {
    return {
      entity: "vendor", panel: panel, title: panel, key: "code", keyLabel: "رقم المورد", detailOf: VND_OF,
      noAdd: VND_SAME_ROW, noDelete: "حذف المورد من «البيانات الرئيسية»",
      cols: [{ c: "code", t: "رقم المورد" }, { c: "name_ar", t: "اسم المورد" }].concat(cols),
      fields: Object.assign({ "رقم المورد": { f: "code" } }, fields)
    };
  }

  MAP["op.6.1.2.2"] = { sets: [
    {
      entity: "vendor", panel: "المورد", title: "البيانات الرئيسية",
      key: "code", keyLabel: "رقم المورد", addFrom: true,
      autoCode: { groupLabel: "المجموعة", codeLabel: "رقم المورد", server: "vendor" },
      cols: [
        { c: "code", t: "رقم المورد" },
        { c: "name_ar", t: "اسم المورد" },
        { c: "group_no", t: "المجموعة", n: true },
        { c: "branch_no", t: "الفرع", n: true },
        { c: "vat_no", t: "الرقم الضريبي" },
        { c: "item_count", t: "أصناف", n: true },
        { c: "purchase_inactive", t: "موقف شراء", bool: true },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "المجموعة": { f: "group_no" },
        "اسم المجموعة": { f: "group_name", ro: true },
        "رقم المورد": { f: "code" },
        "اسم المورد": { f: "name_ar" },
        "الاسم الأجنبي": { f: "name_en" },
        "رقم الحساب": { f: "account_code", ro: true },
        "اسم الحساب": { f: "account_name", ro: true },
        "الدرجة/النوع": { f: "vendor_class" },
        "رقم الدرجة": { f: "degree_no" },
        "مركز التكلفة": { f: "cost_center" },
        "رقم المركز": { f: "cost_center_no", ro: true },
        "الفرع": { f: "branch_no" },
        "اسم الفرع": { f: "branch_name", ro: true },
        "توقيف": { f: "inactive", bool: true },
        "موقف من الشراء": { f: "purchase_inactive", bool: true },
        "ضمن القائمة السوداء": { f: "blacklisted", bool: true },
        "سبب دخول القائمة السوداء": { f: "blacklist_reason" },
        "الرقم الضريبي": { f: "vat_no" },
        "عليه ضريبة": { f: "is_taxpayer", bool: true },
        "طريقة إحتساب الضريبة": { f: "tax_calc_method" },
        "نوع السعر": { f: "price_vat_type", map: VAT_PRICE },
        "طريقة إحتساب ضريبة القيمة المضافة": { f: "vat_base", map: VAT_BASE },
        "رقم السجل التجاري": { f: "cr_no" },
        "النشاط": { f: "activity_name" },
        "فترة الائتمان": { f: "credit_days" },
        "المورد الرئيسي": { f: "parent_code" },
        "اسم المورد الرئيسي": { f: "parent_name", ro: true },
        "رقم المندوب": { f: "purchaser_code" },
        "اسم المندوب": { f: "purchaser_name", ro: true },
        "الحسابات المفضلة": { f: "is_favorite", bool: true },
        "الأصناف المربوطة": { f: "item_count", ro: true },
        "التسلسل": { f: "seq_no", ro: true }
      }
    },
    vndRow("بيانات أخرى", {
      "العنوان": { f: "address" },
      "الدولة": { f: "country_no" },
      "رقم المحافظة": { f: "province_no" },
      "المدينه": { f: "city_no" },
      "رقم المنطقه": { f: "region_no" },
      "صندوق البريد": { f: "po_box" },
      "الهاتف": { f: "phone" },
      "الفاكس": { f: "fax" },
      "الجوال": { f: "mobile" },
      "البريد الإلكتروني": { f: "email" },
      "الموقع الإلكتروني": { f: "website" },
      "عن طريق": { f: "referred_by" },
      "تاريخ التعامل": { f: "since" },
      "ملاحظات": { f: "notes" },
      "تاريخ آخر مطابقة": { f: "last_reconciled_on" }
    }, [{ c: "phone", t: "الهاتف" }, { c: "mobile", t: "الجوال" }]),
    vndRow("بيانات إضافية", {
      "الرقم الأحصائي": { f: "statistical_no" },
      "المادة الضريبية": { f: "tax_article" },
      "رأس المال": { f: "capital" }
    }, [{ c: "statistical_no", t: "الرقم الأحصائي" }]),
    {
      entity: "vendor_bank", panel: "الحسابات البنكية", title: "الحسابات البنكية",
      key: "line_no", keyLabel: "رقم السطر", serverKey: true, detailOf: VND_DTL,
      cols: [
        { c: "bank_name", t: "اسم البنك" },
        { c: "iban", t: "الآيبان" },
        { c: "bank_account", t: "رقم الحساب" },
        { c: "swift_code", t: "رمز البنك" },
        { c: "currency", t: "العملة" }
      ],
      fields: {
        "رقم المورد": { f: "vendor_code" },
        "رقم السطر": { f: "line_no" },
        "رقم البنك": { f: "bank_no" },
        "اسم البنك": { f: "bank_name" },
        "رقم الحساب في البنك": { f: "bank_account" },
        "الآيبان": { f: "iban" },
        "رمز البنك": { f: "swift_code" },
        "اسم المستفيد": { f: "beneficiary_name" },
        "مفتاح البنك": { f: "bank_key" },
        "الدولة": { f: "country_no" },
        "المدينه": { f: "city_no" },
        "العملة": { f: "currency" }
      }
    },
    {
      entity: "vendor_account", panel: "الحسابات", title: "الحسابات",
      key: "rcrd_no", keyLabel: "م", serverKey: true, detailOf: VND_DTL,
      cols: [
        { c: "rcrd_no", t: "م", n: true },
        { c: "account_code", t: "رقم الحساب" },
        { c: "account_name", t: "اسم الحساب" },
        { c: "account_type", t: "نوع الحساب", n: true },
        { c: "inactive", t: "موقف", bool: true }
      ],
      fields: {
        "رقم المورد": { f: "vendor_code" },
        "م": { f: "rcrd_no" },
        "رقم الحساب": { f: "account_code" },
        "اسم الحساب": { f: "account_name", ro: true },
        "نوع الحساب": { f: "account_type" },
        "موقف": { f: "inactive", bool: true },
        "المستخدم الموقف": { f: "inactive_by", ro: true },
        "تاريخ التوقيف": { f: "inactive_date", ro: true },
        "سبب التوقيف": { f: "inactive_reason" }
      }
    },
    {
      entity: "vendor_user", panel: "الصلاحيات", title: "الصلاحيات",
      key: "user_id", keyCols: ["vendor_code", "user_id", "currency"], keyLabel: "رقم المستخدم", detailOf: VND_DTL,
      cols: [
        { c: "user_id", t: "رقم المستخدم", n: true },
        { c: "currency", t: "رمز العملة" },
        { c: "can_add", t: "إضافه", bool: true },
        { c: "can_view", t: "تقرير", bool: true }
      ],
      fields: {
        "رقم المورد": { f: "vendor_code" },
        "رقم المستخدم": { f: "user_id" },
        "رمز العملة": { f: "currency" },
        "إضافه": { f: "can_add", bool: true },
        "تقرير": { f: "can_view", bool: true }
      }
    },
    {
      entity: "vendor_ledger", panel: "الرصيد والحركات", title: "الرصيد والحركات",
      key: "doc_no", keyCols: ["vendor_code", "doc_type", "doc_no"], keyLabel: "رقم المستند", detailOf: VND_DTL,
      noAdd: VND_Q, noDelete: VND_Q,
      cols: [
        { c: "doc_no", t: "رقم المستند" },
        { c: "doc_date", t: "التاريخ" },
        { c: "doc_type_name", t: "نوع المستند" },
        { c: "description", t: "البيان" },
        { c: "debit", t: "مدين", n: true },
        { c: "credit", t: "دائن", n: true },
        { c: "balance", t: "الرصيد", n: true }
      ],
      fields: {
        "رقم المورد": { f: "vendor_code", ro: true },
        "رقم المستند": { f: "doc_no", ro: true },
        "التاريخ": { f: "doc_date", ro: true },
        "نوع المستند": { f: "doc_type_name", ro: true },
        "البيان": { f: "description", ro: true },
        "مدين": { f: "debit", ro: true },
        "دائن": { f: "credit", ro: true },
        "الرصيد": { f: "balance", ro: true }
      }
    },
    {
      entity: "vendor_stats", panel: "إحصائيات", title: "إحصائيات",
      key: "vendor_code", keyLabel: "رقم المورد", detailOf: VND_DTL,
      noAdd: VND_Q, noDelete: VND_Q,
      cols: [
        { c: "opening_balance", t: "الرصيد الإفتتاحي", n: true },
        { c: "current_balance", t: "الرصيد الحالي", n: true },
        { c: "purchases", t: "المشتريات", n: true },
        { c: "payments", t: "سندات الصرف", n: true }
      ],
      fields: {
        "رقم المورد": { f: "vendor_code", ro: true },
        "الرصيد الإفتتاحي": { f: "opening_balance", ro: true },
        "الرصيد الحالي": { f: "current_balance", ro: true },
        "فواتير المشتريات": { f: "purchases", ro: true },
        "مردود المشتريات": { f: "purchase_returns", ro: true },
        "سندات الصرف": { f: "payments", ro: true },
        "آخر تاريخ شراء": { f: "last_purchase_date", ro: true },
        "آخر تاريخ سداد": { f: "last_payment_date", ro: true }
      }
    }
  ]};

  /* ═══ op.1.2.8 — بيانات الموظفين · S_EMP [GO/01 §op.1.2.8 · GENS012]
     تبويبات أونيكس المستخدمة: الرئيسية · التعيين · الشخصية · الاتصال · المالية. الرواتب والحضور والتأمين والتذاكر (148 عموداً)
     محفوظة خلف مركز الميزات (SY-R54) وتبويبات التفاصيل فارغة في أونيكس. «حركة الموظف» قراءة من سطور التحليلي 7. ═══ */
  var EMP_OF = { col: "code", from: "code", label: "رقم الموظف" };
  var EMP_DTL = { col: "employee_code", from: "code", label: "رقم الموظف" };
  var EMP_SAME_ROW = "بيانات هذا التبويب جزء من سجل الموظف — أضف الموظف من «البيانات الرئيسية» ثم «تعديل» هنا";
  var EMP_Q = "استعلام من القيود — لا إضافة ولا حذف";
  /* قوائم الترميزات العامة المعبّأة (S_EMP_CODE_DTL · GENS017) */
  var EMP_GENDER = { "—": "", "ذكر": "1", "أنثى": "2" };
  var EMP_JOB_ST = { "—": "", "مواصل": "1", "ترك الخدمة": "2", "تقاعد": "3" };
  var EMP_CUR_ST = { "—": "", "عادي": "1", "مجاز دراسيا": "2", "منتدب": "3", "معار": "4", "إجازة بدون راتب": "5", "منقطع": "6",
    "فترة تجربه": "7", "غير مستكمل الإجراءات": "8", "إجازة تحتاج لمباشرة": "9", "موفد داخلي": "10", "موفد خارجي": "11" };
  var EMP_SAL_ST = { "—": "", "جاري": "1", "موقف": "2" };
  function empRow(panel, fields, cols) {
    return {
      entity: "employee", panel: panel, title: panel, key: "code", keyLabel: "رقم الموظف", detailOf: EMP_OF,
      noAdd: EMP_SAME_ROW, noDelete: "حذف الموظف من «البيانات الرئيسية»",
      cols: [{ c: "code", t: "رقم الموظف" }, { c: "name_ar", t: "اسم الموظف" }].concat(cols),
      fields: Object.assign({ "رقم الموظف": { f: "code" } }, fields)
    };
  }

  MAP["op.1.2.8"] = { sets: [
    {
      entity: "employee", panel: "الموظف", title: "البيانات الرئيسية",
      key: "code", keyLabel: "رقم الموظف", autoKey: true, addFrom: true,
      cols: [
        { c: "code", t: "رقم الموظف" },
        { c: "name_ar", t: "اسم الموظف" },
        { c: "branch_no", t: "الفرع", n: true },
        { c: "hierarchy_name", t: "الهيكل الإداري" },
        { c: "hired_on", t: "تاريخ التعيين" },
        { c: "rep_code", t: "مندوب" },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "رقم الموظف": { f: "code" },
        "الاسم الأول": { f: "first_ar" },
        "الاسم الثاني": { f: "second_ar" },
        "الاسم الثالث": { f: "third_ar" },
        "الاسم الأخير": { f: "last_ar" },
        "الاسم الكامل": { f: "name_ar", ro: true },
        "الاسم الأول (أجنبي)": { f: "first_en" },
        "الاسم الثاني (أجنبي)": { f: "second_en" },
        "الاسم الثالث (أجنبي)": { f: "third_en" },
        "الاسم الأخير (أجنبي)": { f: "last_en" },
        "الاسم الأجنبي": { f: "name_en", ro: true },
        "الفرع": { f: "branch_no" },
        "اسم الفرع": { f: "branch_name", ro: true },
        "الشركة": { f: "company_no", ro: true },
        "العملة": { f: "currency" },
        "الهيكل الإداري": { f: "hierarchy_no" },
        "اسم الهيكل": { f: "hierarchy_name", ro: true },
        "المسئول المباشر": { f: "manager_no" },
        "اسم المسئول": { f: "manager_name", ro: true },
        "المسئول المباشر 2": { f: "manager2_no" },
        "تاريخ التعيين": { f: "hired_on" },
        "تاريخ الوظيفة الحالية": { f: "current_job_on" },
        "تاريخ العودة للخدمة": { f: "reinstated_on" },
        "رقم المندوب المرتبط": { f: "rep_code", ro: true },
        "توقيف": { f: "inactive", bool: true },
        "المستخدم الموقف": { f: "inactive_by", ro: true },
        "تاريخ التوقيف": { f: "inactive_date", ro: true },
        "سبب التوقيف": { f: "inactive_reason" }
      }
    },
    empRow("بيانات التعيين", {
      "المسمى الوظيفي": { f: "job_title_no" },
      "المسمى الإداري": { f: "admin_title_no" },
      "الدرجة": { f: "grade_no" },
      "الفئة": { f: "category_no" },
      "المستوى": { f: "level_no" },
      "التصنيف": { f: "class_no" },
      "المجموعة": { f: "group_no" },
      "نوع الوظيفة": { f: "employment_type" },
      "الموقف الوظيفي": { f: "job_status", map: EMP_JOB_ST },
      "الوضع الحالي للموظف": { f: "current_status", map: EMP_CUR_ST },
      "المؤهل الحالي": { f: "qualification_no" },
      "التخصص": { f: "major_no" },
      "موقع العمل": { f: "work_location_no" },
      "نوع الدوام": { f: "work_period_type" }
    }, [{ c: "job_status", t: "الموقف", n: true }, { c: "current_status", t: "الوضع", n: true }]),
    empRow("البيانات الشخصية", {
      "الجنس": { f: "gender", map: EMP_GENDER },
      "الجنسية": { f: "nationality_no" },
      "المواطنة": { f: "citizenship" },
      "الحالة الإجتماعية": { f: "marital_status" },
      "الديانة": { f: "religion_no" },
      "فصيلة الدم": { f: "blood_type" },
      "اللغة": { f: "language_no" },
      "تاريخ الميلاد": { f: "birth_date" },
      "تاريخ الميلاد هجري": { f: "birth_date_hijri" },
      "مكان الميلاد": { f: "birth_place" },
      "نوع الهوية": { f: "id_type" },
      "رقم الهوية": { f: "id_no" },
      "الرقم الوطني": { f: "national_no" },
      "مكان الإصدار": { f: "id_issue_place" },
      "تاريخ الإصدار": { f: "id_issue_date" },
      "تاريخ الانتهاء": { f: "id_expiry_date" },
      "رقم الحدود": { f: "border_no" },
      "يستخدم الخدمة الذاتية": { f: "self_service", bool: true },
      "ملاحظات": { f: "notes" }
    }, [{ c: "gender", t: "الجنس", n: true }, { c: "id_no", t: "رقم الهوية" }]),
    empRow("بيانات الاتصال", {
      "الجوال": { f: "mobile" },
      "الهاتف": { f: "phone" },
      "الفاكس": { f: "fax" },
      "البريد الإلكتروني": { f: "email" },
      "الموقع الإلكتروني": { f: "website" },
      "صندوق البريد": { f: "po_box" },
      "العنوان": { f: "address" },
      "الدولة": { f: "country_no" },
      "رقم المحافظة": { f: "province_no" },
      "المدينه": { f: "city_no" },
      "رقم المنطقه": { f: "region_no" }
    }, [{ c: "mobile", t: "الجوال" }, { c: "email", t: "البريد" }]),
    empRow("البيانات المالية", {
      "رقم الحساب": { f: "account_code" },
      "اسم الحساب": { f: "account_name", ro: true },
      "حساب البنك": { f: "bank_account_code" },
      "مركز التكلفة": { f: "cost_center" },
      "رقم المشروع": { f: "project_no" },
      "رقم النشاط": { f: "activity_no" },
      "طريقة الدفع": { f: "pay_method" },
      "طريقة صرف الراتب": { f: "salary_pay_way" },
      "حالة الراتب": { f: "salary_status", map: EMP_SAL_ST },
      "خاضع للضريبة": { f: "taxable", bool: true },
      "رقم التأمينات الاجتماعية": { f: "social_insurance_no" },
      "أيام العمل في الشهر": { f: "work_days_month" },
      "ساعات العمل في اليوم": { f: "work_hours_day" },
      "ساعات العمل في الشهر": { f: "work_hours_month" },
      "ساعات العمل في السنة": { f: "work_hours_year" },
      "أيام العمل في السنة": { f: "work_days_year" }
    }, [{ c: "account_code", t: "الحساب" }, { c: "salary_status", t: "حالة الراتب", n: true }]),
    {
      entity: "employee_ledger", panel: "حركة الموظف", title: "حركة الموظف",
      key: "doc_no", keyCols: ["employee_code", "doc_type", "doc_no"], keyLabel: "رقم المستند", detailOf: EMP_DTL,
      noAdd: EMP_Q, noDelete: EMP_Q,
      cols: [
        { c: "doc_no", t: "رقم المستند" },
        { c: "doc_date", t: "التاريخ" },
        { c: "doc_type_name", t: "نوع المستند" },
        { c: "account_code", t: "الحساب" },
        { c: "account_name", t: "اسم الحساب" },
        { c: "description", t: "البيان" },
        { c: "debit", t: "مدين", n: true },
        { c: "credit", t: "دائن", n: true },
        { c: "balance", t: "الرصيد", n: true }
      ],
      fields: {
        "رقم الموظف": { f: "employee_code", ro: true },
        "رقم المستند": { f: "doc_no", ro: true },
        "التاريخ": { f: "doc_date", ro: true },
        "نوع المستند": { f: "doc_type_name", ro: true },
        "الحساب": { f: "account_code", ro: true },
        "اسم الحساب": { f: "account_name", ro: true },
        "البيان": { f: "description", ro: true },
        "مدين": { f: "debit", ro: true },
        "دائن": { f: "credit", ro: true },
        "الرصيد": { f: "balance", ro: true }
      }
    },
    {
      entity: "employee_stats", panel: "إحصائيات", title: "إحصائيات",
      key: "employee_code", keyLabel: "رقم الموظف", detailOf: EMP_DTL,
      noAdd: EMP_Q, noDelete: EMP_Q,
      cols: [
        { c: "opening_balance", t: "الرصيد الإفتتاحي", n: true },
        { c: "total_debit", t: "مدين", n: true },
        { c: "total_credit", t: "دائن", n: true },
        { c: "current_balance", t: "الرصيد الحالي", n: true }
      ],
      fields: {
        "رقم الموظف": { f: "employee_code", ro: true },
        "الرصيد الإفتتاحي": { f: "opening_balance", ro: true },
        "إجمالي المدين": { f: "total_debit", ro: true },
        "إجمالي الدائن": { f: "total_credit", ro: true },
        "الرصيد الحالي": { f: "current_balance", ro: true },
        "عدد السطور": { f: "line_count", ro: true },
        "آخر حركة": { f: "last_move_date", ro: true }
      }
    }
  ]};

  /* ═══ op.4.1.2.10 — الأرصدة الافتتاحية · OPEN_BAL [GO/04 §op.4.1.2.10 · GLSI011_14]
     + نسختاها بنوع رصيد ثابت: op.7.1.2.10 العملاء (3) · op.6.1.2.4 الموردون (4) — نفس السطور ونفس القواعد.
     الحفظ غير المتوازن مسموح (GL-R30) والفرق يظهر في «التوازن» لكل شركة؛ أول فترة مقفلة ⇒ لا تعديل (OB-R5). ═══ */
  var OB_TYPE = { "عام": "0", "صندوق": "1", "بنك": "2", "عميل": "3", "مورد": "4", "مدينة أخرى": "5", "دائنة أخرى": "6", "موظف": "7" };
  function obLines(entity, title, partyLabel) {
    return {
      entity: entity, panel: "السطر", title: title,
      key: "doc_sequence", keyLabel: "رقم السطر", serverKey: true,
      cols: [
        { c: "branch_id", t: "الفرع", n: true },
        { c: "account_code", t: "رقم الحساب" },
        { c: "analytic_code", t: partyLabel },
        { c: "analytic_name", t: "الاسم" },
        { c: "currency", t: "العملة" },
        { c: "debit", t: "مدين", n: true },
        { c: "credit", t: "دائن", n: true },
        { c: "cost_center", t: "المركز" }
      ],
      fields: {
        "رقم السطر": { f: "doc_sequence", ro: true },
        "الفرع": { f: "branch_id" },
        "اسم الفرع": { f: "branch_name", ro: true },
        "الشركة": { f: "company_id", ro: true },
        "رقم الحساب": { f: "account_code" },
        "اسم الحساب": { f: "account_name", ro: true },
        "نوع التحليلي": { f: "analytic_type", ro: true, map: OB_TYPE },
        "الحساب التحليلي": { f: "analytic_code" },
        "اسم التحليلي": { f: "analytic_name", ro: true },
        "العملة": { f: "currency" },
        "سعر التحويل": { f: "fx_rate" },
        "مدين": { f: "debit" },
        "دائن": { f: "credit" },
        "مدين أجنبي": { f: "debit_fc" },
        "دائن أجنبي": { f: "credit_fc" },
        "رقم المركز": { f: "cost_center" },
        "اسم المركز": { f: "cost_center_name", ro: true },
        "رقم المشروع": { f: "project_no" },
        "رقم النشاط": { f: "activity_no" },
        "رقم المندوب": { f: "rep_code" },
        "رقم المحصل": { f: "collector_no" },
        "رقم المرجع": { f: "ref_no" },
        "البيان": { f: "description" },
        "تاريخ": { f: "value_date" }
      }
    };
  }
  var OB_SUMMARY = {
    entity: "opening_balance_summary", panel: "التوازن", title: "التوازن",
    key: "company_id", keyCols: ["company_id", "analytic_type"], keyLabel: "الشركة",
    noAdd: "لوحة محسوبة من السطور — لا إضافة", noDelete: "لوحة محسوبة من السطور — لا حذف",
    cols: [
      { c: "company_id", t: "الشركة", n: true },
      { c: "analytic_type_name", t: "النوع" },
      { c: "line_count", t: "سطور", n: true },
      { c: "debit", t: "مدين", n: true },
      { c: "credit", t: "دائن", n: true },
      { c: "net", t: "الفرق", n: true }
    ],
    fields: {
      "الشركة": { f: "company_id", ro: true },
      "النوع": { f: "analytic_type_name", ro: true },
      "عدد السطور": { f: "line_count", ro: true },
      "إجمالي المدين": { f: "debit", ro: true },
      "إجمالي الدائن": { f: "credit", ro: true },
      "الفارق": { f: "net", ro: true }
    }
  };
  MAP["op.4.1.2.10"] = { sets: [obLines("opening_balance", "الأرصدة الافتتاحية", "التحليلي"), OB_SUMMARY] };
  MAP["op.7.1.2.10"] = { sets: [obLines("opening_balance_customer", "أرصدة العملاء الافتتاحية", "رقم العميل"), OB_SUMMARY] };
  MAP["op.6.1.2.4"] = { sets: [obLines("opening_balance_vendor", "أرصدة الموردين الافتتاحية", "رقم المورد"), OB_SUMMARY] };

  /* ═══ op.5.1.2.15 — المخزون الافتتاحي · IAS_OPEN_STOCK [GO/05 §op.5.1.2.15 · INVI011]
     الوحدة من وحدات الصنف والعبوة منها (IV-R122) · التكلفة = «التكلفة الأولية» للصنف (IV-R121) · لا قيد محاسبي (IV-R120)
     و«المطابقة» تقارن القيمة بحسابات المخزون في الأستاذ بالفرع. ═══ */
  MAP["op.5.1.2.15"] = { sets: [
    {
      entity: "opening_stock", panel: "السطر", title: "المخزون الافتتاحي",
      key: "doc_sequence", keyLabel: "رقم السطر", serverKey: true,
      cols: [
        { c: "item_code", t: "رقم الصنف" },
        { c: "item_name", t: "اسم الصنف" },
        { c: "unit_code", t: "الوحدة" },
        { c: "warehouse_code", t: "المخزن" },
        { c: "qty", t: "الكمية", n: true },
        { c: "unit_cost", t: "التكلفة", n: true },
        { c: "line_value", t: "القيمة", n: true },
        { c: "carried_forward", t: "مرحّل", bool: true }
      ],
      fields: {
        "رقم السطر": { f: "doc_sequence", ro: true },
        "رقم الصنف": { f: "item_code" },
        "اسم الصنف": { f: "item_name", ro: true },
        "الوحدة": { f: "unit_code" },
        "العبوة": { f: "pack_size", ro: true },
        "الكمية": { f: "qty" },
        "الكمية بالأساس": { f: "base_qty", ro: true },
        "المخزن": { f: "warehouse_code" },
        "اسم المخزن": { f: "warehouse_name", ro: true },
        "مجموعة المخازن": { f: "warehouse_group", ro: true },
        "التكلفة الأولية": { f: "unit_cost", ro: true },
        "القيمة": { f: "line_value", ro: true },
        "الفرع": { f: "branch_id", ro: true },
        "الشركة": { f: "company_id", ro: true },
        "مرحّل من السنة السابقة": { f: "carried_forward", ro: true, bool: true },
        "رقم السجل": { f: "line_no", ro: true }
      }
    },
    {
      entity: "opening_stock_recon", panel: "المطابقة", title: "المطابقة",
      key: "branch_key", keyLabel: "الفرع",
      noAdd: "لوحة محسوبة — لا إضافة", noDelete: "لوحة محسوبة — لا حذف",
      cols: [
        { c: "branch_key", t: "الفرع" },
        { c: "branch_name", t: "اسم الفرع" },
        { c: "line_count", t: "سطور", n: true },
        { c: "stock_value", t: "قيمة المخزون", n: true },
        { c: "gl_value", t: "حسابات المخزون", n: true },
        { c: "difference", t: "الفرق", n: true }
      ],
      fields: {
        "الفرع": { f: "branch_key", ro: true },
        "اسم الفرع": { f: "branch_name", ro: true },
        "عدد السطور": { f: "line_count", ro: true },
        "قيمة المخزون الافتتاحي": { f: "stock_value", ro: true },
        "رصيد حسابات المخزون": { f: "gl_value", ro: true },
        "الفرق": { f: "difference", ro: true }
      }
    }
  ]};

  MAP["op.7.1.2.8"] = { sets: [
    {
      entity: "customer", panel: "العميل", title: "البيانات الرئيسية",
      key: "code", keyLabel: "رقم العميل", addFrom: true,
      autoCode: { groupLabel: "المجموعة", codeLabel: "رقم العميل", server: "customer" },
      cols: [
        { c: "code", t: "رقم العميل" },
        { c: "name_ar", t: "اسم العميل" },
        { c: "group_no", t: "المجموعة", n: true },
        { c: "mobile", t: "الجوال" },
        { c: "vat_no", t: "الرقم الضريبي" },
        { c: "vat_class", t: "النوع الضريبي", map: { "1": "شخصي", "2": "أعمال", "3": "شركات أجنبية", "4": "مؤجلة", "5": "حكومية" } },
        { c: "rep_count", t: "مندوبون", n: true },
        { c: "sales_inactive", t: "موقف بيع", bool: true },
        { c: "inactive", t: "موقوف", bool: true }
      ],
      fields: {
        "المجموعة": { f: "group_no" },
        "اسم المجموعة": { f: "group_name", ro: true },
        "رقم العميل": { f: "code" },
        "اسم العميل": { f: "name_ar" },
        "أنواع العملاء": { f: "customer_type" },
        "رقم الحساب": { f: "account_code" },
        "اسم الحساب": { f: "account_name", ro: true },
        "رقم العميل الرئيسي": { f: "parent_code" },
        "اسم العميل الرئيسي": { f: "parent_name", ro: true },
        "الاسم الأجنبي": { f: "name_en" },
        "التصنيف": { f: "classification" },
        "رقم المستخدم": { f: "portal_user" },
        "كلمة السر معيّنة": { f: "has_portal_secret", ro: true, bool: true },
        "نوع الاستخدام": { f: "usage_kind", map: USAGE },
        "رقم الدرجة": { f: "grade_no" },
        "مركز التكلفة": { f: "cost_center" },
        "مرتبط برقم مورد": { f: "linked_vendor" },
        "اسم المورد المرتبط": { f: "linked_vendor_name", ro: true },
        "الرقم الضريبي": { f: "vat_no" },
        "رقم النوع الضريبي": { f: "vat_class", map: C_CLASS_VAT },
        "الفرع المرتبط بالعميل": { f: "branch_no" },
        "مندوب": { f: "is_rep", bool: true },
        "رقم المندوب": { f: "rep_code" },
        "اسم المندوب": { f: "rep_name", ro: true },
        "رقم المحصل": { f: "collector_no" },
        "وكيل": { f: "is_agent", bool: true },
        "فترة الائتمان": { f: "credit_days" },
        "فترة الائتمان للنقدية المعلقة": { f: "pending_cash_credit_days" },
        "خط السير": { f: "route_no" },
        "ترتيب خط السير": { f: "route_order" },
        "رقم المسوق": { f: "marketer_code" },
        "رقم الموظف": { f: "employee_no" },
        "التسلسل": { f: "seq_no", ro: true }
      }
    },
    {
      entity: "customer_currency", panel: "العملات", title: "العملات",
      key: "currency", keyCols: ["customer_code", "currency"], keyLabel: "العملة", detailOf: CST_DTL,
      cols: [
        { c: "currency", t: "العملة" },
        { c: "currency_name", t: "اسم العملة" },
        { c: "price_level_credit_name", t: "مستوى البيع الآجل" },
        { c: "price_level_cash_name", t: "مستوى البيع النقدي" },
        { c: "is_default", t: "افتراضية", bool: true },
        { c: "inactive", t: "توقيف", bool: true },
        { c: "sales_inactive", t: "توقيف المبيعات", bool: true }
      ],
      fields: {
        "رقم العميل": { f: "customer_code" },
        "العملة": { f: "currency" },
        "اسم العملة": { f: "currency_name", ro: true },
        "مستوى التسعيرة للبيع الآجل": { f: "price_level_credit" },
        "مستوى التسعيرة للبيع النقدي": { f: "price_level_cash" },
        "العملة الافتراضية": { f: "is_default", bool: true },
        "توقيف": { f: "inactive", bool: true },
        "توقيف المبيعات": { f: "sales_inactive", bool: true }
      }
    },
    cstRow("بيانات أخرى", {
      "العنوان": { f: "address" },
      "رقم التلفون": { f: "phone" },
      "رقم الجوال": { f: "mobile" },
      "رقم الجوال الوتس اب": { f: "whatsapp_no" },
      "اسم مجموعة الواتس اب": { f: "whatsapp_group" },
      "رقم صندوق البريد": { f: "po_box" },
      "رقم الفاكس": { f: "fax" },
      "البريد الالكتروني": { f: "email" },
      "الموقع على الانترنت": { f: "website" },
      "أعلى نسبة خصم": { f: "max_discount_pct" },
      "تاريخ فتح الحساب": { f: "opened_on" },
      "نسبة الخصم الإفتراضية": { f: "default_discount_pct" },
      "عن طريق": { f: "referred_by" },
      "GPS": { f: "gps" },
      "تاريخ أخر مطابقة": { f: "last_reconciled_on" },
      "ملاحظات": { f: "notes" },
      "توقيف العميل": { f: "inactive", bool: true },
      "توقيف المبيعات": { f: "sales_inactive", bool: true },
      "تاريخ التوقيف": { f: "inactive_date", ro: true },
      "فترة السماح بعد تاريخ الإستحقاق": { f: "grace_days" },
      "سبب التوقيف": { f: "inactive_reason" },
      "تفعيل العميل خلال الفترة من تاريخ": { f: "active_from" },
      "من تاريخ هـ": { f: "active_from_h" },
      "إلى تاريخ": { f: "active_to" },
      "إلى تاريخ هـ": { f: "active_to_h" },
      "القائمة السوداء": { f: "blacklisted", bool: true },
      "تاريخ الإضافة للقائمة السوداء": { f: "blacklisted_at", ro: true },
      "ارسال رسالة تحقق للعميل للفواتير الأجلة": { f: "verify_msg_credit", bool: true },
      "السماح بالبيع للعميل بوجود مديونية سابقة غير مسددة": { f: "allow_sale_with_debt", map: PRIV_LEVEL },
      "السبب": { f: "blacklist_reason" },
      "رقم الترخيص": { f: "license_no" },
      "مالك الترخيص": { f: "license_owner" },
      "الشخص المسؤول": { f: "responsible_person" },
      "الشخص المخول بالتوقيع": { f: "authorized_signatory" },
      "إستخدام التنبيهات للإيميل والجوال": { f: "notify_channel", map: AUTO_SEND },
      "الحسابات المفضلة": { f: "is_favorite", bool: true },
      "مستثنى من العروض الترويجية": { f: "exclude_promotions", bool: true },
      "إرسال تنبيه إستحقاق أقساط العملاء": { f: "notify_installments", bool: true },
      "تقسيط آلي للمبيعات الآجلة": { f: "auto_installments", bool: true },
      "كيف سمعت عنا ؟": { f: "lead_source" }
    }, [{ c: "phone", t: "التلفون" }, { c: "mobile", t: "الجوال" }, { c: "opened_on", t: "فتح الحساب" }]),
    cstRow("العنوان الوطني", {
      "رقم المبنى": { f: "building_no" },
      "الشارع": { f: "street" },
      "الحي": { f: "district_name" },
      "الدولة": { f: "country_no" },
      "رقم المنطقة": { f: "province_no" },
      "المدينه": { f: "city_no" },
      "رقم الحي": { f: "region_no" },
      "الرمز البريدي": { f: "postal_code" },
      "الرقم الاضافي": { f: "additional_no" },
      "رقم السجل التجاري": { f: "cr_no" },
      "الاسم التجاري محلي": { f: "trade_name_ar" },
      "الاسم التجاري أجنبي": { f: "trade_name_en" },
      "العنوان المختصر": { f: "short_address" },
      "نوع المعرف": { f: "id_scheme" },
      "المعرف": { f: "id_value" }
    }, [{ c: "building_no", t: "المبنى" }, { c: "street", t: "الشارع" }, { c: "postal_code", t: "الرمز البريدي" }]),
    cstRow("البيانات الشخصية", {
      "نوع الهوية": { f: "id_type" },
      "رقم الهوية": { f: "id_no" },
      "تاريخ الاصدار - م": { f: "id_issue_date" },
      "تاريخ الاصدار - هـ": { f: "id_issue_date_h" },
      "المهنة": { f: "profession" },
      "تاريخ الميلاد_م": { f: "birth_date" },
      "مكان الميلاد": { f: "birth_place" },
      "جهة العمل": { f: "employer" },
      "مصادر الدخل": { f: "income_source" },
      "مكان الأصدار": { f: "id_issue_place" },
      "تاريخ الانتهاء - م": { f: "id_expiry_date" },
      "تاريخ الانتهاء - هـ": { f: "id_expiry_date_h" },
      "الحالة الإجتماعية": { f: "marital_status" },
      "تاريخ الميلاد_هـ": { f: "birth_date_h" },
      "عنوان العمل": { f: "work_address" },
      "الجنس": { f: "gender", map: CUST_GNDR },
      "معدل الدخل الشهري": { f: "monthly_income" },
      "الجنسية": { f: "nationality" }
    }, [{ c: "id_no", t: "رقم الهوية" }]),
    cstRow("بيانات إضافية", {
      "طريقة إحتساب الضريبة": { f: "tax_calc_method" },
      "النشاط": { f: "activity_name" },
      "نوع التسجيل": { f: "registration_type", map: CST_RGSTR_TYP },
      "الرقم الأحصائي": { f: "statistical_no" },
      "المادة الضريبية": { f: "tax_article" },
      "رأس المال": { f: "capital" },
      "عميل مجلس التعاون الخليجي": { f: "is_gcc", bool: true },
      "عميل مجموعة ضريبية": { f: "is_vat_group", bool: true },
      "القطاع": { f: "sector", map: CST_SCTR_TYP },
      "رقم الباركود": { f: "barcode" },
      "طريقة فتح الزيارة": { f: "visit_open_type", map: VST_OPN_TYP_CST },
      "رقم الموقع العالمي": { f: "gln_code" },
      "استخدام المزامنة الالية بين العميل والمورد": { f: "auto_sync_vendor", bool: true },
      "نوع السقف لمبيعات الأصناف": { f: "item_cap_type", map: LMT_ITM_QTY }
    }, [{ c: "tax_calc_method", t: "الضريبة", n: true }]),
    cstRow("حقول إضافية", CST_EXTRA, [{ c: "field1", t: "حقل إضافي1" }]),
    {
      entity: "customer_limit", panel: "حد الدين", title: "حد الدين",
      key: "rcrd_sq", keyLabel: "رقم السجل", serverKey: true,
      detailOf: { col: "analytic_code", from: "code", label: "رقم العميل" },
      cols: [
        { c: "currency", t: "العملة" },
        { c: "balance_min", t: "الحد الأدنى", n: true },
        { c: "balance_max", t: "الحد الأعلى", n: true },
        { c: "txn_min", t: "أدنى حد للعملية", n: true },
        { c: "txn_max", t: "أعلى حد للعملية", n: true },
        { c: "overrun_policy", t: "تجاوز حدود الحسابات", map: { "1": "لا يسمح", "2": "يسمح", "3": "يسمح مع التنبيه" } },
        { c: "overrun_pct", t: "نسبة التجاوز", n: true },
        { c: "overrun_possible", t: "اعلى حد متاح", n: true },
        { c: "branch_no", t: "الفرع", n: true }
      ],
      fields: {
        "رقم العميل": { f: "analytic_code" },
        "رقم السجل": { f: "rcrd_sq" },
        "العملة": { f: "currency" },
        "الحد الأدنى": { f: "balance_min" },
        "الحد الأعلى": { f: "balance_max" },
        "أدنى حد للعملية": { f: "txn_min" },
        "أعلى حد للعملية": { f: "txn_max" },
        "تجاوز حدود الحسابات": { f: "overrun_policy", map: LOW_PRICE },
        "نسبة التجاوز": { f: "overrun_pct" },
        "اعلى حد متاح": { f: "overrun_possible", ro: true },
        "النوع": { f: "side", map: DR_CR },
        "مركز التكلفة": { f: "cost_center" },
        "الفرع": { f: "branch_no" },
        "موقف": { f: "inactive", bool: true }
      }
    },
    {
      entity: "customer_account", panel: "الحسابات", title: "الحسابات",
      key: "rcrd_no", keyLabel: "م", serverKey: true, detailOf: CST_DTL,
      cols: [
        { c: "rcrd_no", t: "م", n: true },
        { c: "account_code", t: "رقم الحساب" },
        { c: "account_name", t: "اسم الحساب" },
        { c: "account_type", t: "نوع الحساب", n: true },
        { c: "inactive", t: "موقف", bool: true }
      ],
      fields: {
        "رقم العميل": { f: "customer_code" },
        "م": { f: "rcrd_no" },
        "رقم الحساب": { f: "account_code" },
        "اسم الحساب": { f: "account_name", ro: true },
        "نوع الحساب": { f: "account_type", map: CST_ACCNT_TYP },
        "موقف": { f: "inactive", bool: true },
        "المستخدم الموقف": { f: "inactive_by", ro: true },
        "تاريخ التوقيف": { f: "inactive_date", ro: true },
        "سبب التوقيف": { f: "inactive_reason" }
      }
    },
    {
      entity: "customer_user", panel: "الصلاحيات", title: "الصلاحيات",
      key: "user_id", keyCols: ["customer_code", "user_id", "currency"], keyLabel: "رقم المستخدم", detailOf: CST_DTL,
      cols: [
        { c: "user_id", t: "رقم المستخدم", n: true },
        { c: "currency", t: "رمز العملة" },
        { c: "can_add", t: "إضافه", bool: true },
        { c: "can_view", t: "تقرير", bool: true }
      ],
      fields: {
        "رقم العميل": { f: "customer_code" },
        "رقم المستخدم": { f: "user_id" },
        "رمز العملة": { f: "currency" },
        "إضافه": { f: "can_add", bool: true },
        "تقرير": { f: "can_view", bool: true }
      }
    },
    {
      entity: "customer_sales_cap", panel: "حدود مبيعات العملاء", title: "حدود مبيعات العملاء",
      key: "rcrd_no", keyLabel: "م", serverKey: true, detailOf: CST_DTL,
      cols: [
        { c: "rcrd_no", t: "م", n: true },
        { c: "from_date", t: "من تاريخ" },
        { c: "to_date", t: "إلى تاريخ" },
        { c: "amount", t: "المبلغ المحلي", n: true },
        { c: "note", t: "البيان" }
      ],
      fields: {
        "رقم العميل": { f: "customer_code" },
        "م": { f: "rcrd_no" },
        "من تاريخ": { f: "from_date" },
        "إلى تاريخ": { f: "to_date" },
        "المبلغ المحلي": { f: "amount" },
        "البيان": { f: "note" }
      }
    },
    {
      entity: "salesman_customer", panel: "ربط المندوبين", title: "ربط العملاء بالمندوبين",
      key: "rep_code", keyCols: ["rep_code", "customer_code"], keyLabel: "رقم المندوب", detailOf: CST_DTL,
      cols: [
        { c: "rep_code", t: "رقم المندوب" },
        { c: "visit_day1", t: "السبت", bool: true },
        { c: "visit_day2", t: "الأحد", bool: true },
        { c: "visit_day3", t: "الإثنين", bool: true },
        { c: "visit_day4", t: "الثلاثاء", bool: true },
        { c: "visit_day5", t: "الأربعاء", bool: true },
        { c: "visit_day6", t: "الخميس", bool: true },
        { c: "visit_day7", t: "الجمعة", bool: true },
        { c: "is_default", t: "الإفتراضي", bool: true },
        { c: "inactive", t: "موقف", bool: true }
      ],
      fields: {
        "رقم العميل": { f: "customer_code" },
        "رقم المندوب": { f: "rep_code" },
        "السبت": { f: "visit_day1", bool: true },
        "الأحد": { f: "visit_day2", bool: true },
        "الإثنين": { f: "visit_day3", bool: true },
        "الثلاثاء": { f: "visit_day4", bool: true },
        "الأربعاء": { f: "visit_day5", bool: true },
        "الخميس": { f: "visit_day6", bool: true },
        "الجمعة": { f: "visit_day7", bool: true },
        "الإفتراضي": { f: "is_default", bool: true },
        "موقف": { f: "inactive", bool: true },
        "المستخدم الموقف": { f: "inactive_by", ro: true },
        "تاريخ التوقيف": { f: "inactive_date", ro: true }
      }
    },
    {
      entity: "customer_driver", panel: "ربط السائقين", title: "ربط العملاء بالسائقين",
      key: "driver_no", keyCols: ["customer_code", "driver_no"], keyLabel: "رقم السائق", detailOf: CST_DTL,
      cols: [
        { c: "driver_no", t: "رقم السائق", n: true },
        { c: "is_default", t: "الافتراضي", bool: true },
        { c: "inactive", t: "موقف", bool: true }
      ],
      fields: {
        "رقم العميل": { f: "customer_code" },
        "رقم السائق": { f: "driver_no" },
        "الافتراضي": { f: "is_default", bool: true },
        "موقف": { f: "inactive", bool: true },
        "المستخدم الموقف": { f: "inactive_by", ro: true },
        "تاريخ التوقيف": { f: "inactive_date", ro: true }
      }
    },
    cstRow("بيانات الضمانات", {
      "حالة الضمانة": { f: "g_status", map: G_STATUS },
      "نوع الضمانة": { f: "g_type", map: G_TYPE },
      "تاريخ بدء الضمانة": { f: "g_start_date" },
      "تاريخ إنتهاء الضمانة": { f: "g_expire_date" },
      "اسم الضامن": { f: "g_name" },
      "عنوان الضامن": { f: "g_address" },
      "طبيعة نشاط الضامن": { f: "g_work" },
      "المركز المالي": { f: "g_fin_center" },
      "قيمة الضمانة": { f: "g_amount" },
      "تاريخ توثيق الضمان": { f: "g_doc_date" },
      "رقم التسجيل فى المحكمة": { f: "g_court_reg" },
      "رقم التسجيل بالغرفة التجارية": { f: "g_chamber_reg" },
      "رقم السجل التجاري للضامن": { f: "g_cr_no" },
      "رقم تلفون الضامن": { f: "g_phone" },
      "رقم فاكس الضامن": { f: "g_fax" }
    }, [{ c: "g_type", t: "نوع الضمانة", n: true }]),
    cstRow("مكان التسليم", {
      "المدينة": { f: "dlvr_city_no" },
      "رقم المنطقة": { f: "dlvr_province_no" },
      "رقم الحي": { f: "dlvr_region_no" },
      "رقم التلفون": { f: "dlvr_phone" },
      "العنوان": { f: "dlvr_address" },
      "رقم الفاكس": { f: "dlvr_fax" },
      "البريد الألكتروني": { f: "dlvr_email" },
      "الشخص المسؤول": { f: "dlvr_person" },
      "رقم الجوال": { f: "dlvr_mobile" }
    }, [{ c: "dlvr_address", t: "العنوان" }]),
    {
      entity: "customer_ledger", panel: "العمليات", title: "العمليات",
      key: "doc_no", keyCols: ["customer_code", "doc_type", "doc_no"], keyLabel: "رقم المستند", detailOf: CST_DTL,
      noAdd: CST_Q, noDelete: CST_Q,
      cols: [
        { c: "doc_no", t: "رقم المستند" },
        { c: "doc_date", t: "التاريخ" },
        { c: "doc_type_name", t: "نوع المستند" },
        { c: "description", t: "البيان" },
        { c: "debit", t: "مدين", n: true },
        { c: "credit", t: "دائن", n: true },
        { c: "currency", t: "العملة" },
        { c: "branch_no", t: "رقم الفرع", n: true },
        { c: "balance", t: "الرصيد", n: true }
      ],
      fields: {
        "رقم العميل": { f: "customer_code", ro: true },
        "رقم المستند": { f: "doc_no", ro: true },
        "التاريخ": { f: "doc_date", ro: true },
        "نوع المستند": { f: "doc_type_name", ro: true },
        "البيان": { f: "description", ro: true },
        "مدين": { f: "debit", ro: true },
        "دائن": { f: "credit", ro: true },
        "الرصيد": { f: "balance", ro: true }
      }
    },
    {
      entity: "customer_sales_doc", panel: "وثائق المبيعات", title: "وثائق المبيعات",
      key: "doc_no", keyCols: ["customer_code", "doc_kind", "doc_no"], keyLabel: "رقم المستند", detailOf: CST_DTL,
      noAdd: CST_Q, noDelete: CST_Q,
      cols: [
        { c: "doc_no", t: "رقم المستند" },
        { c: "doc_date", t: "التاريخ" },
        { c: "doc_kind_name", t: "نوع المستند" },
        { c: "description", t: "البيان" },
        { c: "total", t: "مبلغ الوثيقة", n: true },
        { c: "currency", t: "العملة" },
        { c: "ref_no", t: "رقم المرجع" },
        { c: "due_date", t: "تاريخ الإستحقاق" },
        { c: "branch_name", t: "اسم الفرع" }
      ],
      fields: {
        "رقم العميل": { f: "customer_code", ro: true },
        "رقم المستند": { f: "doc_no", ro: true },
        "التاريخ": { f: "doc_date", ro: true },
        "نوع المستند": { f: "doc_kind_name", ro: true },
        "البيان": { f: "description", ro: true },
        "مبلغ الوثيقة": { f: "total", ro: true },
        "العملة": { f: "currency", ro: true },
        "رقم المرجع": { f: "ref_no", ro: true },
        "تاريخ الإستحقاق": { f: "due_date", ro: true }
      }
    },
    {
      entity: "customer_stats", panel: "إحصائيات", title: "إحصائيات",
      key: "customer_code", keyLabel: "رقم العميل", detailOf: CST_DTL,
      noAdd: CST_Q, noDelete: CST_Q,
      cols: [
        { c: "opening_balance", t: "الرصيد الإفتتاحي", n: true },
        { c: "current_balance", t: "الرصيد الحالي", n: true },
        { c: "net_sales", t: "صافي المبيعات", n: true },
        { c: "receipts", t: "سندات القبض", n: true },
        { c: "last_sale_date", t: "اخر تاريخ بيع" }
      ],
      fields: {
        "رقم العميل": { f: "customer_code", ro: true },
        "الرصيد الإفتتاحي": { f: "opening_balance", ro: true },
        "الرصيد الحالي": { f: "current_balance", ro: true },
        "فاتورة المبيعات": { f: "sales", ro: true },
        "مردود المبيعات": { f: "returns", ro: true },
        "صافي الخصم": { f: "net_discount", ro: true },
        "صافي المبيعات": { f: "net_sales", ro: true },
        "سندات القبض": { f: "receipts", ro: true },
        "مبلغ الشيكات الغير مستحقة": { f: "cheques_not_due", ro: true },
        "مبلغ التسويات": { f: "settlements", ro: true },
        "اخر تاريخ بيع": { f: "last_sale_date", ro: true },
        "آخر تاريخ سداد": { f: "last_payment_date", ro: true }
      }
    }
  ]};

  var st = { ref: null, cfg: null, set: 0, rows: [], idx: -1, h: null, q: "", master: null, groups: null };

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
    /* الرأس المعروض يبقى مرجع تبويبات التفصيل (وحدات الصنف …) */
    if (st.cfg && !st.cfg.detailOf) st.master = cur();
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
    lockFixed();
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

  /* مفتاح الرأس لتبويب تفصيل — «» إن لا رأس معروض */
  function masterKey() {
    var d = st.cfg.detailOf;
    return d && st.master && st.master[d.from] != null ? String(st.master[d.from]) : "";
  }

  function load(selectKey) {
    var d = st.cfg.detailOf;
    if (d && !masterKey()) {
      st.rows = [];
      select(-1);
      st.h.note("اختر سجلاً من تبويب «" + MAP[st.ref].sets[0].title + "» أولاً");
      return Promise.resolve({ rows: [] });
    }
    /* الحد 5000: شاشة الأصناف 2,228 وربطها الضريبي 2,228 — الافتراضي 500 كان يُخفي الباقي */
    var q = "?limit=5000" + (st.q ? "&q=" + encodeURIComponent(st.q) : "") +
      (d ? "&eq." + d.col + "=" + encodeURIComponent(masterKey()) : "");
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
      if (fc.addOnly && st.h.st.mode !== "add") return;
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
    if (cfg.serverKey) serverNext("", cfg.keyLabel);
    else if (cfg.autoKey) {
      var max = 0;
      st.rows.forEach(function (r) { max = Math.max(max, Number(r[cfg.key]) || 0); });
      var box = fieldBox(cfg.keyLabel);
      var inp = box && box.querySelector("input");
      if (inp) inp.value = String(max + 1);
    }
    if (cfg.detailOf) {
      var dBox = fieldBox(cfg.detailOf.label);
      var dInp = dBox && dBox.querySelector("input");
      if (dInp) dInp.value = masterKey();
    }
    paintAudit(null);
    paintState(null);
    st.h.rec(0, st.rows.length);
  }

  /* حقل الإضافة فقط (الوحدة الرئيسية للصنف الجديد) ومفتاح الرأس في التفصيل — لا يُعدَّلان يدوياً */
  function lockFixed() {
    var cfg = st.cfg, mode = st.h.st.mode;
    Object.keys(cfg.fields).forEach(function (label) {
      var fc = cfg.fields[label];
      var isMasterKey = cfg.detailOf && label === cfg.detailOf.label;
      if (!fc.addOnly && !isMasterKey) return;
      var box = fieldBox(label);
      var inp = box && box.querySelector("input");
      if (!inp || mode === "view") return;
      var fixed = isMasterKey || (fc.addOnly && mode !== "add");
      inp.readOnly = fixed;
      if (fixed) inp.removeAttribute("data-lock");
    });
  }

  /* IV-R75 · IV-R95 — رقم الصنف: بادئة المجموعة + (أكبر رقم بنفس البادئة والطول الغالب + 1) [مستنتج للتفصيل].
     مجموعة بلا بادئة ⇒ لا رقم مقترح، ويُكتب يدوياً (أونيكس يسمح بالحروف والتعديل اليدوي) */
  function nextItemCode(group) {
    var g = null;
    (st.groups || []).forEach(function (r) { if (String(r.code) === group) g = r; });
    var pre = g && g.item_code_prefix ? String(g.item_code_prefix) : "";
    if (!pre) return "";
    var lens = {}, best = 0, bestLen = 0;
    st.rows.forEach(function (r) {
      var c = String(r.code || "");
      if (c.indexOf(pre) === 0 && /^[0-9]+$/.test(c)) lens[c.length] = (lens[c.length] || 0) + 1;
    });
    Object.keys(lens).forEach(function (L) { if (lens[L] > best) { best = lens[L]; bestLen = Number(L); } });
    if (!bestLen) return "";
    var max = 0;
    st.rows.forEach(function (r) {
      var c = String(r.code || "");
      if (c.length === bestLen && c.indexOf(pre) === 0 && /^[0-9]+$/.test(c)) max = Math.max(max, Number(c.slice(pre.length)) || 0);
    });
    var seq = String(max + 1);
    while (seq.length < bestLen - pre.length) seq = "0" + seq;
    return pre + seq;
  }

  /* الرقم المقترح من الخادم (GET /api/masters/<كيان>/next) — قاعدته في تعريف الكيان (رقم العميل = المجموعة + تسلسل
     بطول CUST_LENGTH · رقم سجل حد الدين = الأكبر في الجدول كله + 1) لا في المتصفح */
  function serverNext(query, label) {
    if (!api()) return;
    var ent = st.cfg.entity;
    api().masters(ent + "/next", query).then(function (j) {
      if (st.cfg.entity !== ent || st.h.st.mode !== "add") return;
      var box = fieldBox(label);
      var inp = box && box.querySelector("input");
      if (inp && j && j.next) inp.value = String(j.next);
    }).catch(function () {});
  }

  function wireAutoCode() {
    var ac = st.cfg.autoCode;
    if (!ac) return;
    if (ac.server) {
      var gBox = fieldBox(ac.groupLabel);
      var gInp = gBox && gBox.querySelector("input");
      if (!gInp || gInp.getAttribute("data-autocode") === "1") return;
      gInp.setAttribute("data-autocode", "1");
      gInp.addEventListener("change", function () {
        if (st.h.st.mode !== "add") return;
        serverNext("?group=" + encodeURIComponent(gInp.value.trim()), ac.codeLabel);
      });
      return;
    }
    if (!st.groups && api()) {
      api().masters("item_group", "?limit=5000").then(function (j) { st.groups = j.rows || []; }).catch(function () { st.groups = []; });
    }
    var box = fieldBox(ac.groupLabel);
    var inp = box && box.querySelector("input");
    if (!inp || inp.getAttribute("data-autocode") === "1") return;
    inp.setAttribute("data-autocode", "1");
    inp.addEventListener("change", function () {
      if (st.h.st.mode !== "add") return;
      var codeBox = fieldBox(ac.codeLabel);
      var codeInp = codeBox && codeBox.querySelector("input");
      var next = nextItemCode(inp.value.trim());
      if (codeInp && next) codeInp.value = next;
    });
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
    if (mode === "add" && st.copyFrom) values.copy_from = st.copyFrom;
    var key = valuesKey(values);
    return api().saveMaster(st.cfg.entity, mode, values).then(function (j) {
      st.copyFrom = null;
      st.h.setMode("view");
      return load(j.saved ? rowKey(j.saved) : key).then(function () {
        var warn = j.warnings && j.warnings.length ? " · تنبيه: " + j.warnings.join(" · ") : "";
        st.h.note("حُفظ — " + st.cfg.keyLabel + " " + (j.saved ? j.saved[st.cfg.key] : key) + warn);
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
        if (st.cfg.detailOf && !masterKey()) {
          h.note("اختر سجلاً من تبويب «" + MAP[st.ref].sets[0].title + "» أولاً");
          return true;
        }
        st.copyFrom = null;
        h.setMode("add");
        blank();
        h.applyMode();
        lockFixed();
        h.note("سجل جديد — الحقول فاضية");
        return true;
      case "edit":
        if (!cur()) { h.note("لا سجل معروض للتعديل"); return true; }
        h.setMode("edit");
        h.applyMode();
        lockFixed();
        h.note("تعديل السجل " + cur()[st.cfg.key]);
        return true;
      case "save":
        save();
        return true;
      case "cancelEntry":
        st.copyFrom = null;
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
      case "addFrom": {
        /* T1 — نسخ السجل المعروض إلى سجل جديد برقم جديد، قابل للتعديل قبل الحفظ */
        if (!st.cfg.addFrom) { h.note("«إضافة من» لا تنطبق على جدول رموز — استخدم «إضافة»"); return true; }
        var src = cur();
        if (!src) { h.note("اعرض السجل المراد النسخ منه أولاً"); return true; }
        h.setMode("add");
        bind(src);
        var cBox = fieldBox(st.cfg.keyLabel);
        var cInp = cBox && cBox.querySelector("input");
        var next = "";
        if (st.cfg.autoCode && st.cfg.autoCode.server) serverNext("?group=" + encodeURIComponent(String(src.group_no || "")), st.cfg.keyLabel);
        else if (st.cfg.autoCode) next = nextItemCode(String(src.group_code || ""));
        else if (st.cfg.autoKey) {
          var mx = 0;
          st.rows.forEach(function (r) { mx = Math.max(mx, Number(r[st.cfg.key]) || 0); });
          next = String(mx + 1);
        }
        if (cInp) cInp.value = next;
        st.copyFrom = String(src[st.cfg.key]);
        paintAudit(null);
        paintState(null);
        h.rec(0, st.rows.length);
        h.note("إضافة من " + st.copyFrom + (st.cfg.autoCode ? (st.cfg.autoCode.server ? " — العملات تُنسخ مع الحفظ" : " — الوحدات تُنسخ مع الحفظ") : "") + "؛ عدّل ثم احفظ");
        return true;
      }
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
    wireAutoCode();
    st.master = null;
    st.copyFrom = null;
    load();
  }

  root.StartyxMasters = {
    MAP: MAP,
    handles: function (ref) { return !!MAP[ref]; },
    mount: mount,
    command: command
  };
})(window);
