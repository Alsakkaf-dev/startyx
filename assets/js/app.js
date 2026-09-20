/* ============================================================================
   ONYX ERP — المتحكّم الرئيسي: التوجيه، الشريط، اللوحة، الربط
   ========================================================================== */
(function (root) {
  "use strict";

  var I = root.OnyxIcons, U = root.OnyxUtil, S = root.OnyxStore,
      IDX = root.OnyxIndex, UI = root.OnyxUI, Tree = root.OnyxTree,
      Views = root.OnyxViews, Palette = root.OnyxPalette, Nav = root.OnyxNav;

  var app, railScroll, treeScroll, treeTitle, treeTools, searchInput, searchCount, treeSeg;
  var treeToggleBtn = null;
  /* حدّ الجوال: تحته يصير التصفّح درجاً منزلقاً، فوقه لوحةً قابلة للطيّ.
     ‎900.02‎ يطابق ‎@media (min-width: 900.02px)‎ في ‎layout.css‎ فلا يبقى شقٌّ عند العرض الكسري. */
  var mqDesktop = window.matchMedia ? window.matchMedia("(min-width: 900.02px)") : null;
  var currentModule = null, currentNode = null, currentTab = null;
  var treeMode = "tree";          // tree | fav | recent
  var suppressHash = false;

  /* ════════════════════ السمة والكثافة ════════════════════ */
  function resolveTheme() {
    var pref = S.getThemePref();
    if (pref === "light" || pref === "dark") return pref;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function applyTheme() {
    var t = resolveTheme();
    document.documentElement.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#0d1220" : "#ffffff");
    var btn = document.getElementById("themeBtn");
    if (btn) {
      var pref = S.getThemePref();
      btn.innerHTML = I.svg(pref === "system" ? "panel" : t === "dark" ? "moon" : "sun", { size: 19 });
      btn.setAttribute("aria-label", "السمة: " + (pref === "system" ? "حسب النظام" : pref === "dark" ? "داكنة" : "فاتحة"));
    }
  }
  function cycleTheme() {
    var order = ["system", "light", "dark"];
    var next = order[(order.indexOf(S.getThemePref()) + 1) % 3];
    S.setThemePref(next);
    applyTheme();
    UI.toast("السمة: " + (next === "system" ? "حسب النظام" : next === "dark" ? "داكنة" : "فاتحة"),
      { icon: next === "dark" ? "moon" : next === "light" ? "sun" : "panel" });
  }
  function applyDensity() {
    document.documentElement.setAttribute("data-density", S.getDensity());
  }

  /* ════════════════════ شريط الأنظمة ════════════════════ */
  function buildRail() {
    railScroll.innerHTML = "";

    var homeBtn = mkRailItem({ label: "الرئيسية", icon: "home", accent: "indigo" }, function () { goHome(); });
    homeBtn.id = "railHome";
    railScroll.appendChild(homeBtn);
    railScroll.appendChild(U.el('<hr class="rail__sep">'));

    railScroll.appendChild(U.el('<div class="rail__caption">الأنظمة</div>'));

    /* الأنظمة التشغيلية وحدها — لا شيء غيرها في الشريط */
    IDX.coreModules.forEach(function (m) {
      var it = mkRailItem(m, function () { openModule(m); });
      it.dataset.module = m._id;
      if (m._effStatus === "wip") it.dataset.wip = "1";
      railScroll.appendChild(it);
    });

    /* لا شيء بعد الأنظمة التشغيلية. الإعدادات والمرجع يُدخل إليهما من أيقونة
       المستخدم في الشريط العلوي — مدخل واحد، فلا يزاحم شيءٌ الأنظمة هنا. */
  }

  function mkRailItem(m, onClick) {
    var b = U.el(
      '<button type="button" class="rail__item" role="tab" aria-selected="false" ' +
      'data-accent="' + U.escapeHtml(m.accent || "slate") + '">' +
        I.svg(m.icon || "grid", { size: 21, cls: "icon" }) +
        "<span>" + U.escapeHtml(m.label) + "</span>" +
      "</button>"
    );
    b.addEventListener("click", onClick);
    UI.tip(b, m.label, "inline-start");
    return b;
  }

  function markRail(moduleId, mode) {
    Array.prototype.forEach.call(railScroll.querySelectorAll(".rail__item"), function (b) {
      b.setAttribute("aria-selected", moduleId && b.dataset.module === moduleId ? "true" : "false");
    });
    var home = document.getElementById("railHome");
    if (home) home.setAttribute("aria-selected", mode === "home" ? "true" : "false");
    /* لا مدخل غير الأنظمة في هذا الشريط — فلا شيء آخر يُضاء أو يُطفأ */
  }

  /* ════════════════════ لوحة الشجرة ════════════════════ */
  function showModuleTree(m) {
    currentModule = m;
    S.setLastModule(m._id);

    treeTitle.innerHTML =
      '<span class="node__icon">' + I.svg(m.icon || "grid", { size: 18 }) + "</span>" +
      "<h2>" + U.escapeHtml(m.label) + "</h2>" +
      '<span class="spacer"></span>';
    treeTitle.setAttribute("data-accent", m.accent || "slate");

    searchInput.value = "";
    searchCount.textContent = "";
    setTreeMode("tree", true);
  }

  function setTreeMode(mode, force) {
    if (treeMode === mode && !force) return;
    treeMode = mode;
    Array.prototype.forEach.call(treeSeg.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-selected", b.dataset.mode === mode ? "true" : "false");
    });
    if (mode === "tree") {
      if (currentModule) Tree.mount(currentModule, treeScroll);
      if (currentNode && currentNode._module === currentModule) {
        Tree.revealPath(currentNode);
        Tree.select(currentNode);
      }
    } else if (mode === "fav") {
      /* المفضلة والأخيرة قد تحوي حسابات أو بنود إعدادات — تلك ملك الصفحة الأخرى */
      renderPaneList(S.getFavorites().slice().reverse()
        .map(function (k) { return IDX.byPath[k]; }).filter(Nav.isLocal),
        "star", "لا توجد شاشات مفضلة", "اضغط النجمة بجوار أي شاشة لإضافتها.");
    } else {
      renderPaneList(S.getRecent().map(function (r) { return IDX.byPath[r.path]; }).filter(Nav.isLocal),
        "clock", "لا يوجد سجل بعد", "ستظهر هنا آخر الشاشات التي تفتحها.");
    }
  }

  function renderPaneList(nodes, icon, emptyTitle, emptyText) {
    treeScroll.innerHTML = "";
    nodes = nodes.filter(Boolean);
    if (!nodes.length) {
      treeScroll.appendChild(U.el(
        '<div class="empty"><div class="empty__icon">' + I.svg(icon, { size: 22, cls: "icon" }) + "</div>" +
        "<h3>" + U.escapeHtml(emptyTitle) + "</h3><p>" + U.escapeHtml(emptyText) + "</p></div>"
      ));
      return;
    }
    var list = U.el('<div class="flatlist"></div>');
    nodes.forEach(function (n) {
      var m = n._module;
      var row = U.el(
        '<button type="button" class="flatlist__item" data-accent="' + U.escapeHtml(m.accent || "slate") + '">' +
          I.svg(m.icon || "file", { size: 17, cls: "icon" }) +
          '<span class="flatlist__body"><b>' + U.escapeHtml(n.label) + "</b>" +
          "<small>" + U.escapeHtml(m.label) + "</small></span>" +
        "</button>"
      );
      row.addEventListener("click", function () { open(n); });
      list.appendChild(row);
    });
    treeScroll.appendChild(list);
  }

  /* ════════════════════ التوجيه ════════════════════ */
  function parseHash() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    if (!h || h === "home") return { home: true };
    /* بقيت للتوافق مع روابط قديمة — تُحوَّل إلى الصفحة المستقلة */
    if (h === "settings" || h === "hub") return { hub: true };
    var tab = null;
    var ix = h.indexOf("::");
    if (ix !== -1) { tab = decodeURIComponent(h.slice(ix + 2)); h = h.slice(0, ix); }
    return { path: decodeURIComponent(h), tab: tab };
  }

  /* ملاحظة: history.pushState ممنوع على بروتوكول file:// (SecurityError)،
     والبرنامج يُفتح بالنقر المزدوج — لذا نستخدم location.hash وهو يعمل في كل الحالات
     ويحافظ على أزرار رجوع/تقدّم في المتصفح. */
  function writeHash(node, tab, replace) {
    /* نفضّل الرقم المرجعي من النظام (op.4.1.3.14) — أقصر وأثبت من المسار */
    var h = typeof node === "string" ? "#/" + node
          : node ? "#/" + (node.ref || node._key) + (tab ? "::" + tab : "")
          : "#/home";
    if (location.hash === h || decodeURIComponent(location.hash) === h) return;
    suppressHash = true;
    try {
      if (replace && location.protocol !== "file:") history.replaceState(null, "", h);
      else location.hash = h;
    } catch (e) {
      try { location.hash = h; } catch (e2) {}
    }
    setTimeout(function () { suppressHash = false; }, 0);
  }

  function handleHash() {
    if (suppressHash) return;
    var r = parseHash();
    if (r.home) { goHome({ silent: true }); return; }
    if (r.hub)  { Nav.goSettings(); return; }
    var n = IDX.resolve(r.path);
    if (!n) {
      var near = IDX.resolveNearest(r.path.split("/"));
      UI.toast("تعذّر فتح الرابط — قد تكون الشاشة غير متوفرة", { kind: "warn" });
      if (near) open(near, { silent: true }); else goHome({ silent: true });
      return;
    }
    open(n, { silent: true, tab: r.tab });
  }

  /* ════════════════════ الفتح ════════════════════ */
  function open(node, opts) {
    opts = opts || {};
    if (!node) return;

    /* ⛔ الحاجز: حساب أو بند إعدادات ليس من نصيب هذه الصفحة.
       تُفتح في settings.html بشجرتها هناك — فلا تُدمج شجرتان في لوحة واحدة. */
    if (!Nav.isLocal(node)) { Nav.go(node, opts.tab); return; }

    currentNode = node;
    currentTab = opts.tab || null;
    if (window.OnyxScreen && window.OnyxScreen.dismissDialogs) window.OnyxScreen.dismissDialogs();

    var m = node._module;
    if (m !== currentModule) showModuleTree(m);
    markRail(m._id, "module");

    if (treeMode !== "tree") setTreeMode("tree");
    Tree.revealPath(node);
    Tree.select(node, { scroll: true });

    if (node._isLeaf && node.kind === "screen") {
      Views.renderScreen(node, currentTab);
      S.pushRecent(node._key);
    } else {
      Views.renderOverview(node);
    }

    UI.status(IDX.breadcrumb(node).map(function (x) { return x.label; }).join(" ‹ "));
    document.getElementById("mainScroll").scrollTop = 0;

    if (!opts.silent) writeHash(node, currentTab);
    S.setLastRoute(location.hash);

    /* على الشاشات الصغيرة: أغلق الدرج بعد الفتح */
    if (!isDesktop() && node._isLeaf) closeDrawer();
  }

  function openModule(m) { open(m); }

  function goHome(opts) {
    opts = opts || {};
    currentNode = null;
    markRail(null, "home");
    Views.renderHome();
    UI.status("الرئيسية");
    document.getElementById("mainScroll").scrollTop = 0;
    if (!opts.silent) writeHash(null);
    S.setLastRoute("#/home");
    if (Tree.moduleNode) Tree.collapseAll();
  }

  /* الإعدادات والمرجع صفحة مستقلة (settings.html) — هذه مجرد بوابة إليها */
  function goSettings() { Nav.goSettings(); }

  /* ════════════════════ المفضلة ════════════════════ */
  function toggleFavorite(node) {
    if (!node || !node._key) return;
    var added = S.toggleFavorite(node._key);
    Tree.refreshStars();
    Views.refreshPanels();
    if (treeMode === "fav") setTreeMode("fav", true);
    if (currentNode === node && node._isLeaf) Views.renderScreen(node, currentTab);
    UI.toast(added ? "أُضيفت «" + node.label + "» إلى المفضلة" : "أُزيلت «" + node.label + "» من المفضلة",
      { kind: "ok", icon: added ? "starFill" : "star",
        action: { label: "تراجع", run: function () { toggleFavorite(node); } } });
  }

  /* ════════════════════ الدرج (شاشات صغيرة) ════════════════════ */
  function isDesktop() { return mqDesktop ? mqDesktop.matches : window.innerWidth > 900; }

  function openDrawer() {
    document.getElementById("appBody").setAttribute("data-drawer", "open");
    applyPaneA11y();
  }
  function closeDrawer() {
    document.getElementById("appBody").removeAttribute("data-drawer");
    applyPaneA11y();
  }
  function toggleDrawer() {
    var b = document.getElementById("appBody");
    if (b.getAttribute("data-drawer") === "open") closeDrawer(); else openDrawer();
  }

  /* هل اللوحة مخفيّة فعلياً الآن؟ سطح المكتب: حين تكون مطويّة. الجوال: حين يكون الدرج مغلقاً. */
  function treePaneHidden() {
    var b = document.getElementById("appBody");
    return isDesktop()
      ? b.getAttribute("data-tree") === "collapsed"
      : b.getAttribute("data-drawer") !== "open";
  }

  /* اللوحة المنزلقة تبقى في شجرة الوصول ما لم نُعطّلها — عطّلها وهي مخفيّة فقط،
     وبحسب منطق العرض الحالي لا حالة الطيّ وحدها (وإلا تجمّد الدرج على الجوال). */
  function applyPaneA11y() {
    var pane = document.querySelector(".treepane");
    if (!pane) return;
    var hidden = treePaneHidden();
    if ("inert" in pane) pane.inert = hidden;
    pane.setAttribute("aria-hidden", hidden ? "true" : "false");
  }

  /* يُنادى عند عبور حدّ الجوال (تغيير حجم النافذة/تدويرها):
     - الدرج سلوكٌ عابر فيُغلق؛ حالة الطيّ محفوظة في ‎data-tree‎ فتبقى.
     - توسيع الشريط سلوك سطح مكتب — يُعرض مطويّاً على الجوال دون المساس بالتفضيل.
     - ‎no-anim‎ لحظةَ العبور كي لا تنزلق اللوحة/الشبكة استجابةً لسحب حافة النافذة.
     - ثم تُعاد مواءمة إخفاء اللوحة (inert/aria) مع منطق العرض الجديد. */
  function syncLayoutToViewport() {
    var b = document.getElementById("appBody");
    b.classList.add("no-anim");
    b.removeAttribute("data-drawer");
    if (app) app.setAttribute("data-rail", (isDesktop() && S.getRailExpanded()) ? "expanded" : "collapsed");
    applyPaneA11y();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { b.classList.remove("no-anim"); });
    });
  }

  /* ════════════════════ طيّ لوحة الشجرة ════════════════════
     حالة واحدة على #appBody: data-tree="collapsed". الزر مموضَع على حافة
     اللوحة فينزلق معها، فيبقى في المتناول وهي مطويّة. */
  function isTreeCollapsed() {
    return document.getElementById("appBody").getAttribute("data-tree") === "collapsed";
  }

  function setTreePane(collapsed, silent) {
    var b = document.getElementById("appBody");
    collapsed = !!collapsed;
    if (collapsed) b.setAttribute("data-tree", "collapsed");
    else b.removeAttribute("data-tree");

    applyPaneA11y();
    if (treeToggleBtn) {
      treeToggleBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      treeToggleBtn.setAttribute("aria-label", collapsed ? "إظهار لوحة الشجرة" : "طيّ لوحة الشجرة");
      treeToggleBtn.title = collapsed ? "إظهار لوحة الشجرة" : "طيّ لوحة الشجرة";
    }
    if (!silent) S.setTreeCollapsed(collapsed);
  }

  /* ════════════════════ تغيير عرض اللوحة ════════════════════ */
  function initResizer() {
    var rz = document.getElementById("resizer");
    if (!rz) return;
    var dragging = false;

    /* أقصى عرض للّوحة: الأصغر بين ٤٦٠ و~٤٢٪ من النافذة كي لا تخنق المحتوى وهي واسعة على نافذة ضيّقة */
    function maxW() { return Math.max(300, Math.min(460, Math.round(window.innerWidth * 0.42))); }
    /* طبّق العرض على المتغيّر فقط (بلا حفظ) — للمواءمة عند تغيير حجم النافذة */
    function applyW(px) { app.style.setProperty("--tree-w", U.clamp(px, 260, maxW()) + "px"); }
    /* تغيير مقصود من المستخدم: طبّق واحفظ */
    function setW(px) {
      px = U.clamp(px, 260, maxW());
      app.style.setProperty("--tree-w", px + "px");
      S.setTreeWidth(px);
    }
    applyW(S.getTreeWidth());

    /* عند تغيير حجم النافذة (بلا عبور حدّ الجوال): أعِد ملاءمة العرض المحفوظ مع النافذة الحالية */
    window.addEventListener("resize", U.debounce(function () {
      if (isDesktop() && !isTreeCollapsed()) applyW(S.getTreeWidth());
    }, 150));

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { rz.releasePointerCapture(e.pointerId); } catch (err) {}
      rz.removeAttribute("data-dragging");
      document.body.style.cursor = "";
    }

    rz.addEventListener("pointerdown", function (e) {
      dragging = true;
      rz.setPointerCapture(e.pointerId);
      rz.setAttribute("data-dragging", "1");
      document.body.style.cursor = "col-resize";
      e.preventDefault();
    });
    rz.addEventListener("pointermove", function (e) {
      if (!dragging || isTreeCollapsed()) return;
      var railW = document.querySelector(".rail").getBoundingClientRect().width;
      setW(window.innerWidth - railW - e.clientX);
    });
    rz.addEventListener("pointerup", endDrag);
    /* الحدّ إن اختفى المقبض (‎display:none‎ عند العبور للجوال أثناء السحب) يُنهي السحب */
    rz.addEventListener("pointercancel", endDrag);
    rz.addEventListener("lostpointercapture", endDrag);
    rz.addEventListener("dblclick", function () { setW(332); });
    rz.addEventListener("keydown", function (e) {
      if (isTreeCollapsed()) return;
      var cur = parseInt(getComputedStyle(app).getPropertyValue("--tree-w"), 10) || 332;
      if (e.key === "ArrowLeft")  { setW(cur + 16); e.preventDefault(); }
      if (e.key === "ArrowRight") { setW(cur - 16); e.preventDefault(); }
      if (e.key === "Home")       { setW(260); e.preventDefault(); }
      if (e.key === "End")        { setW(460); e.preventDefault(); }
    });
  }

  /* ════════════════════ الاختصارات العامة ════════════════════ */
  function initHotkeys() {
    document.addEventListener("keydown", function (e) {
      var inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        Palette.isOpen() ? Palette.close() : Palette.open();
        return;
      }
      if (Palette.isOpen()) return;

      if (e.key === "/" && !inField) { e.preventDefault(); Palette.open(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F") && !inField) {
        e.preventDefault();
        /* اكشف اللوحة كما يفعل الزرّان: درجاً على الجوال، وإلغاء طيّ على سطح المكتب —
           وإلا بقيت اللوحة inert فيضيع focus() ونكون قد عطّلنا بحث المتصفح دون بديل */
        if (isDesktop()) setTreePane(false); else openDrawer();
        searchInput.focus(); searchInput.select(); return;
      }
      if (e.key === "Escape" && document.activeElement === searchInput && searchInput.value) {
        searchInput.value = ""; runSearch(""); return;
      }
      if ((e.altKey) && e.key === "h") { e.preventDefault(); goHome(); }
    });
  }

  /* ════════════════════ البحث في اللوحة ════════════════════ */
  var runSearch = function (q) {
    if (treeMode !== "tree") setTreeMode("tree");
    var n = Tree.search(q);
    if (!q) { searchCount.textContent = ""; return; }
    searchCount.textContent = U.plural(n, U.COUNT_WORDS.result, { one: "نتيجة واحدة", zero: "لا نتائج" });
  };

  /* ════════════════════ الإقلاع ════════════════════ */
  function boot() {
    app = document.getElementById("app");
    railScroll = document.getElementById("railScroll");
    treeScroll = document.getElementById("treeScroll");
    treeTitle = document.getElementById("treeTitle");
    treeTools = document.getElementById("treeTools");
    searchInput = document.getElementById("treeSearch");
    searchCount = document.getElementById("searchCount");
    treeSeg = document.getElementById("treeSeg");

    Nav.setPage("index");
    IDX.build();
    applyTheme();
    applyDensity();

    /* لوحة الأوامر هنا تبحث في الأنظمة التشغيلية وحدها */
    if (Palette.setScope) {
      Palette.setScope(function (n) { return Nav.pageOf(n) === "index"; },
        "ابحث في شاشات الأنظمة التشغيلية");
    }

    /* حالة الشريط — التوسيع سلوك سطح مكتب وحده */
    app.setAttribute("data-rail", (isDesktop() && S.getRailExpanded()) ? "expanded" : "collapsed");

    buildRail();
    initResizer();
    initHotkeys();

    /* ── أزرار الشريط العلوي ── */
    document.getElementById("railToggle").addEventListener("click", function () {
      if (!isDesktop()) { toggleDrawer(); return; }
      var next = app.getAttribute("data-rail") !== "expanded";
      app.setAttribute("data-rail", next ? "expanded" : "collapsed");
      S.setRailExpanded(next);
    });

    /* ── زر طيّ لوحة الشجرة: يسافر مع اللوحة ويعيدها ── */
    treeToggleBtn = document.getElementById("treeToggle");
    if (treeToggleBtn) {
      treeToggleBtn.addEventListener("click", function () {
        if (!isDesktop()) { toggleDrawer(); return; }
        setTreePane(!isTreeCollapsed());
      });
    }
    setTreePane(S.getTreeCollapsed(), true);

    /* ── مزامنة التخطيط عند عبور حدّ الجوال (تغيير حجم النافذة/تدويرها) ── */
    if (mqDesktop) {
      var onViewportCross = function () { syncLayoutToViewport(); };
      if (mqDesktop.addEventListener) mqDesktop.addEventListener("change", onViewportCross);
      else if (mqDesktop.addListener) mqDesktop.addListener(onViewportCross);
    }

    /* ارفع مانع الحركة بعد أول رسم كي لا تنزلق اللوحة عند كل تحميل */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.getElementById("appBody").classList.remove("no-anim");
      });
    });

    document.getElementById("searchTrigger").addEventListener("click", function () { Palette.open(); });
    document.getElementById("themeBtn").addEventListener("click", cycleTheme);

    document.getElementById("bellBtn").addEventListener("click", function (e) {
      var items = [{ head: "ما يحتاج قراراً" }];
      var SPB = (root.ONYX_SPEC && root.ONYX_SPEC.blockers) || [];
      SPB.forEach(function (b) {
        items.push({ icon: "info", label: b.title, run: function () {
          var m = String(b.source).match(/((op|cfg|acc)\.[\w.]+)/);
          var n = m && IDX.resolve(m[1]);
          if (n) open(n);   /* open يحوّل تلقائياً لو كانت العقدة خارج الأنظمة */
        }});
      });
      var pend = 0;
      IDX.flat.forEach(function (x) { if (x.cfgStatus === "pending") pend++; });
      if (pend) {
        items.push("-", { icon: "clock", label: U.plural(pend, ["بند","بندان","بنود","بنداً"]) + " قيد التحقق",
          run: function () {
            var cfgMod = IDX.modulesInZone("settings")[0];
            if (cfgMod) Nav.go(cfgMod);
          }});
      }
      UI.menu(e.currentTarget, items, { alignStart: true });
    });

    document.getElementById("userBtn").addEventListener("click", function (e) {
      /* مدخل واحد للإعدادات — ومنه تتفرّع الأقسام داخل صفحتها، لا هنا */
      UI.menu(e.currentTarget, [
        { head: "المستخدم" },
        { icon: "user", label: "مدير النظام", disabled: true },
        { icon: "landmark", label: root.ONYX_MOCK.org.unit, disabled: true },
        "-",
        { icon: "cog", label: "الإعدادات", run: function () { Nav.goSettings(); } },
        "-",
        { head: "كثافة العرض" },
        { icon: "list", label: "مريحة", checked: S.getDensity() === "comfortable",
          run: function () { S.setDensity("comfortable"); applyDensity(); } },
        { icon: "list", label: "مضغوطة", checked: S.getDensity() === "compact",
          run: function () { S.setDensity("compact"); applyDensity(); } },
        "-",
        { icon: "info", label: "حول البرنامج", run: showAbout }
      ], { alignStart: true });
    });

    /* ── أدوات لوحة الشجرة ── */
    document.getElementById("btnExpandAll").addEventListener("click", function () {
      if (treeMode !== "tree") setTreeMode("tree");
      Tree.expandAll();
    });
    document.getElementById("btnCollapseAll").addEventListener("click", function () {
      if (treeMode !== "tree") setTreeMode("tree");
      Tree.collapseAll();
    });
    document.getElementById("btnTreeMore").addEventListener("click", function (e) {
      UI.menu(e.currentTarget, [
        { icon: "hash", label: "نسخ رابط النظام",
          run: function () {
            if (currentModule) UI.copy(location.href.split("#")[0] + "#/" + (currentModule.ref || currentModule._key));
          } },
        { icon: "grid", label: "نظرة عامة على النظام",
          run: function () { if (currentModule) open(currentModule); } },
        "-",
        { icon: "panel", label: "طيّ لوحة الشجرة",
          run: function () { setTreePane(true); } }
      ], { alignStart: true });
    });

    Array.prototype.forEach.call(treeSeg.querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () { setTreeMode(b.dataset.mode, true); });
    });

    searchInput.addEventListener("input", U.debounce(function () { runSearch(searchInput.value); }, 170));
    document.getElementById("searchClear").addEventListener("click", function () {
      searchInput.value = ""; runSearch(""); searchInput.focus();
    });

    /* ── تحديث اللوحات عند تغيّر الحالة ── */
    S.on("favorites", function () { Views.refreshPanels(); });
    S.on("recent", function () { Views.refreshPanels(); });

    /* ── متابعة سمة النظام ── */
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () { if (S.getThemePref() === "system") applyTheme(); };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    window.addEventListener("hashchange", handleHash);

    /* ── الحالة الأولية ── */
    var lastMod = S.getLastModule();
    var saved = lastMod && IDX.byPath[lastMod];
    /* لو كان آخر ما فُتح دليلاً أو إعدادات فهو ملك الصفحة الأخرى — تجاهله */
    var startMod = (saved && saved._zone === "core") ? saved : IDX.coreModules[0];
    showModuleTree(startMod);

    var initial = parseHash();
    if (!location.hash && S.getLastRoute()) {
      location.hash = S.getLastRoute();
      initial = parseHash();
    }
    if (initial.home) goHome({ silent: true });
    else if (initial.hub) { Nav.goSettings(); return; }
    else {
      var n = IDX.resolve(initial.path);
      if (n && !Nav.isLocal(n)) { Nav.go(n, initial.tab); return; }
      if (n) open(n, { silent: true, tab: initial.tab });
      else goHome({ silent: true });
    }

    document.getElementById("bootLoader") && document.getElementById("bootLoader").remove();
  }

  function showAbout() {
    var meta = root.ONYX_DATA.meta;
    var scrim = U.el('<div class="palette-scrim"></div>');
    var box = U.el(
      '<div class="palette" style="max-width:520px" role="dialog" aria-modal="true" aria-label="حول البرنامج">' +
        '<div class="palette__head"><b style="flex:1;font-size:var(--text-lg)">حول البرنامج</b>' +
          '<button type="button" class="btn btn--icon btn--sm" data-x>' + I.svg("close", { size: 16 }) + "</button></div>" +
        '<div style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-3)">' +
          '<div style="display:flex;gap:var(--space-3);align-items:center">' +
            '<div class="brand-mark" style="width:44px;height:44px">' + I.svg("layers", { size: 24 }) + "</div>" +
            "<div><div style=\"font-size:var(--text-lg);font-weight:600\">" + U.escapeHtml(meta.brandAr) + "</div>" +
            '<div class="ltr" style="font-size:var(--text-xs);color:var(--text-subtle)">' + U.escapeHtml(meta.brand) + "</div></div>" +
          "</div>" +
          "<p style=\"font-size:var(--text-md);color:var(--text-muted);line-height:1.75\">" +
            U.escapeHtml(meta.tagline) + " — " + U.escapeHtml(meta.version) + "." +
          "</p>" +
          '<div style="padding:var(--space-3);background:var(--status-wip-bg);color:var(--status-wip-fg);' +
          'border-radius:var(--radius-sm);font-size:var(--text-sm)">' + U.escapeHtml(meta.note) + "</div>" +
          '<div style="font-size:var(--text-xs);color:var(--text-subtle);border-block-start:1px solid var(--border-subtle);' +
          'padding-block-start:var(--space-3)">' + U.escapeHtml(meta.company) + "</div>" +
        "</div>" +
      "</div>"
    );
    scrim.appendChild(box);
    document.body.appendChild(scrim);
    function bye() { if (scrim.parentNode) scrim.parentNode.removeChild(scrim); document.removeEventListener("keydown", k, true); }
    function k(e) { if (e.key === "Escape") bye(); }
    box.querySelector("[data-x]").addEventListener("click", bye);
    scrim.addEventListener("mousedown", function (e) { if (e.target === scrim) bye(); });
    document.addEventListener("keydown", k, true);
  }

  root.OnyxApp = {
    boot: boot,
    open: open,
    goHome: goHome,
    goSettings: goSettings,
    toggleFavorite: toggleFavorite,
    get currentNode() { return currentNode; },
    get currentModule() { return currentModule; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
