/* ============================================================================
   ONYX ERP — فهرسة الشجرة
   يحوّل ONYX_DATA إلى:
     • معرّفات ثابتة لكل عقدة (تُولّد من التسمية إن لم تُذكر)
     • خرائط:  byPath (نص المسار → عقدة)  ·  parentOf  ·  moduleOf
     • flat[]  لكل العقد   ·  screens[]  لكل الشاشات (فهرس البحث/لوحة الأوامر)
     • عدّادات الشاشات لكل فرع + الحالة الفعلية (ready/wip)
   ========================================================================== */
(function (root) {
  "use strict";

  var U = root.OnyxUtil;

  var byPath = Object.create(null);   // "a/b/c" -> node
  var byRef  = Object.create(null);   // "op.4.1.3.14" -> node  (الرقم المرجعي من النظام)
  var flat = [];
  var screens = [];
  var modules = [];

  /* ── المناطق: ما الذي يظهر في شريط الأنظمة وما الذي يُنقل إلى المرجع ──
       core      : الأنظمة التشغيلية — وحدها في الشريط الرأسي
       reference : الدليل المحاسبي — يُفتح من نظام الحسابات أو من مركز المرجع
       settings  : الإعدادات الفعّالة — تُفتح من صفحة الإعدادات               */
  var ZONE_OF = {
    operations: "core",
    accounts:   "reference",
    config:     "settings"
  };

  function idFor(node) {
    if (node.id) return node.id;
    return U.slugify(U.normalizeArabic(node.label)) || ("n" + flat.length);
  }

  function walk(node, parent, moduleNode) {
    node._id = idFor(node);
    node._parent = parent || null;
    node._path = parent ? parent._path.concat(node._id) : [node._id];
    node._key = node._path.join("/");
    node._level = node._path.length;
    node._module = moduleNode || node;
    node._isLeaf = !(node.children && node.children.length);
    node.kind = node.kind || (node._isLeaf ? "screen" : "group");

    byPath[node._key] = node;
    if (node.ref) byRef[node.ref] = node;
    flat.push(node);

    if (node._isLeaf) {
      node._screenCount = 0;
      if (node.kind === "screen") screens.push(node);
    } else {
      var count = 0, anyReady = false;
      node.children.forEach(function (c) {
        walk(c, node, moduleNode || node);
        count += (c._isLeaf && c.kind === "screen") ? 1 : c._screenCount;
        if (c._effStatus === "ready") anyReady = true;
      });
      node._screenCount = count;
      node._hasReady = anyReady;
    }

    /* الحالة الفعلية: فرع بلا أي ذرّية جاهزة = قيد الإعداد */
    if (node._isLeaf) {
      node._effStatus = node.status || "ready";
    } else {
      node._effStatus = (node.status === "ready" || node._hasReady) ? "ready" : "wip";
    }
  }

  var built = false;
  function build() {
    /* استدعاء ثانٍ (حدثا تحميل متتاليان مثلاً) كان يضاعف الفهرس — نمنعه */
    if (built) return;
    built = true;

    var data = root.ONYX_DATA;
    if (!data) { console.error("ONYX_DATA غير محمّل"); built = false; return; }
    data.modules.forEach(function (m) {
      m.kind = m.kind || "module";
      m._zone = ZONE_OF[m.variant] || "reference";
      walk(m, null, m);
      modules.push(m);
    });

    /* تحذير عند تكرار المعرّفات بين الإخوة (مساعدة أثناء التطوير) */
    flat.forEach(function (n) {
      if (!n.children) return;
      var seen = Object.create(null);
      n.children.forEach(function (c) {
        if (seen[c._id]) console.warn("معرّف مكرر تحت «" + n.label + "»:", c._id);
        seen[c._id] = 1;
      });
    });
  }

  /* ---- حلّ مسار (متسامح مع اختلاف التشكيل/الهمزات) ---- */
  var lenientMap = null;
  function buildLenient() {
    lenientMap = Object.create(null);
    flat.forEach(function (n) {
      var k = n._path.map(function (seg) { return U.normalizeArabic(seg); }).join("/");
      if (!lenientMap[k]) lenientMap[k] = n;
    });
  }
  function resolve(pathStrOrArr) {
    var key = Array.isArray(pathStrOrArr) ? pathStrOrArr.join("/") : String(pathStrOrArr || "");
    key = key.replace(/^\/+|\/+$/g, "");
    if (!key) return null;
    if (byRef[key]) return byRef[key];      /* رقم مرجعي مباشر: op.4.1.3.14 */
    if (byPath[key]) return byPath[key];
    if (!lenientMap) buildLenient();
    var lk = key.split("/").map(function (s) { return U.normalizeArabic(s); }).join("/");
    return lenientMap[lk] || null;
  }

  /* ---- أقرب سلف صالح لمسار غير موجود ---- */
  function resolveNearest(pathArr) {
    var arr = pathArr.slice();
    while (arr.length) {
      var n = resolve(arr);
      if (n) return n;
      arr.pop();
    }
    return null;
  }

  function ancestors(node) {
    var out = [], cur = node._parent;
    while (cur) { out.unshift(cur); cur = cur._parent; }
    return out;
  }

  function breadcrumb(node) {
    return ancestors(node).concat([node]);
  }

  root.OnyxIndex = {
    build: build,
    get modules() { return modules; },
    /* الأنظمة التشغيلية وحدها — هذه ما يظهر في الشريط الرأسي وفي «كل الأنظمة» */
    get coreModules() {
      return modules.filter(function (m) { return m._zone === "core"; });
    },
    /* ما نُقل خارج الشريط: الدليل المحاسبي · الإعدادات */
    get asideModules() {
      return modules.filter(function (m) { return m._zone !== "core"; });
    },
    modulesInZone: function (zone) {
      return modules.filter(function (m) { return m._zone === zone; });
    },
    get flat() { return flat; },
    get screens() { return screens; },
    byPath: byPath,
    byRef: byRef,
    resolve: resolve,
    resolveNearest: resolveNearest,
    ancestors: ancestors,
    breadcrumb: breadcrumb
  };
})(window);
