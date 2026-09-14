/* ============================================================================
   ONYX ERP — التنقّل بين صفحات البرنامج
   ----------------------------------------------------------------------------
   البرنامج ثلاث صفحات مستقلّة، لكلٍّ هيكلها ودورها:

     index.html      الأنظمة التشغيلية        — شريط أيقونات + شجرة النظام
     settings.html   لوحة إعدادات النظام      — تبويبات وحقول تُضبَط، بلا شجرة
     reference.html  وثيقة المرجع             — الدليل والفجوات، للقراءة

   القاعدة: لكل محتوى صفحة واحدة تملكه.
     · شاشة تشغيلية (op.*)          ← index.html
     · بند إعدادات مُلتقَط (cfg.*)   ← settings.html، يُعرض كحقل لا كعقدة شجرة
     · حساب (acc.*)                 ← reference.html، جدول مسطّح للقراءة

   هذا الملف هو الحكم الوحيد في «أي صفحة تملك ماذا».
   ========================================================================== */
(function (root) {
  "use strict";

  var PAGE_OF_ZONE = {
    core:      "index",       /* الأنظمة التشغيلية */
    reference: "reference",   /* الدليل المحاسبي — وثيقة قراءة */
    settings:  "settings"     /* بنود الإعدادات — حقول تُضبَط */
  };

  var FILE = {
    index: "index.html",
    settings: "settings.html",
    reference: "reference.html"
  };

  /* الصفحة التي نعمل فيها الآن — يضبطها متحكّم كل صفحة عند الإقلاع */
  var here = null;

  function zoneOf(node) {
    if (!node) return "core";
    var m = node._module || node;
    return m._zone || "core";
  }

  /* أي صفحة تملك عرض هذه العقدة؟ */
  function pageOf(node) {
    return PAGE_OF_ZONE[zoneOf(node)] || "index";
  }

  function hashOf(node, tab) {
    if (!node) return "#/home";
    return "#/" + (node.ref || node._key) + (tab ? "::" + encodeURIComponent(tab) : "");
  }

  /* هل هذه العقدة من نصيب الصفحة الحالية؟ */
  function isLocal(node) {
    return !here || pageOf(node) === here;
  }

  /* انتقال فعلي بين الصفحات — يحمل العقدة في الـ hash فتُفتح هناك مباشرة */
  function go(node, tab) {
    var page = pageOf(node);
    try { root.OnyxStore && root.OnyxStore.setLastRoute(hashOf(node, tab)); } catch (e) {}
    root.location.href = FILE[page] + hashOf(node, tab);
  }

  /* انتقال إلى صفحة بعينها بلا عقدة محدّدة */
  function goPage(page, hash) {
    root.location.href = (FILE[page] || FILE.index) + (hash || "");
  }

  root.OnyxNav = {
    setPage: function (p) { here = p; },
    get page() { return here; },
    pageOf: pageOf,
    zoneOf: zoneOf,
    hashOf: hashOf,
    isLocal: isLocal,
    go: go,
    goPage: goPage,
    goSettings: function () { goPage("settings", ""); },
    goReference: function () { goPage("reference", ""); },
    goIndex: function () { goPage("index", "#/home"); },
    fileOf: function (p) { return FILE[p] || FILE.index; }
  };
})(window);
