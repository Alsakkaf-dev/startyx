/* ============================================================================
   ONYX ERP — شجرة أنظمة شركة بتروسبيشل لزيوت التشحيم
   ----------------------------------------------------------------------------
   ⚠  ملف مُولَّد آلياً — لا تعدّله يدوياً.
      المصدر : tree-viewer.html  (مُلتقط من النظام المثبَّت فعلياً)
      التوليد: node tools/build-data.js
      المحتوى: 11 شجرة · 180 مجموعة · 901 عنصر نهائي

   الأشجار:
     • ٩ أنظمة تشغيلية (variant: "operations") — بأرقام مرجعية من النظام
     • الدليل المحاسبي  (variant: "accounts")  — بأرقام الحسابات
     • الإعدادات الفعّالة (variant: "config")   — بحالات التحقق
   ========================================================================== */

(function (root) {
  "use strict";

  root.ONYX_DATA = {
  "meta": {
    "brand": "ONYX ERP",
    "brandAr": "أونيكس",
    "company": "شركة بتروسبيشل لزيوت التشحيم",
    "companyShort": "بتروسبيشل",
    "unit": "الإدارة",
    "fiscalPeriod": "2026 / 1",
    "version": "V8.1.27-10-2024",
    "calendar": "ميلادي",
    "language": "عربي (1)",
    "tagline": "إدارة وتخطيط موارد المؤسسات",
    "note": "مرجع تصفّح — لا تُنفَّذ أي عمليات فعلية",
    "source": "tree-viewer.html"
  },
  "modules": [
    {
      "id": "op.1",
      "ref": "op.1",
      "label": "تهيئة النظام",
      "kind": "module",
      "variant": "operations",
      "icon": "sliders",
      "accent": "slate",
      "note": "الشركة والفروع والفترات والعملات والمتغيرات العامة.",
      "status": "ready",
      "children": [
        {
          "id": "op.1.1",
          "ref": "op.1.1",
          "label": "التهيئة",
          "status": "ready",
          "kind": "submodule",
          "icon": "settings",
          "children": [
            {
              "id": "op.1.1.1",
              "ref": "op.1.1.1",
              "label": "المتغيرات العامة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.2",
              "ref": "op.1.1.2",
              "label": "إعداد فترات النظام",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.3",
              "ref": "op.1.1.3",
              "label": "تهيئة العملات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.4",
              "ref": "op.1.1.4",
              "label": "الأقاليم الدولية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.5",
              "ref": "op.1.1.5",
              "label": "بيانات الدول",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.6",
              "ref": "op.1.1.6",
              "label": "بيانات المناطق",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.7",
              "ref": "op.1.1.7",
              "label": "بيانات المدن",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.8",
              "ref": "op.1.1.8",
              "label": "بيانات الأحياء",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.9",
              "ref": "op.1.1.9",
              "label": "خلفيات الشاشات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.10",
              "ref": "op.1.1.10",
              "label": "مجموعات الفروع",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.11",
              "ref": "op.1.1.11",
              "label": "بيانات الشركات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.12",
              "ref": "op.1.1.12",
              "label": "بيانات الفروع",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.13",
              "ref": "op.1.1.13",
              "label": "تهيئة الدليل المحاسبي",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.14",
              "ref": "op.1.1.14",
              "label": "تهيئة مراكز التكلفة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.15",
              "ref": "op.1.1.15",
              "label": "تهيئة المشاريع",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.16",
              "ref": "op.1.1.16",
              "label": "ترميز بيانات إضافية للمشاريع",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.17",
              "ref": "op.1.1.17",
              "label": "الترميزات العامة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.18",
              "ref": "op.1.1.18",
              "label": "أنواع الهيكل الإداري",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.19",
              "ref": "op.1.1.19",
              "label": "الترميزات العامة للموظفين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.20",
              "ref": "op.1.1.20",
              "label": "ترجمة النصوص",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.21",
              "ref": "op.1.1.21",
              "label": "مستويات الإعتماد",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.1.22",
              "ref": "op.1.1.22",
              "label": "تهيئة الحقول الاضافية",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.1.2",
          "ref": "op.1.2",
          "label": "المدخلات",
          "status": "ready",
          "kind": "submodule",
          "icon": "file",
          "children": [
            {
              "id": "op.1.2.1",
              "ref": "op.1.2.1",
              "label": "الدليل المحاسبي العام للوحدات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.2",
              "ref": "op.1.2.2",
              "label": "الأدلة المحاسبية الإفتراضية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.3",
              "ref": "op.1.2.3",
              "label": "الدليل المحاسبي",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.4",
              "ref": "op.1.2.4",
              "label": "ربط الحسابات بالحسابات العامة والتدفقات النقدية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.5",
              "ref": "op.1.2.5",
              "label": "مراكز التكلفة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.6",
              "ref": "op.1.2.6",
              "label": "بيانات المشاريع",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.7",
              "ref": "op.1.2.7",
              "label": "الهيكل الإداري",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.8",
              "ref": "op.1.2.8",
              "label": "بيانات الموظفين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.9",
              "ref": "op.1.2.9",
              "label": "الحسابات الوسيطة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.10",
              "ref": "op.1.2.10",
              "label": "ربط الموظفين بالمهن الوظيفية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.11",
              "ref": "op.1.2.11",
              "label": "ربط الحسابات المدينة والدائنة الأخرى",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.12",
              "ref": "op.1.2.12",
              "label": "مجموعات الحسابات المدينة والدائنة الأخرى",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.13",
              "ref": "op.1.2.13",
              "label": "الحسابات المدينة والدائنة الأخرى",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.1.2.14",
              "ref": "op.1.2.14",
              "label": "تفعيل الأدلة الفرعية",
              "status": "ready",
              "kind": "screen"
            }
          ]
        }
      ]
    },
    {
      "id": "op.2",
      "ref": "op.2",
      "label": "إدارة النظام",
      "kind": "module",
      "variant": "operations",
      "icon": "shield",
      "accent": "indigo",
      "note": "المستخدمون والصلاحيات والإقفالات والنسخ الاحتياطي وقاعدة البيانات.",
      "status": "ready",
      "children": [
        {
          "id": "op.2.1",
          "ref": "op.2.1",
          "label": "إدارة المستخدمين",
          "status": "ready",
          "kind": "submodule",
          "icon": "shield",
          "children": [
            {
              "id": "op.2.1.1",
              "ref": "op.2.1.1",
              "label": "مجموعة المستخدمين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.1.2",
              "ref": "op.2.1.2",
              "label": "بيانات المستخدمين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.1.3",
              "ref": "op.2.1.3",
              "label": "عرض المستخدمين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.1.4",
              "ref": "op.2.1.4",
              "label": "الرقابة",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.2.2",
          "ref": "op.2.2",
          "label": "صلاحيات المستخدمين",
          "status": "ready",
          "kind": "submodule",
          "icon": "shield",
          "children": [
            {
              "id": "op.2.2.1",
              "ref": "op.2.2.1",
              "label": "صلاحيات الشاشات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.2.2",
              "ref": "op.2.2.2",
              "label": "صلاحيات التبويبات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.2.3",
              "ref": "op.2.2.3",
              "label": "صلاحيات المدخلات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.2.4",
              "ref": "op.2.2.4",
              "label": "صلاحيات العمليات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.2.5",
              "ref": "op.2.2.5",
              "label": "تنبيهات النظام",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.2.6",
              "ref": "op.2.2.6",
              "label": "اعتماد اجهزة تطبيقات الموبايل",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.2.7",
              "ref": "op.2.2.7",
              "label": "تقارير الصلاحيات",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.2.3",
          "ref": "op.2.3",
          "label": "خصوصية المستخدم",
          "status": "ready",
          "kind": "submodule",
          "icon": "shield",
          "children": [
            {
              "id": "op.2.3.1",
              "ref": "op.2.3.1",
              "label": "الشاشات المفعلة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.3.2",
              "ref": "op.2.3.2",
              "label": "الشاشات المرتبطة بالمستخدم",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.3.3",
              "ref": "op.2.3.3",
              "label": "الترويسة حسب المستخدم",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.3.4",
              "ref": "op.2.3.4",
              "label": "تغيير كلمة السر",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.2.4",
          "ref": "op.2.4",
          "label": "الإقفالات والتوقيفات",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.2.4.1",
              "ref": "op.2.4.1",
              "label": "التوقيف الشهري/الفتري",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.4.2",
              "ref": "op.2.4.2",
              "label": "الإقفال الشهري/الفتري",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.4.3",
              "ref": "op.2.4.3",
              "label": "الإقفال السنوي",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.4.4",
              "ref": "op.2.4.4",
              "label": "إلغاء الإقفالات",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.2.5",
          "ref": "op.2.5",
          "label": "النسخ الإحتياطي",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.2.5.1",
              "ref": "op.2.5.1",
              "label": "إعدادات النسخ الاحتياطي",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.5.2",
              "ref": "op.2.5.2",
              "label": "النسخ الاحتياطي",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.5.3",
              "ref": "op.2.5.3",
              "label": "إسترجاع النسخ الاحتياطي",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.2.6",
          "ref": "op.2.6",
          "label": "إدارة قاعدة البيانات",
          "status": "ready",
          "kind": "submodule",
          "icon": "file",
          "children": [
            {
              "id": "op.2.6.1",
              "ref": "op.2.6.1",
              "label": "ترميز اللغات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.6.2",
              "ref": "op.2.6.2",
              "label": "أرشفة مرفقات الوثائق",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.6.3",
              "ref": "op.2.6.3",
              "label": "الوحدات المحاسبية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.6.4",
              "ref": "op.2.6.4",
              "label": "نقل البيانات بين الوحدات المحاسبية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.6.5",
              "ref": "op.2.6.5",
              "label": "متغيرات قاعدة البيانات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.6.6",
              "ref": "op.2.6.6",
              "label": "المساحات التخزينية للبيانات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.6.7",
              "ref": "op.2.6.7",
              "label": "تحديث قاعدة البيانات كل السنوات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.6.8",
              "ref": "op.2.6.8",
              "label": "تحديث قاعدة البيانات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.6.9",
              "ref": "op.2.6.9",
              "label": "إعادة تقييم المخزون",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.2.7",
          "ref": "op.2.7",
          "label": "إجراءات مخصصة",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.2.7.1",
              "ref": "op.2.7.1",
              "label": "التوقيعات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.7.2",
              "ref": "op.2.7.2",
              "label": "الحقول الإجبارية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.7.3",
              "ref": "op.2.7.3",
              "label": "قوالب التقارير",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.7.4",
              "ref": "op.2.7.4",
              "label": "نماذج الطباعة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.7.5",
              "ref": "op.2.7.5",
              "label": "مؤشرات النظام",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.7.6",
              "ref": "op.2.7.6",
              "label": "ترميز الشاشات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.7.7",
              "ref": "op.2.7.7",
              "label": "الرسائل",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.7.8",
              "ref": "op.2.7.8",
              "label": "النصوص",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.2.8",
          "ref": "op.2.8",
          "label": "إدارة التكامل والربط",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.2.8.1",
              "ref": "op.2.8.1",
              "label": "ترميز خدمات الويب",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.2.8.2",
              "ref": "op.2.8.2",
              "label": "مزامنة البيانات",
              "status": "ready",
              "kind": "screen"
            }
          ]
        }
      ]
    },
    {
      "id": "op.3",
      "ref": "op.3",
      "label": "نظام الضرائب",
      "kind": "module",
      "variant": "operations",
      "icon": "receipt",
      "accent": "amber",
      "note": "ضريبة القيمة المضافة والفاتورة الإلكترونية وربط الحسابات والأصناف بالأنواع الضريبية.",
      "status": "ready",
      "children": [
        {
          "id": "op.3.1",
          "ref": "op.3.1",
          "label": "ترميز الشرائح الضريبية",
          "status": "ready",
          "kind": "screen"
        },
        {
          "id": "op.3.2",
          "ref": "op.3.2",
          "label": "أنواع الضرائب",
          "status": "ready",
          "kind": "screen"
        },
        {
          "id": "op.3.3",
          "ref": "op.3.3",
          "label": "طرق إحتساب الضرائب",
          "status": "ready",
          "kind": "screen"
        },
        {
          "id": "op.3.4",
          "ref": "op.3.4",
          "label": "ربط الحسابات بالأنواع الضريبية",
          "status": "ready",
          "kind": "screen"
        },
        {
          "id": "op.3.5",
          "ref": "op.3.5",
          "label": "ربط الأصناف بأنواع الضريبية",
          "status": "ready",
          "kind": "screen"
        },
        {
          "id": "op.3.6",
          "ref": "op.3.6",
          "label": "تسلسلات الفاتورة الإلكترونية",
          "status": "ready",
          "kind": "screen"
        },
        {
          "id": "op.3.7",
          "ref": "op.3.7",
          "label": "ترميز خدمات الويب",
          "status": "ready",
          "kind": "screen"
        },
        {
          "id": "op.3.8",
          "ref": "op.3.8",
          "label": "حركة الضرائب",
          "status": "ready",
          "kind": "screen"
        },
        {
          "id": "op.3.9",
          "ref": "op.3.9",
          "label": "تقارير الضرائب",
          "status": "ready",
          "kind": "screen"
        },
        {
          "id": "op.3.10",
          "ref": "op.3.10",
          "label": "مزامنة البيانات",
          "status": "ready",
          "kind": "screen"
        }
      ]
    },
    {
      "id": "op.4",
      "ref": "op.4",
      "label": "أنظمة الحسابات",
      "kind": "module",
      "variant": "operations",
      "icon": "landmark",
      "accent": "blue",
      "note": "الأستاذ العام والمراجعة والترحيلات والموازنات والضمانات.",
      "status": "ready",
      "children": [
        {
          "id": "op.4.1",
          "ref": "op.4.1",
          "label": "نظام الأستاذ العام",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.4.1.1",
              "ref": "op.4.1.1",
              "label": "تهيئة الاستاذ العام",
              "status": "ready",
              "kind": "group",
              "icon": "settings",
              "children": [
                {
                  "id": "op.4.1.1.1",
                  "ref": "op.4.1.1.1",
                  "label": "متغيرات الاستاذ العام",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.1.2",
                  "ref": "op.4.1.1.2",
                  "label": "مجموعات الصناديق",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.1.3",
                  "ref": "op.4.1.1.3",
                  "label": "مجموعات البنوك",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.1.4",
                  "ref": "op.4.1.1.4",
                  "label": "أنواع الإشعارات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.1.5",
                  "ref": "op.4.1.1.5",
                  "label": "أنواع الطلبات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.1.6",
                  "ref": "op.4.1.1.6",
                  "label": "أنواع قيود اليومية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.1.7",
                  "ref": "op.4.1.1.7",
                  "label": "أنواع القبض والصرف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.1.8",
                  "ref": "op.4.1.1.8",
                  "label": "ترميز البيان",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.4.1.2",
              "ref": "op.4.1.2",
              "label": "مدخلات الاستاذ العام",
              "status": "ready",
              "kind": "group",
              "icon": "file",
              "children": [
                {
                  "id": "op.4.1.2.1",
                  "ref": "op.4.1.2.1",
                  "label": "طلب فتح حساب",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.2.2",
                  "ref": "op.4.1.2.2",
                  "label": "الصناديق",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.2.3",
                  "ref": "op.4.1.2.3",
                  "label": "البنوك",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.2.4",
                  "ref": "op.4.1.2.4",
                  "label": "دفاتر الشيكات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.2.5",
                  "ref": "op.4.1.2.5",
                  "label": "طلب تعديل تهيئة الحدود",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.2.6",
                  "ref": "op.4.1.2.6",
                  "label": "تهيئة الحدود",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.2.7",
                  "ref": "op.4.1.2.7",
                  "label": "مصمم التقارير الختامية والدفقات والقوائم",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.2.8",
                  "ref": "op.4.1.2.8",
                  "label": "ربط الحسابات بالمشاريع",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.2.9",
                  "ref": "op.4.1.2.9",
                  "label": "ربط الحسابات بالأنشطة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.2.10",
                  "ref": "op.4.1.2.10",
                  "label": "الأرصدة الإفتتاحية",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.4.1.3",
              "ref": "op.4.1.3",
              "label": "عمليات الاستاذ العام",
              "status": "ready",
              "kind": "group",
              "icon": "layers",
              "children": [
                {
                  "id": "op.4.1.3.1",
                  "ref": "op.4.1.3.1",
                  "label": "إشعارات مدينة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.2",
                  "ref": "op.4.1.3.2",
                  "label": "إشعارات دائنة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.3",
                  "ref": "op.4.1.3.3",
                  "label": "طلبات سندات القبض",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.4",
                  "ref": "op.4.1.3.4",
                  "label": "سند القبض",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.5",
                  "ref": "op.4.1.3.5",
                  "label": "طلبات سندات الصرف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.6",
                  "ref": "op.4.1.3.6",
                  "label": "سند الصرف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.7",
                  "ref": "op.4.1.3.7",
                  "label": "تحقيق الإيداع النقدي لدى البنوك",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.8",
                  "ref": "op.4.1.3.8",
                  "label": "الشبكات المستحقة للسداد - آلي",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.9",
                  "ref": "op.4.1.3.9",
                  "label": "إستحقاق شبكات سندات القبض - يدويًا",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.10",
                  "ref": "op.4.1.3.10",
                  "label": "إستحقاق شبكات سندات الصرف - يدويًا",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.11",
                  "ref": "op.4.1.3.11",
                  "label": "مطابقة البنوك",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.12",
                  "ref": "op.4.1.3.12",
                  "label": "تسوية البنوك",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.13",
                  "ref": "op.4.1.3.13",
                  "label": "طلبات قيود اليومية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.14",
                  "ref": "op.4.1.3.14",
                  "label": "قيود اليومية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.15",
                  "ref": "op.4.1.3.15",
                  "label": "طلب بيع عملة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.16",
                  "ref": "op.4.1.3.16",
                  "label": "طلب صرف عملة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.17",
                  "ref": "op.4.1.3.17",
                  "label": "صرف عملة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.18",
                  "ref": "op.4.1.3.18",
                  "label": "توزيع المصروفات المقدمة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.19",
                  "ref": "op.4.1.3.19",
                  "label": "توزيع الإيرادات المقدمة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.3.20",
                  "ref": "op.4.1.3.20",
                  "label": "جرد النقدية",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.4.1.4",
              "ref": "op.4.1.4",
              "label": "تقارير الاستاذ العام",
              "status": "ready",
              "kind": "group",
              "icon": "chart",
              "children": [
                {
                  "id": "op.4.1.4.1",
                  "ref": "op.4.1.4.1",
                  "label": "تقارير كشف الحساب",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.2",
                  "ref": "op.4.1.4.2",
                  "label": "تقارير حركة الصناديق",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.3",
                  "ref": "op.4.1.4.3",
                  "label": "تقارير حركة البنوك",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.4",
                  "ref": "op.4.1.4.4",
                  "label": "تقارير اليومية العامة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.5",
                  "ref": "op.4.1.4.5",
                  "label": "تقارير ميزان المراجعة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.6",
                  "ref": "op.4.1.4.6",
                  "label": "تقارير قائمة الدخل",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.7",
                  "ref": "op.4.1.4.7",
                  "label": "تقارير المركز المالي",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.8",
                  "ref": "op.4.1.4.8",
                  "label": "تقارير التدفقات النقدية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.9",
                  "ref": "op.4.1.4.9",
                  "label": "تقارير الأرصدة الإفتتاحية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.10",
                  "ref": "op.4.1.4.10",
                  "label": "تقارير طلبات سند القبض",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.11",
                  "ref": "op.4.1.4.11",
                  "label": "تقارير سند القبض",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.12",
                  "ref": "op.4.1.4.12",
                  "label": "تقارير طلبات سند الصرف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.13",
                  "ref": "op.4.1.4.13",
                  "label": "تقارير سند الصرف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.14",
                  "ref": "op.4.1.4.14",
                  "label": "تقارير طلبات قيود اليومية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.15",
                  "ref": "op.4.1.4.15",
                  "label": "تقارير قيود اليومية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.16",
                  "ref": "op.4.1.4.16",
                  "label": "تقارير الشيكات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.17",
                  "ref": "op.4.1.4.17",
                  "label": "تقارير الشيكات المستحقة للسداد",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.18",
                  "ref": "op.4.1.4.18",
                  "label": "تقارير طلبات صرف العملة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.19",
                  "ref": "op.4.1.4.19",
                  "label": "تقارير صرف العملة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.20",
                  "ref": "op.4.1.4.20",
                  "label": "تقارير توزيع المصروفات المقدمة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.21",
                  "ref": "op.4.1.4.21",
                  "label": "تقارير توزيع الإيرادات المقدمة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.22",
                  "ref": "op.4.1.4.22",
                  "label": "تقارير تسوية البنوك",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.23",
                  "ref": "op.4.1.4.23",
                  "label": "تقارير الدليل المحاسبي",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.24",
                  "ref": "op.4.1.4.24",
                  "label": "تقارير الحسابات المدينة والدائنة الأخرى",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.25",
                  "ref": "op.4.1.4.25",
                  "label": "تقارير مراكز التكلفة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.26",
                  "ref": "op.4.1.4.26",
                  "label": "تقارير مراكز التكلفة عمليات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.27",
                  "ref": "op.4.1.4.27",
                  "label": "تقارير دليل المشاريع",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.28",
                  "ref": "op.4.1.4.28",
                  "label": "تقارير بيانات الأنشطة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.29",
                  "ref": "op.4.1.4.29",
                  "label": "تقارير فاتورة دفعة مقدمة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.30",
                  "ref": "op.4.1.4.30",
                  "label": "تقارير مرتجع فاتورة دفعة مقدمة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.31",
                  "ref": "op.4.1.4.31",
                  "label": "تقارير حدود الحسابات والأرصدة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.32",
                  "ref": "op.4.1.4.32",
                  "label": "تقارير الصناديق والبنوك",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.33",
                  "ref": "op.4.1.4.33",
                  "label": "تقارير الإشعارات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.1.4.34",
                  "ref": "op.4.1.4.34",
                  "label": "تقارير السندات المفقودة",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            }
          ]
        },
        {
          "id": "op.4.2",
          "ref": "op.4.2",
          "label": "نظام إدارة المراجعة والترحيلات",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.4.2.1",
              "ref": "op.4.2.1",
              "label": "إعتماد الوثائق",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.2.2",
              "ref": "op.4.2.2",
              "label": "الترحيل",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.2.3",
              "ref": "op.4.2.3",
              "label": "إلغاء الترحيل",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.2.4",
              "ref": "op.4.2.4",
              "label": "مطابقة اليومية العامة للعمليات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.2.5",
              "ref": "op.4.2.5",
              "label": "مطابقة كشف حساب",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.2.6",
              "ref": "op.4.2.6",
              "label": "مطابقة الأرصدة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.2.7",
              "ref": "op.4.2.7",
              "label": "تقارير المستندات المرحلة وغير المرحلة",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.4.3",
          "ref": "op.4.3",
          "label": "نظام إدارة الموازنة والمخططات",
          "status": "ready",
          "note": "لم يُصوَّر توسيعه بعد",
          "kind": "screen"
        },
        {
          "id": "op.4.4",
          "ref": "op.4.4",
          "label": "إدارة الحسابات",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.4.4.1",
              "ref": "op.4.4.1",
              "label": "إدارة المخزون",
              "status": "ready",
              "kind": "group",
              "icon": "folder",
              "children": [
                {
                  "id": "op.4.4.1.1",
                  "ref": "op.4.4.1.1",
                  "label": "مخططات الصرف المخزني",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.4.1.2",
                  "ref": "op.4.4.1.2",
                  "label": "تقارير مخططات الصرف المخزني",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.4.4.2",
              "ref": "op.4.4.2",
              "label": "إدارة الموردين والمشتريات",
              "status": "ready",
              "kind": "group",
              "icon": "folder",
              "children": [
                {
                  "id": "op.4.4.2.1",
                  "ref": "op.4.4.2.1",
                  "label": "مخططات المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.4.2.2",
                  "ref": "op.4.4.2.2",
                  "label": "تقارير مخططات المشتريات",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.4.4.3",
              "ref": "op.4.4.3",
              "label": "إدارة العملاء والمبيعات",
              "status": "ready",
              "kind": "group",
              "icon": "folder",
              "children": [
                {
                  "id": "op.4.4.3.1",
                  "ref": "op.4.4.3.1",
                  "label": "مخططات المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.4.3.2",
                  "ref": "op.4.4.3.2",
                  "label": "مخطط التحصيل",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.4.3.3",
                  "ref": "op.4.4.3.3",
                  "label": "تقارير المخطط الشهري للمبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.4.4.3.4",
                  "ref": "op.4.4.3.4",
                  "label": "تقارير مخطط التحصيل",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            }
          ]
        },
        {
          "id": "op.4.5",
          "ref": "op.4.5",
          "label": "نظام إدارة الضمانات",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.4.5.1",
              "ref": "op.4.5.1",
              "label": "أنواع الضمانات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.5.2",
              "ref": "op.4.5.2",
              "label": "الضمانات البنكية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.5.3",
              "ref": "op.4.5.3",
              "label": "تمديد الضمانات البنكية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.5.4",
              "ref": "op.4.5.4",
              "label": "الغاء/مصادرة الضمانات البنكية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.5.5",
              "ref": "op.4.5.5",
              "label": "ضمانات أخرى",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.5.6",
              "ref": "op.4.5.6",
              "label": "تمديد الضمان",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.5.7",
              "ref": "op.4.5.7",
              "label": "الغاء/مصادرة الضمان",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.5.8",
              "ref": "op.4.5.8",
              "label": "تقارير الضمانات البنكية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.5.9",
              "ref": "op.4.5.9",
              "label": "تقارير خطابات الضمان",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.5.10",
              "ref": "op.4.5.10",
              "label": "تقارير تمديد الضمان",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.4.6",
          "ref": "op.4.6",
          "label": "الربط المالي مع الأنظمة الخارجية",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.4.6.1",
              "ref": "op.4.6.1",
              "label": "المتغيرات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.6.2",
              "ref": "op.4.6.2",
              "label": "ربط أنواع الوثائق بالحسابات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.6.3",
              "ref": "op.4.6.3",
              "label": "إستيراد القيود المالية - قيود اليومية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.4.6.4",
              "ref": "op.4.6.4",
              "label": "تقارير إستيراد القيود المالية - قيود اليومية",
              "status": "ready",
              "kind": "screen"
            }
          ]
        }
      ]
    },
    {
      "id": "op.5",
      "ref": "op.5",
      "label": "أنظمة المخازن",
      "kind": "module",
      "variant": "operations",
      "icon": "package",
      "accent": "teal",
      "note": "المخازن والأصناف والتوريد والصرف والتحويل والجرد.",
      "status": "ready",
      "children": [
        {
          "id": "op.5.1",
          "ref": "op.5.1",
          "label": "نظام إدارة المخازن",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.5.1.1",
              "ref": "op.5.1.1",
              "label": "تهيئة المخزون",
              "status": "ready",
              "kind": "group",
              "icon": "settings",
              "children": [
                {
                  "id": "op.5.1.1.1",
                  "ref": "op.5.1.1.1",
                  "label": "متغيرات المخزون",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.2",
                  "ref": "op.5.1.1.2",
                  "label": "وحدات القياس",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.3",
                  "ref": "op.5.1.1.3",
                  "label": "أنواع الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.4",
                  "ref": "op.5.1.1.4",
                  "label": "أنشطة الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.5",
                  "ref": "op.5.1.1.5",
                  "label": "رتب الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.6",
                  "ref": "op.5.1.1.6",
                  "label": "مستويات التسعيرة",
                  "status": "ready",
                  "note": "جزء من الاسم غير واضح بالصورة",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.7",
                  "ref": "op.5.1.1.7",
                  "label": "أنواع الطلبات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.8",
                  "ref": "op.5.1.1.8",
                  "label": "أنواع التوريد",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.9",
                  "ref": "op.5.1.1.9",
                  "label": "أنواع الصرف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.10",
                  "ref": "op.5.1.1.10",
                  "label": "أنواع التحويل",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.11",
                  "ref": "op.5.1.1.11",
                  "label": "أنواع تسوية المخزون",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.12",
                  "ref": "op.5.1.1.12",
                  "label": "معايير التقييم",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.1.13",
                  "ref": "op.5.1.1.13",
                  "label": "ترميز بيان الصنف",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.5.1.2",
              "ref": "op.5.1.2",
              "label": "مدخلات المخزون",
              "status": "ready",
              "kind": "group",
              "icon": "file",
              "children": [
                {
                  "id": "op.5.1.2.1",
                  "ref": "op.5.1.2.1",
                  "label": "بيانات المجموعة الرئيسية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.2",
                  "ref": "op.5.1.2.2",
                  "label": "المجموعة الفرعية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.3",
                  "ref": "op.5.1.2.3",
                  "label": "المجموعات تحت الفرعية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.4",
                  "ref": "op.5.1.2.4",
                  "label": "المجموعات المساعدة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.5",
                  "ref": "op.5.1.2.5",
                  "label": "المجموعات التفصيلية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.6",
                  "ref": "op.5.1.2.6",
                  "label": "المجموعة المتماثلة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.7",
                  "ref": "op.5.1.2.7",
                  "label": "تصنيفات الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.8",
                  "ref": "op.5.1.2.8",
                  "label": "مجموعات المخازن",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.9",
                  "ref": "op.5.1.2.9",
                  "label": "بيانات المخازن",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.10",
                  "ref": "op.5.1.2.10",
                  "label": "بيانات الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.11",
                  "ref": "op.5.1.2.11",
                  "label": "ربط الأصناف بالملحقات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.12",
                  "ref": "op.5.1.2.12",
                  "label": "تقييم الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.13",
                  "ref": "op.5.1.2.13",
                  "label": "طلب تعديل تسعيرة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.14",
                  "ref": "op.5.1.2.14",
                  "label": "تسعيرة الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.15",
                  "ref": "op.5.1.2.15",
                  "label": "المخزون الإفتتاحي",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.16",
                  "ref": "op.5.1.2.16",
                  "label": "ربط حسابات المخزون بالأستاذ العام",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.17",
                  "ref": "op.5.1.2.17",
                  "label": "تخزين الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.18",
                  "ref": "op.5.1.2.18",
                  "label": "الأصناف المفضلة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.19",
                  "ref": "op.5.1.2.19",
                  "label": "التعديل الجماعي لبيانات الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.20",
                  "ref": "op.5.1.2.20",
                  "label": "المبازين",
                  "status": "ready",
                  "note": "غير واضح — يُحتمل الموازين",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.2.21",
                  "ref": "op.5.1.2.21",
                  "label": "المجموعات التجميعية",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.5.1.3",
              "ref": "op.5.1.3",
              "label": "عمليات المخزون",
              "status": "ready",
              "kind": "group",
              "icon": "layers",
              "children": [
                {
                  "id": "op.5.1.3.1",
                  "ref": "op.5.1.3.1",
                  "label": "حجز كميات الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.2",
                  "ref": "op.5.1.3.2",
                  "label": "إذن التوريد المخزني",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.3",
                  "ref": "op.5.1.3.3",
                  "label": "طلب صرف/تحويل مواد",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.4",
                  "ref": "op.5.1.3.4",
                  "label": "أمر الصرف المخزني",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.5",
                  "ref": "op.5.1.3.5",
                  "label": "التحويل المخزني",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.6",
                  "ref": "op.5.1.3.6",
                  "label": "إستلام تحويل مخزني",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.7",
                  "ref": "op.5.1.3.7",
                  "label": "طلب تسوية مخزون",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.8",
                  "ref": "op.5.1.3.8",
                  "label": "تسوية مخزون",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.9",
                  "ref": "op.5.1.3.9",
                  "label": "أمر إصلاح خارجي",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.10",
                  "ref": "op.5.1.3.10",
                  "label": "طلب صرف توالف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.11",
                  "ref": "op.5.1.3.11",
                  "label": "إذن توريد أمانات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.12",
                  "ref": "op.5.1.3.12",
                  "label": "إذن صرف أمانات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.13",
                  "ref": "op.5.1.3.13",
                  "label": "عهد الموظفين المخزنية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.14",
                  "ref": "op.5.1.3.14",
                  "label": "تصفية العهد المخزنية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.3.15",
                  "ref": "op.5.1.3.15",
                  "label": "توريد/صرف عمليات أخرى QR CODE",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.5.1.4",
              "ref": "op.5.1.4",
              "label": "تقارير المخزون",
              "status": "ready",
              "kind": "group",
              "icon": "chart",
              "children": [
                {
                  "id": "op.5.1.4.1",
                  "ref": "op.5.1.4.1",
                  "label": "تقارير أرصدة المخزون",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.2",
                  "ref": "op.5.1.4.2",
                  "label": "تقارير حركة المخزون",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.3",
                  "ref": "op.5.1.4.3",
                  "label": "تقارير بيانات المجموعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.4",
                  "ref": "op.5.1.4.4",
                  "label": "تقارير بيانات الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.5",
                  "ref": "op.5.1.4.5",
                  "label": "تقارير حدود الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.6",
                  "ref": "op.5.1.4.6",
                  "label": "طباعة باركود الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.7",
                  "ref": "op.5.1.4.7",
                  "label": "تقارير مواقع الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.8",
                  "ref": "op.5.1.4.8",
                  "label": "تقارير تسعيرة الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.9",
                  "ref": "op.5.1.4.9",
                  "label": "تقارير المخزون الإفتتاحي",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.10",
                  "ref": "op.5.1.4.10",
                  "label": "تقارير حجز كميات الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.11",
                  "ref": "op.5.1.4.11",
                  "label": "تقارير إذن التوريد",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.12",
                  "ref": "op.5.1.4.12",
                  "label": "تقارير طلبات الصرف/التحويل",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.13",
                  "ref": "op.5.1.4.13",
                  "label": "تقارير أوامر التوريد المخزني",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.14",
                  "ref": "op.5.1.4.14",
                  "label": "تقارير أوامر الصرف المخزنية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.15",
                  "ref": "op.5.1.4.15",
                  "label": "تقارير التحويل والإستلام المخزني",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.16",
                  "ref": "op.5.1.4.16",
                  "label": "تقارير طلب تسوية مخزون",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.17",
                  "ref": "op.5.1.4.17",
                  "label": "تقارير تسوية المخزون",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.18",
                  "ref": "op.5.1.4.18",
                  "label": "تقارير حركة مخزون - الفروع",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.19",
                  "ref": "op.5.1.4.19",
                  "label": "تقارير مديونية الموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.20",
                  "ref": "op.5.1.4.20",
                  "label": "تقارير إذن توريد وصرف أمانات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.21",
                  "ref": "op.5.1.4.21",
                  "label": "تقارير أمر إصلاح خارجي",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.22",
                  "ref": "op.5.1.4.22",
                  "label": "تقارير طلب صرف توالف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.23",
                  "ref": "op.5.1.4.23",
                  "label": "تقارير العهد المخزنية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.24",
                  "ref": "op.5.1.4.24",
                  "label": "تقارير تصفية العهد المخزنية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.5.1.4.25",
                  "ref": "op.5.1.4.25",
                  "label": "تقارير حركة الأصناف المخزنية في الرفوف",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            }
          ]
        },
        {
          "id": "op.5.2",
          "ref": "op.5.2",
          "label": "نظام الأصناف المركبة",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.5.2.1",
              "ref": "op.5.2.1",
              "label": "المواد الأولية للأصناف",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.2.2",
              "ref": "op.5.2.2",
              "label": "إستبدال مكونات الأصناف المركبة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.2.3",
              "ref": "op.5.2.3",
              "label": "أنواع التجميع/التفكيك",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.2.4",
              "ref": "op.5.2.4",
              "label": "طلبات أوامر التجميع",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.2.5",
              "ref": "op.5.2.5",
              "label": "أوامر التجميع",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.2.6",
              "ref": "op.5.2.6",
              "label": "أوامر التفكيك",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.2.7",
              "ref": "op.5.2.7",
              "label": "الإستعلام عن المنتجات وموادها الأولية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.2.8",
              "ref": "op.5.2.8",
              "label": "تقارير طلبات أوامر التجميع",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.2.9",
              "ref": "op.5.2.9",
              "label": "تقارير أوامر التجميع",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.2.10",
              "ref": "op.5.2.10",
              "label": "تقارير أوامر التفكيك",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.5.3",
          "ref": "op.5.3",
          "label": "نظام الجرد",
          "status": "ready",
          "kind": "submodule",
          "icon": "list",
          "children": [
            {
              "id": "op.5.3.1",
              "ref": "op.5.3.1",
              "label": "أنواع الجرد",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.3.2",
              "ref": "op.5.3.2",
              "label": "جرد الآلات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.3.3",
              "ref": "op.5.3.3",
              "label": "الجرد اليدوي",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.3.4",
              "ref": "op.5.3.4",
              "label": "تقارير جرد مخزون العميل",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.5.3.5",
              "ref": "op.5.3.5",
              "label": "تقارير الجرد",
              "status": "ready",
              "kind": "screen"
            }
          ]
        }
      ]
    },
    {
      "id": "op.6",
      "ref": "op.6",
      "label": "أنظمة الموردين",
      "kind": "module",
      "variant": "operations",
      "icon": "truck",
      "accent": "orange",
      "note": "الموردون والمشتريات والاعتمادات المستندية.",
      "status": "ready",
      "children": [
        {
          "id": "op.6.1",
          "ref": "op.6.1",
          "label": "نظام إدارة الموردين",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.6.1.1",
              "ref": "op.6.1.1",
              "label": "تهيئة الموردين",
              "status": "ready",
              "kind": "group",
              "icon": "settings",
              "children": [
                {
                  "id": "op.6.1.1.1",
                  "ref": "op.6.1.1.1",
                  "label": "متغيرات نظام الموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.1.2",
                  "ref": "op.6.1.1.2",
                  "label": "أنواع الموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.1.3",
                  "ref": "op.6.1.1.3",
                  "label": "درجات الموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.1.4",
                  "ref": "op.6.1.1.4",
                  "label": "أنواع إشعارات الموردين",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.6.1.2",
              "ref": "op.6.1.2",
              "label": "مدخلات الموردين",
              "status": "ready",
              "kind": "group",
              "icon": "file",
              "children": [
                {
                  "id": "op.6.1.2.1",
                  "ref": "op.6.1.2.1",
                  "label": "مجموعة الموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.2.2",
                  "ref": "op.6.1.2.2",
                  "label": "بيانات الموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.2.3",
                  "ref": "op.6.1.2.3",
                  "label": "بيانات مندوبي المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.2.4",
                  "ref": "op.6.1.2.4",
                  "label": "الأرصدة الإفتتاحية للموردين",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.6.1.3",
              "ref": "op.6.1.3",
              "label": "عمليات الموردين",
              "status": "ready",
              "kind": "group",
              "icon": "layers",
              "children": [
                {
                  "id": "op.6.1.3.1",
                  "ref": "op.6.1.3.1",
                  "label": "بيانات العقود",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.3.2",
                  "ref": "op.6.1.3.2",
                  "label": "تجديد العقود",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.3.3",
                  "ref": "op.6.1.3.3",
                  "label": "سند الصرف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.3.4",
                  "ref": "op.6.1.3.4",
                  "label": "اشعارات الموردين",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.6.1.4",
              "ref": "op.6.1.4",
              "label": "تقارير الموردين",
              "status": "ready",
              "kind": "group",
              "icon": "chart",
              "children": [
                {
                  "id": "op.6.1.4.1",
                  "ref": "op.6.1.4.1",
                  "label": "تقارير بيانات الموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.4.2",
                  "ref": "op.6.1.4.2",
                  "label": "تقارير الأرصدة الإفتتاحية للموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.4.3",
                  "ref": "op.6.1.4.3",
                  "label": "تقارير كشوفات حساب الموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.4.4",
                  "ref": "op.6.1.4.4",
                  "label": "تقارير أعمار الديون",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.4.5",
                  "ref": "op.6.1.4.5",
                  "label": "تقارير الأقساط",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.4.6",
                  "ref": "op.6.1.4.6",
                  "label": "تقارير العقود",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.4.7",
                  "ref": "op.6.1.4.7",
                  "label": "تقارير إشعارات الموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.1.4.8",
                  "ref": "op.6.1.4.8",
                  "label": "تقارير سند الصرف",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            }
          ]
        },
        {
          "id": "op.6.2",
          "ref": "op.6.2",
          "label": "نظام إدارة المشتريات",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.6.2.1",
              "ref": "op.6.2.1",
              "label": "تهيئة المشتريات",
              "status": "ready",
              "kind": "group",
              "icon": "settings",
              "children": [
                {
                  "id": "op.6.2.1.1",
                  "ref": "op.6.2.1.1",
                  "label": "أنواع تكاليف المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.1.2",
                  "ref": "op.6.2.1.2",
                  "label": "أنواع طلبات الشراء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.1.3",
                  "ref": "op.6.2.1.3",
                  "label": "أنواع أوامر الشراء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.1.4",
                  "ref": "op.6.2.1.4",
                  "label": "أنواع فواتير المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.1.5",
                  "ref": "op.6.2.1.5",
                  "label": "أنواع مردود المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.1.6",
                  "ref": "op.6.2.1.6",
                  "label": "أعباء المشتريات - الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.1.7",
                  "ref": "op.6.2.1.7",
                  "label": "ترميز المصاريف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.1.8",
                  "ref": "op.6.2.1.8",
                  "label": "أسباب مردود مشتريات",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.6.2.2",
              "ref": "op.6.2.2",
              "label": "المدخلات",
              "status": "ready",
              "kind": "group",
              "icon": "file",
              "children": [
                {
                  "id": "op.6.2.2.1",
                  "ref": "op.6.2.2.1",
                  "label": "أصناف الموردين",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.6.2.3",
              "ref": "op.6.2.3",
              "label": "العمليات",
              "status": "ready",
              "kind": "group",
              "icon": "layers",
              "children": [
                {
                  "id": "op.6.2.3.1",
                  "ref": "op.6.2.3.1",
                  "label": "طلبات الشراء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.2",
                  "ref": "op.6.2.3.2",
                  "label": "عروض الأسعار",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.3",
                  "ref": "op.6.2.3.3",
                  "label": "المقارنة الفنية لعروض الشراء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.4",
                  "ref": "op.6.2.3.4",
                  "label": "ترشيح المقارنة الفنية لعروض الشراء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.5",
                  "ref": "op.6.2.3.5",
                  "label": "أوامر الشراء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.6",
                  "ref": "op.6.2.3.6",
                  "label": "متابعة أوامر الشراء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.7",
                  "ref": "op.6.2.3.7",
                  "label": "بيانات الشحن",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.8",
                  "ref": "op.6.2.3.8",
                  "label": "فاتورة المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.9",
                  "ref": "op.6.2.3.9",
                  "label": "فاتورة المشتريات الخارجية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.10",
                  "ref": "op.6.2.3.10",
                  "label": "إذن توريد المشتريات الخارجية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.11",
                  "ref": "op.6.2.3.11",
                  "label": "تكاليف المشتريات الخارجية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.12",
                  "ref": "op.6.2.3.12",
                  "label": "فاتورة مردود المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.3.13",
                  "ref": "op.6.2.3.13",
                  "label": "متابعة عمليات الشراء",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.6.2.4",
              "ref": "op.6.2.4",
              "label": "التقارير",
              "status": "ready",
              "kind": "group",
              "icon": "chart",
              "children": [
                {
                  "id": "op.6.2.4.1",
                  "ref": "op.6.2.4.1",
                  "label": "تقارير أصناف الموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.4.2",
                  "ref": "op.6.2.4.2",
                  "label": "تقارير قوائم أسعار الموردين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.4.3",
                  "ref": "op.6.2.4.3",
                  "label": "تقارير طلبات الشراء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.4.4",
                  "ref": "op.6.2.4.4",
                  "label": "تقارير عروض الأسعار",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.4.5",
                  "ref": "op.6.2.4.5",
                  "label": "تقارير أوامر الشراء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.4.6",
                  "ref": "op.6.2.4.6",
                  "label": "تقارير فواتير المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.4.7",
                  "ref": "op.6.2.4.7",
                  "label": "تقارير أعباء المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.4.8",
                  "ref": "op.6.2.4.8",
                  "label": "تقارير إذن توريد مشتريات خارجية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.4.9",
                  "ref": "op.6.2.4.9",
                  "label": "تقارير تكاليف المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.4.10",
                  "ref": "op.6.2.4.10",
                  "label": "تقارير مردود المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.4.11",
                  "ref": "op.6.2.4.11",
                  "label": "تقارير صافي المشتريات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.6.2.4.12",
                  "ref": "op.6.2.4.12",
                  "label": "تقارير الضرائب",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            }
          ]
        },
        {
          "id": "op.6.3",
          "ref": "op.6.3",
          "label": "نظام إدارة الإعتمادات",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.6.3.1",
              "ref": "op.6.3.1",
              "label": "الأرصدة الإفتتاحية للإعتمادات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.6.3.2",
              "ref": "op.6.3.2",
              "label": "الإعتمادات المستندية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.6.3.3",
              "ref": "op.6.3.3",
              "label": "تقارير الأرصدة الإفتتاحية للإعتمادات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.6.3.4",
              "ref": "op.6.3.4",
              "label": "تقارير الإعتمادات المستندية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.6.3.5",
              "ref": "op.6.3.5",
              "label": "تقارير كشف حساب الإعتمادات",
              "status": "ready",
              "kind": "screen"
            }
          ]
        }
      ]
    },
    {
      "id": "op.7",
      "ref": "op.7",
      "label": "أنظمة العملاء",
      "kind": "module",
      "variant": "operations",
      "icon": "cart",
      "accent": "green",
      "note": "العملاء والمبيعات والتوزيع والعمولات والعروض.",
      "status": "ready",
      "children": [
        {
          "id": "op.7.1",
          "ref": "op.7.1",
          "label": "نظام إدارة العملاء",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.7.1.1",
              "ref": "op.7.1.1",
              "label": "تهيئة العملاء",
              "status": "ready",
              "kind": "group",
              "icon": "settings",
              "children": [
                {
                  "id": "op.7.1.1.1",
                  "ref": "op.7.1.1.1",
                  "label": "متغيرات نظام العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.2",
                  "ref": "op.7.1.1.2",
                  "label": "أنواع العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.3",
                  "ref": "op.7.1.1.3",
                  "label": "درجات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.4",
                  "ref": "op.7.1.1.4",
                  "label": "معايير تقييم درجات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.5",
                  "ref": "op.7.1.1.5",
                  "label": "تصنيفات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.6",
                  "ref": "op.7.1.1.6",
                  "label": "أنواع المندوبين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.7",
                  "ref": "op.7.1.1.7",
                  "label": "أنواع المحصلين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.8",
                  "ref": "op.7.1.1.8",
                  "label": "أنواع المسوقين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.9",
                  "ref": "op.7.1.1.9",
                  "label": "ترميز درجات المسوقين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.10",
                  "ref": "op.7.1.1.10",
                  "label": "مجموعة بطائق الائتمان",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.11",
                  "ref": "op.7.1.1.11",
                  "label": "أنواع بطائق الائتمان",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.12",
                  "ref": "op.7.1.1.12",
                  "label": "بيانات بطاقات الائتمان",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.13",
                  "ref": "op.7.1.1.13",
                  "label": "أنواع طلبات الإشعارات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.14",
                  "ref": "op.7.1.1.14",
                  "label": "أنواع الإشعارات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.15",
                  "ref": "op.7.1.1.15",
                  "label": "أنواع الكوبونات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.16",
                  "ref": "op.7.1.1.16",
                  "label": "الترميزات العامة لنظام العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.17",
                  "ref": "op.7.1.1.17",
                  "label": "أنواع عقود المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.18",
                  "ref": "op.7.1.1.18",
                  "label": "ترميز شروط عقود المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.1.19",
                  "ref": "op.7.1.1.19",
                  "label": "ترميزات وصفتي",
                  "status": "ready",
                  "note": "غير واضح بالكامل بالصورة",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.7.1.2",
              "ref": "op.7.1.2",
              "label": "مدخلات العملاء",
              "status": "ready",
              "kind": "group",
              "icon": "file",
              "children": [
                {
                  "id": "op.7.1.2.1",
                  "ref": "op.7.1.2.1",
                  "label": "بيانات المسوقين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.2",
                  "ref": "op.7.1.2.2",
                  "label": "مجموعة العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.3",
                  "ref": "op.7.1.2.3",
                  "label": "بيانات المحصلين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.4",
                  "ref": "op.7.1.2.4",
                  "label": "بيانات مندوبي المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.5",
                  "ref": "op.7.1.2.5",
                  "label": "بيانات السائقين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.6",
                  "ref": "op.7.1.2.6",
                  "label": "بيانات خطوط السير",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.7",
                  "ref": "op.7.1.2.7",
                  "label": "طلب فتح حساب",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.8",
                  "ref": "op.7.1.2.8",
                  "label": "بيانات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.9",
                  "ref": "op.7.1.2.9",
                  "label": "بيانات المستفيدين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.10",
                  "ref": "op.7.1.2.10",
                  "label": "الأرصدة الإفتتاحية للعملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.11",
                  "ref": "op.7.1.2.11",
                  "label": "بيانات الكوبونات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.12",
                  "ref": "op.7.1.2.12",
                  "label": "مجموعة العملاء التقديون",
                  "status": "ready",
                  "note": "غير واضح",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.13",
                  "ref": "op.7.1.2.13",
                  "label": "بيانات العملاء التقديون",
                  "status": "ready",
                  "note": "غير واضح",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.2.14",
                  "ref": "op.7.1.2.14",
                  "label": "التعديل الجماعي لبيانات العملاء",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.7.1.3",
              "ref": "op.7.1.3",
              "label": "عمليات العملاء",
              "status": "ready",
              "kind": "group",
              "icon": "layers",
              "children": [
                {
                  "id": "op.7.1.3.1",
                  "ref": "op.7.1.3.1",
                  "label": "طلبات إشعارات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.2",
                  "ref": "op.7.1.3.2",
                  "label": "إشعارات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.3",
                  "ref": "op.7.1.3.3",
                  "label": "إشعارات العملاء المتعدد",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.4",
                  "ref": "op.7.1.3.4",
                  "label": "سند القبض",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.5",
                  "ref": "op.7.1.3.5",
                  "label": "فواتير المبيعات المستحقة للسداد",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.6",
                  "ref": "op.7.1.3.6",
                  "label": "فواتير مردود المبيعات المستحقة للسداد",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.7",
                  "ref": "op.7.1.3.7",
                  "label": "تسوية أقساط العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.8",
                  "ref": "op.7.1.3.8",
                  "label": "متابعة فواتير المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.9",
                  "ref": "op.7.1.3.9",
                  "label": "متابعة مطالبات شركات التأمين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.10",
                  "ref": "op.7.1.3.10",
                  "label": "عقود المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.11",
                  "ref": "op.7.1.3.11",
                  "label": "توزيع الكوبونات على المندوبين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.12",
                  "ref": "op.7.1.3.12",
                  "label": "إرجاع الكوبونات من المندوبين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.13",
                  "ref": "op.7.1.3.13",
                  "label": "مبيعات الكوبونات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.14",
                  "ref": "op.7.1.3.14",
                  "label": "إعتماد طلبات تجاوزات الخصومات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.3.15",
                  "ref": "op.7.1.3.15",
                  "label": "مناقلة العملاء",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.7.1.4",
              "ref": "op.7.1.4",
              "label": "تقارير العملاء",
              "status": "ready",
              "kind": "group",
              "icon": "chart",
              "children": [
                {
                  "id": "op.7.1.4.1",
                  "ref": "op.7.1.4.1",
                  "label": "تقارير بيانات المناطق",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.2",
                  "ref": "op.7.1.4.2",
                  "label": "تقارير بيانات المحصلين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.3",
                  "ref": "op.7.1.4.3",
                  "label": "تقارير مندوبي المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.4",
                  "ref": "op.7.1.4.4",
                  "label": "تقارير بيانات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.5",
                  "ref": "op.7.1.4.5",
                  "label": "تقارير مطالبات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.6",
                  "ref": "op.7.1.4.6",
                  "label": "تقارير الأرصدة الإفتتاحية للعملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.7",
                  "ref": "op.7.1.4.7",
                  "label": "تقارير كشف حساب العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.8",
                  "ref": "op.7.1.4.8",
                  "label": "تقارير أعمار الديون",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.9",
                  "ref": "op.7.1.4.9",
                  "label": "تقارير طلبات إشعارات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.10",
                  "ref": "op.7.1.4.10",
                  "label": "تقارير إشعارات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.11",
                  "ref": "op.7.1.4.11",
                  "label": "تقارير سند القبض",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.12",
                  "ref": "op.7.1.4.12",
                  "label": "تقارير التحصيل",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.13",
                  "ref": "op.7.1.4.13",
                  "label": "تقارير عقود المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.14",
                  "ref": "op.7.1.4.14",
                  "label": "تقارير مبيعات الكوبونات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.15",
                  "ref": "op.7.1.4.15",
                  "label": "رسوم بيانية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.16",
                  "ref": "op.7.1.4.16",
                  "label": "تقارير العملاء التقديون",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.17",
                  "ref": "op.7.1.4.17",
                  "label": "تقارير بيانات النقاط",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.1.4.18",
                  "ref": "op.7.1.4.18",
                  "label": "طباعة باركود العملاء",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            }
          ]
        },
        {
          "id": "op.7.2",
          "ref": "op.7.2",
          "label": "نظام العمولات",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.7.2.1",
              "ref": "op.7.2.1",
              "label": "ترميز عمولات العملاء",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.2",
              "ref": "op.7.2.2",
              "label": "ترميز عمولات المندوبين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.3",
              "ref": "op.7.2.3",
              "label": "أنواع إحتساب تحصيلات المندوبين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.4",
              "ref": "op.7.2.4",
              "label": "ترميز عمولات المحصلين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.5",
              "ref": "op.7.2.5",
              "label": "ترميز عمولات الموظفين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.6",
              "ref": "op.7.2.6",
              "label": "ترميز عمولات المسوقين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.7",
              "ref": "op.7.2.7",
              "label": "إحتساب عمولات العملاء",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.8",
              "ref": "op.7.2.8",
              "label": "إحتساب عمولات المندوبين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.9",
              "ref": "op.7.2.9",
              "label": "إحتساب عمولات المحصلين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.10",
              "ref": "op.7.2.10",
              "label": "إحتساب عمولات الموظفين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.11",
              "ref": "op.7.2.11",
              "label": "إحتساب عمولات المسوقين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.12",
              "ref": "op.7.2.12",
              "label": "تقارير عمولات العملاء",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.13",
              "ref": "op.7.2.13",
              "label": "تقارير عمولات المندوبين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.14",
              "ref": "op.7.2.14",
              "label": "تقارير عمولات المحصلين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.2.15",
              "ref": "op.7.2.15",
              "label": "تقارير عمولات الموظفين",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.7.3",
          "ref": "op.7.3",
          "label": "المتاجر الالكترونية",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.7.3.1",
              "ref": "op.7.3.1",
              "label": "متغيرات المتاجر الالكترونية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.3.2",
              "ref": "op.7.3.2",
              "label": "أصناف المتجر",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.3.3",
              "ref": "op.7.3.3",
              "label": "الإعلانات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.3.4",
              "ref": "op.7.3.4",
              "label": "تقارير أصناف المتجر",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.3.5",
              "ref": "op.7.3.5",
              "label": "أصناف مطلوبة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.3.6",
              "ref": "op.7.3.6",
              "label": "أصناف مستعملة للبيع",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.7.4",
          "ref": "op.7.4",
          "label": "العروض الترويجية",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.7.4.1",
              "ref": "op.7.4.1",
              "label": "أنواع العروض الترويجية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.4.2",
              "ref": "op.7.4.2",
              "label": "مجموعات العروض الترويجية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.4.3",
              "ref": "op.7.4.3",
              "label": "العروض الترويجية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.4.4",
              "ref": "op.7.4.4",
              "label": "تقارير العروض الترويجية",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.7.5",
          "ref": "op.7.5",
          "label": "نظام إدارة المبيعات",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.7.5.1",
              "ref": "op.7.5.1",
              "label": "تهيئة المبيعات",
              "status": "ready",
              "kind": "group",
              "icon": "settings",
              "children": [
                {
                  "id": "op.7.5.1.1",
                  "ref": "op.7.5.1.1",
                  "label": "أنواع عروض الأسعار",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.1.2",
                  "ref": "op.7.5.1.2",
                  "label": "أنواع طلبات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.1.3",
                  "ref": "op.7.5.1.3",
                  "label": "أنواع فواتير المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.1.4",
                  "ref": "op.7.5.1.4",
                  "label": "أنواع مردودات المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.1.5",
                  "ref": "op.7.5.1.5",
                  "label": "أسباب مردودات المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.1.6",
                  "ref": "op.7.5.1.6",
                  "label": "المبالغ الإضافية والخصومات",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.7.5.2",
              "ref": "op.7.5.2",
              "label": "المدخلات",
              "status": "ready",
              "kind": "group",
              "icon": "file",
              "children": [
                {
                  "id": "op.7.5.2.1",
                  "ref": "op.7.5.2.1",
                  "label": "الأصناف المطلوبة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.2.2",
                  "ref": "op.7.5.2.2",
                  "label": "تسعيرة الأصناف",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.2.3",
                  "ref": "op.7.5.2.3",
                  "label": "قوائم أسعار المنافسين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.2.4",
                  "ref": "op.7.5.2.4",
                  "label": "أصناف العملاء",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.7.5.3",
              "ref": "op.7.5.3",
              "label": "العمليات",
              "status": "ready",
              "kind": "group",
              "icon": "layers",
              "children": [
                {
                  "id": "op.7.5.3.1",
                  "ref": "op.7.5.3.1",
                  "label": "طلب عروض الأسعار",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.3.2",
                  "ref": "op.7.5.3.2",
                  "label": "عروض الأسعار",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.3.3",
                  "ref": "op.7.5.3.3",
                  "label": "طلبات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.3.4",
                  "ref": "op.7.5.3.4",
                  "label": "فاتورة دفعة مقدمة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.3.5",
                  "ref": "op.7.5.3.5",
                  "label": "مرتجع فاتورة دفعة مقدمة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.3.6",
                  "ref": "op.7.5.3.6",
                  "label": "فاتورة المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.3.7",
                  "ref": "op.7.5.3.7",
                  "label": "فاتورة مردود المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.3.8",
                  "ref": "op.7.5.3.8",
                  "label": "تعديل بيانات فاتورة المبيعات",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.7.5.4",
              "ref": "op.7.5.4",
              "label": "التقارير",
              "status": "ready",
              "kind": "group",
              "icon": "chart",
              "children": [
                {
                  "id": "op.7.5.4.1",
                  "ref": "op.7.5.4.1",
                  "label": "تقارير الأصناف المطلوبة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.4.2",
                  "ref": "op.7.5.4.2",
                  "label": "تقارير أصناف العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.4.3",
                  "ref": "op.7.5.4.3",
                  "label": "تقارير طلبات عروض الأسعار",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.4.4",
                  "ref": "op.7.5.4.4",
                  "label": "تقارير عروض الأسعار",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.4.5",
                  "ref": "op.7.5.4.5",
                  "label": "تقارير طلبات العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.4.6",
                  "ref": "op.7.5.4.6",
                  "label": "تقارير المبالغ الإضافية والخصومات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.4.7",
                  "ref": "op.7.5.4.7",
                  "label": "تقارير مردود المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.4.8",
                  "ref": "op.7.5.4.8",
                  "label": "تقارير المبيعات اليومية",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.5.4.9",
                  "ref": "op.7.5.4.9",
                  "label": "تقارير تهيئة المبالغ الإضافية والخصومات",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            }
          ]
        },
        {
          "id": "op.7.6",
          "ref": "op.7.6",
          "label": "نظام التوزيع",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.7.6.1",
              "ref": "op.7.6.1",
              "label": "التهيئة",
              "status": "ready",
              "kind": "group",
              "icon": "settings",
              "children": [
                {
                  "id": "op.7.6.1.1",
                  "ref": "op.7.6.1.1",
                  "label": "متغيرات التوزيع",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.1.2",
                  "ref": "op.7.6.1.2",
                  "label": "بنود خطة سير المندوب",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.1.3",
                  "ref": "op.7.6.1.3",
                  "label": "مجموعة الأصناف المنافسة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.1.4",
                  "ref": "op.7.6.1.4",
                  "label": "طرق دخول الأصناف المنافسة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.1.5",
                  "ref": "op.7.6.1.5",
                  "label": "أنواع المزايا المعطاة للأصناف المنافسة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.1.6",
                  "ref": "op.7.6.1.6",
                  "label": "أنواع مصروفات المندوبين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.1.7",
                  "ref": "op.7.6.1.7",
                  "label": "أنواع أسعار الأصناف المنافسة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.1.8",
                  "ref": "op.7.6.1.8",
                  "label": "أسباب فشل زيارة العميل",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.1.9",
                  "ref": "op.7.6.1.9",
                  "label": "تهيئة حقول المدخلات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.1.10",
                  "ref": "op.7.6.1.10",
                  "label": "أنواع المسوقين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.1.11",
                  "ref": "op.7.6.1.11",
                  "label": "ترميز درجات المسوقين",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.7.6.2",
              "ref": "op.7.6.2",
              "label": "المدخلات",
              "status": "ready",
              "kind": "group",
              "icon": "file",
              "children": [
                {
                  "id": "op.7.6.2.1",
                  "ref": "op.7.6.2.1",
                  "label": "بيانات الشركات المنتجة للأصناف المنافسة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.2.2",
                  "ref": "op.7.6.2.2",
                  "label": "بيانات وكلاء الأصناف المنافسة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.2.3",
                  "ref": "op.7.6.2.3",
                  "label": "بيانات مجموعة التوزيع",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.2.4",
                  "ref": "op.7.6.2.4",
                  "label": "بيانات الأصناف المنافسة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.2.5",
                  "ref": "op.7.6.2.5",
                  "label": "بيانات المسوقين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.2.6",
                  "ref": "op.7.6.2.6",
                  "label": "بيانات العملاء المستهدفين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.2.7",
                  "ref": "op.7.6.2.7",
                  "label": "فحص الإعدادات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.2.8",
                  "ref": "op.7.6.2.8",
                  "label": "بيانات مندوبي المبيعات",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.2.9",
                  "ref": "op.7.6.2.9",
                  "label": "مخطط التحصيل",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.2.10",
                  "ref": "op.7.6.2.10",
                  "label": "مخططات المبيعات",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.7.6.3",
              "ref": "op.7.6.3",
              "label": "العمليات",
              "status": "ready",
              "kind": "group",
              "icon": "layers",
              "children": [
                {
                  "id": "op.7.6.3.1",
                  "ref": "op.7.6.3.1",
                  "label": "خطة السير اليومية للمندوب",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.3.2",
                  "ref": "op.7.6.3.2",
                  "label": "خطة سير المندوب لفترة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.3.3",
                  "ref": "op.7.6.3.3",
                  "label": "المتابعة اليومية لخطة سير المندوب",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.3.4",
                  "ref": "op.7.6.3.4",
                  "label": "مصروفات المندوبين",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.3.5",
                  "ref": "op.7.6.3.5",
                  "label": "معلومات إحصائية عن الأصناف المنافسة",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.3.6",
                  "ref": "op.7.6.3.6",
                  "label": "جرد مخزون العميل",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.3.7",
                  "ref": "op.7.6.3.7",
                  "label": "الخرائط",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.3.8",
                  "ref": "op.7.6.3.8",
                  "label": "مناقلة العملاء",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.3.9",
                  "ref": "op.7.6.3.9",
                  "label": "عرض الأصناف للترويج",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.3.10",
                  "ref": "op.7.6.3.10",
                  "label": "طلب تعديل بيانات العميل",
                  "status": "ready",
                  "kind": "screen"
                },
                {
                  "id": "op.7.6.3.11",
                  "ref": "op.7.6.3.11",
                  "label": "الترحيل لنظام الأونكس برو",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "op.7.6.4",
              "ref": "op.7.6.4",
              "label": "التقارير",
              "status": "ready",
              "note": "لم يُصوَّر توسيعها بعد",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.7.7",
          "ref": "op.7.7",
          "label": "نظام الإستبيانات",
          "status": "ready",
          "kind": "submodule",
          "icon": "file",
          "children": [
            {
              "id": "op.7.7.1",
              "ref": "op.7.7.1",
              "label": "الترميزات العامة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.7.2",
              "ref": "op.7.7.2",
              "label": "ترميز اجابات الاستبيان",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.7.3",
              "ref": "op.7.7.3",
              "label": "تفاصيل عناصر الإستبيان",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.7.4",
              "ref": "op.7.7.4",
              "label": "إستبيان الأصناف",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.7.7.5",
              "ref": "op.7.7.5",
              "label": "تقارير إستبيان الأصناف",
              "status": "ready",
              "kind": "screen"
            }
          ]
        }
      ]
    },
    {
      "id": "op.8",
      "ref": "op.8",
      "label": "نظام إدارة المعلومات",
      "kind": "module",
      "variant": "operations",
      "icon": "chart",
      "accent": "sky",
      "note": "التقارير التحليلية والإدارية لكل الأنظمة.",
      "status": "ready",
      "children": [
        {
          "id": "op.8.1",
          "ref": "op.8.1",
          "label": "تقارير إدارة النظام",
          "status": "ready",
          "kind": "submodule",
          "icon": "chart",
          "children": [
            {
              "id": "op.8.1.1",
              "ref": "op.8.1.1",
              "label": "تقارير الرقابة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.1.2",
              "ref": "op.8.1.2",
              "label": "تقارير أرشفة مرفقات الوثائق",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.1.3",
              "ref": "op.8.1.3",
              "label": "حركة الإعتمادات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.1.4",
              "ref": "op.8.1.4",
              "label": "عرض حركات النظام",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.8.2",
          "ref": "op.8.2",
          "label": "تقارير إدارة الأستاذ العام",
          "status": "ready",
          "kind": "submodule",
          "icon": "chart",
          "children": [
            {
              "id": "op.8.2.1",
              "ref": "op.8.2.1",
              "label": "تقارير القوائم والدفقات الختامية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.2.2",
              "ref": "op.8.2.2",
              "label": "تقارير الأرصدة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.2.3",
              "ref": "op.8.2.3",
              "label": "حركة الحسابات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.2.4",
              "ref": "op.8.2.4",
              "label": "بيانات إحصائية مالية",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.8.3",
          "ref": "op.8.3",
          "label": "تقارير إدارة المخزون",
          "status": "ready",
          "kind": "submodule",
          "icon": "chart",
          "children": [
            {
              "id": "op.8.3.1",
              "ref": "op.8.3.1",
              "label": "حركة الأصناف",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.3.2",
              "ref": "op.8.3.2",
              "label": "معلومات الأصناف",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.3.3",
              "ref": "op.8.3.3",
              "label": "تقارير أعمار الأصناف المخزنية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.3.4",
              "ref": "op.8.3.4",
              "label": "تقارير معدل الدوران",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.3.5",
              "ref": "op.8.3.5",
              "label": "تقارير إدارية",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.8.4",
          "ref": "op.8.4",
          "label": "تقارير إدارة المشتريات",
          "status": "ready",
          "kind": "submodule",
          "icon": "chart",
          "children": [
            {
              "id": "op.8.4.1",
              "ref": "op.8.4.1",
              "label": "طلب شراء آلي",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.4.2",
              "ref": "op.8.4.2",
              "label": "تقارير الأرصدة الشهرية للموردين",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.8.5",
          "ref": "op.8.5",
          "label": "تقارير إدارة المبيعات",
          "status": "ready",
          "kind": "submodule",
          "icon": "chart",
          "children": [
            {
              "id": "op.8.5.1",
              "ref": "op.8.5.1",
              "label": "تقارير الأرصدة الشهرية للعملاء",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.5.2",
              "ref": "op.8.5.2",
              "label": "تقارير إدارية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.5.3",
              "ref": "op.8.5.3",
              "label": "تقارير صافي هامش الربح",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.5.4",
              "ref": "op.8.5.4",
              "label": "بيانات إحصائية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.8.5.5",
              "ref": "op.8.5.5",
              "label": "الأصناف المطلوبة للعملاء",
              "status": "ready",
              "kind": "screen"
            }
          ]
        }
      ]
    },
    {
      "id": "op.9",
      "ref": "op.9",
      "label": "الأنظمة المساعدة",
      "kind": "module",
      "variant": "operations",
      "icon": "wrench",
      "accent": "slate",
      "note": "التنبيهات والشاشات المساعدة.",
      "status": "ready",
      "children": [
        {
          "id": "op.9.1",
          "ref": "op.9.1",
          "label": "نظام التنبيهات",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.9.1.1",
              "ref": "op.9.1.1",
              "label": "متغيرات التنبيهات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.9.1.2",
              "ref": "op.9.1.2",
              "label": "الرسائل المباشرة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.9.1.3",
              "ref": "op.9.1.3",
              "label": "تنبيهات الحسابات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.9.1.4",
              "ref": "op.9.1.4",
              "label": "تنبيهات الحسابات التحليلية",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.9.1.5",
              "ref": "op.9.1.5",
              "label": "تنبيهات المستفيدين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.9.1.6",
              "ref": "op.9.1.6",
              "label": "تنبيهات الشيكات",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.9.1.7",
              "ref": "op.9.1.7",
              "label": "عرض الرسائل",
              "status": "ready",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "op.9.2",
          "ref": "op.9.2",
          "label": "الشاشات المساعدة",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "op.9.2.1",
              "ref": "op.9.2.1",
              "label": "الحسابات المفضلة",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.9.2.2",
              "ref": "op.9.2.2",
              "label": "رسائل المستخدمين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.9.2.3",
              "ref": "op.9.2.3",
              "label": "دليل العناوين",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.9.2.4",
              "ref": "op.9.2.4",
              "label": "جدولة الاعمال",
              "status": "ready",
              "kind": "screen"
            },
            {
              "id": "op.9.2.5",
              "ref": "op.9.2.5",
              "label": "دليل النظام",
              "status": "ready",
              "kind": "screen"
            }
          ]
        }
      ]
    },
    {
      "id": "chart-of-accounts",
      "label": "الدليل المحاسبي",
      "labelEn": "Chart of Accounts",
      "kind": "module",
      "variant": "accounts",
      "icon": "book",
      "accent": "violet",
      "status": "ready",
      "note": "الدليل المحاسبي الفعلي لشركة بتروسبيشل — الحسابات الرئيسية والتفصيلية بأرقامها.",
      "children": [
        {
          "id": "acc.1",
          "ref": "acc.1",
          "code": "1",
          "label": "الأصول",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "acc.11",
              "ref": "acc.11",
              "code": "11",
              "label": "الاصول الثابتة",
              "status": "ready",
              "kind": "submodule",
              "icon": "folder",
              "children": [
                {
                  "id": "acc.1101",
                  "ref": "acc.1101",
                  "code": "1101",
                  "label": "اصول ثابتة",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.110101",
                      "ref": "acc.110101",
                      "code": "110101",
                      "label": "سيارات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1101010001",
                          "ref": "acc.1101010001",
                          "code": "1101010001",
                          "label": "باص هايس موديل 2013 لوحة رقم ا م 3325",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010002",
                          "ref": "acc.1101010002",
                          "code": "1101010002",
                          "label": "باص هايس موديل 2014 لوحة اي ف 6885",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010003",
                          "ref": "acc.1101010003",
                          "code": "1101010003",
                          "label": "باص هيبنداي موديل 2008 لوحة ا ح ر 3624",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010004",
                          "ref": "acc.1101010004",
                          "code": "1101010004",
                          "label": "باص هايس موديل 2014 - مكة لوحة رقم ا م 1300",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010005",
                          "ref": "acc.1101010005",
                          "code": "1101010005",
                          "label": "باص هايس موديل 2010 لوحة رقم ا ص ط 1899",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010006",
                          "ref": "acc.1101010006",
                          "code": "1101010006",
                          "label": "رافعة شوكية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010007",
                          "ref": "acc.1101010007",
                          "code": "1101010007",
                          "label": "باص هايس موديل 2013 لوحة رقم ا ن ح 6426",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010008",
                          "ref": "acc.1101010008",
                          "code": "1101010008",
                          "label": "باص هايس موديل 2005 (عادل) لوحة رقم ا د د 3138",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010009",
                          "ref": "acc.1101010009",
                          "code": "1101010009",
                          "label": "لون أزرق CTPOWER رافعة شوكية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010010",
                          "ref": "acc.1101010010",
                          "code": "1101010010",
                          "label": "كورولا موديل 2013 لوحة رقم ب ن ص 4649",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010011",
                          "ref": "acc.1101010011",
                          "code": "1101010011",
                          "label": "سيارة سي اس 75 موديل 2022 اللوحة ب ن س 7782",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010012",
                          "ref": "acc.1101010012",
                          "code": "1101010012",
                          "label": "سيارة هايس موديل 2013 رقم اللوحة 5108",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010013",
                          "ref": "acc.1101010013",
                          "code": "1101010013",
                          "label": "سيارة تويوتا اللوحة رقم ا ح ع 2417 موديل 2008",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010014",
                          "ref": "acc.1101010014",
                          "code": "1101010014",
                          "label": "تويوتا موديل 2016 اللوحة ب ن ب 1276",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010015",
                          "ref": "acc.1101010015",
                          "code": "1101010015",
                          "label": "سيارة تويوتا اللوحة ا ه ب 2126 موديل 2013",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010016",
                          "ref": "acc.1101010016",
                          "code": "1101010016",
                          "label": "باص هايس موديل 2013 اللوحة ا ه ب 2126",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010017",
                          "ref": "acc.1101010017",
                          "code": "1101010017",
                          "label": "سيارة أوروخان - باص اللوحة ب ط ع 5624 موديل 2023",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010018",
                          "ref": "acc.1101010018",
                          "code": "1101010018",
                          "label": "سيارة غمارتين موديل 2025 اللوحة ب ط ح ي 3074",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101010019",
                          "ref": "acc.1101010019",
                          "code": "1101010019",
                          "label": "تنسويشي كانتر موديل 2007 رقم اللوحة أ ق د 5183",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.110102",
                      "ref": "acc.110102",
                      "code": "110102",
                      "label": "الالات والمعدات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1101020001",
                          "ref": "acc.1101020001",
                          "code": "1101020001",
                          "label": "ماكينة تعبئة زيوت 4 نوزل",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101020002",
                          "ref": "acc.1101020002",
                          "code": "1101020002",
                          "label": "سيسرا علب كبير",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101020003",
                          "ref": "acc.1101020003",
                          "code": "1101020003",
                          "label": "سيسرا علب صغير",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101020004",
                          "ref": "acc.1101020004",
                          "code": "1101020004",
                          "label": "ماكينة طباعة التاريخ",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101020005",
                          "ref": "acc.1101020005",
                          "code": "1101020005",
                          "label": "دينمو سحب الزيت",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101020006",
                          "ref": "acc.1101020006",
                          "code": "1101020006",
                          "label": "جهاز فحص لزوجة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101020007",
                          "ref": "acc.1101020007",
                          "code": "1101020007",
                          "label": "جهاز فحص فلاش",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101020008",
                          "ref": "acc.1101020008",
                          "code": "1101020008",
                          "label": "جهاز فحص حرارة",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.110103",
                      "ref": "acc.110103",
                      "code": "110103",
                      "label": "الكمبيوترات والطابعات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1101030001",
                          "ref": "acc.1101030001",
                          "code": "1101030001",
                          "label": "جهاز كمبيوتر LED Dell + طابعة HP laser",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101030002",
                          "ref": "acc.1101030002",
                          "code": "1101030002",
                          "label": "جهاز كمبيوتر Dell Optiplex",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101030003",
                          "ref": "acc.1101030003",
                          "code": "1101030003",
                          "label": "شاشة عرض GVC PRO LED 32 -1",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101030004",
                          "ref": "acc.1101030004",
                          "code": "1101030004",
                          "label": "شاشة عرض GVC PRO LED 32 -2",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101030005",
                          "ref": "acc.1101030005",
                          "code": "1101030005",
                          "label": "شاشة عرض GVC PRO LED 32 -3",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101030006",
                          "ref": "acc.1101030006",
                          "code": "1101030006",
                          "label": "طابعة فواتير ابسون EPSON LQ-690",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101030007",
                          "ref": "acc.1101030007",
                          "code": "1101030007",
                          "label": "طابعة فواتير عدد 7",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101030008",
                          "ref": "acc.1101030008",
                          "code": "1101030008",
                          "label": "جهاز كمبيوتر Dell OPTIPLEX 3020",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101030009",
                          "ref": "acc.1101030009",
                          "code": "1101030009",
                          "label": "طابعات 5 HP LASER JET 111W و5 اجهزة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101030010",
                          "ref": "acc.1101030010",
                          "code": "1101030010",
                          "label": "جهاز كمبيوتر ASUS D500MD",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101030011",
                          "ref": "acc.1101030011",
                          "code": "1101030011",
                          "label": "شاشة كمبيوتر MICRODIGIT",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.110104",
                      "ref": "acc.110104",
                      "code": "110104",
                      "label": "الأثاث والمفروشات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1101040001",
                          "ref": "acc.1101040001",
                          "code": "1101040001",
                          "label": "أثاث مكتبي ومكتبات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101040002",
                          "ref": "acc.1101040002",
                          "code": "1101040002",
                          "label": "تجهيزات مكتبية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101040003",
                          "ref": "acc.1101040003",
                          "code": "1101040003",
                          "label": "ديكورات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101040004",
                          "ref": "acc.1101040004",
                          "code": "1101040004",
                          "label": "برادة مياه - GVC PRO",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101040005",
                          "ref": "acc.1101040005",
                          "code": "1101040005",
                          "label": "مكيف دولاب جنرال سويحري بحريني 60",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101040006",
                          "ref": "acc.1101040006",
                          "code": "1101040006",
                          "label": "تجهيزات معرض كبير 8",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101040007",
                          "ref": "acc.1101040007",
                          "code": "1101040007",
                          "label": "مكيف دورا 18 وحدة شباك",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101040008",
                          "ref": "acc.1101040008",
                          "code": "1101040008",
                          "label": "مكتب الإدارة كيلو 8",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101040009",
                          "ref": "acc.1101040009",
                          "code": "1101040009",
                          "label": "مكتب مستودع كيلو 8 (بجوار كيان)",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101040010",
                          "ref": "acc.1101040010",
                          "code": "1101040010",
                          "label": "ثلاجة جنرال طويل",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.110105",
                      "ref": "acc.110105",
                      "code": "110105",
                      "label": "التجهيزات ومصاريف التأسيس",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1101050001",
                          "ref": "acc.1101050001",
                          "code": "1101050001",
                          "label": "مصاريف التأسيس والتجهيزات",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.110106",
                      "ref": "acc.110106",
                      "code": "110106",
                      "label": "البرامج المحاسبية",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1101060001",
                          "ref": "acc.1101060001",
                          "code": "1101060001",
                          "label": "برنامج ERP المتكامل",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101060002",
                          "ref": "acc.1101060002",
                          "code": "1101060002",
                          "label": "برنامج اونكس برو",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.110107",
                      "ref": "acc.110107",
                      "code": "110107",
                      "label": "مشروعات تحت التنفيذ",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1101070001",
                          "ref": "acc.1101070001",
                          "code": "1101070001",
                          "label": "مشاريع تحت التنفيذ -1",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.110108",
                      "ref": "acc.110108",
                      "code": "110108",
                      "label": "اجهزة وكاميرات مراقبة",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1101080001",
                          "ref": "acc.1101080001",
                          "code": "1101080001",
                          "label": "كاميرات مراقبة هيك فيجن",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.110109",
                      "ref": "acc.110109",
                      "code": "110109",
                      "label": "أصول عارف",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1101090001",
                          "ref": "acc.1101090001",
                          "code": "1101090001",
                          "label": "كمبيوتر عارف",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.110110",
                      "ref": "acc.110110",
                      "code": "110110",
                      "label": "علامات تجارية",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1101100001",
                          "ref": "acc.1101100001",
                          "code": "1101100001",
                          "label": "علامة تجارية - فولين",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101100002",
                          "ref": "acc.1101100002",
                          "code": "1101100002",
                          "label": "علامة تجارية - سالكو",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101100003",
                          "ref": "acc.1101100003",
                          "code": "1101100003",
                          "label": "علامة تجارية - جكس",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101100004",
                          "ref": "acc.1101100004",
                          "code": "1101100004",
                          "label": "علامة تجارية - G7X",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101100005",
                          "ref": "acc.1101100005",
                          "code": "1101100005",
                          "label": "علامة تجارية - RAVAL",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1101100006",
                          "ref": "acc.1101100006",
                          "code": "1101100006",
                          "label": "علامة تجارية - RAVAL RUFILA",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.1102",
                  "ref": "acc.1102",
                  "code": "1102",
                  "label": "مشاريع تحت التنفيذ",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.110201",
                      "ref": "acc.110201",
                      "code": "110201",
                      "label": "مشاريع تحت التنفيذ",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1102010001",
                          "ref": "acc.1102010001",
                          "code": "1102010001",
                          "label": "مشاريع تحت التنفيذ -1",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "id": "acc.12",
              "ref": "acc.12",
              "code": "12",
              "label": "الاصول المتداولة",
              "status": "ready",
              "kind": "submodule",
              "icon": "folder",
              "children": [
                {
                  "id": "acc.1201",
                  "ref": "acc.1201",
                  "code": "1201",
                  "label": "الأموال الجاهزة",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.120101",
                      "ref": "acc.120101",
                      "code": "120101",
                      "label": "الصناديق",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1201010001",
                          "ref": "acc.1201010001",
                          "code": "1201010001",
                          "label": "صندوق الإدارة العامة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1201010002",
                          "ref": "acc.1201010002",
                          "code": "1201010002",
                          "label": "صندوق المندوبين",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.120102",
                      "ref": "acc.120102",
                      "code": "120102",
                      "label": "البنوك",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1201020001",
                          "ref": "acc.1201020001",
                          "code": "1201020001",
                          "label": "مصرف الراجحي",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1201020002",
                          "ref": "acc.1201020002",
                          "code": "1201020002",
                          "label": "مصرف بنك العربي",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1201020003",
                          "ref": "acc.1201020003",
                          "code": "1201020003",
                          "label": "سواء stc مصرف بنك",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1201020004",
                          "ref": "acc.1201020004",
                          "code": "1201020004",
                          "label": "بنك الاهلي",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1201020005",
                          "ref": "acc.1201020005",
                          "code": "1201020005",
                          "label": "وسيط - شبكات وبنوك المندوبين",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1201020006",
                          "ref": "acc.1201020006",
                          "code": "1201020006",
                          "label": "التحقق من نقاط البيع",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1201020007",
                          "ref": "acc.1201020007",
                          "code": "1201020007",
                          "label": "مصرف الراجحي - 463000001006089909554",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1201020008",
                          "ref": "acc.1201020008",
                          "code": "1201020008",
                          "label": "مصرف الراجحي (عم البعد)",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1201020009",
                          "ref": "acc.1201020009",
                          "code": "1201020009",
                          "label": "مصرف الراجحي سميح - 453000001006080548347",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.1202",
                  "ref": "acc.1202",
                  "code": "1202",
                  "label": "حساب المخزون",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.120201",
                      "ref": "acc.120201",
                      "code": "120201",
                      "label": "المخزون السلعي",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1202010001",
                          "ref": "acc.1202010001",
                          "code": "1202010001",
                          "label": "المخزون السلعي للبضائع",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1202010009",
                          "ref": "acc.1202010009",
                          "code": "1202010009",
                          "label": "مخزن تحت التشغيل",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1202010010",
                          "ref": "acc.1202010010",
                          "code": "1202010010",
                          "label": "وسيط التحويل المخزني",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1202010011",
                          "ref": "acc.1202010011",
                          "code": "1202010011",
                          "label": "وسيط التحويل المخزني صرف الكرتون",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1202010012",
                          "ref": "acc.1202010012",
                          "code": "1202010012",
                          "label": "مخزن توريد بضاعة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1202010013",
                          "ref": "acc.1202010013",
                          "code": "1202010013",
                          "label": "مخزن توريد خامات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1202010014",
                          "ref": "acc.1202010014",
                          "code": "1202010014",
                          "label": "مخزن المعدات",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.1203",
                  "ref": "acc.1203",
                  "code": "1203",
                  "label": "ذمم العملاء",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.120301",
                      "ref": "acc.120301",
                      "code": "120301",
                      "label": "ذمم العملاء",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1203010001",
                          "ref": "acc.1203010001",
                          "code": "1203010001",
                          "label": "العملاء",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.1204",
                  "ref": "acc.1204",
                  "code": "1204",
                  "label": "ذمم الموظفين الادارة",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.120401",
                      "ref": "acc.120401",
                      "code": "120401",
                      "label": "ذمم الموظفين الادارة",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1204010001",
                          "ref": "acc.1204010001",
                          "code": "1204010001",
                          "label": "سلف الموظفين",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1204010002",
                          "ref": "acc.1204010002",
                          "code": "1204010002",
                          "label": "عهد الموظفين",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.1205",
                  "ref": "acc.1205",
                  "code": "1205",
                  "label": "الاعتمادات المستندية",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.120501",
                      "ref": "acc.120501",
                      "code": "120501",
                      "label": "الاعتمادات المستندية",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1205010001",
                          "ref": "acc.1205010001",
                          "code": "1205010001",
                          "label": "أعضاء الفاتورة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1205010002",
                          "ref": "acc.1205010002",
                          "code": "1205010002",
                          "label": "مصاريف جمارك",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1205010003",
                          "ref": "acc.1205010003",
                          "code": "1205010003",
                          "label": "رسوم الشحن",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1205010004",
                          "ref": "acc.1205010004",
                          "code": "1205010004",
                          "label": "مصاريف نقل",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1205010005",
                          "ref": "acc.1205010005",
                          "code": "1205010005",
                          "label": "تأمين بحري",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1205010006",
                          "ref": "acc.1205010006",
                          "code": "1205010006",
                          "label": "مصاريف بنكية للمشتريات الخارجية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1205010007",
                          "ref": "acc.1205010007",
                          "code": "1205010007",
                          "label": "مصاريف أخرى",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.1206",
                  "ref": "acc.1206",
                  "code": "1206",
                  "label": "مسحوبات الشركاء",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.120601",
                      "ref": "acc.120601",
                      "code": "120601",
                      "label": "مسحوبات المالك",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1206010001",
                          "ref": "acc.1206010001",
                          "code": "1206010001",
                          "label": "مسحوبات السيد -1",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1206010002",
                          "ref": "acc.1206010002",
                          "code": "1206010002",
                          "label": "مسحوبات السيد -2",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1206010003",
                          "ref": "acc.1206010003",
                          "code": "1206010003",
                          "label": "مسحوبات السيد -3",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.1207",
                  "ref": "acc.1207",
                  "code": "1207",
                  "label": "ارصدة مدينة أخرى",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.120701",
                      "ref": "acc.120701",
                      "code": "120701",
                      "label": "الارصدة المدينة الأخرى",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1207010001",
                          "ref": "acc.1207010001",
                          "code": "1207010001",
                          "label": "مصروفات مدفوعة مقدما - إيجارات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207010002",
                          "ref": "acc.1207010002",
                          "code": "1207010002",
                          "label": "مصروفات مدفوعة مقدما - دعاية واعلان",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207010003",
                          "ref": "acc.1207010003",
                          "code": "1207010003",
                          "label": "إيرادات مستحقة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207010004",
                          "ref": "acc.1207010004",
                          "code": "1207010004",
                          "label": "مصروفات مدفوعة مقدما - رسوم حكومية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207010005",
                          "ref": "acc.1207010005",
                          "code": "1207010005",
                          "label": "أرصدة مدينة تحت التسوية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207010006",
                          "ref": "acc.1207010006",
                          "code": "1207010006",
                          "label": "مصروفات مستحقة أخرى",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207010007",
                          "ref": "acc.1207010007",
                          "code": "1207010007",
                          "label": "دفعات مقدمة من الموردين",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207010008",
                          "ref": "acc.1207010008",
                          "code": "1207010008",
                          "label": "يوم 1-10 الى 10-15 م بعد اغلاق السنة 2023",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207010009",
                          "ref": "acc.1207010009",
                          "code": "1207010009",
                          "label": "دفعات مقدمة من العملاء",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.120702",
                      "ref": "acc.120702",
                      "code": "120702",
                      "label": "أوراق القبض",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1207020001",
                          "ref": "acc.1207020001",
                          "code": "1207020001",
                          "label": "اوراق القبض",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.120703",
                      "ref": "acc.120703",
                      "code": "120703",
                      "label": "ضريبة القيمة المضافة مدخلات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1207030001",
                          "ref": "acc.1207030001",
                          "code": "1207030001",
                          "label": "ضريبة القيمة المضافة مدخلات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207030002",
                          "ref": "acc.1207030002",
                          "code": "1207030002",
                          "label": "ضريبة القيمة المضافة - مصروفات عارف",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207030003",
                          "ref": "acc.1207030003",
                          "code": "1207030003",
                          "label": "ضريبة القيمة المضافة - مصروفات قم",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207030004",
                          "ref": "acc.1207030004",
                          "code": "1207030004",
                          "label": "ضريبة القيمة المضافة - مصروفات سميح",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1207030005",
                          "ref": "acc.1207030005",
                          "code": "1207030005",
                          "label": "ضريبة القيمة المضافة - مصروفات بلاستيك",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.1208",
                  "ref": "acc.1208",
                  "code": "1208",
                  "label": "أنشطة شقيقة",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.120801",
                      "ref": "acc.120801",
                      "code": "120801",
                      "label": "شركة قم البعد الجديدة التجارية - فولين",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1208010001",
                          "ref": "acc.1208010001",
                          "code": "1208010001",
                          "label": "شركة قم البعد الجديدة التجارية - فولين",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.1208010002",
                          "ref": "acc.1208010002",
                          "code": "1208010002",
                          "label": "فرع البلاستيك شركة قم",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.120802",
                      "ref": "acc.120802",
                      "code": "120802",
                      "label": "شركة بتروسبيشل لزيت التنشيح",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.1208020001",
                          "ref": "acc.1208020001",
                          "code": "1208020001",
                          "label": "شركة بتروسبيشل لزيت التنشيح",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "id": "acc.2",
          "ref": "acc.2",
          "code": "2",
          "label": "الخصوم وحقوق الملكية",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "acc.21",
              "ref": "acc.21",
              "code": "21",
              "label": "حقوق الملكية",
              "status": "ready",
              "kind": "submodule",
              "icon": "folder",
              "children": [
                {
                  "id": "acc.2101",
                  "ref": "acc.2101",
                  "code": "2101",
                  "label": "حقوق الملكية للمؤسسة",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.210101",
                      "ref": "acc.210101",
                      "code": "210101",
                      "label": "رأس مال الشركة",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2101010001",
                          "ref": "acc.2101010001",
                          "code": "2101010001",
                          "label": "رأس المال",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.210102",
                      "ref": "acc.210102",
                      "code": "210102",
                      "label": "الارباح والخسائر",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2101020001",
                          "ref": "acc.2101020001",
                          "code": "2101020001",
                          "label": "ارباح وخسائر العام",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.210103",
                      "ref": "acc.210103",
                      "code": "210103",
                      "label": "جاري المالك",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2101030001",
                          "ref": "acc.2101030001",
                          "code": "2101030001",
                          "label": "جاري الشريك -1",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2101030002",
                          "ref": "acc.2101030002",
                          "code": "2101030002",
                          "label": "جاري الشريك -2",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.210104",
                      "ref": "acc.210104",
                      "code": "210104",
                      "label": "الاحتياطيات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2101040001",
                          "ref": "acc.2101040001",
                          "code": "2101040001",
                          "label": "احتياطي عام",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "id": "acc.22",
              "ref": "acc.22",
              "code": "22",
              "label": "الخصوم",
              "status": "ready",
              "kind": "submodule",
              "icon": "folder",
              "children": [
                {
                  "id": "acc.2201",
                  "ref": "acc.2201",
                  "code": "2201",
                  "label": "الخصوم الثابتة",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.220101",
                      "ref": "acc.220101",
                      "code": "220101",
                      "label": "القروض",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2201010001",
                          "ref": "acc.2201010001",
                          "code": "2201010001",
                          "label": "القروض البنكية",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.2202",
                  "ref": "acc.2202",
                  "code": "2202",
                  "label": "الخصوم المتداولة",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.220201",
                      "ref": "acc.220201",
                      "code": "220201",
                      "label": "موردين - خارجيون",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2202010001",
                          "ref": "acc.2202010001",
                          "code": "2202010001",
                          "label": "موردين خارجيون -1",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202010002",
                          "ref": "acc.2202010002",
                          "code": "2202010002",
                          "label": "موردين خارجيون -2",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220202",
                      "ref": "acc.220202",
                      "code": "220202",
                      "label": "موردين داخليين",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2202020001",
                          "ref": "acc.2202020001",
                          "code": "2202020001",
                          "label": "موردون محليون",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202020002",
                          "ref": "acc.2202020002",
                          "code": "2202020002",
                          "label": "موردون - منثوعون",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202020003",
                          "ref": "acc.2202020003",
                          "code": "2202020003",
                          "label": "موردين الخدمات",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220203",
                      "ref": "acc.220203",
                      "code": "220203",
                      "label": "اوراق الدفع",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2202030001",
                          "ref": "acc.2202030001",
                          "code": "2202030001",
                          "label": "اوراق الدفع",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220204",
                      "ref": "acc.220204",
                      "code": "220204",
                      "label": "مجمع أهلاك الأصول الثابتة",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2202040001",
                          "ref": "acc.2202040001",
                          "code": "2202040001",
                          "label": "مجمع إهلاك السيارات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202040002",
                          "ref": "acc.2202040002",
                          "code": "2202040002",
                          "label": "مجمع اهلاك الآلات والمعدات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202040003",
                          "ref": "acc.2202040003",
                          "code": "2202040003",
                          "label": "مجمع اهلاك الكمبيوترات والطابعات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202040004",
                          "ref": "acc.2202040004",
                          "code": "2202040004",
                          "label": "مجمع اهلاك الاثاث والمفروشات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202040005",
                          "ref": "acc.2202040005",
                          "code": "2202040005",
                          "label": "مجمع اهلاك كاميرات المراقبة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202040006",
                          "ref": "acc.2202040006",
                          "code": "2202040006",
                          "label": "مجمع اهلاك البرامج المحاسبية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202040007",
                          "ref": "acc.2202040007",
                          "code": "2202040007",
                          "label": "مجمع اهلاك م/التأسيس",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220205",
                      "ref": "acc.220205",
                      "code": "220205",
                      "label": "مخصصات الاصول",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2202050001",
                          "ref": "acc.2202050001",
                          "code": "2202050001",
                          "label": "مخصص اهلاك السيارات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202050002",
                          "ref": "acc.2202050002",
                          "code": "2202050002",
                          "label": "مخصص اهلاك الأثاث",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202050003",
                          "ref": "acc.2202050003",
                          "code": "2202050003",
                          "label": "مخصص اهلاك الديكور",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202050004",
                          "ref": "acc.2202050004",
                          "code": "2202050004",
                          "label": "مخصص اهلاك الأجهزة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202050005",
                          "ref": "acc.2202050005",
                          "code": "2202050005",
                          "label": "مخصص زكاة الدخل",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202050006",
                          "ref": "acc.2202050006",
                          "code": "2202050006",
                          "label": "مخصص هبوط اسعار المخزون",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202050007",
                          "ref": "acc.2202050007",
                          "code": "2202050007",
                          "label": "مخصص ديون مشكوك به",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220206",
                      "ref": "acc.220206",
                      "code": "220206",
                      "label": "ارصدة دائنة اخرى",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2202060001",
                          "ref": "acc.2202060001",
                          "code": "2202060001",
                          "label": "ايرادات مقدمة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202060002",
                          "ref": "acc.2202060002",
                          "code": "2202060002",
                          "label": "الرواتب المستحقة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202060003",
                          "ref": "acc.2202060003",
                          "code": "2202060003",
                          "label": "ارصدة دائنة تحت التسوية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202060004",
                          "ref": "acc.2202060004",
                          "code": "2202060004",
                          "label": "معرض محمد عساف بن فهيد",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220207",
                      "ref": "acc.220207",
                      "code": "220207",
                      "label": "ضريبة القيمة المضافة مخرجات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2202070001",
                          "ref": "acc.2202070001",
                          "code": "2202070001",
                          "label": "ضريبة القيمة المضافة مخرجات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202070002",
                          "ref": "acc.2202070002",
                          "code": "2202070002",
                          "label": "وسيط ضريبة القيمة المضافة المستحقة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202070003",
                          "ref": "acc.2202070003",
                          "code": "2202070003",
                          "label": "هيئة الزكاة والضريبة والجمارك",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220208",
                      "ref": "acc.220208",
                      "code": "220208",
                      "label": "مصروفات مستحقة",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2202080001",
                          "ref": "acc.2202080001",
                          "code": "2202080001",
                          "label": "مصروفات مستحقة - ايجارات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202080002",
                          "ref": "acc.2202080002",
                          "code": "2202080002",
                          "label": "مصروفات مستحقة - كهرباء",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202080003",
                          "ref": "acc.2202080003",
                          "code": "2202080003",
                          "label": "مصروفات مستحقة - اتعاب استشارات وتدقيق",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202080004",
                          "ref": "acc.2202080004",
                          "code": "2202080004",
                          "label": "مصروفات مستحقة - هاتف",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202080005",
                          "ref": "acc.2202080005",
                          "code": "2202080005",
                          "label": "مصروفات مستحقة - عمولات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202080006",
                          "ref": "acc.2202080006",
                          "code": "2202080006",
                          "label": "مصروفات مستحقة إضافي",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220209",
                      "ref": "acc.220209",
                      "code": "220209",
                      "label": "حساب وسيط المندوبين",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2202090001",
                          "ref": "acc.2202090001",
                          "code": "2202090001",
                          "label": "وسيط الرئيسي (عارف)",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202090002",
                          "ref": "acc.2202090002",
                          "code": "2202090002",
                          "label": "وسيط المندوب - عارف",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202090003",
                          "ref": "acc.2202090003",
                          "code": "2202090003",
                          "label": "وسيط الرئيسي (عادل)",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202090004",
                          "ref": "acc.2202090004",
                          "code": "2202090004",
                          "label": "وسيط المندوب / عادل",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202090005",
                          "ref": "acc.2202090005",
                          "code": "2202090005",
                          "label": "وسيط الرئيسي (سميح)",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202090006",
                          "ref": "acc.2202090006",
                          "code": "2202090006",
                          "label": "وسيط المندوب/ سميح",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202090007",
                          "ref": "acc.2202090007",
                          "code": "2202090007",
                          "label": "وسيط الرئيسي (البلاستيك)",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2202090008",
                          "ref": "acc.2202090008",
                          "code": "2202090008",
                          "label": "وسيط الفرع/ البلاستيك",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.2203",
                  "ref": "acc.2203",
                  "code": "2203",
                  "label": "مخصصات الإهلاك",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.220301",
                      "ref": "acc.220301",
                      "code": "220301",
                      "label": "مخصص إهلاك السيارات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2203010001",
                          "ref": "acc.2203010001",
                          "code": "2203010001",
                          "label": "مخصص إهلاك - باص هيبنداي موديل 2008",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010002",
                          "ref": "acc.2203010002",
                          "code": "2203010002",
                          "label": "مخصص إهلاك - باص هايس موديل 2014",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010003",
                          "ref": "acc.2203010003",
                          "code": "2203010003",
                          "label": "مخصص إهلاك - باص هايس موديل 2010",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010004",
                          "ref": "acc.2203010004",
                          "code": "2203010004",
                          "label": "مخصص إهلاك - باص هايس موديل 2013",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010005",
                          "ref": "acc.2203010005",
                          "code": "2203010005",
                          "label": "مخصص إهلاك - باص هايس موديل 2014 - مكة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010006",
                          "ref": "acc.2203010006",
                          "code": "2203010006",
                          "label": "مخصص إهلاك - باص هايس موديل 2014 لوحة رقم ح ن ع 6426",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010007",
                          "ref": "acc.2203010007",
                          "code": "2203010007",
                          "label": "مخصص إهلاك - باص هايس موديل 2005 (عادل)",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010008",
                          "ref": "acc.2203010008",
                          "code": "2203010008",
                          "label": "مخصص إهلاك CTPOWER أزرق - رافعة شوكية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010009",
                          "ref": "acc.2203010009",
                          "code": "2203010009",
                          "label": "مخصص إهلاك - كورولا موديل 2013 لوحة رقم ب ن ص 4649",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010010",
                          "ref": "acc.2203010010",
                          "code": "2203010010",
                          "label": "مخصص إهلاك - سيارة تويوتا هايس موديل 2013 اللوحة 5108",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010011",
                          "ref": "acc.2203010011",
                          "code": "2203010011",
                          "label": "مخصص إهلاك - باص موديل 2008 اللوحة ا ح ج 3417",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010012",
                          "ref": "acc.2203010012",
                          "code": "2203010012",
                          "label": "مخصص إهلاك - تويوتا موديل 2016 اللوحة ب ن ب 1276",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010013",
                          "ref": "acc.2203010013",
                          "code": "2203010013",
                          "label": "مخصص إهلاك - تويوتا موديل 2013 اللوحة ا ه ب 2126",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010014",
                          "ref": "acc.2203010014",
                          "code": "2203010014",
                          "label": "مخصص إهلاك - سيارة شانجان دبل موديل 2022 اللوحة د و ع 7782",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203010015",
                          "ref": "acc.2203010015",
                          "code": "2203010015",
                          "label": "مخصص إهلاك - تنسويشي موديل 2007 اللوحة أ ق د 5183",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220302",
                      "ref": "acc.220302",
                      "code": "220302",
                      "label": "مخصص إهلاك الاثاث والمفروشات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2203020001",
                          "ref": "acc.2203020001",
                          "code": "2203020001",
                          "label": "تجهيزات مكتبية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203020002",
                          "ref": "acc.2203020002",
                          "code": "2203020002",
                          "label": "ديكورات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203020003",
                          "ref": "acc.2203020003",
                          "code": "2203020003",
                          "label": "أثاث مكتبي ومكيفات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203020004",
                          "ref": "acc.2203020004",
                          "code": "2203020004",
                          "label": "مكيف دولاب جنرال سويحري بحريني 60",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203020005",
                          "ref": "acc.2203020005",
                          "code": "2203020005",
                          "label": "برادة مياه - GVC PRO",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203020006",
                          "ref": "acc.2203020006",
                          "code": "2203020006",
                          "label": "مكيف دورا 18 وحدة شباك",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203020007",
                          "ref": "acc.2203020007",
                          "code": "2203020007",
                          "label": "تجهيزات معرض كبير 8",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203020008",
                          "ref": "acc.2203020008",
                          "code": "2203020008",
                          "label": "مكتب الإدارة كيلو 8",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203020009",
                          "ref": "acc.2203020009",
                          "code": "2203020009",
                          "label": "مكتب مستودع كيلو 8 (بجوار كيان)",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220303",
                      "ref": "acc.220303",
                      "code": "220303",
                      "label": "مخصص إهلاك الكمبيوترات والطابعات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2203030001",
                          "ref": "acc.2203030001",
                          "code": "2203030001",
                          "label": "جهاز كمبيوتر LED Dell + طابعة HP laser",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203030002",
                          "ref": "acc.2203030002",
                          "code": "2203030002",
                          "label": "جهاز كمبيوتر Dell Optiplex",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203030003",
                          "ref": "acc.2203030003",
                          "code": "2203030003",
                          "label": "شاشة عرض GVC PRO LED 32 -1",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203030004",
                          "ref": "acc.2203030004",
                          "code": "2203030004",
                          "label": "شاشة عرض GVC PRO LED 32 -2",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203030005",
                          "ref": "acc.2203030005",
                          "code": "2203030005",
                          "label": "شاشة عرض GVC PRO LED 32 -3",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203030006",
                          "ref": "acc.2203030006",
                          "code": "2203030006",
                          "label": "طابعة فواتير ابسون EPSON LQ-690",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203030007",
                          "ref": "acc.2203030007",
                          "code": "2203030007",
                          "label": "طابعات فواتير عدد 7",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203030008",
                          "ref": "acc.2203030008",
                          "code": "2203030008",
                          "label": "جهاز كمبيوتر Dell OPTIPLEX 3020",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203030009",
                          "ref": "acc.2203030009",
                          "code": "2203030009",
                          "label": "⚠ الاسم غير واضح في المصدر",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203030010",
                          "ref": "acc.2203030010",
                          "code": "2203030010",
                          "label": "5 اجهزة طابعات HP LASER JET 111W",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203030011",
                          "ref": "acc.2203030011",
                          "code": "2203030011",
                          "label": "جهاز كمبيوتر ASUS D500MD",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.2203030012",
                          "ref": "acc.2203030012",
                          "code": "2203030012",
                          "label": "شاشة كمبيوتر MICRODIGIT",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220304",
                      "ref": "acc.220304",
                      "code": "220304",
                      "label": "مخصص اهلاك اجهزة وكاميرات مراقبة",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2203040001",
                          "ref": "acc.2203040001",
                          "code": "2203040001",
                          "label": "كاميرات مراقبة هيك فيجن",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220305",
                      "ref": "acc.220305",
                      "code": "220305",
                      "label": "مخصص اهلاك البرامج المحاسبية",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2203050001",
                          "ref": "acc.2203050001",
                          "code": "2203050001",
                          "label": "مخصص اهلاك برنامج ERP المتكامل",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.2204",
                  "ref": "acc.2204",
                  "code": "2204",
                  "label": "مخصصات بخلاف الاهلاك",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.220401",
                      "ref": "acc.220401",
                      "code": "220401",
                      "label": "مخصص نهاية الخدمة",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2204010001",
                          "ref": "acc.2204010001",
                          "code": "2204010001",
                          "label": "مخصص نهاية الخدمة",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.220402",
                      "ref": "acc.220402",
                      "code": "220402",
                      "label": "مخصص بدل إجازة سنوية",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.2204020001",
                          "ref": "acc.2204020001",
                          "code": "2204020001",
                          "label": "مخصص بدل إجازة سنوية",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "id": "acc.3",
          "ref": "acc.3",
          "code": "3",
          "label": "المصروفات",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "acc.31",
              "ref": "acc.31",
              "code": "31",
              "label": "النشاط الجاري",
              "status": "ready",
              "kind": "submodule",
              "icon": "folder",
              "children": [
                {
                  "id": "acc.3101",
                  "ref": "acc.3101",
                  "code": "3101",
                  "label": "مصروفات النشاط",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.310101",
                      "ref": "acc.310101",
                      "code": "310101",
                      "label": "تكلفة المبيعات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.3101010001",
                          "ref": "acc.3101010001",
                          "code": "3101010001",
                          "label": "تكلفة المبيعات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3101010002",
                          "ref": "acc.3101010002",
                          "code": "3101010002",
                          "label": "رق تكلفة أوامر توريد مخزني وأوامر صرف مخزني",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.310102",
                      "ref": "acc.310102",
                      "code": "310102",
                      "label": "مردودات سنوات سابقة",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.3101020001",
                          "ref": "acc.3101020001",
                          "code": "3101020001",
                          "label": "مردودات سنوات سابقة",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.310103",
                      "ref": "acc.310103",
                      "code": "310103",
                      "label": "تكلفة مبيعات سنوات سابقة",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.3101030001",
                          "ref": "acc.3101030001",
                          "code": "3101030001",
                          "label": "تكلفة مبيعات سنوات سابقة",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.310104",
                      "ref": "acc.310104",
                      "code": "310104",
                      "label": "تكلفة مردود المبيعات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.3101040001",
                          "ref": "acc.3101040001",
                          "code": "3101040001",
                          "label": "تكلفة مردود المبيعات",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.310105",
                      "ref": "acc.310105",
                      "code": "310105",
                      "label": "مبيعات الكميات المجانية",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.3101050001",
                          "ref": "acc.3101050001",
                          "code": "3101050001",
                          "label": "تكلفة الكميات المجانية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3101050002",
                          "ref": "acc.3101050002",
                          "code": "3101050002",
                          "label": "تكلفة مردود الكميات المجانية",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.310106",
                      "ref": "acc.310106",
                      "code": "310106",
                      "label": "مصاريف متعلقة بالنشاط",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.3101060001",
                          "ref": "acc.3101060001",
                          "code": "3101060001",
                          "label": "فروق الكسور",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3101060002",
                          "ref": "acc.3101060002",
                          "code": "3101060002",
                          "label": "فروق التكلفة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3101060003",
                          "ref": "acc.3101060003",
                          "code": "3101060003",
                          "label": "فروق الاعتمادات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3101060004",
                          "ref": "acc.3101060004",
                          "code": "3101060004",
                          "label": "الأصناف المفقودة",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "id": "acc.32",
              "ref": "acc.32",
              "code": "32",
              "label": "المصاريف الأخرى",
              "status": "ready",
              "kind": "submodule",
              "icon": "folder",
              "children": [
                {
                  "id": "acc.3201",
                  "ref": "acc.3201",
                  "code": "3201",
                  "label": "عمومية وادارية",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.320101",
                      "ref": "acc.320101",
                      "code": "320101",
                      "label": "المصروفات العمومية والادارية",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.3201010001",
                          "ref": "acc.3201010001",
                          "code": "3201010001",
                          "label": "أجور ومرتبات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010002",
                          "ref": "acc.3201010002",
                          "code": "3201010002",
                          "label": "أجور يومية ومزايا",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010003",
                          "ref": "acc.3201010003",
                          "code": "3201010003",
                          "label": "مصاريف سفر",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010004",
                          "ref": "acc.3201010004",
                          "code": "3201010004",
                          "label": "مواصلات عامة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010005",
                          "ref": "acc.3201010005",
                          "code": "3201010005",
                          "label": "هاتف وبريد وانترنت",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010006",
                          "ref": "acc.3201010006",
                          "code": "3201010006",
                          "label": "اكراميات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010007",
                          "ref": "acc.3201010007",
                          "code": "3201010007",
                          "label": "مكافآت",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010008",
                          "ref": "acc.3201010008",
                          "code": "3201010008",
                          "label": "ايجارات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010009",
                          "ref": "acc.3201010009",
                          "code": "3201010009",
                          "label": "قرطاسية ومطبوعات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010010",
                          "ref": "acc.3201010010",
                          "code": "3201010010",
                          "label": "م/كهرباء",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010011",
                          "ref": "acc.3201010011",
                          "code": "3201010011",
                          "label": "م/ مياه",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010012",
                          "ref": "acc.3201010012",
                          "code": "3201010012",
                          "label": "تشريات ادارية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010013",
                          "ref": "acc.3201010013",
                          "code": "3201010013",
                          "label": "مصاريف ضيافة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010014",
                          "ref": "acc.3201010014",
                          "code": "3201010014",
                          "label": "فوائد بنكية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010015",
                          "ref": "acc.3201010015",
                          "code": "3201010015",
                          "label": "عمولات فيزا ومستر",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010016",
                          "ref": "acc.3201010016",
                          "code": "3201010016",
                          "label": "محروقات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010017",
                          "ref": "acc.3201010017",
                          "code": "3201010017",
                          "label": "رسوم حكومية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010018",
                          "ref": "acc.3201010018",
                          "code": "3201010018",
                          "label": "صيانة عدد وادوات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010019",
                          "ref": "acc.3201010019",
                          "code": "3201010019",
                          "label": "مصروفات السيارات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010020",
                          "ref": "acc.3201010020",
                          "code": "3201010020",
                          "label": "صيانة شبكات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010021",
                          "ref": "acc.3201010021",
                          "code": "3201010021",
                          "label": "برامج وصيانة اجهزة كمبيوتر",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010022",
                          "ref": "acc.3201010022",
                          "code": "3201010022",
                          "label": "أصلاحات وترميمات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010024",
                          "ref": "acc.3201010024",
                          "code": "3201010024",
                          "label": "مصروفات متنوعة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010025",
                          "ref": "acc.3201010025",
                          "code": "3201010025",
                          "label": "رسوم استشارات ومراجعة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010026",
                          "ref": "acc.3201010026",
                          "code": "3201010026",
                          "label": "تسهيلات مختلفة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010027",
                          "ref": "acc.3201010027",
                          "code": "3201010027",
                          "label": "رسوم تراخيص",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010028",
                          "ref": "acc.3201010028",
                          "code": "3201010028",
                          "label": "مصاريف أتعاب مهنية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010029",
                          "ref": "acc.3201010029",
                          "code": "3201010029",
                          "label": "مصاريف ديون مشكوك فيه",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010030",
                          "ref": "acc.3201010030",
                          "code": "3201010030",
                          "label": "مصاريف الزكاة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010031",
                          "ref": "acc.3201010031",
                          "code": "3201010031",
                          "label": "المساعدات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010032",
                          "ref": "acc.3201010032",
                          "code": "3201010032",
                          "label": "فروق عملة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010033",
                          "ref": "acc.3201010033",
                          "code": "3201010033",
                          "label": "تأمينات اجتماعية واشتراكات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010034",
                          "ref": "acc.3201010034",
                          "code": "3201010034",
                          "label": "مصاريف تغليف",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010035",
                          "ref": "acc.3201010035",
                          "code": "3201010035",
                          "label": "عجز ونقص بالبضائع",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010036",
                          "ref": "acc.3201010036",
                          "code": "3201010036",
                          "label": "الخصم المسموح",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010037",
                          "ref": "acc.3201010037",
                          "code": "3201010037",
                          "label": "رسوم بنكية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010038",
                          "ref": "acc.3201010038",
                          "code": "3201010038",
                          "label": "مصروفات التأمين الطبي",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010039",
                          "ref": "acc.3201010039",
                          "code": "3201010039",
                          "label": "وزارة التجارة وتصديقات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010040",
                          "ref": "acc.3201010040",
                          "code": "3201010040",
                          "label": "مصروفات نظافة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010041",
                          "ref": "acc.3201010041",
                          "code": "3201010041",
                          "label": "بدل إجازة سنوية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010042",
                          "ref": "acc.3201010042",
                          "code": "3201010042",
                          "label": "نهاية الخدمة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010043",
                          "ref": "acc.3201010043",
                          "code": "3201010043",
                          "label": "أجور تحميل وتنزيل",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010044",
                          "ref": "acc.3201010044",
                          "code": "3201010044",
                          "label": "غرامات ومخالفات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010045",
                          "ref": "acc.3201010045",
                          "code": "3201010045",
                          "label": "مصاريف علاج",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010046",
                          "ref": "acc.3201010046",
                          "code": "3201010046",
                          "label": "ديون معدومة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010047",
                          "ref": "acc.3201010047",
                          "code": "3201010047",
                          "label": "عجز بالصندوق",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010048",
                          "ref": "acc.3201010048",
                          "code": "3201010048",
                          "label": "فحوصات مخبرية وعينات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010049",
                          "ref": "acc.3201010049",
                          "code": "3201010049",
                          "label": "عينات السوق",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010050",
                          "ref": "acc.3201010050",
                          "code": "3201010050",
                          "label": "بدلات للموظفين",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010051",
                          "ref": "acc.3201010051",
                          "code": "3201010051",
                          "label": "فروقات نقاط البيع",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010052",
                          "ref": "acc.3201010052",
                          "code": "3201010052",
                          "label": "مصروف الإيجارات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3201010053",
                          "ref": "acc.3201010053",
                          "code": "3201010053",
                          "label": "مصروف علامات تجارية",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.3202",
                  "ref": "acc.3202",
                  "code": "3202",
                  "label": "المصاريف التسويقية",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.320201",
                      "ref": "acc.320201",
                      "code": "320201",
                      "label": "المصروفات التسويقية",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.3202010001",
                          "ref": "acc.3202010001",
                          "code": "3202010001",
                          "label": "عمولة تحصيل",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3202010002",
                          "ref": "acc.3202010002",
                          "code": "3202010002",
                          "label": "دعاية واعلان",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3202010003",
                          "ref": "acc.3202010003",
                          "code": "3202010003",
                          "label": "مصاريف نقل",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3202010004",
                          "ref": "acc.3202010004",
                          "code": "3202010004",
                          "label": "⚠ الاسم غير واضح في المصدر (عجز ...)",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3202010005",
                          "ref": "acc.3202010005",
                          "code": "3202010005",
                          "label": "اجور تعبئة وتغليف مصنع رواد الطاقة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3202010006",
                          "ref": "acc.3202010006",
                          "code": "3202010006",
                          "label": "مصاريف تسويق متنوعة",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3202010007",
                          "ref": "acc.3202010007",
                          "code": "3202010007",
                          "label": "مصروف ترقيم المنتجات - مركز الترقيم السعودي",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3202010008",
                          "ref": "acc.3202010008",
                          "code": "3202010008",
                          "label": "هدايا وكافآت وكلاء المبيعات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3202010009",
                          "ref": "acc.3202010009",
                          "code": "3202010009",
                          "label": "عمولات وكلاء البيع",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.3203",
                  "ref": "acc.3203",
                  "code": "3203",
                  "label": "مصاريف اهلاك الأصول",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.320301",
                      "ref": "acc.320301",
                      "code": "320301",
                      "label": "مصروفات أهلاك الأصول",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.3203010001",
                          "ref": "acc.3203010001",
                          "code": "3203010001",
                          "label": "اهلاك سيارات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3203010002",
                          "ref": "acc.3203010002",
                          "code": "3203010002",
                          "label": "اهلاك الأجهزة والطابعات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3203010004",
                          "ref": "acc.3203010004",
                          "code": "3203010004",
                          "label": "اهلاك الأثاث",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3203010005",
                          "ref": "acc.3203010005",
                          "code": "3203010005",
                          "label": "اهلاك الديكورات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3203010006",
                          "ref": "acc.3203010006",
                          "code": "3203010006",
                          "label": "اهلاك م/التأسيس والتجهيزات",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3203010007",
                          "ref": "acc.3203010007",
                          "code": "3203010007",
                          "label": "اطفاء مشاريع قيد التنفيذ",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3203010008",
                          "ref": "acc.3203010008",
                          "code": "3203010008",
                          "label": "إهلاك الأجهزة الكهربائية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3203010009",
                          "ref": "acc.3203010009",
                          "code": "3203010009",
                          "label": "إهلاك التجهيزات المكتبية",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.3203010010",
                          "ref": "acc.3203010010",
                          "code": "3203010010",
                          "label": "إهلاك البرامج المحاسبية",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.3204",
                  "ref": "acc.3204",
                  "code": "3204",
                  "label": "مصاريف التشغيل",
                  "status": "ready",
                  "kind": "screen"
                }
              ]
            }
          ]
        },
        {
          "id": "acc.4",
          "ref": "acc.4",
          "code": "4",
          "label": "الايرادات",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "acc.41",
              "ref": "acc.41",
              "code": "41",
              "label": "ايرادات النشاط الجاري",
              "status": "ready",
              "kind": "submodule",
              "icon": "folder",
              "children": [
                {
                  "id": "acc.4101",
                  "ref": "acc.4101",
                  "code": "4101",
                  "label": "صافي المبيعات",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.410101",
                      "ref": "acc.410101",
                      "code": "410101",
                      "label": "مبيعات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.4101010001",
                          "ref": "acc.4101010001",
                          "code": "4101010001",
                          "label": "مبيعات البضائع",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.410102",
                      "ref": "acc.410102",
                      "code": "410102",
                      "label": "مردودات المبيعات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.4101020001",
                          "ref": "acc.4101020001",
                          "code": "4101020001",
                          "label": "مردودات المبيعات",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.410103",
                      "ref": "acc.410103",
                      "code": "410103",
                      "label": "خصم مسموح بة",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.4101030001",
                          "ref": "acc.4101030001",
                          "code": "4101030001",
                          "label": "الخصم المسموح بة",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.4102",
                  "ref": "acc.4102",
                  "code": "4102",
                  "label": "ايرادات مشتريات اخرى",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.410201",
                      "ref": "acc.410201",
                      "code": "410201",
                      "label": "مردودات المشتريات",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.4102010001",
                          "ref": "acc.4102010001",
                          "code": "4102010001",
                          "label": "مردودات المشتريات",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.410202",
                      "ref": "acc.410202",
                      "code": "410202",
                      "label": "الخصم المكتسب",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.4102020001",
                          "ref": "acc.4102020001",
                          "code": "4102020001",
                          "label": "الخصم المكتسب",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    },
                    {
                      "id": "acc.410203",
                      "ref": "acc.410203",
                      "code": "410203",
                      "label": "تكلفة مشتريات الكميات المجانية",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.4102030001",
                          "ref": "acc.4102030001",
                          "code": "4102030001",
                          "label": "تكلفة مشتريات الكميات المجانية",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "acc.4103",
                  "ref": "acc.4103",
                  "code": "4103",
                  "label": "ايرادات اخرى",
                  "status": "ready",
                  "kind": "group",
                  "icon": "folder",
                  "children": [
                    {
                      "id": "acc.410301",
                      "ref": "acc.410301",
                      "code": "410301",
                      "label": "ايرادات اخرى",
                      "status": "ready",
                      "kind": "group",
                      "icon": "folder",
                      "children": [
                        {
                          "id": "acc.4103010001",
                          "ref": "acc.4103010001",
                          "code": "4103010001",
                          "label": "ايراد بيع اصول",
                          "status": "ready",
                          "kind": "screen"
                        },
                        {
                          "id": "acc.4103010002",
                          "ref": "acc.4103010002",
                          "code": "4103010002",
                          "label": "ايرادات اخرى",
                          "status": "ready",
                          "kind": "screen"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "active-config",
      "label": "الإعدادات الفعّالة",
      "labelEn": "Active Configuration",
      "kind": "module",
      "variant": "config",
      "icon": "settings",
      "accent": "emerald",
      "status": "ready",
      "note": "ما هو مفعَّل ومعطَّل فعلياً في نظام بتروسبيشل، وما يحتاج تحققاً.",
      "children": [
        {
          "id": "cfg.1",
          "ref": "cfg.1",
          "label": "هوية النظام والشركة",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "cfg.1.1",
              "ref": "cfg.1.1",
              "label": "شركة بتروسبيشل لزيوت التشحيم",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "اسم الشركة كما يظهر بترويسة النظام",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.1.2",
              "ref": "cfg.1.2",
              "label": "الوحدة المحاسبية: الإدارة",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "وحدة محاسبية واحدة نشطة",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.1.3",
              "ref": "cfg.1.3",
              "label": "الفترة المالية الحالية: 2026 / 1",
              "status": "ready",
              "cfgStatus": "verified_info",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.1.4",
              "ref": "cfg.1.4",
              "label": "إصدار أونيكس: V8.1.27-10-2024",
              "status": "ready",
              "cfgStatus": "verified_info",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.1.5",
              "ref": "cfg.1.5",
              "label": "لغة الواجهة: عربي (1)",
              "status": "ready",
              "cfgStatus": "verified_info",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.1.6",
              "ref": "cfg.1.6",
              "label": "تقويم النظام: ميلادي",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "التقويم المقابل غير محدد",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.1.7",
              "ref": "cfg.1.7",
              "label": "أرصدة الحسابات متعددة السنوات تبدأ من: 2023",
              "status": "ready",
              "cfgStatus": "verified_info",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.1.8",
              "ref": "cfg.1.8",
              "label": "الأرصدة المخزنية متعددة السنوات تبدأ من: 2023",
              "status": "ready",
              "cfgStatus": "verified_info",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.1.9",
              "ref": "cfg.1.9",
              "label": "نوع الفترة الضريبية: غير مستخدم",
              "status": "ready",
              "cfgStatus": "verified_info",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.1.10",
              "ref": "cfg.1.10",
              "label": "آخر تعديل للمتغيرات العامة: 03/07/2024 — محسن السقاف",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "يفيد بمعرفة من يملك ضبط النظام",
              "source": "GENS001",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "cfg.2",
          "ref": "cfg.2",
          "label": "مفعّل — داخل نطاق النظام الجديد",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "cfg.2.1",
              "ref": "cfg.2.1",
              "label": "ضريبة القيمة المضافة",
              "status": "ready",
              "cfgStatus": "verified_on",
              "detail": "أساسية. يقابلها بالدليل المحاسبي حسابات مدخلات (120703) ومخرجات (220207) وهيئة الزكاة والضريبة والجمارك",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.2.2",
              "ref": "cfg.2.2",
              "label": "الفاتورة الإلكترونية",
              "status": "ready",
              "cfgStatus": "verified_on",
              "detail": "ربط فوترة/ZATCA. يستلزم تسلسلات فاتورة إلكترونية وترميز خدمات ويب",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.2.3",
              "ref": "cfg.2.3",
              "label": "محرك بحث التقارير",
              "status": "ready",
              "cfgStatus": "verified_on",
              "detail": "خاصية واجهة — بحث داخل التقارير",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.2.4",
              "ref": "cfg.2.4",
              "label": "ترويسة التقارير حسب المستخدم",
              "status": "ready",
              "cfgStatus": "verified_on",
              "detail": "كل مستخدم له ترويسة طباعة خاصة",
              "source": "GENS001",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "cfg.3",
          "ref": "cfg.3",
          "label": "معطّل — خارج نطاق النظام الجديد",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "cfg.3.1",
              "ref": "cfg.3.1",
              "label": "السعر شامل ضريبة المبيعات",
              "status": "ready",
              "cfgStatus": "verified_off",
              "detail": "قاعدة تسعير حاسمة: الأسعار المخزّنة بدون ضريبة، والضريبة تُحتسب فوق السعر عند الفوترة. يجب نقلها كما هي",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.3.2",
              "ref": "cfg.3.2",
              "label": "نظام مراجعة الوثائق",
              "status": "ready",
              "cfgStatus": "verified_off",
              "detail": "لا توجد دورة اعتماد مستندات مفعّلة — رغم وجود شاشات إعتماد الوثائق ومستويات الإعتماد بالشجرة",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.3.3",
              "ref": "cfg.3.3",
              "label": "نظام المخزون المفصل",
              "status": "ready",
              "cfgStatus": "verified_off",
              "detail": "مخزون مبسّط — لا تتبع مفصّل بالمواقع/الرفوف. يبسّط تصميم جداول المخزون كثيراً",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.3.4",
              "ref": "cfg.3.4",
              "label": "وضع الأستاذ العام فقط",
              "status": "ready",
              "cfgStatus": "verified_off",
              "detail": "معطّل = كل الوحدات شغالة (مخزون، عملاء، موردين)، وليس المحاسبة وحدها",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.3.5",
              "ref": "cfg.3.5",
              "label": "التوسيط الآلي لحساب جاري الفروع",
              "status": "ready",
              "cfgStatus": "verified_off",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.3.6",
              "ref": "cfg.3.6",
              "label": "المنافذ البيعية (POS)",
              "status": "ready",
              "cfgStatus": "verified_off",
              "detail": "لا يوجد بيع بنقاط بيع مباشرة",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.3.7",
              "ref": "cfg.3.7",
              "label": "خصم الضريبة من المصدر (Withholding Tax)",
              "status": "ready",
              "cfgStatus": "verified_off",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.3.8",
              "ref": "cfg.3.8",
              "label": "الربط مع هيئة الغذاء والدواء",
              "status": "ready",
              "cfgStatus": "verified_off",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.3.9",
              "ref": "cfg.3.9",
              "label": "صلاحية القوائم المالية لأكثر من وحدة محاسبية",
              "status": "ready",
              "cfgStatus": "verified_off",
              "detail": "وحدة محاسبية واحدة",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.3.10",
              "ref": "cfg.3.10",
              "label": "منع اتصال المستخدم من أكثر من جهاز",
              "status": "ready",
              "cfgStatus": "verified_off",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.3.11",
              "ref": "cfg.3.11",
              "label": "ربط المستخدم بجهاز واحد",
              "status": "ready",
              "cfgStatus": "verified_off",
              "source": "GENS001",
              "kind": "screen"
            },
            {
              "id": "cfg.3.12",
              "ref": "cfg.3.12",
              "label": "منع صلاحية أكثر من فرع في نظام اللايت",
              "status": "ready",
              "cfgStatus": "verified_off",
              "source": "GENS001",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "cfg.4",
          "ref": "cfg.4",
          "label": "العمليات اليومية — المثبّتة كاختصارات بالشاشة الرئيسية",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "cfg.4.1",
              "ref": "cfg.4.1",
              "label": "قيود اليومية",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "اختصار مثبّت = استخدام يومي",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.4.2",
              "ref": "cfg.4.2",
              "label": "سند القبض",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "اختصار مثبّت",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.4.3",
              "ref": "cfg.4.3",
              "label": "سند الصرف",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "اختصار مثبّت",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.4.4",
              "ref": "cfg.4.4",
              "label": "فاتورة المبيعات",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "اختصار مثبّت",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.4.5",
              "ref": "cfg.4.5",
              "label": "فاتورة المشتريات",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "اختصار مثبّت",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.4.6",
              "ref": "cfg.4.6",
              "label": "تقارير كشف الحساب",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "اختصار مثبّت",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.4.7",
              "ref": "cfg.4.7",
              "label": "تقارير أرصدة المخزون",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "اختصار مثبّت",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.4.8",
              "ref": "cfg.4.8",
              "label": "تقارير أمر التوريد المخزني",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "اختصار مثبّت",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.4.9",
              "ref": "cfg.4.9",
              "label": "تقارير سند الصرف",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "اختصار مثبّت",
              "source": "شاشة رئيسية",
              "kind": "screen"
            },
            {
              "id": "cfg.4.10",
              "ref": "cfg.4.10",
              "label": "تقارير فواتير المشتريات",
              "status": "ready",
              "cfgStatus": "verified_info",
              "detail": "اختصار مثبّت",
              "source": "شاشة رئيسية",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "cfg.5",
          "ref": "cfg.5",
          "label": "مؤشرات استخدام مستنبطة من الدليل المحاسبي (تحتاج تأكيد بالشاشات)",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "cfg.5.1",
              "ref": "cfg.5.1",
              "label": "الأصول الثابتة وإهلاكها لكل أصل على حدة",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "19 سيارة + آلات + كمبيوترات + أثاث، ولكل أصل حساب مخصص إهلاك مقابل (2203) — يعني الإهلاك يُدار لكل أصل منفرداً لا كمجموعة",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            },
            {
              "id": "cfg.5.2",
              "ref": "cfg.5.2",
              "label": "الصناديق والبنوك",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "صندوقان (الإدارة، المندوبين) و4+ بنوك: الراجحي (3 حسابات)، العربي، الأهلي، stc pay، إضافة لوسيط الشبكات ونقاط البيع",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            },
            {
              "id": "cfg.5.3",
              "ref": "cfg.5.3",
              "label": "المخزون بمخازن متعددة الأغراض",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "مخزن بضاعة، خامات، معدات، تحت التشغيل، ووسيط تحويل مخزني (بما فيه صرف الكرتون)",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            },
            {
              "id": "cfg.5.4",
              "ref": "cfg.5.4",
              "label": "نظام المندوبين بحسابات وسيطة",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "لكل مندوب زوج حسابات (وسيط رئيسي / وسيط مندوب): عارف، عادل، سميح، إضافة لفرع البلاستيك — نمط تسليم/تسوية عهدة",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            },
            {
              "id": "cfg.5.5",
              "ref": "cfg.5.5",
              "label": "الاعتمادات المستندية والاستيراد",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "حسابات جمارك، شحن، نقل، تأمين بحري، مصاريف بنكية للمشتريات الخارجية — يطابق استيراد الزيت الخام",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            },
            {
              "id": "cfg.5.6",
              "ref": "cfg.5.6",
              "label": "العملاء بالآجل وأعمار الديون",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "حساب العملاء + مخصص ديون مشكوك فيها + مصاريف ديون معدومة",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            },
            {
              "id": "cfg.5.7",
              "ref": "cfg.5.7",
              "label": "ذمم الموظفين (سلف وعهد)",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "سلف الموظفين، عهد الموظفين",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            },
            {
              "id": "cfg.5.8",
              "ref": "cfg.5.8",
              "label": "الأنشطة الشقيقة",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "شركة قم البعد الجديدة التجارية - فولين، فرع البلاستيك، شركة بتروسبيشل لزيت التشحيم — حسابات بينية",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            },
            {
              "id": "cfg.5.9",
              "ref": "cfg.5.9",
              "label": "مسحوبات الشركاء وجاري المالك",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "3 حسابات مسحوبات + جاري شريك 1 و2",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            },
            {
              "id": "cfg.5.10",
              "ref": "cfg.5.10",
              "label": "العلامات التجارية كأصول",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "6 علامات: فولين، سالكو، جكس، G7X، RAVAL، RAVAL RUFILA — تُهلك كأصل معنوي",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            },
            {
              "id": "cfg.5.11",
              "ref": "cfg.5.11",
              "label": "عمولات وكلاء البيع والتحصيل",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "عمولة تحصيل، عمولات وكلاء البيع، هدايا ومكافآت وكلاء المبيعات",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            },
            {
              "id": "cfg.5.12",
              "ref": "cfg.5.12",
              "label": "الكميات المجانية كعملية محاسبية مستقلة",
              "status": "wip",
              "cfgStatus": "inferred",
              "detail": "تكلفة الكميات المجانية + تكلفة مردودها + تكلفة مشترياتها — أسلوب ترويج مفعّل محاسبياً",
              "source": "الدليل المحاسبي",
              "kind": "screen"
            }
          ]
        },
        {
          "id": "cfg.6",
          "ref": "cfg.6",
          "label": "قيد التحقق — قائمة الفحص القادمة",
          "status": "ready",
          "kind": "submodule",
          "icon": "folder",
          "children": [
            {
              "id": "cfg.6.1",
              "ref": "cfg.6.1",
              "label": "أولوية قصوى — قواعد الحساب والترابط",
              "status": "ready",
              "kind": "group",
              "icon": "folder",
              "children": [
                {
                  "id": "cfg.6.1.1",
                  "ref": "cfg.6.1.1",
                  "label": "معايير التقييم (طريقة تسعير المخزون: متوسط مرجّح / FIFO)",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "تحدد كيف تُحتسب تكلفة المبيعات — أهم قاعدة حسابية بالمخزون",
                  "source": "تهيئة المخزون",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.1.2",
                  "ref": "cfg.6.1.2",
                  "label": "ربط الحسابات بالحسابات العامة والتدفقات النقدية",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "خريطة ربط الدليل بالقوائم المالية",
                  "source": "تهيئة النظام > المدخلات",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.1.3",
                  "ref": "cfg.6.1.3",
                  "label": "ربط حسابات المخزون بالأستاذ العام",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "قواعد الترحيل التلقائي من المخزون للمحاسبة",
                  "source": "مدخلات المخزون",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.1.4",
                  "ref": "cfg.6.1.4",
                  "label": "ربط الحسابات بالأنواع الضريبية",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "نظام الضرائب",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.1.5",
                  "ref": "cfg.6.1.5",
                  "label": "ربط الأصناف بأنواع الضريبية",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "نظام الضرائب",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.1.6",
                  "ref": "cfg.6.1.6",
                  "label": "مصمم التقارير الختامية والدفقات والقوائم",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "معادلات قائمة الدخل والمركز المالي",
                  "source": "مدخلات الاستاذ العام",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.1.7",
                  "ref": "cfg.6.1.7",
                  "label": "متغيرات الأستاذ العام",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة الاستاذ العام",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.1.8",
                  "ref": "cfg.6.1.8",
                  "label": "متغيرات المخزون",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة المخزون",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.1.9",
                  "ref": "cfg.6.1.9",
                  "label": "متغيرات نظام العملاء",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة العملاء",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.1.10",
                  "ref": "cfg.6.1.10",
                  "label": "متغيرات نظام الموردين",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة الموردين",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.1.11",
                  "ref": "cfg.6.1.11",
                  "label": "متغيرات التوزيع",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "يحدد إن كان نظام التوزيع/المندوبين مفعّلاً فعلاً",
                  "source": "تهيئة التوزيع",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "cfg.6.2",
              "ref": "cfg.6.2",
              "label": "أولوية عالية — أنواع المستندات وسلوكها",
              "status": "ready",
              "kind": "group",
              "icon": "folder",
              "children": [
                {
                  "id": "cfg.6.2.1",
                  "ref": "cfg.6.2.1",
                  "label": "أنواع قيود اليومية",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة الاستاذ العام",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.2.2",
                  "ref": "cfg.6.2.2",
                  "label": "أنواع القبض والصرف",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة الاستاذ العام",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.2.3",
                  "ref": "cfg.6.2.3",
                  "label": "أنواع فواتير المبيعات",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة المبيعات",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.2.4",
                  "ref": "cfg.6.2.4",
                  "label": "أنواع مردودات المبيعات + أسبابها",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة المبيعات",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.2.5",
                  "ref": "cfg.6.2.5",
                  "label": "أنواع فواتير المشتريات",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة المشتريات",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.2.6",
                  "ref": "cfg.6.2.6",
                  "label": "أنواع التوريد / الصرف / التحويل / تسوية المخزون",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة المخزون",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.2.7",
                  "ref": "cfg.6.2.7",
                  "label": "أنواع الإشعارات (مدينة/دائنة)",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة الاستاذ العام",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.2.8",
                  "ref": "cfg.6.2.8",
                  "label": "المبالغ الإضافية والخصومات",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "قواعد الخصم والإضافة على الفاتورة",
                  "source": "تهيئة المبيعات",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "cfg.6.3",
              "ref": "cfg.6.3",
              "label": "أولوية عالية — بنية البيانات الرئيسية",
              "status": "ready",
              "kind": "group",
              "icon": "folder",
              "children": [
                {
                  "id": "cfg.6.3.1",
                  "ref": "cfg.6.3.1",
                  "label": "بيانات الأصناف (حقول الصنف كاملة)",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "مدخلات المخزون",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.3.2",
                  "ref": "cfg.6.3.2",
                  "label": "وحدات القياس والتحويل بينها",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "كرتون/عبوة/لتر",
                  "source": "تهيئة المخزون",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.3.3",
                  "ref": "cfg.6.3.3",
                  "label": "مجموعات الأصناف بمستوياتها الست",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "رئيسية/فرعية/تحت فرعية/مساعدة/تفصيلية/متماثلة — نحتاج نعرف كم مستوى مستخدم فعلاً",
                  "source": "مدخلات المخزون",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.3.4",
                  "ref": "cfg.6.3.4",
                  "label": "بيانات المخازن ومجموعاتها",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "مدخلات المخزون",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.3.5",
                  "ref": "cfg.6.3.5",
                  "label": "بيانات العملاء (حقول العميل كاملة)",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "مدخلات العملاء",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.3.6",
                  "ref": "cfg.6.3.6",
                  "label": "بيانات مندوبي المبيعات وخطوط السير",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "مدخلات العملاء",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.3.7",
                  "ref": "cfg.6.3.7",
                  "label": "بيانات الموردين",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "مدخلات الموردين",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.3.8",
                  "ref": "cfg.6.3.8",
                  "label": "تسعيرة الأصناف ومستويات التسعيرة",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "كم مستوى سعر مستخدم",
                  "source": "مدخلات المخزون",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.3.9",
                  "ref": "cfg.6.3.9",
                  "label": "درجات العملاء ومعايير تقييمها",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة العملاء",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "cfg.6.4",
              "ref": "cfg.6.4",
              "label": "أولوية متوسطة — الصلاحيات والفترات",
              "status": "ready",
              "kind": "group",
              "icon": "folder",
              "children": [
                {
                  "id": "cfg.6.4.1",
                  "ref": "cfg.6.4.1",
                  "label": "بيانات المستخدمين ومجموعاتهم",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "إدارة المستخدمين",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.4.2",
                  "ref": "cfg.6.4.2",
                  "label": "صلاحيات العمليات",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "صلاحيات المستخدمين",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.4.3",
                  "ref": "cfg.6.4.3",
                  "label": "مستويات الإعتماد",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "رغم أن مراجعة الوثائق معطّلة — نتأكد",
                  "source": "تهيئة النظام",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.4.4",
                  "ref": "cfg.6.4.4",
                  "label": "إعداد فترات النظام",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "قواعد إقفال الفترات",
                  "source": "تهيئة النظام",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.4.5",
                  "ref": "cfg.6.4.5",
                  "label": "تهيئة العملات",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "هل يوجد تعامل بعملات متعددة",
                  "source": "تهيئة النظام",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.4.6",
                  "ref": "cfg.6.4.6",
                  "label": "بيانات الفروع والشركات",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "تهيئة النظام",
                  "kind": "screen"
                }
              ]
            },
            {
              "id": "cfg.6.5",
              "ref": "cfg.6.5",
              "label": "أولوية عالية — شاشات العمليات الفعلية بتبويباتها",
              "status": "ready",
              "kind": "group",
              "icon": "folder",
              "children": [
                {
                  "id": "cfg.6.5.1",
                  "ref": "cfg.6.5.1",
                  "label": "شاشة فاتورة المبيعات كاملة",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "detail": "الحقول، التبويبات، الأزرار، الترابط",
                  "source": "عمليات المبيعات",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.5.2",
                  "ref": "cfg.6.5.2",
                  "label": "شاشة فاتورة المشتريات كاملة",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "عمليات المشتريات",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.5.3",
                  "ref": "cfg.6.5.3",
                  "label": "شاشة قيود اليومية",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "عمليات الاستاذ العام",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.5.4",
                  "ref": "cfg.6.5.4",
                  "label": "شاشة سند القبض",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "عمليات الاستاذ العام",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.5.5",
                  "ref": "cfg.6.5.5",
                  "label": "شاشة سند الصرف",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "عمليات الاستاذ العام",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.5.6",
                  "ref": "cfg.6.5.6",
                  "label": "شاشة إذن التوريد المخزني",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "عمليات المخزون",
                  "kind": "screen"
                },
                {
                  "id": "cfg.6.5.7",
                  "ref": "cfg.6.5.7",
                  "label": "شاشة أمر الصرف المخزني",
                  "status": "wip",
                  "cfgStatus": "pending",
                  "source": "عمليات المخزون",
                  "kind": "screen"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

})(window);
