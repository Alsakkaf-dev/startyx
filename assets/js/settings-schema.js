/* ============================================================================
   ONYX ERP — مخطّط إعدادات النظام
   ----------------------------------------------------------------------------
   هذا ملف **إعدادات**، لا ملف تصفّح. كل بند هنا شيء يُضبَط، لا شيء يُقرأ.

   حالة كل بند (state):
     locked    مضبوط في النظام المثبَّت ولا يُغيَّر من هنا (هوية، إصدار)
     set       مؤكَّد من النظام — قابل للتغيير في النظام الذي نبنيه
     pending   لم يُقرأ بعد من أونيكس — افتح الشاشة واقرأ القيمة
     decision  قرار يحجب البرمجة (BLK) — ضبطه يفتح مراحل بناء كاملة

   أنواع الحقول (type):
     switch · select · number · text · account

   شكل عرض القوائم (ui):
     segmented   أزرار متجاورة — للخيارات القليلة القصيرة (الأسرع قراءةً وضغطاً)
     cards       بطاقات مشروحة — للقرارات التي يحتاج كل خيار فيها جملة تفسير
     (بلا ui)    قائمة منسدلة — للخيارات الكثيرة أو الطويلة

   والخيار إمّا نصّ، أو { v: القيمة المخزَّنة, t: التسمية القصيرة, h: شرح سطر }
   ========================================================================== */
