/* ============================================================================
   ONYX ERP — وثيقة المرجع  (reference.html)
   ----------------------------------------------------------------------------
   وثيقة تُقرأ، لا واجهة تُتصفَّح. **لا شجرة ولا تفريعات ولا حالة** — صفحة واحدة
   طويلة بجداول مسطّحة وفهرس روابط، قابلة للطباعة كما هي.

   تحوي ما ليس إعداداً ولا شاشة تشغيل:
     ① الدليل المحاسبي كاملاً        ② جسور الربط
     ③ الفجوات البنيوية              ④ الأنظمة المقترحة
     ⑤ القرارات الحاجبة              ⑥ ثوابت الترحيل
   ========================================================================== */
(function (root) {
  "use strict";

  var U = root.OnyxUtil, IDX = root.OnyxIndex;
  var doc;

  function esc(s) { return U.escapeHtml(String(s == null ? "" : s)); }
  function ar(n) { return U.formatNum(n, true); }

  function section(id, title, sub) {
    var s = document.createElement("section");
    s.className = "doc__sec";
    s.id = id;
    s.innerHTML = "<h2>" + esc(title) + "</h2>" + (sub ? "<p class='doc__sub'>" + esc(sub) + "</p>" : "");
    return s;
  }

  /* ── ① الدليل المحاسبي — جداول مسطّحة، قائمة تلو الأخرى ── */
  function chartOfAccounts(host) {
    var mod = IDX.modules.filter(function (m) { return m.variant === "accounts"; })[0];
    if (!mod) return;

    /* عدّ صريح: المجمّع لا يقع عليه قيد (INV-5)، والتفصيلي هو ما يُرحَّل إليه */
    var nLeaf = 0, nGroup = 0;
    (function count(n) {
      (n.children || []).forEach(function (c) {
        if (c.children && c.children.length) { nGroup++; count(c); } else nLeaf++;
      });
    })(mod);

    var sec = section("accounts", "الدليل المحاسبي",
      ar(nLeaf) + " حساباً تفصيلياً يقع عليه القيد، و" + ar(nGroup - (mod.children || []).length) +
      " حساباً مجمّعاً لا يقع عليه قيد (INV-5)، موزّعة على " + ar((mod.children || []).length) +
      " قوائم. الدليل شاشة تهيئة رقمها op.1.2.3 في أونيكس — يسبق كل نظام، وكل نظام يعود إليه عبر شاشة ربط.");
    host.appendChild(sec);

    (mod.children || []).forEach(function (list) {
      var rows = [];
      (function walk(n, depth) {
        (n.children || []).forEach(function (c) {
          rows.push({ n: c, depth: depth });
          if (c.children && c.children.length) walk(c, depth + 1);
        });
      })(list, 0);

      var box = document.createElement("div");
      box.className = "doc__block";
      box.innerHTML =
        "<h3 id='acc-" + esc(list.code || list._id) + "'>" +
          (list.code ? "<code>" + esc(list.code) + "</code> " : "") + esc(list.label) +
          " <span class='doc__count'>" + ar(list._screenCount) + " حساباً</span></h3>";

      var t = document.createElement("table");
      t.className = "doc__tbl";
      t.innerHTML = "<thead><tr><th>الرقم</th><th>الاسم</th><th>المستوى</th><th>النوع</th></tr></thead>";
      var tb = document.createElement("tbody");
      rows.forEach(function (r) {
        var n = r.n;
        var tr = document.createElement("tr");
        tr.id = "row-" + esc(n.ref || n._id);
        tr.className = "lvl" + Math.min(r.depth, 4);
        tr.innerHTML =
          "<td class='doc__code'>" + esc(n.code || "") + "</td>" +
          "<td class='doc__name'>" + esc(n.label) + "</td>" +
          "<td>" + ar(r.depth + 2) + "</td>" +
          "<td>" + (n._isLeaf ? "<span class='doc__leaf'>تفصيلي</span>" : "مجمّع · " + ar(n._screenCount)) + "</td>";
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      box.appendChild(t);
      sec.appendChild(box);
    });
  }

  /* ── ② جسور الربط ── */
  function bridges(host) {
    var L = root.ONYX_LINKS || {};
    var list = L.bridges || [];
    if (!list.length) return;

    var sec = section("bridges", "جسور الربط المحاسبي",
      ar(list.length) + " شاشة ربط تصل الأنظمة بالدليل. الدليل لا يُشغِّل البرنامج تلقائياً — " +
      "من لم يضبط شاشة الربط لن يُرحَّل نظامه للدليل مهما كانت الحسابات صحيحة.");
    var t = document.createElement("table");
    t.className = "doc__tbl";
    t.innerHTML = "<thead><tr><th>الرقم</th><th>الشاشة</th><th>دورها</th></tr></thead>";
    var tb = document.createElement("tbody");
    list.forEach(function (b) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td class='doc__code'><a href='index.html#/" + esc(b.ref) + "'>" + esc(b.ref) + "</a></td>" +
        "<td class='doc__name'>" + esc(b.label) + "</td>" +
        "<td>" + esc(b.role || "") + "</td>";
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    sec.appendChild(t);
    host.appendChild(sec);
  }

  /* ── ③ الفجوات البنيوية ── */
  function gaps(host) {
    var L = root.ONYX_LINKS || {};
    var list = L.gaps || [];
    if (!list.length) return;

    var sec = section("gaps", "الفجوات البنيوية",
      "ما يكشفه الدليل المحاسبي من حسابات تعمل بلا شاشات تديرها. هذه ملاحظات للقراءة — لا إعدادات ولا شاشات.");
    list.forEach(function (g) {
      var d = document.createElement("article");
      d.className = "doc__note";
      d.innerHTML =
        "<h3>" + esc(g.title) + "</h3>" +
        "<p><b>ما في الدليل:</b> " + esc(g.detail || "") + "</p>" +
        (g.impact ? "<p><b>الأثر:</b> " + esc(g.impact) + "</p>" : "");
      if ((g.accounts || []).length) {
        var ul = document.createElement("p");
        ul.className = "doc__accs";
        ul.innerHTML = "<b>الحسابات:</b> " + g.accounts.map(function (a) {
          var n = IDX.resolve(a);
          return n ? "<a href='#row-" + esc(a) + "'>" + esc(n.code || a) + " " + esc(n.label) + "</a>" : esc(a);
        }).join(" · ");
        d.appendChild(ul);
      }
      sec.appendChild(d);
    });
    host.appendChild(sec);
  }

  /* ── ④ الأنظمة المقترحة — قوائم مسطّحة، لا شجرة ── */
  function proposed(host) {
    var P = root.ONYX_PROPOSED;
    if (!P || !P.modules || !P.modules.length) return;

    var sec = section("proposed", "الأنظمة المقترحة",
      "غير مثبَّتة في أونيكس عندكم. صُمِّمت على الورق لأن الدليل المحاسبي يفرض وجودها. " +
      "تُقرأ هنا كاقتراح — لا تُبنى إلا بقرار منكم.");

    P.modules.forEach(function (m) {
      var art = document.createElement("article");
      art.className = "doc__note";
      art.id = m.ref;
      art.innerHTML = "<h3>" + esc(m.label) + "</h3>" +
        "<p><b>لماذا:</b> " + esc(m.why || "") + "</p>";

      if ((m.gapFor || []).length) {
        var p = document.createElement("p");
        p.className = "doc__accs";
        p.innerHTML = "<b>يسدّ فجوة الحسابات:</b> " + m.gapFor.map(function (a) {
          var n = IDX.resolve(a);
          return n ? "<a href='#row-" + esc(a) + "'>" + esc(n.code || a) + " " + esc(n.label) + "</a>" : esc(a);
        }).join(" · ");
        art.appendChild(p);
      }

      /* الشاشات: قائمة واحدة مسطّحة مع القيد الناتج — لا تفريعات */
      var t = document.createElement("table");
      t.className = "doc__tbl";
      t.innerHTML = "<thead><tr><th>المجموعة</th><th>الشاشة المقترحة</th><th>القيد الناتج</th></tr></thead>";
      var tb = document.createElement("tbody");
      (m.children || []).forEach(function (g) {
        (g.children || []).forEach(function (s) {
          var tr = document.createElement("tr");
          tr.innerHTML =
            "<td class='doc__grp'>" + esc(g.label) + "</td>" +
            "<td class='doc__name'>" + esc(s.label) +
              (s.detail ? "<small>" + esc(s.detail) + "</small>" : "") + "</td>" +
            "<td class='doc__entry'>" + esc(s.entry || "—") + "</td>";
          tb.appendChild(tr);
        });
      });
      t.appendChild(tb);
      art.appendChild(t);
      sec.appendChild(art);
    });
    host.appendChild(sec);
  }

  /* ── ⑤ القرارات الحاجبة ── */
  function blockers(host) {
    var SP = root.ONYX_SPEC || {};
    var list = SP.blockers || [];
    if (!list.length) return;

    var sec = section("blockers", "القرارات التي تحجب البرمجة",
      "ثلاثة قرارات ما دامت معلّقة فالمراحل التي تعتمد عليها لا تبدأ. " +
      "تُحسم بالقراءة من أونيكس المثبَّت، وتُسجَّل في تبويب «المخزون والتكلفة» بصفحة الإعدادات.");

    list.forEach(function (b) {
      var art = document.createElement("article");
      art.className = "doc__note doc__note--hard";
      art.innerHTML =
        "<h3>" + esc(b.id) + " — " + esc(b.title) + "</h3>" +
        "<p><b>السؤال:</b> " + esc(b.question || "") + "</p>" +
        "<p><b>لماذا يهم:</b> " + esc(b.why || "") + "</p>" +
        (b.blocks ? "<p><b>يحجب:</b> " + esc(b.blocks.join(" · ")) + "</p>" : "") +
        "<p><b>المصدر:</b> " + esc(b.source || "") + "</p>" +
        "<p><b>كيف تحسمه:</b> " + esc(b.howToResolve || "") + "</p>" +
        "<p class='doc__accs'><a href='settings.html#/inventory'>افتح البند في الإعدادات ←</a></p>";
      sec.appendChild(art);
    });
    host.appendChild(sec);
  }

  /* ── ⑥ ثوابت الترحيل ── */
  function invariants(host) {
    var SP = root.ONYX_SPEC || {};
    var list = SP.invariants || [];
    if (!list.length) return;

    var sec = section("invariants", "ثوابت الترحيل",
      ar(list.length) + " ثابتاً لا يُكسر في أي شاشة. ضعها في خدمة ترحيل واحدة مشتركة — تكرارها في كل شاشة يعني انكسارها.");
    var t = document.createElement("table");
    t.className = "doc__tbl";
    t.innerHTML = "<thead><tr><th>#</th><th>الثابت</th><th>ما يحدث لو كُسر</th></tr></thead>";
    var tb = document.createElement("tbody");
    list.forEach(function (v) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td class='doc__code'>" + esc(v.id || "") + "</td>" +
        "<td class='doc__name'>" + esc(v.rule || v.title || v.label || "") + "</td>" +
        "<td>" + esc(v.breaks || v.why || v.impact || "") + "</td>";
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    sec.appendChild(t);
    host.appendChild(sec);
  }

  /* ── الفهرس ── */
  function toc(host) {
    var items = [
      ["accounts", "الدليل المحاسبي"],
      ["bridges", "جسور الربط"],
      ["gaps", "الفجوات البنيوية"],
      ["proposed", "الأنظمة المقترحة"],
      ["blockers", "القرارات الحاجبة"],
      ["invariants", "ثوابت الترحيل"]
    ].filter(function (x) { return document.getElementById(x[0]); });

    var nav = document.createElement("nav");
    nav.className = "doc__toc";
    nav.innerHTML = "<b>في هذه الوثيقة</b>" + items.map(function (x) {
      return "<a href='#" + x[0] + "'>" + esc(x[1]) + "</a>";
    }).join("");
    host.insertBefore(nav, host.firstChild.nextSibling);
  }

  /* ── البحث داخل الوثيقة ── */
  function initFind() {
    var input = document.getElementById("docFind");
    var count = document.getElementById("docFindCount");
    if (!input) return;

    input.addEventListener("input", U.debounce(function () {
      var q = U.normalizeArabic(input.value.trim());
      var rows = doc.querySelectorAll(".doc__tbl tbody tr");
      if (!q) {
        Array.prototype.forEach.call(rows, function (r) { r.hidden = false; });
        Array.prototype.forEach.call(doc.querySelectorAll(".doc__block, .doc__note"), function (b) { b.hidden = false; });
        count.textContent = "";
        return;
      }
      var n = 0;
      Array.prototype.forEach.call(rows, function (r) {
        var hit = U.normalizeArabic(r.textContent).indexOf(q) !== -1;
        r.hidden = !hit;
        if (hit) n++;
      });
      /* اطوِ الكتل التي لم يبقَ فيها صفّ */
      Array.prototype.forEach.call(doc.querySelectorAll(".doc__block, .doc__note"), function (b) {
        var visible = b.querySelectorAll(".doc__tbl tbody tr:not([hidden])").length;
        var hasTable = b.querySelector(".doc__tbl");
        b.hidden = hasTable ? visible === 0 : U.normalizeArabic(b.textContent).indexOf(q) === -1;
      });
      count.textContent = n ? U.formatNum(n, true) + " صفاً" : "لا نتائج";
    }, 180));
  }

  function boot() {
    doc = document.getElementById("doc");
    IDX.build();

    var M = root.ONYX_MOCK;
    doc.appendChild(U.el(
      "<header class='doc__head'>" +
        "<h1>وثيقة المرجع</h1>" +
        "<p>" + esc(M.org.name) + " · الفترة المالية " + esc(M.org.fiscalPeriod) +
        " · الإصدار المرجعي " + esc(M.org.version) + "</p>" +
        "<p class='doc__lead'>هذه وثيقة قراءة لا لوحة تحكّم. ما فيها إمّا مستخرَج من نظامكم المثبَّت " +
        "أو مُشتقّ من دليلكم المحاسبي بوسم صريح. الإعدادات القابلة للضبط مكانها " +
        "<a href='settings.html'>صفحة الإعدادات</a>، والشاشات التشغيلية مكانها " +
        "<a href='index.html#/home'>صفحة الأنظمة</a>.</p>" +
      "</header>"
    ));

    chartOfAccounts(doc);
    bridges(doc);
    gaps(doc);
    proposed(doc);
    blockers(doc);
    invariants(doc);
    toc(doc);
    initFind();

    var foot = document.getElementById("docFoot");
    if (foot) foot.textContent = M.org.name + " — وثيقة مرجع، لا تُنفَّذ منها أي عملية.";

    var pr = document.getElementById("docPrint");
    if (pr) pr.addEventListener("click", function () { root.print(); });

    /* رابط مباشر لحساب أو نظام مقترح */
    if (location.hash) {
      var h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
      var el = document.getElementById("row-" + h) || document.getElementById(h);
      if (el) {
        if (typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "center" });
        el.classList.add("doc__hit");
        setTimeout(function () { el.classList.remove("doc__hit"); }, 2600);
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
