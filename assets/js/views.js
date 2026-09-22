/* ============================================================================
   ONYX ERP — العروض: اللوحة الرئيسية · نظرة النظام · معاينة الشاشة
   ========================================================================== */
(function (root) {
  "use strict";

  var I = root.OnyxIcons, U = root.OnyxUtil, S = root.OnyxStore, IDX = root.OnyxIndex;
  var main;

  function host() {
    if (!main) main = document.getElementById("mainInner");
    main.classList.remove("main__inner--live", "main__inner--blank");
    return main;
  }

  function esc(s) { return U.escapeHtml(s); }

  var CFG_LABEL = {
    verified_on: "مفعّل — مؤكد", verified_off: "معطّل — مؤكد",
    verified_info: "معلومة مؤكدة", inferred: "مرجّح — يحتاج تأكيد",
    pending: "قيد التحقق"
  };
  var CFG_ICON = {
    verified_on: "check", verified_off: "close", verified_info: "info",
    inferred: "sparkle", pending: "clock"
  };

  /* كلمة العدّ حسب نوع الشجرة */
  var VARIANT_WORDS = {
    operations: ["شاشة", "شاشتان", "شاشات", "شاشة"],
    accounts:   ["حساب", "حسابان", "حسابات", "حساباً"],
    config:     ["بند", "بندان", "بنود", "بنداً"]
  };
  function countOf(node, n) {
    var v = (node._module && node._module.variant) || "operations";
    return U.plural(n, VARIANT_WORDS[v] || VARIANT_WORDS.operations);
  }

  /* صفوف الأوراق: بلاطات للعمليات، وقائمة مقروءة للحسابات والإعدادات */
  function leafBlock(nodes, mod) {
    var v = mod.variant || "operations";
    if (v === "operations") {
      var grid = U.el('<div class="quickgrid"></div>');
      nodes.forEach(function (n) { grid.appendChild(quickTile(n)); });
      return grid;
    }
    var list = U.el('<div class="leaflist" data-accent="' + esc(mod.accent || "slate") + '"></div>');
    nodes.forEach(function (n) {
      var row = U.el(
        '<button type="button" class="leafrow">' +
          (n.code ? '<span class="leafrow__code">' + esc(n.code) + "</span>" : "") +
          '<span class="leafrow__name">' + esc(n.label) + "</span>" +
          (n.cfgStatus
            ? '<span class="pill pill--' + n.cfgStatus.replace(/_/g, "-") + '">' +
              esc(CFG_LABEL[n.cfgStatus]) + "</span>" : "") +
          (n.detail ? '<span class="leafrow__detail">' + esc(n.detail) + "</span>" : "") +
        "</button>"
      );
      row.addEventListener("click", function () { root.OnyxApp.open(n); });
      list.appendChild(row);
    });
    return list;
  }

  /* لوحة «تفاصيل» عامة: صفوف مفتاح/قيمة */
  function detailRows(rows) {
    var box = U.el('<dl class="detailbox"></dl>');
    var any = false;
    rows.forEach(function (r) {
      if (!r || r[1] == null || r[1] === "") return;
      any = true;
      var val = r[2] === "raw" ? r[1] : esc(r[1]);
      box.appendChild(U.el(
        '<div class="detailbox__row"><dt>' + esc(r[0]) + '</dt><dd>' + val + '</dd></div>'
      ));
    });
    return any ? box : null;
  }

  /* ═════════════════ مسار التنقل ═════════════════ */
  function crumbs(node) {
    var chain = IDX.breadcrumb(node);
    var wrap = U.el('<nav class="crumbs" aria-label="مسار التنقل"></nav>');

    var homeBtn = U.el('<button type="button">' + I.svg("home", { size: 14, cls: "icon-sm" }) + "</button>");
    homeBtn.title = "الرئيسية";
    homeBtn.addEventListener("click", function () { root.OnyxApp.goHome(); });
    wrap.appendChild(homeBtn);

    chain.forEach(function (n, i) {
      wrap.appendChild(U.el('<span class="crumbs__sep">' + I.svg("chevronLeft", { size: 14 }) + "</span>"));
      var last = i === chain.length - 1;
      var b = U.el("<button type=\"button\"" + (last ? ' aria-current="page"' : "") + ">" + esc(n.label) + "</button>");
      if (!last) b.addEventListener("click", function () { root.OnyxApp.open(n); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  /* ═════════════════ خط بياني مصغّر ═════════════════ */
  function sparkline(values, up) {
    var w = 84, h = 30, pad = 3;
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    var span = (max - min) || 1;
    var pts = values.map(function (v, i) {
      var x = pad + (i * (w - pad * 2)) / (values.length - 1);
      var y = h - pad - ((v - min) / span) * (h - pad * 2);
      return [x, y];
    });
    var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var area = d + " L" + (w - pad) + " " + (h - pad) + " L" + pad + " " + (h - pad) + " Z";
    var col = up ? "var(--success-fg)" : "var(--danger-fg)";
    var gid = "g" + Math.abs(values.join("").length * 31 + values[0]);
    var last = pts[pts.length - 1];
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + col + '" stop-opacity=".22"/>' +
        '<stop offset="100%" stop-color="' + col + '" stop-opacity="0"/>' +
      "</linearGradient></defs>" +
      '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.2" fill="' + col + '"/>' +
    "</svg>";
  }

  /* حساب المؤشرات البنيوية من المصادر الحقيقية فقط */
  function computeStat(expr) {
    var SP = root.ONYX_SPEC || {}, L = root.ONYX_LINKS || {};
    var ops = IDX.modules.filter(function (m) { return m.variant === "operations"; });
    switch (expr) {
      case "modules:operations":
        return ops.length;
      case "leaves:operations":
        return ops.reduce(function (n, m) { return n + m._screenCount; }, 0);
      case "leaves:accounts": {
        var acc = IDX.modules.filter(function (m) { return m.variant === "accounts"; })[0];
        return acc ? acc._screenCount : null;
      }
      case "spec:documents":
        return (SP.documents || []).length || null;
      case "links:bridges":
        return (L.bridges || []).length || null;
      case "links:gaps":
        return (L.gaps || []).length || null;
      case "spec:blockers":
        return (SP.blockers || []).length || null;
      case "cfg:pending": {
        var n = 0;
        IDX.flat.forEach(function (x) { if (x.cfgStatus === "pending") n++; });
        return n || null;
      }
    }
    return null;
  }

  /* ═════════════════ اللوحة الرئيسية ═════════════════ */
  function renderHome() {
    var M = root.ONYX_MOCK;
    var h = host();
    h.innerHTML = "";

    var hour = new Date().getHours();
    var greet = hour < 12 ? "صباح الخير" : hour < 17 ? "طاب يومك" : "مساء الخير";
    var dateStr = "";
    try {
      dateStr = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        .format(new Date());
    } catch (e) { dateStr = ""; }

    h.appendChild(U.el(
      '<header class="page-head"><div class="page-head__row">' +
        "<div><h1>" + esc(greet) + "</h1>" +
        '<div class="page-head__sub">' + esc(dateStr) + " · " + esc(M.org.name) + "</div></div>" +
        '<div class="page-head__spacer"></div>' +
        '<div class="page-head__actions">' +
          '<span class="pill pill--brand">الفترة المالية ' + esc(M.org.fiscalPeriod) + "</span>" +
          '<span class="pill pill--muted">' + esc(M.org.unit) + "</span>" +
          '<span class="pill pill--muted ltr">' + esc(M.org.version) + "</span>" +
        "</div>" +
      "</div></header>"
    ));

    /* الوصول السريع */
    h.appendChild(U.el('<div class="section-head">' + I.svg("sparkle", { size: 18, cls: "icon" }) +
      "<h2>العمليات اليومية</h2><span class=\"spacer\"></span>" +
      '<span class="pill pill--muted">مثبّتة بالشاشة الرئيسية للنظام</span></div>'));
    var qg = U.el('<div class="quickgrid"></div>');
    M.quickAccess.forEach(function (p) {
      var n = IDX.resolve(p);
      if (!n) return;
      qg.appendChild(quickTile(n));
    });
    h.appendChild(qg);

    /* كل الأنظمة */
    h.appendChild(U.el('<div class="section-head">' + I.svg("grid", { size: 18, cls: "icon" }) +
      "<h2>الأنظمة التشغيلية</h2></div>"));
    var mg = U.el('<div class="modgrid"></div>');
    IDX.coreModules.forEach(function (m) {
      var card = U.el(
        '<button type="button" class="modcard" data-accent="' + esc(m.accent || "slate") + '"' +
          ">" +
          '<div class="modcard__top">' +
            '<div class="modcard__icon">' + I.svg(m.icon || "grid", { size: 20 }) + "</div>" +
            '<div class="modcard__name">' + esc(m.label) + "</div>" +
          "</div>" +
          (m.note ? '<div class="modcard__note">' + esc(m.note) + "</div>" : "") +
        "</button>"
      );
      card.addEventListener("click", function () { root.OnyxApp.open(m); });
      mg.appendChild(card);
    });
    h.appendChild(mg);
  }


  /* ══════════════════════ مركز المرجع والإعدادات ══════════════════════
     كل ما ليس نظاماً تشغيلياً يعيش هنا: الدليل المحاسبي والإعدادات الفعّالة —
     مفصولة عن الأنظمة التشغيلية كي تبقى الرئيسية غير مزدحمة. */
  function hubCard(o) {
    var card = U.el(
      '<button type="button" class="hubcard" data-accent="' + esc(o.accent || "slate") + '"' +
        (o.tone ? ' data-tone="' + esc(o.tone) + '"' : "") + ">" +
        '<div class="hubcard__top">' +
          '<span class="hubcard__icon">' + I.svg(o.icon || "folder", { size: 20 }) + "</span>" +
          '<span class="hubcard__name">' + esc(o.title) + "</span>" +
          (o.pill ? '<span class="pill pill--' + esc(o.pillKind || "muted") + '">' +
            esc(o.pill) + "</span>" : "") +
        "</div>" +
        '<p class="hubcard__desc">' + esc(o.desc || "") + "</p>" +
        '<div class="hubcard__foot"><span class="count">' + esc(o.count || "") + "</span>" +
          '<span class="hubcard__go">' + I.svg("chevronLeft", { size: 15 }) + "</span></div>" +
      "</button>"
    );
    card.addEventListener("click", o.run);
    return card;
  }

  /* ══════════════════ صفحة الإعدادات والمرجع (settings.html) ══════════════════
     هذه الدوال لا تُستدعى من index.html إطلاقاً — تخصّ الصفحة الثانية وحدها.  */

  function secHead(icon, title, pill, pillKind) {
    return U.el('<div class="section-head">' + I.svg(icon, { size: 18, cls: "icon" }) +
      "<h2>" + esc(title) + "</h2><span class=\"spacer\"></span>" +
      (pill ? '<span class="pill pill--' + esc(pillKind || "muted") + '">' + esc(pill) + "</span>" : "") +
      "</div>");
  }

  function setHead(icon, title, sub, pill) {
    return U.el(
      '<header class="page-head"><div class="page-head__row">' +
        '<div style="display:flex;gap:var(--space-3);align-items:flex-start">' +
          '<div class="modcard__icon" style="width:44px;height:44px">' + I.svg(icon, { size: 22 }) + "</div>" +
          "<div><h1>" + esc(title) + "</h1>" +
          '<div class="page-head__sub">' + esc(sub) + "</div></div>" +
        "</div>" +
        '<div class="page-head__spacer"></div>' +
        (pill ? '<div class="page-head__actions"><span class="pill pill--muted">' + esc(pill) + "</span></div>" : "") +
      "</div></header>"
    );
  }

  function goSection(id) {
    return function () {
      if (root.OnyxApp && root.OnyxApp.showSection) root.OnyxApp.showSection(id);
    };
  }

  /* ── ① نظرة عامة — واجهة الصفحة، وكل بطاقة تقود لقسمها ── */
  function renderSettings() {
    var M = root.ONYX_MOCK;
    var SP = root.ONYX_SPEC || {};
    var L = root.ONYX_LINKS || {};
    var h = host();
    h.innerHTML = "";

    h.appendChild(setHead("cog", "الإعدادات والمرجع",
      "الأساس المحاسبي وإعدادات التشغيل — صفحة مستقلة عن شجرة الأنظمة التشغيلية",
      M.org.short));

    h.appendChild(U.el(
      '<div class="demo-note">' + I.svg("info", { size: 16, cls: "icon" }) +
      "<span>ما في هذه الصفحة <b>ليس نظاماً تشغيلياً</b> بل ما تستند إليه الأنظمة: " +
      "دليل الحسابات، وما هو مضبوط في النظام، وما يكشفه الدليل من فجوات. " +
      "لذلك فُصلت بشجرتها الخاصة.</span></div>"
    ));

    h.appendChild(secHead("book", "الأساس المحاسبي", "تعتمد عليه الأنظمة التشغيلية", "ready"));
    var g1 = U.el('<div class="hubgrid"></div>');
    var accMod = IDX.modulesInZone("reference")[0];
    if (accMod) {
      g1.appendChild(hubCard({
        title: accMod.label, icon: accMod.icon || "book", accent: accMod.accent,
        desc: "الطبقة التي ترتبط بها كل الأنظمة. ليس تقريراً بل شاشة تهيئة رقمها op.1.2.3 — تسبق كل نظام.",
        count: U.formatNum(accMod._screenCount, true) + " حساباً في " +
               U.formatNum((accMod.children || []).length, true) + " قوائم",
        pill: "مرجع", pillKind: "ready",
        run: goSection("mod:" + accMod._id)
      }));
    }
    if ((L.bridges || []).length) {
      g1.appendChild(hubCard({
        title: "جسور الربط المحاسبي", icon: "corner", accent: "teal",
        desc: "شاشات الربط التي تجعل كل نظام يعرف حساباته. من لم يضبطها لن يُرحَّل نظامه للدليل مهما كانت الحسابات صحيحة.",
        count: U.formatNum(L.bridges.length, true) + " جسراً",
        run: goSection("bridges")
      }));
    }
    h.appendChild(g1);

    h.appendChild(secHead("sliders", "إعدادات التشغيل"));
    var g2 = U.el('<div class="hubgrid"></div>');
    var cfgMod = IDX.modulesInZone("settings")[0];
    if (cfgMod) {
      var pend = 0;
      IDX.flat.forEach(function (x) { if (x.cfgStatus === "pending") pend++; });
      g2.appendChild(hubCard({
        title: cfgMod.label, icon: cfgMod.icon || "sliders", accent: cfgMod.accent,
        desc: "ما هو مفعَّل فعلاً، وما هو معطَّل عمداً، وما يحتاج تحققاً من داخل الشاشات.",
        count: U.formatNum(cfgMod._screenCount, true) + " بنداً",
        pill: pend ? U.formatNum(pend, true) + " قيد التحقق" : null, pillKind: "wip",
        run: goSection("mod:" + cfgMod._id)
      }));
    }
    g2.appendChild(hubCard({
      title: "هوية النظام والخصائص", icon: "landmark", accent: "indigo",
      desc: "الوحدة المحاسبية والفترة المالية والإصدار، ولوحتا المفعَّل والمعطَّل كما هما في النظام.",
      count: M.org.version,
      run: goSection("identity")
    }));
    h.appendChild(g2);

    if ((SP.blockers || []).length) {
      h.appendChild(secHead("info", "ما يحتاج قراراً"));
      var g4 = U.el('<div class="hubgrid"></div>');
      g4.appendChild(hubCard({
        title: "قرارات تحجب البرمجة", icon: "info", accent: "red",
        desc: "ثلاثة قرارات مصدرها بند «معايير التقييم» — ما دامت معلّقة فالمراحل ٦ و٧ و٨ لا تبدأ.",
        count: U.formatNum(SP.blockers.length, true) + " قراراً",
        pill: "عائق", pillKind: "wip",
        run: goSection("blockers")
      }));
      h.appendChild(g4);
    }
  }

  /* ── ② جسور الربط المحاسبي ── */
  function renderBridges() {
    var L = root.ONYX_LINKS || {};
    var bridges = L.bridges || [];
    var h = host();
    h.innerHTML = "";

    h.appendChild(setHead("corner", "جسور الربط المحاسبي",
      U.formatNum(bridges.length, true) + " شاشة ربط تصل الأنظمة بالدليل"));

    h.appendChild(U.el(
      '<div class="demo-note">' + I.svg("info", { size: 16, cls: "icon" }) +
      "<span><b>الدليل لا يُشغِّل البرنامج تلقائياً.</b> الترحيل يتم عبر هذه الشاشات — " +
      "من لم يضبط شاشة الربط لن يُرحَّل نظامه للدليل مهما كانت الحسابات صحيحة.</span></div>"
    ));

    var list = U.el('<div class="flatlist"></div>');
    bridges.forEach(function (b) {
      var n = IDX.resolve(b.ref);
      var row = U.el(
        '<button type="button" class="flatlist__item" data-accent="teal">' +
          I.svg("corner", { size: 17, cls: "icon" }) +
          '<span class="flatlist__body"><b>' + esc(b.label) + "</b>" +
          "<small>" + esc(b.role || "") + "</small></span>" +
          '<span class="refchip">' + esc(b.ref) + "</span>" +
        "</button>"
      );
      /* شاشة الجسر نظام تشغيلي — فتحها ينقل إلى index.html بشجرتها هناك */
      if (n) row.addEventListener("click", function () { root.OnyxNav.go(n); });
      else row.disabled = true;
      list.appendChild(row);
    });
    h.appendChild(list);

    h.appendChild(U.el('<div class="screen__note">' + I.svg("info", { size: 15, cls: "icon" }) +
      "<span>هذه شاشات من الأنظمة التشغيلية — النقر عليها ينقلك إلى صفحة الأنظمة.</span></div>"));
  }

  /* ── ③ هوية النظام والخصائص ── */
  function renderIdentity() {
    var M = root.ONYX_MOCK;
    var h = host();
    h.innerHTML = "";

    h.appendChild(setHead("landmark", "هوية النظام والخصائص",
      "مؤكدة من الشاشة الرئيسية للنظام المثبَّت", M.org.version));

    var rows = detailRows([
      ["الشركة", M.org.name],
      ["الوحدة المحاسبية", M.org.unit.replace("الوحدة المحاسبية: ", "")],
      ["الفترة المالية", M.org.fiscalPeriod],
      ["الإصدار", M.org.version],
      ["التقويم", M.org.calendar],
      ["اللغة", M.org.language],
      ["الأرصدة من", M.org.balancesFrom],
      ["آخر تعديل للمتغيرات", M.org.lastVarsEdit],
      ["الفترة الضريبية", M.org.taxPeriod]
    ]);
    if (rows) h.appendChild(rows);

    h.appendChild(secHead("settings", "الخصائص", "مؤكدة من النظام", "ready"));
    var fx = U.el('<div class="cols2"></div>');
    [["مفعّل", M.features.on, "check", "on"],
     ["معطّل — خارج نطاق العمل", M.features.off, "close", "off"]].forEach(function (grp) {
      var panel = U.el(
        '<section class="panel"><div class="panel__head">' +
          I.svg(grp[2], { size: 17, cls: "icon" }) + "<h3>" + esc(grp[0]) + "</h3>" +
          '<span class="spacer"></span><span class="count">' +
          U.formatNum(grp[1].length, true) + "</span></div>" +
          '<div class="panel__body"><div class="featlist"></div></div></section>'
      );
      grp[1].forEach(function (t) {
        panel.querySelector(".featlist").appendChild(U.el(
          '<div class="feat feat--' + grp[3] + '">' + I.svg(grp[2], { size: 14, cls: "icon-sm" }) +
          "<span>" + esc(t) + "</span></div>"));
      });
      fx.appendChild(panel);
    });
    h.appendChild(fx);
  }

  /* ── ④ القرارات التي تحجب البرمجة ── */
  function renderBlockers() {
    var SP = root.ONYX_SPEC || {};
    var L = root.ONYX_LINKS || {};
    var blockers = SP.blockers || [];
    var gaps = L.gaps || [];
    var h = host();
    h.innerHTML = "";

    h.appendChild(setHead("info", "قرارات تحجب البرمجة",
      U.formatNum(blockers.length, true) + " قراراً معلّقاً — ما دامت معلّقة فالمراحل التالية لا تبدأ"));

    blockers.forEach(function (b) {
      var card = U.el(
        '<section class="panel" style="margin-block-end:var(--space-4)">' +
          '<div class="panel__head">' + I.svg("info", { size: 17, cls: "icon" }) +
            "<h3>" + esc(b.id + " — " + b.title) + "</h3>" +
            '<span class="spacer"></span>' +
            (b.blocks ? '<span class="pill pill--wip">يحجب ' + esc(b.blocks.join(" · ")) + "</span>" : "") +
          "</div>" +
          '<div class="panel__body"></div>' +
        "</section>"
      );
      var body = card.querySelector(".panel__body");
      var rows = detailRows([
        ["السؤال", b.question],
        ["لماذا يهم", b.why],
        ["المصدر", b.source],
        ["كيف تحسمه", b.howToResolve]
      ]);
      if (rows) body.appendChild(rows);

      if ((b.screens || []).length) {
        var chips = U.el('<div class="whybox__accs"></div>');
        b.screens.forEach(function (r) {
          var n = IDX.resolve(r);
          if (!n) return;
          var c = U.el('<button type="button" class="accchip">' +
            '<span class="accchip__code">' + esc(r) + "</span>" +
            "<span>" + esc(n.label) + "</span></button>");
          c.addEventListener("click", function () { root.OnyxNav.go(n); });
          chips.appendChild(c);
        });
        body.appendChild(chips);
      }
      h.appendChild(card);
    });

    if (gaps.length) {
      h.appendChild(secHead("sparkle", "الفجوات البنيوية"));
      var gl = U.el('<div class="ruleslist"></div>');
      gaps.forEach(function (g) {
        var row = U.el('<div class="rule"><b>' + esc(g.title) + "</b>" +
          "<span>" + esc(g.detail || "") + "</span>" +
          (g.impact ? '<span class="rule__impact">' + esc(g.impact) + "</span>" : "") + "</div>");
        if ((g.accounts || []).length) {
          var chips2 = U.el('<div class="whybox__accs"></div>');
          g.accounts.forEach(function (a) {
            var n = IDX.resolve(a);
            if (!n) return;
            var c = U.el('<button type="button" class="accchip">' +
              (n.code ? '<span class="accchip__code">' + esc(n.code) + "</span>" : "") +
              "<span>" + esc(n.label) + "</span></button>");
            c.addEventListener("click", function () { root.OnyxApp.open(n); });
            chips2.appendChild(c);
          });
          row.appendChild(chips2);
        }
        gl.appendChild(row);
      });
      h.appendChild(gl);
    }
  }

  function quickTile(n) {
    var m = n._module;
    var t = U.el(
      '<button type="button" class="quick" data-accent="' + esc(m.accent || "slate") + '">' +
        '<span class="quick__icon">' + I.svg(m.icon || "file", { size: 18 }) + "</span>" +
        '<span class="quick__body"><b>' + esc(n.label) + "</b><small>" + esc(m.label) + "</small></span>" +
      "</button>"
    );
    t.addEventListener("click", function () { root.OnyxApp.open(n); });
    return t;
  }

  /* ── لوحة المفضلة ── */
  function favPanel() {
    var p = U.el(
      '<section class="panel"><div class="panel__head">' +
        I.svg("star", { size: 17, cls: "icon" }) + "<h3>المفضلة</h3>" +
        '<span class="spacer"></span></div><div class="panel__body"></div></section>'
    );
    fillFav(p.querySelector(".panel__body"));
    return p;
  }

  function fillFav(body) {
    var favs = S.getFavorites();
    body.innerHTML = "";
    if (!favs.length) {
      body.appendChild(U.el(
        '<div class="empty"><div class="empty__icon">' + I.svg("star", { size: 22, cls: "icon" }) + "</div>" +
        "<h3>لا توجد شاشات مفضلة</h3><p>اضغط على النجمة بجوار أي شاشة في الشجرة لتظهر هنا.</p></div>"
      ));
      return;
    }
    var list = U.el('<div class="flatlist"></div>');
    favs.slice().reverse().forEach(function (key) {
      var n = IDX.byPath[key];
      if (!n) return;
      list.appendChild(flatRow(n, "unfav"));
    });
    body.appendChild(list);
  }

  /* ── لوحة الأخيرة ── */
  function recentPanel() {
    var p = U.el(
      '<section class="panel"><div class="panel__head">' +
        I.svg("clock", { size: 17, cls: "icon" }) + "<h3>آخر ما فُتح</h3>" +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn btn--sm" data-clear>مسح</button>' +
        "</div><div class=\"panel__body\"></div></section>"
    );
    p.querySelector("[data-clear]").addEventListener("click", function () {
      S.clearRecent();
      root.OnyxUI.toast("تم مسح قائمة الأخيرة", { kind: "ok", icon: "check" });
    });
    fillRecent(p.querySelector(".panel__body"));
    return p;
  }

  function fillRecent(body) {
    var rec = S.getRecent();
    body.innerHTML = "";
    if (!rec.length) {
      body.appendChild(U.el(
        '<div class="empty"><div class="empty__icon">' + I.svg("clock", { size: 22, cls: "icon" }) + "</div>" +
        "<h3>لا يوجد سجل بعد</h3><p>ستظهر هنا آخر الشاشات التي تفتحها.</p></div>"
      ));
      return;
    }
    var list = U.el('<div class="flatlist"></div>');
    rec.forEach(function (r) {
      var n = IDX.byPath[r.path];
      if (!n) return;
      list.appendChild(flatRow(n, null, U.relTime(r.ts)));
    });
    body.appendChild(list);
  }

  function flatRow(n, action, meta) {
    var m = n._module;
    var row = U.el(
      '<div class="flatlist__item" data-accent="' + esc(m.accent || "slate") + '" style="cursor:pointer">' +
        I.svg(m.icon || "file", { size: 17, cls: "icon" }) +
        '<span class="flatlist__body"><b>' + esc(n.label) + "</b>" +
        "<small>" + esc(m.label) + (meta ? " · " + esc(meta) : "") + "</small></span>" +
      "</div>"
    );
    row.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      root.OnyxApp.open(n);
    });
    if (action === "unfav") {
      var b = U.el('<button type="button" class="btn btn--icon btn--sm" aria-label="إزالة من المفضلة">' +
        I.svg("close", { size: 14 }) + "</button>");
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        root.OnyxApp.toggleFavorite(n);
      });
      row.appendChild(b);
    }
    return row;
  }

  /* تحديث اللوحات إن كانت الرئيسية معروضة */
  function refreshPanels() {
    Array.prototype.forEach.call(document.querySelectorAll(".panel"), function (p) {
      var t = p.querySelector("h3");
      if (!t) return;
      if (t.textContent === "المفضلة") fillFav(p.querySelector(".panel__body"));
      if (t.textContent === "آخر ما فُتح") fillRecent(p.querySelector(".panel__body"));
    });
  }

  /* ═════════════════ نظرة عامة على نظام / مجموعة ═════════════════ */
  function renderOverview(node) {
    var h = host();
    h.innerHTML = "";
    var m = node._module;

    h.appendChild(crumbs(node));

    /* العنوان الفرعي قد يخلو تماماً بعد إزالة العدّاد — لا تُخرج حاوية فارغة */
    var sub = [node.labelEn ? '<span class="ltr">' + esc(node.labelEn) + "</span>" : "",
               node.note ? esc(node.note) : ""].filter(Boolean).join(" · ");

    h.appendChild(U.el(
      '<header class="page-head" data-accent="' + esc(m.accent || "slate") + '"><div class="page-head__row">' +
        '<div style="display:flex;gap:var(--space-3);align-items:flex-start">' +
          '<div class="modcard__icon" style="width:44px;height:44px">' +
            I.svg(node.icon || m.icon || "grid", { size: 22 }) + "</div>" +
          "<div><h1>" + esc(node.label) + "</h1>" +
          (sub ? '<div class="page-head__sub">' + sub + "</div>" : "") +
          "</div>" +
        "</div>" +
        '<div class="page-head__spacer"></div>' +
      "</div></header>"
    ));

    /* حساب مجمَّع: أظهر ربطه بالأنظمة والفجوة إن وُجدت */
    if ((m.variant === "accounts") && node.code && root.ONYX_LINKS) {
      var _L = root.ONYX_LINKS;
      var _lk = _L.forAccount(node.code);
      if (_lk && _lk.code === node.code) {
        var holder = U.el("<div></div>");
        renderAccountLink(holder, node, _lk);
        while (holder.firstChild) h.appendChild(holder.firstChild);
        h.appendChild(U.el('<div class="section-head">' + I.svg("folder", { size: 18, cls: "icon" }) +
          "<h2>الحسابات تحته</h2></div>"));
      }
    }

    var kids = node.children || [];
    var branches = kids.filter(function (c) { return !c._isLeaf; });
    var leaves = kids.filter(function (c) { return c._isLeaf; });

    if (branches.length) {
      var grid = U.el('<div class="groupgrid"></div>');
      branches.forEach(function (g) { grid.appendChild(groupCard(g, m)); });
      h.appendChild(grid);
    }

    if (leaves.length) {
      if (branches.length) {
        var w = (m.variant || "operations");
        h.appendChild(U.el('<div class="section-head"><h2>' +
          (w === "accounts" ? "حسابات مباشرة" : w === "config" ? "بنود مباشرة" : "شاشات مباشرة") +
          "</h2></div>"));
      }
      h.appendChild(leafBlock(leaves, m));
    }

    if (!kids.length) {
      h.appendChild(U.el(
        '<div class="empty empty--wip"><div class="empty__icon">' + I.svg("sliders", { size: 26, cls: "icon" }) + "</div>" +
        "<h3>قيد الإعداد</h3><p>لم تُوثَّق شاشات هذا القسم بعد. البنية جاهزة لإضافتها لاحقاً.</p></div>"
      ));
    }
  }

  function groupCard(g, m) {
    var card = U.el(
      '<article class="card groupcard" data-accent="' + esc(m.accent || "slate") + '">' +
        '<div class="groupcard__top">' + I.svg(g.icon || "folder", { size: 18, cls: "icon" }) +
          "<h3>" + esc(g.label) + "</h3>" +
          (g._effStatus === "wip" ? '<span class="pill pill--wip">قيد الإعداد</span>' : "") +
        "</div><ul></ul></article>"
    );
    var ul = card.querySelector("ul");
    var kids = g.children || [];
    var show = kids.slice(0, 6);

    show.forEach(function (n) {
      var li = document.createElement("li");
      var b = U.el("<button type=\"button\"><i></i><span>" + esc(n.label) + "</span>" +
        "</button>");
      b.addEventListener("click", function () { root.OnyxApp.open(n); });
      li.appendChild(b);
      ul.appendChild(li);
    });

    if (!kids.length) {
      ul.appendChild(U.el('<li style="font-size:var(--text-sm);color:var(--text-subtle);padding:var(--space-2)">' +
        "لا توجد شاشات موثقة بعد.</li>"));
    } else if (kids.length > show.length) {
      var more = U.el('<button type="button" class="groupcard__more">عرض الكل ←</button>');
      more.addEventListener("click", function () { root.OnyxApp.open(g); });
      card.appendChild(more);
    }
    return card;
  }

  /* الربط بالأنظمة — تُستدعى من شاشة الحساب ومن نظرة الحساب المجمَّع */
  function renderAccountLink(h, node, link) {
    var L = root.ONYX_LINKS;
    if (!link) return;
    /* ٢) الربط بالأنظمة */
    h.appendChild(U.el('<div class="section-head">' + I.svg("layers", { size: 18, cls: "icon" }) +
      "<h2>ما الذي يحرّك هذا الحساب؟</h2><span class=\"spacer\"></span>" +
      '<span class="pill pill--' + (link.confidence === "verified" ? "verified-on\">مؤكد" : "inferred\">مرجّح") +
      "</span></div>"));

    var box = U.el('<div class="linkbox"></div>');

    /* الأنظمة المغذّية */
    var sysRow = U.el('<div class="linkbox__row"><div class="linkbox__lbl">الأنظمة المغذّية</div>' +
      '<div class="linkbox__val chips"></div></div>');
    link.systems.forEach(function (sref) {
      var sn = IDX.resolve(sref);
      if (!sn) return;
      var c = U.el('<button type="button" class="accchip" data-accent="' + esc(sn._module.accent || "slate") + '">' +
        I.svg(sn.icon || sn._module.icon || "grid", { size: 14, cls: "icon-sm" }) +
        "<span>" + esc(sn.label) + "</span></button>");
      c.addEventListener("click", function () { root.OnyxApp.open(sn); });
      sysRow.querySelector(".chips").appendChild(c);
    });
    box.appendChild(sysRow);

    /* شاشة الربط (الجسر) */
    if (link.bridge) {
      var bn = IDX.resolve(link.bridge);
      if (bn) {
        var bRow = U.el('<div class="linkbox__row"><div class="linkbox__lbl">شاشة الربط</div>' +
          '<div class="linkbox__val chips"></div></div>');
        var bc = U.el('<button type="button" class="accchip accchip--bridge">' +
          I.svg("corner", { size: 14, cls: "icon-sm" }) +
          '<span class="accchip__code">' + esc(bn.ref) + "</span>" +
          "<span>" + esc(bn.label) + "</span></button>");
        bc.addEventListener("click", function () { root.OnyxApp.open(bn); });
        bRow.querySelector(".chips").appendChild(bc);
        box.appendChild(bRow);
      }
    }

    /* الشاشات التي تحرّكه */
    if (link.screens && link.screens.length) {
      var scRow = U.el('<div class="linkbox__row"><div class="linkbox__lbl">الشاشات المؤثِّرة</div>' +
        '<div class="linkbox__val chips"></div></div>');
      link.screens.forEach(function (sref) {
        var sn = IDX.resolve(sref);
        if (!sn) return;
        var c = U.el('<button type="button" class="accchip">' +
          '<span class="accchip__code">' + esc(sn.ref) + "</span>" +
          "<span>" + esc(sn.label) + "</span></button>");
        c.addEventListener("click", function () { root.OnyxApp.open(sn); });
        scRow.querySelector(".chips").appendChild(c);
      });
      box.appendChild(scRow);
    }

    /* الدليل */
    box.appendChild(U.el('<div class="linkbox__row"><div class="linkbox__lbl">الدليل على الربط</div>' +
      '<div class="linkbox__val">' + esc(link.evidence) + "</div></div>"));
    if (link.note) {
      box.appendChild(U.el('<div class="linkbox__row"><div class="linkbox__lbl">ملاحظة</div>' +
        '<div class="linkbox__val">' + esc(link.note) + "</div></div>"));
    }
    h.appendChild(box);

    /* ٣) فجوة بنيوية */
    if (link.gap && L.gaps) {
      var gap = L.gaps.filter(function (g) {
        return (g.accounts || []).some(function (a) { return a === "acc." + link.code; });
      })[0];
      if (gap) {
        var gb = U.el(
          '<div class="whybox" style="margin-block-start:var(--space-5)">' +
            '<div class="whybox__head">' + I.svg("info", { size: 17, cls: "icon" }) +
            "<b>فجوة بنيوية: " + esc(gap.title) + "</b></div>" +
            "<p>" + esc(gap.detail) + "</p>" +
            "<p style=\"margin-block-start:var(--space-2)\"><b>الأثر:</b> " + esc(gap.impact) + "</p>" +
          "</div>"
        );
        h.appendChild(gb);
      }
    }

  }

  /* ═════════════════ حساب من الدليل: الهوية + الربط بالأنظمة ═════════════════ */
  function renderAccount(h, node) {
    var L = root.ONYX_LINKS;
    var parent = node._parent;
    var rootInfo = L ? L.rootOf(node.code) : null;
    var link = L ? L.forAccount(node.code) : null;

    /* ١) هوية الحساب */
    h.appendChild(U.el('<div class="section-head">' + I.svg("book", { size: 18, cls: "icon" }) +
      "<h2>هوية الحساب</h2></div>"));
    h.appendChild(detailRows([
      ["رقم الحساب", node.code],
      ["النوع", node._isLeaf ? "حساب تفصيلي (نهائي)" : "حساب رئيسي / تصنيف"],
      ["الطبيعة", rootInfo ? rootInfo.nature : null],
      ["القائمة المالية", rootInfo ? rootInfo.statement + " — " + rootInfo.side : null],
      ["الحساب الأب", parent && parent.code ? parent.code + " — " + parent.label : "—"],
      ["المستوى", U.formatNum(node._level - 1, true)],
      ["عدد الحسابات تحته", node._isLeaf ? null : U.formatNum(node._screenCount, true)],
      ["المسار", IDX.ancestors(node).slice(1).map(function (a) { return a.label; })
        .concat([node.label]).join(" ‹ ")]
    ]) || U.el("<div></div>"));

    if (!link) {
      h.appendChild(U.el('<div class="screen__note">' + I.svg("info", { size: 15, cls: "icon" }) +
        "<span>لم يُحدَّد نظام مغذٍّ لهذا الحساب بعد.</span></div>"));
      return;
    }

    renderAccountLink(h, node, link);

    h.appendChild(U.el('<div class="screen__note">' + I.svg("info", { size: 15, cls: "icon" }) +
      "<span>من الدليل المحاسبي الفعلي لبتروسبيشل. الأرصدة والحركة غير معروضة في نسخة التصفح.</span></div>"));
  }

  /* ═════════════════ معاينة الشاشة ═════════════════ */
  function renderScreen(node, tabId) {
    var h = host();
    h.replaceChildren();
    h.classList.add("main__inner--blank");
  }
  root.OnyxViews = {
    renderHome: renderHome,
    renderSettings: renderSettings,
    renderBridges: renderBridges,
    renderIdentity: renderIdentity,
    renderBlockers: renderBlockers,
    renderOverview: renderOverview,
    renderScreen: renderScreen,
    refreshPanels: refreshPanels,
    crumbs: crumbs
  };
})(window);
