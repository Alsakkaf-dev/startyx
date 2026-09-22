/* ============================================================================
   ONYX ERP — مواصفات الوثائق وقواعد الترحيل المحاسبي
   ----------------------------------------------------------------------------
   هذا الملف يجيب على السؤال الوحيد الذي يقرّر صحة النظام:
       «هذه الوثيقة — ما القيد الذي تُنتجه بالضبط؟»

   بنية قاعدة الترحيل:
       legs: [ { side, account, amount, when? } ]
         side    : "debit" | "credit"
         account : كيفية العثور على الحساب (لا رقم ثابت إلا للحسابات النظامية)
                   { from: "customer.account" }        ← من البيانات الأساسية
                   { map: "مخزون:مخزون" }              ← من جدول ربط الحسابات
                   { fixed: "220207" }                  ← حساب نظامي ثابت
         amount  : تعبير محسوب — انظر AMOUNTS أدناه
         when    : شرط اختياري (مثل: نقدي فقط)

   ⛔ الثابت الذي لا يُكسر: مجموع debit = مجموع credit في كل قيد.
      المُتحقِّق  tools/validate-spec.js  يفحص هذا رياضياً لكل وثيقة.
   ========================================================================== */

(function (root) {
  "use strict";

  /* ── التعبيرات المالية المتاحة داخل القواعد ── */
  var AMOUNTS = {
    gross:        "إجمالي السطور قبل الخصم",
    discount:     "إجمالي الخصم",
    net:          "الصافي بعد الخصم وقبل الضريبة",
    tax:          "مبلغ الضريبة",
    total:        "الإجمالي النهائي = net + tax",
    cost:         "تكلفة البضاعة المنصرفة (من طريقة تقييم الصنف)",
    paid:         "المبلغ المدفوع نقداً",
    onCredit:     "المبلغ الآجل = total − paid",
    qtyValue:     "قيمة الكمية × التكلفة",
    diffValue:    "قيمة فرق الجرد",
    fxDiff:       "فرق العملة"
  };

  /* ── حالات الوثيقة ودورة حياتها ──
       بتروسبيشل: «نظام مراجعة الوثائق» معطّل ⇒ لا خطوة اعتماد إجبارية،
       فالدورة الفعلية: مسودة → مرحَّل. أبقِ «معتمد» في النموذج للتوسّع. */
  var LIFECYCLE = {
    states: ["مسودة", "معتمد", "مرحَّل", "ملغى"],
    active: ["مسودة", "مرحَّل"],
    transitions: [
      { from: "مسودة",  to: "مرحَّل", action: "ترحيل",     effect: "يُنشئ القيد وحركة المخزون" },
      { from: "مسودة",  to: "ملغى",  action: "إلغاء",     effect: "لا أثر محاسبي" },
      { from: "مرحَّل", to: "ملغى",  action: "إلغاء ترحيل", effect: "يُنشئ قيداً عكسياً — لا يحذف الأصلي" }
    ],
    rules: [
      "لا تعديل على وثيقة مرحَّلة — إلغاء ترحيل ثم تعديل ثم إعادة ترحيل.",
      "الإلغاء يحفظ الرقم ولا يعيد استخدامه.",
      "الترحيل عملية ذرّية: القيد وحركة المخزون معاً أو لا شيء."
    ]
  };

  /* مختصر */
  function D(ref, label, o) { return Object.assign({ ref: ref, label: label }, o); }

  var DOCUMENTS = [

    /* ═══════════════════════ الأستاذ العام ═══════════════════════ */

    D("op.4.1.3.14", "قيود اليومية", {
      family: "قيد يومية", entity: "journalEntry", layer: 4,
      role: "الوثيقة الحرة — يدخلها المحاسب مباشرة بحسابات من اختياره.",
      header: ["date", "branch", "docType", "description", "currency", "rate"],
      lines: ["account", "debit", "credit", "costCenter", "project", "activity", "description"],
      posting: {
        mode: "manual",
        legs: [{ side: "both", account: { from: "line.account" }, amount: "line.debit / line.credit" }],
        note: "الحسابات يحدّدها المستخدم — لا اشتقاق آلي."
      },
      validations: [
        "مجموع المدين = مجموع الدائن.",
        "كل سطر له طرف واحد فقط.",
        "كل حساب نهائي وغير موقوف.",
        "التاريخ داخل فترة مفتوحة."
      ],
      dependsOn: ["account", "fiscalPeriod", "documentType", "numberSeries"],
      feeds: ["journalEntry", "accountBalance"]
    }),

    D("op.4.1.3.4", "سند القبض", {
      family: "سند قبض", layer: 4,
      role: "قبض نقدية من عميل أو جهة — يزيد النقدية ويقلّل الذمم.",
      header: ["date", "branch", "cashbox|bank", "payer", "currency", "rate", "description"],
      lines: ["account", "amount", "costCenter", "description"],
      posting: {
        legs: [
          { side: "debit",  account: { from: "header.cashbox.account | header.bank.account" }, amount: "total" },
          { side: "credit", account: { from: "line.account" }, amount: "line.amount" }
        ]
      },
      validations: [
        "الصندوق/البنك إلزامي.",
        "مجموع السطور = إجمالي السند.",
        "إن كان الطرف عميلاً: لا يتجاوز القبض رصيده المدين إلا بسماح صريح."
      ],
      dependsOn: ["cashbox", "bank", "account", "customer"],
      feeds: ["journalEntry"]
    }),

    D("op.4.1.3.6", "سند الصرف", {
      family: "سند صرف", layer: 4,
      role: "صرف نقدية — يقلّل النقدية ويقلّل الالتزام أو يسجّل مصروفاً.",
      header: ["date", "branch", "cashbox|bank", "payee", "currency", "rate", "description"],
      lines: ["account", "amount", "costCenter", "project", "description"],
      posting: {
        legs: [
          { side: "debit",  account: { from: "line.account" }, amount: "line.amount" },
          { side: "credit", account: { from: "header.cashbox.account | header.bank.account" }, amount: "total" }
        ]
      },
      validations: [
        "رصيد الصندوق/البنك لا يصير سالباً إلا بسماح صريح.",
        "مصروفات 3201 تتطلب مركز تكلفة إن كان الحساب يشترطه."
      ],
      dependsOn: ["cashbox", "bank", "account"],
      feeds: ["journalEntry"]
    }),

    D("op.4.1.3.12", "تسوية البنوك", {
      family: "قيد يومية", layer: 4,
      role: "مطابقة كشف البنك بحساب البنك الدفتري وإثبات الفروقات.",
      posting: { legs: [
        { side: "debit",  account: { from: "bank.account | line.account" }, amount: "line.amount", when: "فرق مدين" },
        { side: "credit", account: { from: "bank.account | line.account" }, amount: "line.amount", when: "فرق دائن" }
      ]},
      validations: [
        "الرصيد الدفتري بعد التسوية = رصيد كشف البنك.",
        "كل بند غير مطابق له سبب مصنَّف (شيك لم يُصرف / إيداع لم يُقيَّد / عمولة / فوائد)."
      ],
      dependsOn: ["bank", "account"], feeds: ["journalEntry"]
    }),

    D("op.4.1.3.17", "صرف عملة", {
      family: "قيد يومية", layer: 4,
      role: "تحويل بين عملتين وإثبات فرق الصرف.",
      posting: { legs: [
        { side: "debit",  account: { from: "header.toAccount" },  amount: "total" },
        { side: "credit", account: { from: "header.fromAccount" }, amount: "total" },
        { side: "both",   account: { map: "مخزون:فروق تقييم" },    amount: "fxDiff",
          note: "مدين إن كانت خسارة، دائن إن كان ربحاً" }
      ]},
      validations: ["سعر الصرف إلزامي.", "الفرق يُرحَّل لحساب فروق العملة لا يُهمَل."],
      dependsOn: ["currency", "exchangeRate", "cashbox", "bank"], feeds: ["journalEntry"]
    }),

    /* ═══════════════════════ المبيعات والعملاء ═══════════════════════ */

    D("op.7.5.3.6", "فاتورة المبيعات", {
      family: "فاتورة مبيعات", layer: 4,
      role: "الوثيقة الأكثر تعقيداً: تمسّ الإيراد والضريبة والذمم والمخزون والتكلفة معاً.",
      keyDoc: true,
      header: ["date","branch","customer","salesman","warehouse","priceList","currency","rate",
               "paymentType(نقدي|آجل)","dueDate","description"],
      lines: ["item","warehouse","qty","unit","price","discount","taxType","costCenter"],
      posting: {
        legs: [
          { side: "debit",  account: { from: "header.customer.account" }, amount: "onCredit", when: "آجل أو جزئي" },
          { side: "debit",  account: { from: "header.cashbox.account" },  amount: "paid",     when: "نقدي أو جزئي" },
          { side: "credit", account: { map: "عملاء:إيراد" },              amount: "net" },
          { side: "credit", account: { map: "ضرائب:ضريبة مخرجات" },       amount: "tax",      when: "الضريبة مفعّلة" },
          { side: "debit",  account: { map: "مخزون:تكلفة المبيعات" },     amount: "cost",     when: "المخزون مستمر" },
          { side: "credit", account: { map: "مخزون:مخزون" },              amount: "cost",     when: "المخزون مستمر" }
        ]
        /* قرار محسوم (لا معلّق): مخزون مستمر بمتوسط مرجّح، التكلفة تُرحَّل مع كل فاتورة —
           موثّق ومختبَر فعلياً في server/engines/posting.ts ("sales invoice balances: AR + COGS"). */
      },
      validations: [
        "الكمية > صفر ولا تتجاوز المتاح في المخزن (إلا بسماح السالب).",
        "السعر ≥ الحد الأدنى في مستوى التسعيرة المسموح للمستخدم.",
        "الرقم الضريبي للعميل إلزامي — الفاتورة الإلكترونية مفعّلة عند بتروسبيشل.",
        "الضريبة تُضاف فوق السعر — «السعر شامل الضريبة» معطّل عندكم.",
        "لا تتجاوز الفاتورة الحد الائتماني للعميل إلا بصلاحية تجاوز.",
        "التاريخ داخل فترة مفتوحة."
      ],
      dependsOn: ["customer","item","warehouse","priceList","taxType","salesman","accountMapping"],
      feeds: ["journalEntry","stockMovement","accountBalance"],
      reverses: "op.7.5.3.7"
    }),

    D("op.7.5.3.7", "فاتورة مردود المبيعات", {
      family: "مردود مبيعات", layer: 4,
      role: "عكس فاتورة مبيعات كلياً أو جزئياً.",
      posting: {
        legs: [
          { side: "debit",  account: { map: "عملاء:مردودات" },        amount: "net" },
          { side: "debit",  account: { map: "ضرائب:ضريبة مخرجات" },   amount: "tax", when: "الضريبة مفعّلة" },
          { side: "credit", account: { from: "header.customer.account" }, amount: "total" },
          { side: "debit",  account: { map: "مخزون:مخزون" },           amount: "cost", when: "المخزون مستمر" },
          { side: "credit", account: { map: "مخزون:تكلفة المبيعات" },  amount: "cost", when: "المخزون مستمر" }
        ]
      },
      validations: [
        "لا يتجاوز المردود الكمية المباعة في الفاتورة الأصلية.",
        "⛔ تكلفة المردود = تكلفة البيع الأصلية، لا التكلفة الحالية — وإلا اختلّ المخزون.",
        "سبب المردود إلزامي."
      ],
      dependsOn: ["op.7.5.3.6"], feeds: ["journalEntry","stockMovement"]
    }),

    D("op.7.5.3.4", "فاتورة دفعة مقدمة", {
      family: "فاتورة مبيعات", layer: 4,
      role: "قبض مقدم قبل التسليم — التزام لا إيراد.",
      posting: { legs: [
        { side: "debit",  account: { from: "header.cashbox.account" }, amount: "total" },
        { side: "credit", account: { map: "عملاء:وسيط" }, amount: "net", note: "دفعات مقدمة — حساب التزام" },
        { side: "credit", account: { map: "ضرائب:ضريبة مخرجات" }, amount: "tax", when: "الضريبة مفعّلة" }
      ]},
      validations: ["⛔ لا يُعترف بالإيراد هنا — يُعترف عند التسليم بالفاتورة الفعلية.",
                    "تسوية الدفعة مع الفاتورة النهائية إلزامية."],
      dependsOn: ["customer","cashbox"], feeds: ["journalEntry"]
    }),

    D("op.7.1.3.4", "سند القبض (العملاء)", {
      family: "سند قبض", layer: 4,
      role: "تحصيل من عميل — نسخة نظام العملاء من سند القبض.",
      posting: { legs: [
        { side: "debit",  account: { from: "header.cashbox.account | header.bank.account" }, amount: "total" },
        { side: "credit", account: { from: "header.customer.account" }, amount: "total" }
      ]},
      validations: ["تخصيص المبلغ على فواتير محددة أو على الحساب.",
                    "عمولة التحصيل للمندوب تُحتسب هنا إن كانت القاعدة «نسبة من التحصيل»."],
      dependsOn: ["customer","cashbox","bank","salesman"], feeds: ["journalEntry"]
    }),

    /* ═══════════════════════ المشتريات والموردون ═══════════════════════ */

    D("op.6.2.3.8", "فاتورة المشتريات", {
      family: "فاتورة مشتريات", layer: 4,
      role: "إثبات شراء: يزيد المخزون أو المصروف، ويثبت الالتزام والضريبة القابلة للخصم.",
      keyDoc: true,
      header: ["date","branch","supplier","warehouse","currency","rate","paymentType","dueDate"],
      lines: ["item","warehouse","qty","unit","price","discount","taxType","costCenter"],
      posting: {
        legs: [
          { side: "debit",  account: { map: "مخزون:مخزون" },            amount: "net", when: "صنف مخزني" },
          { side: "debit",  account: { from: "line.expenseAccount" },   amount: "net", when: "صنف خدمي/مصروف" },
          { side: "debit",  account: { map: "ضرائب:ضريبة مدخلات" },     amount: "tax", when: "الضريبة مفعّلة" },
          { side: "credit", account: { from: "header.supplier.account" }, amount: "onCredit", when: "آجل" },
          { side: "credit", account: { from: "header.cashbox.account" },  amount: "paid",     when: "نقدي" }
        ]
      },
      validations: [
        "⛔ تكلفة الصنف الواردة تشمل المصاريف الإضافية الموزَّعة (شحن، جمارك) لا سعر الفاتورة فقط.",
        "الضريبة المدخلة تُرحَّل لـ 120703 وتخصم من ضريبة المخرجات في الإقرار.",
        "رقم فاتورة المورّد إلزامي ولا يتكرر لنفس المورّد."
      ],
      dependsOn: ["supplier","item","warehouse","taxType","accountMapping"],
      feeds: ["journalEntry","stockMovement"],
      reverses: "op.6.2.3.12"
    }),

    D("op.6.2.3.12", "فاتورة مردود المشتريات", {
      family: "مردود مشتريات", layer: 4,
      role: "إرجاع بضاعة للمورّد.",
      posting: { legs: [
        { side: "debit",  account: { from: "header.supplier.account" }, amount: "total" },
        { side: "credit", account: { map: "مخزون:مخزون" },              amount: "net" },
        { side: "credit", account: { map: "ضرائب:ضريبة مدخلات" },       amount: "tax", when: "الضريبة مفعّلة" }
      ]},
      validations: ["الكمية لا تتجاوز المستلمة.", "التكلفة = تكلفة الاستلام الأصلية."],
      dependsOn: ["op.6.2.3.8"], feeds: ["journalEntry","stockMovement"]
    }),

    D("op.6.2.3.9", "فاتورة المشتريات الخارجية", {
      family: "فاتورة مشتريات", layer: 4,
      role: "استيراد — تكلفة الصنف تُبنى من عناصر متعددة عبر الاعتماد المستندي.",
      posting: { legs: [
        { side: "debit",  account: { map: "مخزون:وسيط" }, amount: "net",
          note: "حساب اعتماد مستندي (1205) حتى اكتمال التكلفة" },
        { side: "credit", account: { from: "header.supplier.account" }, amount: "total" }
      ]},
      validations: [
        "⛔ لا تُرحَّل التكلفة للمخزون قبل توزيع كل المصاريف (شحن، تأمين، جمارك، تخليص).",
        "الاعتماد يُقفل عند الاستلام النهائي وتوزيع التكلفة."
      ],
      dependsOn: ["supplier","currency","exchangeRate"], feeds: ["journalEntry"]
    }),

    D("op.6.1.3.3", "سند الصرف (الموردون)", {
      family: "سند صرف", layer: 4,
      role: "سداد لمورّد.",
      posting: { legs: [
        { side: "debit",  account: { from: "header.supplier.account" }, amount: "total" },
        { side: "credit", account: { from: "header.cashbox.account | header.bank.account" }, amount: "total" }
      ]},
      validations: ["تخصيص السداد على فواتير محددة أو على الحساب."],
      dependsOn: ["supplier","cashbox","bank"], feeds: ["journalEntry"]
    }),

    /* ═══════════════════════ المخازن ═══════════════════════ */

    D("op.5.1.3.2", "إذن التوريد المخزني", {
      family: "توريد مخزني", layer: 4,
      role: "استلام بضاعة فعلياً — قد يسبق الفاتورة.",
      posting: {
        legs: []
        /* قرار محسوم (لا معلّق) — GO/05-warehouse.md IV-D27 (2026-09-16): هذا "محضر فحص واعتماد
           بلا أثر مخزني ولا محاسبي" (صفر صفوف حقيقية 2026)، خرج من نطاق الـ56 وعوّضه op.5.1.3.16
           (أمر التوريد المخزني) الذي يحرّك المخزون ويولّد القيد فعلاً. لا قيد هنا إطلاقاً. */
      },
      validations: ["الكمية > صفر.", "المخزن نشط.", "الدفعة/التسلسل إلزامي إن كان الصنف يتتبعه."],
      dependsOn: ["item","warehouse","supplier"], feeds: ["stockMovement","journalEntry"]
    }),

    D("op.5.1.3.4", "أمر الصرف المخزني", {
      family: "صرف مخزني", layer: 4,
      role: "إخراج بضاعة لغير البيع (استهلاك، إنتاج، عهدة).",
      posting: { legs: [
        { side: "debit",  account: { map: "مخزون:وسيط" }, amount: "cost",
          note: "حساب الجهة المستفيدة — يُحدَّد من «ربط حسابات أمر الصرف»" },
        { side: "credit", account: { map: "مخزون:مخزون" }, amount: "cost" }
      ]},
      validations: ["الرصيد المتاح يكفي.", "جهة الصرف إلزامية (مركز تكلفة/مشروع/موظف)."],
      dependsOn: ["item","warehouse","costCenter","accountMapping"],
      feeds: ["stockMovement","journalEntry"]
    }),

    D("op.5.1.3.5", "التحويل المخزني", {
      family: "تحويل مخزني", layer: 4,
      role: "نقل بين مخزنين.",
      posting: {
        legs: [
          { side: "debit",  account: { map: "مخزون:مخزون" }, amount: "cost", note: "حساب المخزن المستلم" },
          { side: "credit", account: { map: "مخزون:مخزون" }, amount: "cost", note: "حساب المخزن المرسل" }
        ],
        note: "إن كان المخزنان يشتركان في نفس الحساب فلا قيد — حركة كمية فقط."
      },
      validations: [
        "⛔ التكلفة تنتقل كما هي — التحويل لا يُنشئ ربحاً ولا خسارة أبداً.",
        "المخزن المرسل ≠ المستلم.",
        "إن كان التحويل يحتاج استلاماً فالكمية تبقى «في الطريق» حتى op.5.1.3.6."
      ],
      dependsOn: ["item","warehouse"], feeds: ["stockMovement","journalEntry"]
    }),

    D("op.5.1.3.6", "إستلام تحويل مخزني", {
      family: "تحويل مخزني", layer: 4,
      role: "إقفال التحويل في المخزن المستلم.",
      posting: { legs: [
        { side: "debit",  account: { map: "مخزون:مخزون" }, amount: "cost" },
        { side: "credit", account: { map: "مخزون:وسيط" },  amount: "cost", note: "بضاعة في الطريق" }
      ]},
      validations: ["الكمية المستلمة ≤ المرسلة.", "الفرق يُعالَج كعجز بتسوية مستقلة لا يُهمَل."],
      dependsOn: ["op.5.1.3.5"], feeds: ["stockMovement","journalEntry"]
    }),

    D("op.5.1.3.8", "تسوية مخزون", {
      family: "تسوية مخزون", layer: 4,
      role: "تصحيح الرصيد الدفتري ليطابق الجرد الفعلي.",
      posting: {
        legs: [
          { side: "debit",  account: { map: "مخزون:مخزون" },  amount: "diffValue", when: "زيادة" },
          { side: "credit", account: { map: "مخزون:وسيط" },   amount: "diffValue", when: "زيادة" },
          { side: "debit",  account: { map: "مخزون:وسيط" },   amount: "diffValue", when: "عجز" },
          { side: "credit", account: { map: "مخزون:مخزون" },  amount: "diffValue", when: "عجز" }
        ],
        note: "حساب الوسيط هنا = حساب فروقات الجرد (مصروف أو إيراد حسب الاتجاه)."
      },
      validations: [
        "التسوية تستند إلى طلب تسوية موثَّق (op.5.1.3.7) — لا تسوية بلا طلب.",
        "سبب الفرق إلزامي.",
        "صلاحية التسوية أعلى من صلاحية الطلب (فصل المهام)."
      ],
      dependsOn: ["item","warehouse","accountMapping"], feeds: ["stockMovement","journalEntry"]
    })
  ];

  /* ══════════════════════════════════════════════════════════════════════
     وثائق إجرائية — لا تُنتج قيداً محاسبياً
     ----------------------------------------------------------------------
     في أونيكس تُفصَل «العمليات الإجرائية» عن «العمليات الأساسية»:
     الطلبات والأوامر تُوثّق النية وتُتابَع، ولا تمسّ الحسابات حتى تتحوّل
     إلى وثيقة أساسية. برمجتها أبسط — لكن لا تُهملها: منها يأتي الربط
     والمتابعة ومنع الازدواج.
     ══════════════════════════════════════════════════════════════════════ */
  var NON_POSTING = [
    { ref: "op.5.1.3.3",  label: "طلب صرف/تحويل مواد", becomes: "op.5.1.3.4 أو op.5.1.3.5",
      why: "طلب من قسم للمخزن — لا حركة مخزون حتى يُنفَّذ." },
    { ref: "op.5.1.3.7",  label: "طلب تسوية مخزون",    becomes: "op.5.1.3.8",
      why: "يوثّق الفرق المكتشف؛ التسوية المعتمدة هي التي تُرحَّل (فصل مهام)." },
    { ref: "op.6.2.3.5",  label: "أوامر الشراء",       becomes: "op.6.2.3.8",
      why: "التزام تعاقدي لا محاسبي — القيد عند الاستلام أو الفاتورة." },
    { ref: "op.6.2.3.6",  label: "متابعة أوامر الشراء", becomes: null,
      why: "شاشة متابعة — للعرض فقط." },
    { ref: "op.7.5.3.8",  label: "تعديل بيانات فاتورة المبيعات", becomes: null,
      why: "تعديل حقول وصفية لا مالية (عنوان، مندوب). ⛔ إن مسّ مبلغاً فهو مردود أو إشعار لا تعديل." }
  ];

  /* وثائق تُرحَّل لكن مواصفتها لم تُكتب بعد (تُضاف عند الحاجة) */
  var PENDING_SPEC = [
    { ref: "op.4.1.3.9",  label: "إستحقاق شبكات سندات القبض - يدويًا" },
    { ref: "op.4.1.3.10", label: "إستحقاق شبكات سندات الصرف - يدويًا" },
    { ref: "op.4.1.3.21", label: "قيود بنكية" },
    { ref: "op.5.1.3.16", label: "أمر التوريد المخزني" },
    { ref: "op.5.1.3.10", label: "طلب صرف توالف" },
    { ref: "op.6.1.3.4",  label: "اشعارات الموردين" },
    { ref: "op.6.2.3.10", label: "إذن توريد المشتريات الخارجية" },
    { ref: "op.7.1.3.2",  label: "إشعارات العملاء" },
    { ref: "op.7.1.3.6",  label: "فواتير مردود المبيعات المستحقة للسداد" },
    { ref: "op.7.5.3.5",  label: "مرتجع فاتورة دفعة مقدمة" },
    { ref: "op.5.1.3.15", label: "توريد/صرف عمليات أخرى QR CODE" }
  ];

  root.ONYX_SPEC = root.ONYX_SPEC || {};
  root.ONYX_SPEC.amounts = AMOUNTS;
  root.ONYX_SPEC.lifecycle = LIFECYCLE;
  root.ONYX_SPEC.documents = DOCUMENTS;
  root.ONYX_SPEC.nonPosting = NON_POSTING;
  root.ONYX_SPEC.pendingSpec = PENDING_SPEC;
})(window);
