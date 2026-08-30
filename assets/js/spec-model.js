/* ============================================================================
   ONYX ERP — نموذج البيانات (الكيانات والحقول والعلاقات)
   ----------------------------------------------------------------------------
   هذا هو العقد الذي تُبنى عليه كل شاشة. قبل كتابة أي كود لشاشة، اقرأ كيانها هنا:
   ما حقولها، ما مفتاحها، بماذا ترتبط، وما القواعد التي لا يجوز كسرها.

   أنواع الكيانات:
     master   : بيانات أساسية — تُنشأ مرة وتُستخدم كثيراً (صنف، عميل، حساب)
     doc      : وثيقة — لها رأس وسطور وحالة، وتُنتج قيداً (فاتورة، سند)
     ledger   : دفتر — لا يُحرَّر مباشرة، يُكتب بالترحيل فقط (قيد اليومية، حركة المخزون)
     config   : تهيئة — تضبط سلوك النظام (متغيرات، أنواع، ربط حسابات)

   أنواع الحقول:
     id · code · text · num · money · qty · date · bool · ref(كيان) · enum[...]
     calc  : محسوب — لا يُدخَل يدوياً
   ========================================================================== */

(function (root) {
  "use strict";

  /* مختصرات */
  function F(name, type, opts) {
    return Object.assign({ name: name, type: type }, opts || {});
  }

  var ENTITIES = {

    /* ══════════════════════════════════════════════════════════════════
       ط ب ق ة   ا ل أ س ا س  —  لا شيء يعمل قبلها
       ══════════════════════════════════════════════════════════════════ */

    account: {
      label: "الحساب", kind: "master", screen: "op.1.2.3",
      layer: 0,
      key: "code",
      note: "العمود الفقري. كل قيد يشير إلى حسابين على الأقل من هنا.",
      fields: [
        F("code", "code", { req: true, unique: true, note: "هرمي: 1 → 11 → 1101 → 110101 → 1101010001" }),
        F("nameAr", "text", { req: true }),
        F("nameEn", "text"),
        F("parent", "ref", { to: "account", note: "فارغ للجذور الأربعة فقط" }),
        F("level", "num", { calc: true, note: "يُشتق من طول الكود" }),
        F("isLeaf", "bool", { calc: true, note: "الحسابات غير النهائية لا تقبل قيوداً" }),
        F("nature", "enum", { values: ["مدين", "دائن"], calc: true, note: "من الجذر: 1,3 مدين · 2,4 دائن" }),
        F("statement", "enum", { values: ["الميزانية العمومية", "قائمة الدخل"], calc: true }),
        F("currency", "ref", { to: "currency", note: "فارغ = متعدد العملات" }),
        F("costCenterRequired", "bool"),
        F("projectRequired", "bool"),
        F("activityRequired", "bool"),
        F("isSuspended", "bool", { note: "موقوف = يظهر في التقارير ولا يقبل قيوداً جديدة" })
      ],
      rules: [
        "لا يُقبل قيد على حساب غير نهائي (isLeaf = false).",
        "لا يُحذف حساب له أي حركة — يُوقَف فقط.",
        "تغيير الحساب الأب ممنوع بعد أول حركة.",
        "الرصيد الافتتاحي يُدخَل من «الأرصدة الافتتاحية» (op.4.1.2.10) لا من هنا."
      ]
    },

    currency: {
      label: "العملة", kind: "master", screen: "op.1.1.3", layer: 0, key: "code",
      fields: [
        F("code", "code", { req: true, unique: true, note: "YER / USD / SAR" }),
        F("nameAr", "text", { req: true }),
        F("isBase", "bool", { note: "عملة واحدة فقط أساسية" }),
        F("decimals", "num", { def: 2 })
      ],
      rules: ["عملة أساسية واحدة لا تتغيّر بعد أول قيد.", "كل مبلغ يُخزَّن بالعملة الأصلية + مقابلها بالأساسية."]
    },

    exchangeRate: {
      label: "سعر الصرف", kind: "master", screen: "op.1.1.3", layer: 0, key: ["currency", "date"],
      fields: [
        F("currency", "ref", { to: "currency", req: true }),
        F("date", "date", { req: true }),
        F("rate", "num", { req: true })
      ],
      rules: ["كل وثيقة بعملة غير أساسية تُجمّد سعر الصرف وقت الترحيل — لا يُعاد حسابه لاحقاً."]
    },

    fiscalPeriod: {
      label: "الفترة المحاسبية", kind: "config", screen: "op.1.1.2", layer: 0, key: ["year", "period"],
      fields: [
        F("year", "num", { req: true, note: "بتروسبيشل: السنة الحالية 2026" }),
        F("period", "num", { req: true, note: "1..12" }),
        F("dateFrom", "date", { req: true }),
        F("dateTo", "date", { req: true }),
        F("status", "enum", { values: ["مفتوحة", "موقوفة", "مقفلة"], def: "مفتوحة" })
      ],
      rules: [
        "لا تُرحَّل وثيقة تاريخها خارج فترة مفتوحة.",
        "«موقوفة» تمنع الإدخال وتسمح بالعرض. «مقفلة» تمنع أي تعديل.",
        "الإقفال الشهري (op.2.4.x) هو ما يغيّر الحالة — لا تُغيَّر يدوياً."
      ]
    },

    branch: {
      label: "الفرع / الوحدة المحاسبية", kind: "master", screen: "op.1.1.12", layer: 0, key: "code",
      fields: [
        F("code", "code", { req: true, unique: true }),
        F("nameAr", "text", { req: true }),
        F("isActive", "bool", { def: true })
      ],
      rules: ["بتروسبيشل: وحدة واحدة نشطة («الإدارة») — لكن ابنِ الحقل من البداية."]
    },

    costCenter: { label: "مركز التكلفة", kind: "master", screen: "op.1.2.5", layer: 0, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true}), F("parent","ref",{to:"costCenter"})],
      rules: ["بُعد تحليلي اختياري على سطر القيد — لا يؤثر على التوازن."] },

    project: { label: "المشروع", kind: "master", screen: "op.1.2.6", layer: 0, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true}), F("status","enum",{values:["مفتوح","مغلق"]})],
      rules: ["يُربط بالحسابات عبر op.4.1.2.8."] },

    activity: { label: "النشاط", kind: "master", screen: "op.4.1.2.9", layer: 0, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true})],
      rules: ["يُربط بالحسابات عبر op.4.1.2.9 — يخدم حسابات «أنشطة شقيقة» (1208)."] },

    /* ══════════════════════════════════════════════════════════════════
       ط ب ق ة   ا ل ت ه ي ئ ة  —  تضبط سلوك الوثائق
       ══════════════════════════════════════════════════════════════════ */

    documentType: {
      label: "نوع الوثيقة", kind: "config", screen: "op.4.6.2", layer: 1, key: "code",
      note: "المفتاح الذي يجعل الوثيقة تعرف حساباتها وترقيمها وسلوكها.",
      fields: [
        F("code", "code", { req: true, unique: true }),
        F("nameAr", "text", { req: true }),
        F("docFamily", "enum", { req: true, values: [
          "قيد يومية", "سند قبض", "سند صرف", "إشعار مدين", "إشعار دائن",
          "فاتورة مبيعات", "مردود مبيعات", "فاتورة مشتريات", "مردود مشتريات",
          "توريد مخزني", "صرف مخزني", "تحويل مخزني", "تسوية مخزون"
        ]}),
        F("numberSeries", "ref", { to: "numberSeries", req: true }),
        F("defaultDebitAccount", "ref", { to: "account" }),
        F("defaultCreditAccount", "ref", { to: "account" }),
        F("requiresApproval", "bool", { note: "بتروسبيشل: «نظام مراجعة الوثائق» معطّل → false" }),
        F("affectsInventory", "bool"),
        F("affectsTax", "bool")
      ],
      rules: [
        "الحساب الافتراضي يُربط من op.4.6.2 «ربط أنواع الوثائق بالحسابات».",
        "لا تُحذف نوع وثيقة استُخدم — يُوقَف."
      ]
    },

    numberSeries: {
      label: "تسلسل الترقيم", kind: "config", layer: 1, key: "code",
      noScreen: "لا توجد شاشة مستقلة للترقيم في شجرة بتروسبيشل — الترقيم مضبوط داخل «أنواع الوثائق» ومتغيرات كل نظام. تحقق من شاشة المتغيرات قبل البرمجة.",
      fields: [
        F("code", "code", { req: true, unique: true }),
        F("prefix", "text"),
        F("nextNumber", "num", { req: true }),
        F("resetOn", "enum", { values: ["لا يُصفَّر", "سنوياً", "شهرياً"] }),
        F("scope", "enum", { values: ["عام", "حسب الفرع", "حسب المخزن", "حسب النوع"] })
      ],
      rules: [
        "الرقم يُحجَز عند الحفظ لا عند فتح الشاشة — وإلا تظهر ثغرات.",
        "لا يُعاد استخدام رقم وثيقة ملغاة — تبقى ملغاة بنفس الرقم (أثر تدقيقي)."
      ]
    },

    taxType: {
      label: "النوع الضريبي", kind: "config", screen: "op.3.2", layer: 1, key: "code",
      fields: [
        F("code", "code", { req: true, unique: true }),
        F("nameAr", "text", { req: true }),
        F("rate", "num", { req: true, note: "نسبة مئوية" }),
        F("inputAccount", "ref", { to: "account", note: "بتروسبيشل: 120703 ضريبة مدخلات" }),
        F("outputAccount", "ref", { to: "account", note: "بتروسبيشل: 220207 ضريبة مخرجات" })
      ],
      rules: [
        "الربط من op.3.4 (حسابات) و op.3.5 (أصناف).",
        "بتروسبيشل: «السعر شامل ضريبة المبيعات» معطّل ⇒ الضريبة تُضاف فوق السعر لا تُستخرج منه."
      ]
    },

    accountMapping: {
      label: "ربط الحسابات", kind: "config", layer: 1,
      note: "الجسر: يخبر كل نظام أي حساب يستخدم. بدونه لا يُرحَّل شيء.",
      key: ["scope", "sourceKey"],
      fields: [
        F("scope", "enum", { req: true, values: [
          "مخزون", "عملاء", "موردين", "ضرائب", "أصول", "موظفين", "أنواع وثائق"
        ]}),
        F("sourceKey", "text", { req: true, note: "مثل: مجموعة مخزنية، مجموعة عملاء، نوع ضريبي" }),
        F("accountRole", "enum", { req: true, values: [
          "مخزون", "تكلفة المبيعات", "ذمم", "إيراد", "خصم مسموح", "مردودات",
          "ضريبة مدخلات", "ضريبة مخرجات", "فروق تقييم", "وسيط"
        ]}),
        F("account", "ref", { to: "account", req: true })
      ],
      screens: ["op.5.1.2.16", "op.3.4", "op.3.5", "op.4.6.2", "op.1.2.4", "op.1.2.11"],
      rules: [
        "قاعدة ذهبية: **الوثيقة لا تخزّن رقم حساب — تخزّن مفتاح الربط**، ويُحلّ الحساب وقت الترحيل.",
        "تغيير الربط لا يغيّر القيود المرحَّلة سابقاً.",
        "أي دور ربط ناقص = خطأ ترحيل صريح، لا ترحيل صامت لحساب خاطئ."
      ]
    },

    /* ══════════════════════════════════════════════════════════════════
       ط ب ق ة   ا ل ب ي ا ن ا ت   ا ل أ س ا س ي ة
       ══════════════════════════════════════════════════════════════════ */

    item: {
      label: "الصنف", kind: "master", screen: "op.5.1.2.10", layer: 2, key: "code",
      fields: [
        F("code", "code", { req: true, unique: true }),
        F("nameAr", "text", { req: true }),
        F("group", "ref", { to: "itemGroup", req: true, note: "يحدد حسابات الصنف عبر الربط" }),
        F("baseUnit", "ref", { to: "unit", req: true }),
        F("units", "list", { of: "itemUnit", note: "وحدات بديلة بمعامل تحويل" }),
        F("taxType", "ref", { to: "taxType", note: "من op.3.5" }),
        F("valuationMethod", "enum", { values: ["متوسط مرجّح", "الوارد أولاً صادر أولاً", "تكلفة معيارية"],
          pending: "cfg.6.1.1", note: "⚠ غير محسوم في إعدادات بتروسبيشل — «معايير التقييم» قيد التحقق" }),
        F("trackBatch", "bool"), F("trackSerial", "bool"),
        F("reorderLevel", "qty"), F("isSuspended", "bool")
      ],
      rules: [
        "لا يُحذف صنف له حركة.",
        "تغيير وحدة القياس الأساسية ممنوع بعد أول حركة.",
        "تغيير طريقة التقييم يتطلب إعادة تقييم رسمية لا تعديلاً مباشراً."
      ]
    },

    itemGroup: { label: "مجموعة الأصناف", kind: "master", screen: "op.5.1.2.1", layer: 1, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true}),
               F("parent","ref",{to:"itemGroup"}), F("level","num",{calc:true,note:"رئيسية/فرعية/تحت فرعية/مساعدة/تفصيلية"})],
      rules: ["حسابات المخزون تُربط على مستوى المجموعة لا الصنف (op.5.1.2.16)."] },

    unit: { label: "وحدة القياس", kind: "master", screen: "op.5.1.1.2", layer: 1, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true})], rules: [] },

    warehouse: {
      label: "المخزن", kind: "master", screen: "op.5.1.2.9", layer: 2, key: "code",
      fields: [
        F("code", "code", { req: true, unique: true }),
        F("nameAr", "text", { req: true }),
        F("branch", "ref", { to: "branch", req: true }),
        F("group", "ref", { to: "warehouseGroup" }),
        F("inventoryAccount", "ref", { to: "account", note: "أو يُشتق من مجموعة الصنف — انظر accountMapping" }),
        F("isActive", "bool", { def: true })
      ],
      rules: ["الرصيد يُمسك بمفتاح (صنف × مخزن) — وبالدفعة/التسلسل إن كان الصنف يتتبعها."]
    },

    warehouseGroup: { label: "مجموعة المخازن", kind: "master", screen: "op.5.1.2.8", layer: 1, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true})], rules: [] },

    customer: {
      label: "العميل", kind: "master", screen: "op.7.1.2.8", layer: 2, key: "code",
      fields: [
        F("code", "code", { req: true, unique: true }),
        F("nameAr", "text", { req: true }),
        F("group", "ref", { to: "customerGroup", req: true }),
        F("account", "ref", { to: "account", req: true, note: "تحت 1203 ذمم العملاء" }),
        F("taxNumber", "text", { note: "إلزامي للفاتورة الإلكترونية" }),
        F("creditLimit", "money"), F("creditDays", "num"),
        F("salesman", "ref", { to: "salesman" }),
        F("priceList", "ref", { to: "priceList" }),
        F("isSuspended", "bool")
      ],
      rules: [
        "لكل عميل حساب فرعي تحت 1203 — إما مُنشأ آلياً أو مربوط يدوياً.",
        "تجاوز الحد الائتماني: منع أو تحذير حسب الإعداد — لا يُتجاهل صامتاً.",
        "الرقم الضريبي إلزامي ما دامت الفاتورة الإلكترونية مفعّلة (وهي مفعّلة عند بتروسبيشل)."
      ]
    },

    customerGroup: { label: "مجموعة العملاء", kind: "master", screen: "op.7.1.2.2", layer: 1, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true}),
               F("receivableAccount","ref",{to:"account"}), F("revenueAccount","ref",{to:"account"})],
      rules: ["الربط المحاسبي يتم هنا لا على مستوى العميل المفرد."] },

    supplier: {
      label: "المورّد", kind: "master", screen: "op.6.1.2.2", layer: 2, key: "code",
      fields: [
        F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true}),
        F("group","ref",{to:"supplierGroup",req:true}),
        F("account","ref",{to:"account",req:true,note:"تحت 2202 الخصوم المتداولة"}),
        F("taxNumber","text"), F("creditDays","num"), F("isSuspended","bool")
      ],
      rules: ["لكل مورّد حساب فرعي تحت 2202."]
    },

    supplierGroup: { label: "مجموعة الموردين", kind: "master", screen: "op.6.1.2.1", layer: 1, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true}),
               F("payableAccount","ref",{to:"account"})], rules: [] },

    salesman: { label: "مندوب البيع", kind: "master", screen: "op.7.1.2.4", layer: 2, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true}),
               F("commissionRule","ref",{to:"commissionRule"}), F("account","ref",{to:"account"})],
      rules: ["حساب المندوب وسيط — يُصفَّى بالعمولة أو التحصيل."] },

    commissionRule: { label: "قاعدة العمولة", kind: "config", screen: "op.7.2.2", layer: 1, key: "code",
      fields: [F("code","code",{req:true}), F("basis","enum",{values:["نسبة من المبيعات","نسبة من التحصيل","مبلغ ثابت"]}),
               F("rate","num")], rules: [] },

    priceList: { label: "قائمة الأسعار", kind: "master", screen: "op.5.1.2.14", layer: 2, key: "code",
      fields: [F("code","code",{req:true}), F("nameAr","text",{req:true}), F("currency","ref",{to:"currency"}),
               F("validFrom","date"), F("validTo","date")],
      rules: ["تعديل السعر يمر بـ«طلب تعديل تسعيرة» ثم اعتماد — لا تعديل مباشر."] },

    cashbox: { label: "الصندوق", kind: "master", screen: "op.4.1.2.2", layer: 2, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true}),
               F("account","ref",{to:"account",req:true,note:"تحت 1201 الأموال الجاهزة"}),
               F("currency","ref",{to:"currency"}), F("custodian","text")],
      rules: ["لكل صندوق حساب مستقل — لا يُشارك صندوقان حساباً واحداً."] },

    bank: { label: "البنك", kind: "master", screen: "op.4.1.2.3", layer: 2, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true}),
               F("account","ref",{to:"account",req:true,note:"تحت 1201"}),
               F("accountNumber","text"), F("iban","text"), F("currency","ref",{to:"currency"})],
      rules: ["حساب البنك في الدليل ≠ رقم الحساب البنكي — لا تخلط بينهما."] },

    employee: { label: "الموظف", kind: "master", screen: "op.1.2.8", layer: 2, key: "code",
      fields: [F("code","code",{req:true,unique:true}), F("nameAr","text",{req:true}),
               F("account","ref",{to:"account",note:"تحت 1204 ذمم الموظفين"}),
               F("job","text"), F("isActive","bool",{def:true})],
      rules: ["حساب الموظف يُستخدم للسلف والعهد — انظر النظام المقترح prop.hr."] },

    fixedAsset: {
      label: "الأصل الثابت", kind: "master", screen: "prop.assets.inputs.1", layer: 2, key: "code",
      proposed: true,
      fields: [
        F("code","code",{req:true,unique:true}),
        F("nameAr","text",{req:true}),
        F("group","ref",{to:"assetGroup",req:true}),
        F("assetAccount","ref",{to:"account",req:true,note:"تحت 1101"}),
        F("accumDepAccount","ref",{to:"account",req:true,note:"تحت 2203"}),
        F("depExpenseAccount","ref",{to:"account",req:true,note:"تحت 3203"}),
        F("acquisitionDate","date",{req:true}), F("cost","money",{req:true}),
        F("salvageValue","money"), F("usefulLifeMonths","num",{req:true}),
        F("depMethod","enum",{values:["القسط الثابت","القسط المتناقص","وحدات الإنتاج"]}),
        F("costCenter","ref",{to:"costCenter"}), F("location","text"),
        F("accumDepreciation","money",{calc:true}), F("netBookValue","money",{calc:true}),
        F("status","enum",{values:["قيد الاستخدام","مستهلك بالكامل","مستبعد"]})
      ],
      rules: [
        "netBookValue = cost − accumDepreciation، ولا يقل عن salvageValue أبداً.",
        "الأصول الستون الموجودة حالياً كحسابات مفردة تُهاجَر إلى هذا الكيان مع إبقاء حساباتها.",
        "لا يُحذف أصل — يُستبعد بوثيقة استبعاد."
      ]
    },

    assetGroup: { label: "مجموعة الأصول", kind: "master", screen: "prop.assets.setup.2", layer: 1, key: "code",
      proposed: true,
      fields: [F("code","code",{req:true}), F("nameAr","text",{req:true}), F("defaultLifeMonths","num"),
               F("defaultMethod","enum",{values:["القسط الثابت","القسط المتناقص"]})],
      rules: ["تقابل مستوى 1101xx في الدليل: سيارات، آلات، كمبيوترات، أثاث…"] },

    /* ══════════════════════════════════════════════════════════════════
       ط ب ق ة   ا ل د ف ا ت ر  —  تُكتب بالترحيل فقط
       ══════════════════════════════════════════════════════════════════ */

    journalEntry: {
      label: "قيد اليومية", kind: "ledger", screen: "op.4.1.3.14", layer: 4,
      key: "id",
      note: "الدفتر الأم. كل وثيقة مرحَّلة تُنتج قيداً واحداً هنا.",
      fields: [
        F("id","id",{req:true}),
        F("number","text",{req:true,unique:true}),
        F("date","date",{req:true}),
        F("period","ref",{to:"fiscalPeriod",calc:true}),
        F("branch","ref",{to:"branch",req:true}),
        F("docType","ref",{to:"documentType",req:true}),
        F("sourceDoc","text",{note:"نوع الوثيقة المصدر ورقمها — أثر تدقيقي إلزامي"}),
        F("description","text",{req:true}),
        F("currency","ref",{to:"currency"}), F("rate","num"),
        F("totalDebit","money",{calc:true}), F("totalCredit","money",{calc:true}),
        F("status","enum",{values:["مسودة","مرحَّل","ملغى"],def:"مسودة"}),
        F("lines","list",{of:"journalLine",req:true})
      ],
      rules: [
        "⛔ الثابت الأعلى: totalDebit = totalCredit دائماً وبلا استثناء.",
        "سطران على الأقل.",
        "لا يُعدَّل قيد مرحَّل — يُعكَس بقيد عكسي.",
        "كل قيد آلي يحمل sourceDoc — لا قيد يتيم بلا مصدر.",
        "لا ترحيل في فترة غير مفتوحة."
      ]
    },

    journalLine: {
      label: "سطر القيد", kind: "ledger",
      noScreen: "بنية داخلية داخل قيد اليومية — لا شاشة مستقلة.", layer: 4, key: ["entry", "lineNo"],
      fields: [
        F("entry","ref",{to:"journalEntry",req:true}), F("lineNo","num",{req:true}),
        F("account","ref",{to:"account",req:true,note:"يجب أن يكون نهائياً وغير موقوف"}),
        F("debit","money"), F("credit","money"),
        F("costCenter","ref",{to:"costCenter"}), F("project","ref",{to:"project"}),
        F("activity","ref",{to:"activity"}),
        F("currency","ref",{to:"currency"}), F("rate","num"),
        F("amountBase","money",{calc:true,note:"المبلغ بالعملة الأساسية"}),
        F("description","text")
      ],
      rules: [
        "طرف واحد فقط: إما debit أو credit — لا كلاهما ولا صفر.",
        "إن كان الحساب يتطلب مركز تكلفة/مشروع/نشاط فهو إلزامي هنا."
      ]
    },

    stockMovement: {
      label: "حركة المخزون", kind: "ledger",
      noScreen: "دفتر داخلي يُكتب بالترحيل — يُقرأ عبر «تقارير حركة المخزون» (op.5.1.4.2).", layer: 4, key: "id",
      note: "دفتر الكميات والتكلفة — يتزامن مع قيد اليومية ولا ينفصل عنه.",
      fields: [
        F("id","id",{req:true}), F("date","date",{req:true}),
        F("item","ref",{to:"item",req:true}), F("warehouse","ref",{to:"warehouse",req:true}),
        F("batch","text"), F("serial","text"),
        F("direction","enum",{req:true,values:["وارد","صادر"]}),
        F("qty","qty",{req:true}), F("unit","ref",{to:"unit",req:true}),
        F("qtyBase","qty",{calc:true,note:"بالوحدة الأساسية"}),
        F("unitCost","money"), F("totalCost","money",{calc:true}),
        F("sourceDoc","text",{req:true}), F("journalEntry","ref",{to:"journalEntry"})
      ],
      rules: [
        "⛔ كل حركة مخزون لها أثر مالي يجب أن ترتبط بقيد — لا حركة كمية بلا قيمة (إلا الجرد قبل التسوية).",
        "التكلفة تُحسب بطريقة تقييم الصنف — ⚠ الطريقة غير محسومة عند بتروسبيشل (cfg.6.1.1).",
        "لا رصيد سالب إلا إن سُمح به صراحةً في متغيرات المخزون."
      ]
    },

    accountBalance: {
      label: "رصيد الحساب", kind: "ledger",
      noScreen: "دفتر محسوب — يُقرأ عبر «تقارير كشف الحساب» (op.4.1.4.1) وميزان المراجعة.", layer: 5, key: ["account","period","branch"],
      fields: [
        F("account","ref",{to:"account",req:true}), F("period","ref",{to:"fiscalPeriod",req:true}),
        F("branch","ref",{to:"branch",req:true}),
        F("openingDebit","money"), F("openingCredit","money"),
        F("periodDebit","money",{calc:true}), F("periodCredit","money",{calc:true}),
        F("closingBalance","money",{calc:true})
      ],
      rules: [
        "محسوب بالكامل من journalLine — لا يُحرَّر يدوياً.",
        "بتروسبيشل: الأرصدة متعددة السنوات تبدأ من 2023."
      ]
    }
  };

  /* ── طبقات البناء: لا تبنِ طبقة قبل التي تحتها ── */
  var LAYERS = [
    { n: 0, label: "الأساس",           what: "الحسابات، العملات، الفترات، الفروع، الأبعاد التحليلية" },
    { n: 1, label: "التهيئة",          what: "أنواع الوثائق، الترقيم، الضرائب، ربط الحسابات، المجموعات" },
    { n: 2, label: "البيانات الأساسية", what: "الأصناف، المخازن، العملاء، الموردون، الصناديق، البنوك، الأصول" },
    { n: 3, label: "الأرصدة الافتتاحية", what: "أرصدة الحسابات والمخزون والذمم عند بدء التشغيل" },
    { n: 4, label: "الوثائق والدفاتر",  what: "الفواتير والسندات والقيود وحركة المخزون" },
    { n: 5, label: "التقارير والإقفال", what: "الأرصدة، ميزان المراجعة، القوائم، الإقفال الشهري والسنوي" }
  ];

  root.ONYX_SPEC = root.ONYX_SPEC || {};
  root.ONYX_SPEC.entities = ENTITIES;
  root.ONYX_SPEC.layers = LAYERS;
})(window);