(function (root) {
  "use strict";

  /* مختصرات بناء الحقول */
  function sw(id, label, o)   { return Object.assign({ id: id, label: label, type: "switch" }, o || {}); }
  function sel(id, label, options, o) { return Object.assign({ id: id, label: label, type: "select", options: options }, o || {}); }
  function num(id, label, o)  { return Object.assign({ id: id, label: label, type: "number" }, o || {}); }
  function txt(id, label, o)  { return Object.assign({ id: id, label: label, type: "text" }, o || {}); }
  function acc(id, label, o)  { return Object.assign({ id: id, label: label, type: "account" }, o || {}); }

  var TABS = [

  /* ══════════════════════════ ① عام ══════════════════════════ */
  {
    id: "general", label: "عام", icon: "landmark",
    group: "أساسيات",
    intro: "هوية الوحدة المحاسبية والفترة المالية والعملة — تُضبط مرة واحدة قبل أي قيد.",
    groups: [
      {
        label: "الشركة والوحدة المحاسبية",
        note: "مقروءة من الشاشة الرئيسية للنظام المثبَّت. تغييرها في النظام الجديد يتم من شاشة الفروع والشركات.",
        fields: [
          txt("org.name", "اسم الشركة", { state: "locked", src: "cfg.1.1", value: "شركة بتروسبيشل لزيوت التشحيم" }),
          txt("org.unit", "الوحدة المحاسبية", { state: "locked", src: "cfg.1.2", value: "الإدارة" }),
          txt("org.version", "إصدار أونيكس المرجعي", { state: "locked", src: "cfg.1.4", value: "V8.1.27-10-2024", ltr: true }),
          txt("org.lastEdit", "آخر تعديل للمتغيرات العامة", { state: "locked", src: "cfg.1.10", value: "03/07/2024 — محسن السقاف" }),
          sw("org.multiCompany", "تفعيل أكثر من شركة/فرع", {
            state: "set", value: false, src: "cfg.3.9",
            help: "معطّل عندكم: القوائم المالية لوحدة محاسبية واحدة. تفعيله يفرض بُعد الفرع على كل قيد.",
            screen: "op.1.1.11"
          })
        ]
      },
      {
        label: "الفترة المالية والتقويم",
        fields: [
          txt("fiscal.current", "الفترة المالية الحالية", { state: "locked", src: "cfg.1.3", value: "2026 / 1" }),
          sel("fiscal.calendar", "تقويم النظام", ["ميلادي", "هجري", "الاثنان معاً"], {
            state: "set", value: "ميلادي", src: "cfg.1.6", screen: "op.1.1.1", ui: "segmented"
          }),
          num("fiscal.glFrom", "أرصدة الحسابات متعددة السنوات تبدأ من", {
            state: "set", value: 2023, src: "cfg.1.7", min: 2000, max: 2100
          }),
          num("fiscal.invFrom", "الأرصدة المخزنية متعددة السنوات تبدأ من", {
            state: "set", value: 2023, src: "cfg.1.8", min: 2000, max: 2100
          }),
          sel("fiscal.periodLen", "طول الفترة المحاسبية", ["شهرية", "ربع سنوية", "نصف سنوية", "سنوية"], {
            state: "pending", src: "cfg.6.4.4", screen: "op.1.1.2", ui: "segmented",
            help: "اقرأها من «إعداد فترات النظام» — تحدّد متى يُقفَل الترحيل."
          })
        ]
      },
      {
        label: "الإقفال",
        note: "⛔ INV-4: لا ترحيل في فترة مقفلة. كسر هذا الثابت يغيّر أرقام فترة صدرت تقاريرها.",
        fields: [
          sw("close.blockPosting", "منع الترحيل في فترة مقفلة", {
            state: "set", value: true, hard: true, src: "cfg.6.4.4", screen: "op.1.1.2",
            help: "ثابت لا يُكسر. إبقاؤه مطفأً يعني أن تقاريرك الصادرة قابلة للتغيير بأثر رجعي."
          }),
          acc("close.retainedEarnings", "حساب الأرباح المرحّلة (إقفال سنوي)", {
            state: "pending", src: "op.1.2.4", prefix: "3",
            help: "الحساب الذي تُرحَّل إليه نتيجة النشاط عند الإقفال السنوي."
          })
        ]
      },
      {
        label: "العملات",
        fields: [
          txt("cur.base", "عملة الأساس", { state: "pending", src: "cfg.6.4.5", screen: "op.1.1.3",
            help: "اقرأها من «تهيئة العملات» — كل التقارير تُبنى عليها." }),
          sw("cur.multi", "تفعيل تعدد العملات", { state: "pending", src: "cfg.6.4.5", screen: "op.1.1.3" }),
          acc("cur.diffAccount", "حساب فروق أسعار الصرف", { state: "pending", src: "op.1.2.4", prefix: "3",
            help: "يُقيَّد فيه الفرق عند اختلاف سعر الصرف بين الاستحقاق والسداد." }),
          sel("cur.rateSource", "سعر الصرف المعتمد في الترحيل", [
            { v: "سعر يوم الوثيقة", t: "يوم الوثيقة", h: "الأدق محاسبياً" },
            { v: "سعر ثابت للفترة", t: "ثابت للفترة", h: "أبسط، ويؤجّل الفروق للإقفال" },
            { v: "سعر يدوي لكل وثيقة", t: "يدوي", h: "يفتح باب الخطأ البشري" }
          ], { state: "pending", src: "cfg.6.4.5", screen: "op.1.1.3", ui: "segmented" })
        ]
      },
      {
        label: "الواجهة",
        fields: [
          sel("ui.lang", "لغة الواجهة", ["عربي (1)", "إنجليزي (2)"], {
            state: "set", value: "عربي (1)", src: "cfg.1.5", ui: "segmented" }),
          sel("ui.density", "كثافة العرض", ["مريحة", "مضغوطة"], {
            state: "set", value: "مريحة", src: "cfg.1.5", local: "density", ui: "segmented" }),
          sel("ui.theme", "السمة", ["حسب النظام", "فاتحة", "داكنة"], {
            state: "set", value: "حسب النظام", src: "cfg.1.5", local: "theme", ui: "segmented" })
        ]
      }
    ]
  },

  /* ══════════════════════ ② الخصائص العامة ══════════════════════ */
  {
    id: "features", label: "الخصائص", icon: "sliders",
    group: "أساسيات",
    intro: "المفاتيح الرئيسية للنظام — كل مفتاح هنا يفتح أو يغلق منظومة كاملة من الشاشات والقيود.",
    groups: [
      {
        label: "مفعّل في نظامكم",
        note: "أربع خصائص مؤكَّدة التفعيل من النظام المثبَّت.",
        fields: [
          sw("f.vat", "ضريبة القيمة المضافة", { state: "set", value: true, src: "cfg.2.1", screen: "op.3.2",
            help: "تفعيلها يجعل كل فاتورة تولّد طرفاً ضريبياً في القيد." }),
          sw("f.einvoice", "الفاتورة الإلكترونية", { state: "set", value: true, src: "cfg.2.2",
            help: "تفرض حقولاً إلزامية في الفاتورة ورقم تسلسلي لا ينقطع." }),
          sw("f.reportSearch", "محرك بحث التقارير", { state: "set", value: true, src: "cfg.2.3" }),
          sw("f.reportHeader", "ترويسة التقارير حسب المستخدم", { state: "set", value: true, src: "cfg.2.4" })
        ]
      },
      {
        label: "معطّل — خارج نطاق النظام الجديد",
        note: "اثنتا عشرة خاصية معطّلة عمداً في نظامكم. تفعيل أي منها يضيف شاشات وقواعد ترحيل جديدة — لا تفعّلها إلا بقرار.",
        fields: [
          sw("f.priceInclTax", "السعر شامل ضريبة المبيعات", { state: "set", value: false, src: "cfg.3.1",
            help: "تفعيلها يقلب حساب الوعاء الضريبي في كل سطر فاتورة." }),
          sw("f.docReview", "نظام مراجعة الوثائق", { state: "set", value: false, src: "cfg.3.2",
            help: "يضيف حالة «مراجَعة» بين الحفظ والترحيل." }),
          sw("f.detailedStock", "نظام المخزون المفصل", { state: "set", value: false, src: "cfg.3.3",
            help: "الدفعات وتواريخ الصلاحية والأرقام التسلسلية." }),
          sw("f.glOnly", "وضع الأستاذ العام فقط", { state: "set", value: false, src: "cfg.3.4",
            help: "تفعيله يعطّل أنظمة المخزون والمبيعات والمشتريات كلها." }),
          sw("f.branchAuto", "التوسيط الآلي لحساب جاري الفروع", { state: "set", value: false, src: "cfg.3.5" }),
          sw("f.pos", "المنافذ البيعية (POS)", { state: "set", value: false, src: "cfg.3.6" }),
          sw("f.wht", "خصم الضريبة من المصدر", { state: "set", value: false, src: "cfg.3.7" }),
          sw("f.sfda", "الربط مع هيئة الغذاء والدواء", { state: "set", value: false, src: "cfg.3.8" }),
          sw("f.multiUnitFS", "صلاحية القوائم المالية لأكثر من وحدة محاسبية", { state: "set", value: false, src: "cfg.3.9" }),
          sw("f.oneDevice", "منع اتصال المستخدم من أكثر من جهاز", { state: "set", value: false, src: "cfg.3.10" }),
          sw("f.bindDevice", "ربط المستخدم بجهاز واحد", { state: "set", value: false, src: "cfg.3.11" }),
          sw("f.liteBranch", "منع صلاحية أكثر من فرع في نظام اللايت", { state: "set", value: false, src: "cfg.3.12" })
        ]
      }
    ]
  },

  /* ═════════════════ ③ الحسابات والترحيل ═════════════════ */
  {
    id: "gl", label: "الحسابات والترحيل", icon: "book",
    group: "المحاسبة",
    intro: "قواعد الدليل المحاسبي وخدمة الترحيل. ما يُضبط هنا يسري على كل وثيقة في كل نظام.",
    groups: [
      {
        label: "بنية الدليل المحاسبي",
        note: "الدليل شاشة تهيئة (op.1.2.3) تسبق كل نظام، وبنيتها تُضبط من op.1.1.13.",
        fields: [
          num("gl.levels", "عدد مستويات الدليل", { state: "pending", src: "cfg.6.1.7", screen: "op.1.1.13", min: 2, max: 9,
            help: "اقرأه من «تهيئة الدليل المحاسبي». دليلكم الحالي يصل إلى ١٠ خانات في الحساب التفصيلي." }),
          sel("gl.codeMode", "ترقيم الحسابات", ["يدوي", "آلي متسلسل", "آلي حسب المستوى"], {
            state: "pending", src: "cfg.6.1.7", screen: "op.1.1.13", ui: "segmented"
          }),
          sw("gl.leafOnly", "منع القيد على حساب غير نهائي", {
            state: "set", value: true, hard: true, src: "cfg.6.1.7", screen: "op.1.1.13",
            help: "⛔ INV-5. إطفاؤه يُنتج أرصدة مزدوجة: رصيد في الأب ورصيد في الأبناء."
          }),
          sw("gl.blockDeleteUsed", "منع حذف حساب له حركة", { state: "set", value: true, hard: true, src: "cfg.6.1.7" })
        ]
      },
      {
        label: "ثوابت الترحيل",
        note: "⛔ هذه ثوابت خدمة الترحيل المشتركة. ضعها في خدمة واحدة لا مكرّرة في كل شاشة.",
        fields: [
          sw("post.balanced", "إلزام توازن القيد (مدين = دائن)", { state: "set", value: true, hard: true, src: "cfg.6.1.2",
            help: "⛔ INV-1. بدونه لا يتوازن ميزان المراجعة أصلاً." }),
          sw("post.sourceRequired", "إلزام مصدر موثَّق لكل قيد آلي", { state: "set", value: true, hard: true, src: "cfg.6.1.2",
            help: "⛔ INV-2. بدونه يستحيل التدقيق: قيد بلا وثيقة تولّده." }),
          sw("post.reverseOnly", "التعديل على المرحَّل بالعكس فقط", { state: "set", value: true, hard: true, src: "cfg.6.2.1",
            help: "⛔ INV-6. التعديل المباشر يضيّع الأثر التدقيقي." }),
          sw("post.atomicStock", "القيد وحركة المخزون في معاملة ذرّية", { state: "set", value: true, hard: true, src: "cfg.6.1.3",
            help: "⛔ INV-3. فصلهما يُنتج مخزوناً بلا قيمة أو قيمة بلا مخزون." }),
          sel("post.accountResolve", "كيف تُحلّ الحسابات وقت الترحيل", [
            { v: "الوثيقة تخزّن مفتاح الربط ويُحلّ الحساب وقت الترحيل ثم يُجمَّد في القيد",
              t: "مفتاح ربط يُحلّ ثم يُجمَّد",
              h: "الصحيح. تغيير الربط لاحقاً لا يمسّ قيداً قديماً، وغياب ربط مطلوب يوقف الترحيل برسالة تسمّي الشاشة الناقصة." },
            { v: "الوثيقة تخزّن رقم الحساب مباشرة",
              t: "رقم حساب مباشر",
              h: "⛔ خطأ لا يُصلَح لاحقاً: تغيير ربط الحسابات يفسد قيوداً مرحَّلة." }
          ], {
            state: "set", value: "الوثيقة تخزّن مفتاح الربط ويُحلّ الحساب وقت الترحيل ثم يُجمَّد في القيد",
            hard: true, src: "cfg.6.1.2", ui: "cards",
            help: "القاعدة الذهبية في الترحيل — عليها يقوم كل ما بعدها."
          })
        ]
      },
      {
        label: "أنواع وثائق الأستاذ العام",
        note: "لكل نوع وثيقة: بادئة ترقيم وسلوك ترحيل ومستوى اعتماد.",
        fields: [
          sw("gl.typesJournal", "تفعيل أنواع قيود اليومية", { state: "pending", src: "cfg.6.2.1", screen: "op.4.1.1.6" }),
          sw("gl.typesVoucher", "تفعيل أنواع القبض والصرف", { state: "pending", src: "cfg.6.2.2", screen: "op.4.1.1.7" }),
          sw("gl.glVars", "متغيرات الأستاذ العام مقروءة ومضبوطة", {
            state: "pending", src: "cfg.6.1.7", screen: "op.4.1.1.1",
            help: "افتح الشاشة واقرأ كل متغيّر، ثم فعّل هذا البند تأكيداً."
          })
        ]
      },
      {
        label: "جسور الربط المحاسبي",
        note: "⚠ من لم يضبط شاشة الربط لن يُرحَّل نظامه للدليل مهما كانت الحسابات صحيحة.",
        fields: [
          sw("bridge.glFlows", "ربط الحسابات بالحسابات العامة والتدفقات النقدية", {
            state: "pending", src: "cfg.6.1.2", screen: "op.1.2.4", bridge: true
          }),
          sw("bridge.otherDrCr", "ربط الحسابات المدينة والدائنة الأخرى", {
            state: "pending", src: "cfg.6.1.2", screen: "op.1.2.11", bridge: true
          }),
          sw("bridge.projects", "ربط الحسابات بالمشاريع", { state: "pending", src: "cfg.6.1.2", screen: "op.4.1.2.8", bridge: true }),
          sw("bridge.activities", "ربط الحسابات بالأنشطة", { state: "pending", src: "cfg.6.1.2", screen: "op.4.1.2.9", bridge: true })
        ]
      },
      {
        label: "حسابات افتراضية",
        note: "الحسابات التي تلجأ إليها خدمة الترحيل حين لا يوجد ربط أدق. غيابها يوقف الترحيل برسالة واضحة — لا ترحيل صامت لحساب خاطئ.",
        fields: [
          acc("def.rounding", "حساب فروق التقريب", { state: "pending", src: "op.1.2.4", prefix: "3" }),
          acc("def.suspense", "حساب الوسيط المؤقت", { state: "pending", src: "op.1.2.11", prefix: "1" }),
          acc("def.cashShort", "حساب العجز والزيادة النقدية", { state: "pending", src: "op.1.2.11", prefix: "3" })
        ]
      }
    ]
  },

  /* ═════════════════ ④ المخزون والتكلفة ═════════════════ */
  {
    id: "inventory", label: "المخزون والتكلفة", icon: "package",
    group: "المحاسبة",
    intro: "⛔ هذا التبويب يحوي القرارات الثلاثة التي تحجب البرمجة اليوم. ضبطها يفتح مراحل البناء ٦ و٧ و٨.",
    groups: [
      {
        label: "طريقة التقييم — قرار حاجب",
        note: "BLK-1 · يحجب دورة المشتريات والمبيعات وحركات المخزون. اقرأ القيمة من «معايير التقييم» في أونيكس المثبَّت.",
        fields: [
          sel("inv.costing", "طريقة تسعير المخزون", [
            { v: "متوسط مرجّح", t: "متوسط مرجّح", h: "الأشيع في مخازن الزيوت — تكلفة واحدة تتحرّك مع كل توريد" },
            { v: "FIFO — الوارد أولاً صادر أولاً", t: "FIFO", h: "الوارد أولاً صادر أولاً — يتطلّب تتبّع الدفعات" },
            { v: "LIFO", t: "LIFO", h: "الوارد أخيراً صادر أولاً — مرفوض في أغلب المعايير" },
            { v: "تكلفة معيارية", t: "تكلفة معيارية", h: "سعر مخطَّط مع قيد انحراف" }
          ], {
            state: "decision", blocker: "BLK-1", src: "cfg.6.1.1", screen: "op.5.1.1.12", ui: "cards",
            help: "تحدّد كيف تُحسب تكلفة كل صرف. تغييرها بعد أول حركة يعني إعادة تقييم المخزون كله."
          }),
          sel("inv.system", "نظام الجرد", [
            { v: "مستمر — التكلفة تُرحَّل مع كل حركة", t: "مستمر", h: "تكلفة المبيعات طرف في قيد الفاتورة" },
            { v: "دوري — التكلفة تُحسب عند الجرد", t: "دوري", h: "التكلفة تُؤجَّل لقيد جرد" }
          ], {
            state: "decision", blocker: "BLK-1", src: "cfg.6.1.1", screen: "op.5.1.1.12", ui: "segmented",
            help: "المستمر يجعل تكلفة المبيعات طرفاً في قيد الفاتورة. الدوري يؤجّلها لقيد جرد."
          }),
          sw("inv.negativeStock", "السماح بالرصيد السالب", {
            state: "pending", src: "cfg.6.1.8", screen: "op.5.1.1.1",
            help: "السماح به مع التقييم بالمتوسط المرجّح يُنتج تكاليف سالبة يصعب تسويتها."
          })
        ]
      },
      {
        label: "ربط حسابات المخزون — قرار حاجب",
        note: "BLK-2 · يحجب التهيئة ودورة المشتريات. افتح op.5.1.2.16 وانظر أعمدة المفتاح.",
        fields: [
          sel("inv.mapLevel", "مستوى ربط حسابات المخزون بالأستاذ العام", [
            { v: "على مستوى مجموعة الصنف", t: "مجموعة الصنف", h: "الأشيع — صفّ ربط لكل مجموعة" },
            { v: "على مستوى المخزن", t: "المخزن", h: "لفصل أرصدة المخازن محاسبياً" },
            { v: "على مستوى الصنف", t: "الصنف", h: "الأدقّ والأثقل — صفّ لكل صنف" },
            { v: "مجموعة الصنف + المخزن معاً", t: "مجموعة + مخزن", h: "مفتاح مركّب — جدول أكبر ومرونة أعلى" }
          ], {
            state: "decision", blocker: "BLK-2", src: "cfg.6.1.3", screen: "op.5.1.2.16", bridge: true, ui: "cards",
            help: "يحدّد شكل جدول الربط كله. اختياره خطأ يعني إعادة بناء الجدول وكل ما يقرأ منه."
          }),
          acc("inv.stockAccount", "حساب المخزون الافتراضي", { state: "pending", src: "op.5.1.2.16", prefix: "1" }),
          acc("inv.cogsAccount", "حساب تكلفة المبيعات", { state: "pending", src: "op.5.1.2.16", prefix: "3" }),
          acc("inv.adjustAccount", "حساب تسويات المخزون", { state: "pending", src: "op.5.1.2.16", prefix: "3" })
        ]
      },
      {
        label: "إذن التوريد — قرار حاجب",
        note: "BLK-3 · يحجب دورة المشتريات. رحّل إذناً تجريبياً في أونيكس وانظر هل ولّد قيداً.",
        fields: [
          sw("inv.grnPosts", "إذن التوريد يُرحَّل محاسبياً", {
            state: "decision", blocker: "BLK-3", src: "cfg.6.1.1", screen: "op.5.1.2.1",
            help: "لو كان كمياً فقط فالقيد ينشأ من الفاتورة وحدها. لو رحّل محاسبياً فلا بد من حساب «بضاعة بالطريق» ومعالجة فرق الكمية بين الإذن والفاتورة."
          }),
          acc("inv.goodsInTransit", "حساب بضاعة واردة لم تُفوتر", {
            state: "pending", src: "op.5.1.2.16", prefix: "1",
            help: "مطلوب فقط إن كان إذن التوريد يُرحَّل محاسبياً."
          }),
          sw("inv.costOnPurchase", "تكاليف الشراء تُحمَّل على تكلفة الصنف", {
            state: "pending", src: "cfg.6.1.8", screen: "op.6.2.1.1",
            help: "الشحن والتأمين والجمارك: تُرسمل على الصنف أم تُصرَف كمصروف فترة؟"
          })
        ]
      },
      {
        label: "أنواع حركات المخزون",
        fields: [
          sw("inv.typesReceive", "أنواع التوريد", { state: "pending", src: "cfg.6.2.6", screen: "op.5.1.1.8" }),
          sw("inv.typesIssue", "أنواع الصرف", { state: "pending", src: "cfg.6.2.6", screen: "op.5.1.1.9" }),
          sw("inv.typesTransfer", "أنواع التحويل", { state: "pending", src: "cfg.6.2.6", screen: "op.5.1.1.10" }),
          sw("inv.typesAdjust", "أنواع تسوية المخزون", { state: "pending", src: "cfg.6.2.6", screen: "op.5.1.1.11" })
        ]
      },
      {
        label: "بنية الأصناف والمخازن",
        fields: [
          num("inv.itemGroupLevels", "مستويات مجموعات الأصناف", { state: "pending", src: "cfg.6.3.3", min: 1, max: 6,
            help: "شجرتكم تذكر ست مستويات — أكّدها من الشاشة." }),
          sw("inv.multiUnit", "وحدات قياس متعددة مع تحويل بينها", { state: "pending", src: "cfg.6.3.2" }),
          sw("inv.multiWarehouse", "مخازن متعددة", { state: "pending", src: "cfg.6.3.4", screen: "op.5.1.1.2" })
        ]
      }
    ]
  },

  /* ═════════════════ ⑤ الضرائب والفوترة ═════════════════ */
  {
    id: "tax", label: "الضرائب والفوترة", icon: "receipt",
    group: "المحاسبة",
    intro: "ضريبة القيمة المضافة مفعّلة عندكم — فكل فاتورة تولّد طرفاً ضريبياً، وضبط الربط هنا شرط لصحة الإقرار.",
    groups: [
      {
        label: "ضريبة القيمة المضافة",
        fields: [
          sw("tax.vatOn", "تفعيل ضريبة القيمة المضافة", { state: "set", value: true, src: "cfg.2.1", screen: "op.3.2" }),
          num("tax.vatRate", "النسبة الأساسية %", { state: "pending", src: "cfg.6.1.4", screen: "op.3.2", min: 0, max: 100,
            help: "اقرأها من «أنواع الضرائب» — لا تُدخل رقماً من عندك." }),
          sw("tax.priceIncl", "السعر شامل الضريبة", { state: "set", value: false, src: "cfg.3.1",
            help: "معطّل عندكم: الأسعار المسجّلة صافية والضريبة تُضاف." }),
          sel("tax.roundMode", "تقريب مبلغ الضريبة", ["على مستوى السطر", "على مستوى الفاتورة"], {
            state: "pending", src: "cfg.6.1.4", screen: "op.3.2", ui: "segmented",
            help: "الفرق يظهر كفلسات في كل فاتورة متعددة الأسطر — وهو أشهر سبب لعدم تطابق الإقرار."
          })
        ]
      },
      {
        label: "الحسابات الضريبية",
        note: "شجرتكم تذكر صراحة: الضريبة المدينة 120703 والدائنة 220207.",
        fields: [
          acc("tax.inputAcc", "حساب ضريبة المشتريات (مدينة)", { state: "pending", src: "cfg.6.1.4", screen: "op.3.4", prefix: "1207", bridge: true }),
          acc("tax.outputAcc", "حساب ضريبة المبيعات (دائنة)", { state: "pending", src: "cfg.6.1.4", screen: "op.3.4", prefix: "2202", bridge: true }),
          sw("tax.mapItems", "ربط الأصناف بالأنواع الضريبية", { state: "pending", src: "cfg.6.1.5", screen: "op.3.5", bridge: true,
            help: "بدونه لا يعرف النظام أي صنف معفى وأيها خاضع." })
        ]
      },
      {
        label: "الفاتورة الإلكترونية",
        fields: [
          sw("tax.einvoice", "تفعيل الفاتورة الإلكترونية", { state: "set", value: true, src: "cfg.2.2" }),
          sel("tax.numbering", "تسلسل أرقام الفواتير", ["متصل لا ينقطع", "متسلسل لكل فرع", "متسلسل لكل نوع فاتورة"], {
            state: "pending", src: "cfg.6.2.3",
            help: "الفوترة الإلكترونية عادة تفرض تسلسلاً لا ينقطع — تأكّد قبل البناء."
          }),
          sw("tax.wht", "خصم الضريبة من المصدر", { state: "set", value: false, src: "cfg.3.7" }),
          sel("tax.periodType", "نوع الفترة الضريبية", ["غير مستخدم", "شهرية", "ربع سنوية"], {
            state: "set", value: "غير مستخدم", src: "cfg.1.9", ui: "segmented"
          })
        ]
      }
    ]
  },

  /* ═════════════════ ⑥ المبيعات والعملاء ═════════════════ */
  {
    id: "sales", label: "المبيعات والعملاء", icon: "cart",
    group: "الدورات التشغيلية",
    intro: "فاتورة المبيعات أعقد وثيقة في نظامكم: ستة أطراف في قيد واحد، خمسة منها مشروطة. ما يُضبط هنا يحدّد شكل القيد.",
    groups: [
      {
        label: "سياسة البيع",
        fields: [
          sel("sales.creditPolicy", "تجاوز حد ائتمان العميل", [
            { v: "منع الحفظ", t: "منع", h: "الأحفظ للتحصيل" },
            { v: "تحذير مع السماح", t: "تحذير", h: "يوازن بين البيع والانضباط" },
            { v: "السماح بلا تنبيه", t: "سماح", h: "الحدّ بلا أثر عملي" }
          ], {
            state: "pending", src: "cfg.6.1.9", screen: "op.7.1.1.1", ui: "segmented",
            help: "اقرأها من «متغيرات نظام العملاء»."
          }),
          sw("sales.allowNegativeStock", "السماح بالبيع من رصيد غير متوفر", { state: "pending", src: "cfg.6.1.9", screen: "op.7.1.1.1" }),
          sel("sales.priceLevel", "مستوى التسعيرة المعتمد", ["تسعيرة واحدة", "تسعيرة حسب درجة العميل", "تسعيرة حسب المنطقة", "تسعيرة حسب الكمية"], {
            state: "pending", src: "cfg.6.3.8"
          }),
          sw("sales.freeQty", "الكميات المجانية كعملية محاسبية مستقلة", {
            state: "pending", src: "cfg.5.12",
            help: "مستنبط من دليلكم — يحتاج تأكيداً. إن كانت مستقلة فلها قيد يخفّض المخزون ويُحمّل مصروف ترويج."
          })
        ]
      },
      {
        label: "أنواع وثائق المبيعات",
        fields: [
          sw("sales.typesInvoice", "أنواع فواتير المبيعات", { state: "pending", src: "cfg.6.2.3", screen: "op.7.5.1.3" }),
          sw("sales.typesReturn", "أنواع مردودات المبيعات وأسبابها", { state: "pending", src: "cfg.6.2.4", screen: "op.7.5.1.4" }),
          sw("sales.typesQuote", "أنواع عروض الأسعار", { state: "pending", src: "cfg.6.2.3", screen: "op.7.5.1.1" }),
          sw("sales.typesOrder", "أنواع طلبات العملاء", { state: "pending", src: "cfg.6.2.3", screen: "op.7.5.1.2" }),
          sw("sales.extraAmounts", "المبالغ الإضافية والخصومات", { state: "pending", src: "cfg.6.2.8", screen: "op.7.5.4.9",
            help: "كل مبلغ إضافي يحتاج حساباً وقاعدة: يدخل الوعاء الضريبي أم لا." })
        ]
      },
      {
        label: "العملاء والمندوبون",
        fields: [
          sw("sales.customerGrades", "درجات العملاء ومعايير تقييمها", { state: "pending", src: "cfg.6.3.9", screen: "op.7.1.1.4" }),
          sw("sales.reps", "نظام المندوبين", { state: "pending", src: "cfg.5.4", screen: "op.7.1.1.6",
            help: "مستنبط من دليلكم: حسابات وسيطة للمندوبين." }),
          sw("sales.pos", "المنافذ البيعية (POS)", { state: "set", value: false, src: "cfg.3.6" })
        ]
      }
    ]
  },

  /* ═════════════════ ⑦ المشتريات والموردين ═════════════════ */
  {
    id: "purchase", label: "المشتريات والموردين", icon: "truck",
    group: "الدورات التشغيلية",
    intro: "دورة الشراء: طلب ← أمر ← إذن توريد ← فاتورة. ما يُرحَّل منها محاسبياً يعتمد على قرار BLK-3 في تبويب المخزون.",
    groups: [
      {
        label: "سياسة الشراء",
        fields: [
          sel("pur.flow", "دورة الشراء المعتمدة", [
            { v: "فاتورة مباشرة", t: "فاتورة مباشرة", h: "الأبسط — بلا رقابة مسبقة على الالتزام" },
            { v: "أمر شراء ← فاتورة", t: "أمر ← فاتورة", h: "رقابة على الالتزام قبل الشراء" },
            { v: "طلب ← أمر ← إذن توريد ← فاتورة", t: "الدورة الكاملة", h: "الأضبط — ومطابقة ثلاثية بين الأمر والإذن والفاتورة" }
          ], { state: "pending", src: "cfg.6.1.10", screen: "op.6.1.1.1", ui: "cards" }),
          sw("pur.matchQty", "مطابقة كمية الفاتورة مع إذن التوريد", { state: "pending", src: "cfg.6.1.10", screen: "op.6.1.1.1",
            help: "بدونها يمكن أن تُفوتر كمية لم تُستلم." }),
          sel("pur.costAlloc", "توزيع تكاليف الشراء على الأصناف", ["بالقيمة", "بالكمية", "بالوزن", "يدوي"], {
            state: "pending", src: "cfg.6.1.10", screen: "op.6.2.1.1", ui: "segmented"
          })
        ]
      },
      {
        label: "أنواع وثائق المشتريات",
        fields: [
          sw("pur.typesInvoice", "أنواع فواتير المشتريات", { state: "pending", src: "cfg.6.2.5", screen: "op.6.2.1.4" }),
          sw("pur.typesReturn", "أنواع مردود المشتريات", { state: "pending", src: "cfg.6.2.5", screen: "op.6.2.1.5" }),
          sw("pur.typesOrder", "أنواع أوامر الشراء", { state: "pending", src: "cfg.6.2.5", screen: "op.6.2.1.3" }),
          sw("pur.typesRequest", "أنواع طلبات الشراء", { state: "pending", src: "cfg.6.2.5", screen: "op.6.2.1.2" }),
          sw("pur.typesCost", "أنواع تكاليف المشتريات", { state: "pending", src: "cfg.6.2.5", screen: "op.6.2.1.1" })
        ]
      },
      {
        label: "الموردون",
        fields: [
          sw("pur.supplierTypes", "أنواع الموردين", { state: "pending", src: "cfg.6.3.7", screen: "op.6.1.1.2" }),
          sw("pur.supplierNotices", "أنواع إشعارات الموردين", { state: "pending", src: "cfg.6.2.7", screen: "op.6.1.1.4" }),
          sw("pur.lc", "الاعتمادات المستندية والاستيراد", { state: "pending", src: "cfg.5.5",
            help: "مستنبط من دليلكم — يحتاج تأكيداً بالشاشات." })
        ]
      }
    ]
  },

  /* ═════════════════ ⑧ الوثائق والترقيم ═════════════════ */
  {
    id: "documents", label: "الوثائق والترقيم", icon: "file",
    group: "الإدارة والتحكّم",
    intro: "كل وثيقة تحتاج رقماً فريداً محجوزاً ذرّياً عند الحفظ، ودورة حياة واضحة من المسودة إلى الترحيل.",
    groups: [
      {
        label: "الترقيم",
        note: "⛔ INV-10: الرقم يُحجز ذرّياً — لا يُولَّد بعدّ السجلات، وإلا تكرّر عند التزامن.",
        fields: [
          sel("doc.numbering", "نمط ترقيم الوثائق", ["متسلسل عام", "متسلسل لكل نوع", "متسلسل لكل نوع وفرع", "متسلسل لكل نوع وسنة"], {
            state: "pending", src: "cfg.6.2.1", hard: true
          }),
          sw("doc.resetYearly", "إعادة الترقيم مع بداية كل سنة مالية", { state: "pending", src: "cfg.6.2.1" }),
          sw("doc.allowGaps", "السماح بفجوات في التسلسل", { state: "pending", src: "cfg.6.2.1",
            help: "الفوترة الإلكترونية عادة تمنع الفجوات — تحقّق قبل السماح." }),
          txt("doc.prefixPattern", "نمط البادئة", { state: "pending", src: "cfg.6.2.1", ltr: true,
            help: "اقرأ النمط الفعلي من شاشة أنواع الوثائق." })
        ]
      },
      {
        label: "دورة حياة الوثيقة",
        fields: [
          sw("doc.review", "نظام مراجعة الوثائق", { state: "set", value: false, src: "cfg.3.2",
            help: "معطّل عندكم — أي أن الوثيقة تنتقل من الحفظ إلى الترحيل مباشرة." }),
          sel("doc.editPosted", "تعديل وثيقة مرحَّلة", [
            { v: "ممنوع — بعكس القيد فقط", t: "ممنوع — بالعكس", h: "الأثر التدقيقي محفوظ" },
            { v: "مسموح بصلاحية خاصة", t: "مسموح بصلاحية", h: "⛔ يكسر INV-6 ويضيّع الأثر" }
          ], {
            state: "set", value: "ممنوع — بعكس القيد فقط", hard: true, src: "cfg.6.2.1", ui: "segmented",
            help: "⛔ INV-6: لا تعديل على مرحَّل — يُعكَس."
          }),
          sw("doc.attachments", "إرفاق ملفات بالوثيقة", { state: "pending", src: "cfg.6.2.1" })
        ]
      },
      {
        label: "التقارير",
        fields: [
          sw("rep.searchEngine", "محرك بحث التقارير", { state: "set", value: true, src: "cfg.2.3" }),
          sw("rep.userHeader", "ترويسة التقارير حسب المستخدم", { state: "set", value: true, src: "cfg.2.4" }),
          sw("rep.designer", "مصمم التقارير الختامية والتدفقات والقوائم", { state: "pending", src: "cfg.6.1.6",
            help: "المركز المالي وقائمة الدخل والتدفقات النقدية تُبنى منه." }),
          sw("rep.glOnly", "وضع الأستاذ العام فقط", { state: "set", value: false, src: "cfg.3.4" })
        ]
      }
    ]
  },

  /* ═════════════════ ⑨ الأبعاد والفروع ═════════════════ */
  {
    id: "dimensions", label: "الأبعاد والفروع", icon: "diagram",
    group: "الإدارة والتحكّم",
    intro: "الأبعاد التي تُحلَّل بها الأرقام: مركز التكلفة والمشروع والنشاط والفرع. قرارها مبكر — إضافتها بعد آلاف القيود يعني قيوداً بلا بُعد.",
    groups: [
      {
        label: "مراكز التكلفة",
        fields: [
          sw("dim.costCenter", "تفعيل مراكز التكلفة", { state: "pending", src: "cfg.6.4.6", screen: "op.1.1.14" }),
          sel("dim.costCenterRequired", "إلزام مركز التكلفة", [
            { v: "اختياري", t: "اختياري", h: "قيود بلا بُعد — تحليل ناقص لاحقاً" },
            { v: "إلزامي على حسابات المصروفات", t: "على المصروفات", h: "التوازن العملي المعتاد" },
            { v: "إلزامي على كل قيد", t: "على كل قيد", h: "الأشمل والأثقل على المدخِل" }
          ], {
            state: "pending", src: "cfg.6.4.6", screen: "op.1.1.14", ui: "cards",
            help: "الإلزام المتأخر لا يُصلح القيود السابقة — احسمه قبل أول قيد."
          })
        ]
      },
      {
        label: "المشاريع والأنشطة",
        fields: [
          sw("dim.projects", "تفعيل المشاريع", { state: "pending", src: "cfg.6.4.6", screen: "op.1.2.6" }),
          sw("dim.activities", "تفعيل الأنشطة", { state: "pending", src: "cfg.5.8",
            help: "مستنبط من دليلكم: «الأنشطة الشقيقة» — يحتاج تأكيداً." })
        ]
      },
      {
        label: "الفروع",
        fields: [
          sw("dim.branches", "تفعيل تعدد الفروع", { state: "pending", src: "cfg.6.4.6" }),
          sw("dim.branchAuto", "التوسيط الآلي لحساب جاري الفروع", { state: "set", value: false, src: "cfg.3.5",
            help: "معطّل عندكم. تفعيله يجعل كل حركة بين فرعين تولّد طرفَي جاري تلقائياً." }),
          sw("dim.multiUnitFS", "صلاحية القوائم المالية لأكثر من وحدة محاسبية", { state: "set", value: false, src: "cfg.3.9" }),
          sw("dim.adminStructure", "أنواع الهيكل الإداري", { state: "pending", src: "cfg.6.4.6", screen: "op.1.1.18" })
        ]
      }
    ]
  },

  /* ═════════════════ ⑩ المستخدمون والأمان ═════════════════ */
  {
    id: "security", label: "المستخدمون والأمان", icon: "shield",
    group: "الإدارة والتحكّم",
    intro: "الصلاحيات والجلسات والنسخ الاحتياطي. الصلاحية على الشاشة لا تكفي — الصلاحية على العملية هي التي تمنع الترحيل غير المصرّح.",
    groups: [
      {
        label: "الصلاحيات",
        fields: [
          sw("sec.screens", "صلاحيات الشاشات", { state: "pending", src: "cfg.6.4.2", screen: "op.2.2.1" }),
          sw("sec.inputs", "صلاحيات المدخلات", { state: "pending", src: "cfg.6.4.2", screen: "op.2.2.3" }),
          sw("sec.operations", "صلاحيات العمليات (ترحيل / عكس / إقفال)", { state: "pending", src: "cfg.6.4.2", screen: "op.2.2.4",
            help: "أهمها. صلاحية الشاشة تفتح العرض، وصلاحية العملية هي التي تسمح بالترحيل." }),
          sw("sec.userGroups", "مجموعات المستخدمين", { state: "pending", src: "cfg.6.4.1" })
        ]
      },
      {
        label: "الجلسات",
        fields: [
          sw("sec.oneDevice", "منع اتصال المستخدم من أكثر من جهاز", { state: "set", value: false, src: "cfg.3.10" }),
          sw("sec.bindDevice", "ربط المستخدم بجهاز واحد", { state: "set", value: false, src: "cfg.3.11" }),
          sw("sec.liteBranch", "منع صلاحية أكثر من فرع في نظام اللايت", { state: "set", value: false, src: "cfg.3.12" }),
          num("sec.idleMinutes", "إنهاء الجلسة الخاملة بعد (دقيقة)", { state: "pending", src: "cfg.6.4.1", min: 0, max: 480 })
        ]
      },
      {
        label: "النسخ الاحتياطي والأثر التدقيقي",
        fields: [
          sw("sec.backupAuto", "نسخ احتياطي تلقائي", { state: "pending", src: "cfg.6.4.1", screen: "op.2.5.1" }),
          sel("sec.backupFreq", "تكرار النسخ", ["يومي", "كل ١٢ ساعة", "أسبوعي"], {
            state: "pending", src: "cfg.6.4.1", screen: "op.2.5.1", ui: "segmented" }),
          sw("sec.auditTrail", "تسجيل الأثر التدقيقي لكل ترحيل وعكس", {
            state: "set", value: true, hard: true, src: "cfg.6.4.2",
            help: "⛔ INV-2 يستلزمه: كل قيد آلي له مصدر موثَّق ومستخدم ووقت."
          })
        ]
      }
    ]
  }

  ];

  /* ── فهارس مساعدة ── */
  var byField = Object.create(null);
  var bySrc = Object.create(null);
  TABS.forEach(function (t) {
    t.groups.forEach(function (g) {
      g.fields.forEach(function (f) {
        f._tab = t.id;
        f._group = g.label;
        byField[f.id] = f;
        if (f.src) (bySrc[f.src] = bySrc[f.src] || []).push(f);
      });
    });
  });

  /* الخيار قد يكون نصاً أو كائناً — هذه تُرجعه دائماً بالشكل الكامل */
  function normOption(o) {
    if (o && typeof o === "object") return { v: o.v, t: o.t || o.v, h: o.h || "" };
    return { v: o, t: o, h: "" };
  }

  function allFields() {
    var out = [];
    TABS.forEach(function (t) { t.groups.forEach(function (g) { out = out.concat(g.fields); }); });
    return out;
  }

  function countBy(state) {
    return allFields().filter(function (f) { return f.state === state; }).length;
  }

  /* حقل «محسوم» = مقفل من النظام، أو له قيمة افتراضية مؤكَّدة.
     ما عدا ذلك ينتظر قراءة من أونيكس أو قراراً منكم.                    */
  function isResolvedByDefault(f) {
    return f.state === "locked" || f.value !== undefined;
  }

  root.ONYX_SETTINGS_SCHEMA = {
    tabs: TABS,
    field: function (id) { return byField[id] || null; },
    fieldsForSource: function (ref) { return bySrc[ref] || []; },
    allFields: allFields,
    countBy: countBy,
    normOption: normOption,
    options: function (f) { return (f.options || []).map(normOption); },
    isResolvedByDefault: isResolvedByDefault,
    /* الافتراضي المصنعي — يُستخدم في «استرجاع» و«تصدير الفروق» */
    defaults: function () {
      var d = {};
      allFields().forEach(function (f) { if (f.value !== undefined) d[f.id] = f.value; });
      return d;
    }
  };
})(window);
