/* ============================================================================
   ONYX ERP — لوحة إعدادات النظام  (settings.html)
   ----------------------------------------------------------------------------
   لوحة تحكّم، لا صفحة تصفّح. لا شجرة ولا تفريعات — قائمة جانبية وأقسام
   ومجموعات وحقول تُضبط. المخطّط في settings-schema.js، وهذا الملف يرسمه.

   مبادئ العرض:
     · الخيار القليل القصير  → أزرار متجاورة (segmented) — ضغطة واحدة، بلا فتح قائمة
     · القرار المصيري        → بطاقات مشروحة (cards) — كل خيار وأثره أمام عينك
     · الحساب                → منتقٍ بالبحث من دليلكم — لا كتابة حرة
     · الباقي                → قائمة منسدلة أو حقل إدخال

   الحفظ محلي (localStorage) — البرنامج بلا خادم. وزر «نسخ الإعدادات» يخرج
   نصاً مرتّباً بكل بند وقيمته ومصدره، للتسليم أو الأرشفة.
   ========================================================================== */
(function (root) {
  "use strict";

  var I = root.OnyxIcons, U = root.OnyxUtil, S = root.OnyxStore,
      IDX = root.OnyxIndex, UI = root.OnyxUI, Nav = root.OnyxNav,
      SCHEMA = root.ONYX_SETTINGS_SCHEMA;

  var KEY = "settings";
  var COLLAPSE_KEY = "settingsGroups";

  var sideEl, innerEl, barEl, barInfoEl, searchEl, searchCountEl;
  var activeTab = null;
  var saved = {};        // المحفوظ فعلاً
  var draft = {};        // قيد التعديل
  var query = "";
  var collapsed = {};    // مجموعات القائمة المطويّة

  function scrollTo(el, opts) {
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView(opts);
  }

  var STATE_META = {
    locked:   { label: "من النظام المثبَّت", kind: "muted",  icon: "shield" },
    set:      { label: "مضبوط",              kind: "ready",  icon: "check" },
    pending:  { label: "يحتاج قراءة",        kind: "wip",    icon: "clock" },
    decision: { label: "قرار حاجب",          kind: "danger", icon: "info" }
  };

  /* ════════════════ القيم ════════════════ */
  function defaultOf(f) { return f.value !== undefined ? f.value : null; }
  function valueOf(f)   { return f.id in draft ? draft[f.id] : (f.id in saved ? saved[f.id] : defaultOf(f)); }
  function isSet(f)     { var v = valueOf(f); return v !== null && v !== undefined && v !== ""; }
  function isDirty()    { return Object.keys(draft).length > 0; }

  /* بند «محسوم»: مقفل من النظام، أو له قيمة مضبوطة */
  function resolved(f) { return f.state === "locked" || isSet(f); }

  function setValue(f, v) {
    var base = (f.id in saved) ? saved[f.id] : defaultOf(f);
    if (v === base) delete draft[f.id]; else draft[f.id] = v;
    applyLocal(f, v);
    refreshBar();
    buildSide();
    var row = innerEl.querySelector('[data-field="' + f.id + '"]');
    if (row) row.setAttribute("data-dirty", f.id in draft ? "1" : "0");
    refreshCardHeads();
  }

  function applyLocal(f, v) {
    if (f.local === "density") {
      S.setDensity(v === "مضغوطة" ? "compact" : "comfortable");
      document.documentElement.setAttribute("data-density", S.getDensity());
    }
    if (f.local === "theme") {
      S.setThemePref(v === "فاتحة" ? "light" : v === "داكنة" ? "dark" : "system");
      applyTheme();
    }
  }

  /* ════════════════ الإنجاز — محسوب لا مخزَّن ════════════════ */
  function progressOf(fields) {
    var done = fields.filter(resolved).length;
    return { done: done, total: fields.length, pct: fields.length ? Math.round(done * 100 / fields.length) : 100 };
  }
  function tabFields(t) {
    var out = [];
    t.groups.forEach(function (g) { out = out.concat(g.fields); });
    return out;
  }
  function overallProgress() { return progressOf(SCHEMA.allFields()); }

  /* ════════════════ السمة ════════════════ */
  function resolveTheme() {
    var p = S.getThemePref();
    if (p === "light" || p === "dark") return p;
    return root.matchMedia && root.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function applyTheme() {
    var t = resolveTheme();
    document.documentElement.setAttribute("data-theme", t);
    var b = document.getElementById("cpTheme");
    if (b) {
      var p = S.getThemePref();
      b.innerHTML = I.svg(p === "system" ? "panel" : t === "dark" ? "moon" : "sun", { size: 18 });
      b.setAttribute("aria-label", "السمة: " +
        (p === "system" ? "حسب النظام" : p === "dark" ? "داكنة" : "فاتحة"));
    }
  }

  /* ════════════════ القائمة الجانبية ════════════════ */
  function tabFlags(t) {
    var d = 0, p = 0;
    tabFields(t).forEach(function (f) {
      if (f.state === "decision" && !isSet(f)) d++;
      else if (f.state === "pending" && !isSet(f)) p++;
    });
    return { decision: d, pending: p };
  }

  function buildSide() {
    sideEl.innerHTML = "";

    var groups = [];
    SCHEMA.tabs.forEach(function (t) {
      var g = groups[groups.length - 1];
      if (!g || g.label !== t.group) { g = { label: t.group, tabs: [] }; groups.push(g); }
      g.tabs.push(t);
    });

    groups.forEach(function (g) {
      var isOpen = !collapsed[g.label];
      var pr = progressOf(g.tabs.reduce(function (a, t) { return a.concat(tabFields(t)); }, []));

      var cap = U.el(
        '<button type="button" class="cp__cap" aria-expanded="' + isOpen + '">' +
          '<span class="cp__capchev">' + I.svg("chevronDown", { size: 13 }) + "</span>" +
          '<span class="cp__captext">' + U.escapeHtml(g.label) + "</span>" +
          '<span class="cp__capmeter" title="' + pr.done + " من " + pr.total + ' بنداً محسوماً">' +
            '<i style="width:' + pr.pct + '%"></i></span>' +
        "</button>"
      );
      cap.addEventListener("click", function () {
        collapsed[g.label] = isOpen;
        writeRaw(COLLAPSE_KEY, collapsed);
        buildSide();
      });
      sideEl.appendChild(cap);

      if (!isOpen) return;

      g.tabs.forEach(function (t) {
        var flags = tabFlags(t);
        var b = U.el(
          '<button type="button" role="tab" class="cp__item" data-tab="' + U.escapeHtml(t.id) + '"' +
            ' aria-selected="' + (t.id === activeTab) + '">' +
            I.svg(t.icon || "dot", { size: 17, cls: "icon" }) +
            '<span class="cp__itemlabel">' + U.escapeHtml(t.label) + "</span>" +
            (flags.decision ? '<b class="cp__flag cp__flag--danger" title="قرارات حاجبة لم تُحسم">' +
              U.formatNum(flags.decision, true) + "</b>" : "") +
            (flags.pending ? '<b class="cp__flag" title="بنود تحتاج قراءة من أونيكس">' +
              U.formatNum(flags.pending, true) + "</b>" : "") +
          "</button>"
        );
        b.addEventListener("click", function () { showTab(t.id); });
        sideEl.appendChild(b);
      });
    });

    /* المرجع — وثيقة تُقرأ، لا قسم يُضبَط */
    sideEl.appendChild(U.el('<div class="cp__cap cp__cap--plain"><span class="cp__captext">المرجع</span></div>'));
    var ref = U.el(
      '<a class="cp__item cp__item--link" href="reference.html">' +
        I.svg("book", { size: 17, cls: "icon" }) +
        '<span class="cp__itemlabel">وثيقة المرجع</span>' +
        '<span class="cp__go">' + I.svg("chevronLeft", { size: 14 }) + "</span>" +
      "</a>"
    );
    sideEl.appendChild(ref);
    sideEl.appendChild(U.el(
      '<p class="cp__sidenote">الدليل المحاسبي · جسور الربط · الفجوات البنيوية · الأنظمة المقترحة</p>'
    ));
  }

  function markSide() {
    Array.prototype.forEach.call(sideEl.querySelectorAll(".cp__item[data-tab]"), function (b) {
      var on = b.dataset.tab === activeTab;
      b.setAttribute("aria-selected", on ? "true" : "false");
      if (on) scrollTo(b, { block: "nearest" });
    });
  }

  function showTab(id, opts) {
    opts = opts || {};
    activeTab = id;
    /* افتح مجموعة القسم لو كانت مطويّة */
    var tab = SCHEMA.tabs.filter(function (t) { return t.id === id; })[0];
    if (tab && collapsed[tab.group]) { collapsed[tab.group] = false; writeRaw(COLLAPSE_KEY, collapsed); }
    buildSide();
    markSide();
    render();
    document.getElementById("cpMain").scrollTop = 0;
    if (!opts.silent) { try { location.hash = "#/" + id; } catch (e) {} }
    S.setLastRoute("#/" + id);
  }

  /* ════════════════ الرسم ════════════════ */
  function render() {
    innerEl.innerHTML = "";
    var tab = SCHEMA.tabs.filter(function (t) { return t.id === activeTab; })[0];
    if (!tab) return;
    if (query) { renderSearch(); return; }

    var pr = progressOf(tabFields(tab));
    var flags = tabFlags(tab);

    var head = U.el(
      '<header class="cp__head">' +
        '<div class="cp__headicon">' + I.svg(tab.icon || "dot", { size: 22 }) + "</div>" +
        '<div class="cp__headtext">' +
          "<h2>" + U.escapeHtml(tab.label) + "</h2>" +
          "<p>" + U.escapeHtml(tab.intro || "") + "</p>" +
        "</div>" +
        '<div class="cp__headmeter">' +
          '<div class="cp__ring" style="--pct:' + pr.pct + '"><span>' + U.formatNum(pr.pct, true) + "٪</span></div>" +
          '<small>' + U.formatNum(pr.done, true) + " من " + U.formatNum(pr.total, true) + " محسوم</small>" +
        "</div>" +
      "</header>"
    );
    innerEl.appendChild(head);

    if (flags.decision || flags.pending) {
      var chips = U.el('<div class="cp__headchips"></div>');
      if (flags.decision) chips.appendChild(U.el('<span class="chip chip--danger">' +
        I.svg("info", { size: 12, cls: "icon-sm" }) + "<span>" +
        U.formatNum(flags.decision, true) + " قرار حاجب</span></span>"));
      if (flags.pending) chips.appendChild(U.el('<span class="chip chip--wip">' +
        I.svg("clock", { size: 12, cls: "icon-sm" }) + "<span>" +
        U.formatNum(flags.pending, true) + " بند يحتاج قراءة من أونيكس</span></span>"));
      innerEl.appendChild(chips);
    }

    tab.groups.forEach(function (g) { innerEl.appendChild(groupCard(g)); });

    innerEl.appendChild(U.el(
      '<p class="cp__foot">كل بند أعلاه مرتبط بشاشة حقيقية في نظامكم. ' +
      'ما حالته «يحتاج قراءة» لم يُقرأ بعد من أونيكس المثبَّت — افتح شاشته وسجّل القيمة هنا.</p>'
    ));
  }

  function groupCard(g) {
    var pr = progressOf(g.fields);
    var hasDecision = g.fields.some(function (f) { return f.state === "decision"; });
    var needsWork = pr.done < pr.total;

    var card = U.el(
      '<section class="cpg"' + (hasDecision ? ' data-tone="danger"' : "") + '>' +
        '<div class="cpg__head">' +
          "<h3>" + U.escapeHtml(g.label) + "</h3>" +
          '<span class="cpg__count">' + U.formatNum(pr.done, true) + "/" + U.formatNum(pr.total, true) + "</span>" +
          (hasDecision ? '<span class="chip chip--danger">حاجب</span>'
            : needsWork ? '<span class="chip chip--wip">يحتاج ضبطاً</span>'
            : '<span class="chip chip--ok">' + I.svg("check", { size: 11, cls: "icon-sm" }) + "<span>مكتمل</span></span>") +
        "</div>" +
        (g.note ? '<p class="cpg__note">' + U.escapeHtml(g.note) + "</p>" : "") +
        '<div class="cpg__body"></div>' +
      "</section>"
    );
    var body = card.querySelector(".cpg__body");
    g.fields.forEach(function (f) { body.appendChild(fieldRow(f)); });
    return card;
  }

  /* تحديث عدّادات رؤوس البطاقات بعد أي تغيير — بلا إعادة رسم كاملة */
  function refreshCardHeads() {
    var tab = SCHEMA.tabs.filter(function (t) { return t.id === activeTab; })[0];
    if (!tab || query) return;
    var cards = innerEl.querySelectorAll(".cpg");
    tab.groups.forEach(function (g, i) {
      var c = cards[i];
      if (!c) return;
      var pr = progressOf(g.fields);
      var cnt = c.querySelector(".cpg__count");
      if (cnt) cnt.textContent = U.formatNum(pr.done, true) + "/" + U.formatNum(pr.total, true);
    });
    var pr2 = progressOf(tabFields(tab));
    var ring = innerEl.querySelector(".cp__ring");
    if (ring) {
      ring.style.setProperty("--pct", pr2.pct);
      ring.querySelector("span").textContent = U.formatNum(pr2.pct, true) + "٪";
    }
    var sm = innerEl.querySelector(".cp__headmeter small");
    if (sm) sm.textContent = U.formatNum(pr2.done, true) + " من " + U.formatNum(pr2.total, true) + " محسوم";
  }

  /* ════════════════ صفّ حقل ════════════════ */
  function fieldRow(f) {
    var meta = STATE_META[f.state] || STATE_META.set;
    var wide = f.ui === "cards";

    var row = U.el(
      '<div class="cpf" data-field="' + U.escapeHtml(f.id) + '"' +
        ' data-state="' + U.escapeHtml(f.state) + '"' +
        (wide ? ' data-wide="1"' : "") +
        ' data-dirty="' + (f.id in draft ? "1" : "0") + '">' +
        '<div class="cpf__main">' +
          '<div class="cpf__label">' +
            "<span>" + U.escapeHtml(f.label) + "</span>" +
            (f.blocker ? '<span class="chip chip--danger chip--xs">' + U.escapeHtml(f.blocker) + "</span>" : "") +
            (f.hard ? '<span class="chip chip--hard chip--xs" title="ثابت لا يُكسر">⛔ ثابت</span>' : "") +
            (f.bridge ? '<span class="chip chip--ok chip--xs">جسر ربط</span>' : "") +
          "</div>" +
          (f.help ? '<p class="cpf__help">' + U.escapeHtml(f.help) + "</p>" : "") +
          '<div class="cpf__meta"></div>' +
        "</div>" +
        '<div class="cpf__control"></div>' +
      "</div>"
    );

    var metaBox = row.querySelector(".cpf__meta");
    metaBox.appendChild(U.el('<span class="cpf__state cpf__state--' + meta.kind + '">' +
      I.svg(meta.icon, { size: 12, cls: "icon-sm" }) + "<span>" + meta.label + "</span></span>"));

    if (f.src) {
      var srcNode = IDX.resolve(f.src);
      var srcBtn = U.el('<button type="button" class="cpf__ref" title="مصدر هذا البند في نظامكم">' +
        U.escapeHtml(f.src) + "</button>");
      if (srcNode) srcBtn.addEventListener("click", function () { openRef(srcNode); });
      else srcBtn.disabled = true;
      metaBox.appendChild(srcBtn);
    }
    if (f.screen) {
      var scNode = IDX.resolve(f.screen);
      if (scNode) {
        var go = U.el('<button type="button" class="cpf__screen">' +
          I.svg("external", { size: 12, cls: "icon-sm" }) +
          "<span>" + U.escapeHtml(scNode.label) + "</span></button>");
        go.addEventListener("click", function () { Nav.go(scNode); });
        metaBox.appendChild(go);
      }
    }

    row.querySelector(".cpf__control").appendChild(control(f, row));
    return row;
  }

  /* ════════════════ عناصر التحكّم ════════════════ */
  function control(f, row) {
    if (f.state === "locked") {
      return U.el('<div class="cpf__locked' + (f.ltr ? " ltr" : "") + '">' +
        I.svg("shield", { size: 13, cls: "icon-sm" }) +
        "<span>" + U.escapeHtml(String(valueOf(f) == null ? "—" : valueOf(f))) + "</span></div>");
    }
    if (f.type === "switch")  return switchCtl(f);
    if (f.type === "account") return accountCtl(f);
    if (f.type === "select") {
      if (f.ui === "segmented") return segmentedCtl(f, row);
      if (f.ui === "cards")     return cardsCtl(f, row);
      return selectCtl(f);
    }
    return inputCtl(f);
  }

  /* ── مفتاح ── */
  function switchCtl(f) {
    var v = valueOf(f);
    var wrap = U.el('<div class="cpsw"></div>');
    var lbl = U.el('<span class="cpsw__txt">' +
      (v === true ? "مفعّل" : v === false ? "معطّل" : "لم يُحدَّد") + "</span>");
    var btn = U.el(
      '<button type="button" class="switch" role="switch" aria-checked="' + (v === true) + '"' +
        (v === null ? ' data-unset="1"' : "") + '><span class="switch__knob"></span></button>'
    );
    btn.setAttribute("aria-label", f.label);
    btn.addEventListener("click", function () {
      v = v === true ? false : true;
      btn.setAttribute("aria-checked", String(v));
      btn.removeAttribute("data-unset");
      lbl.textContent = v ? "مفعّل" : "معطّل";
      setValue(f, v);
    });
    wrap.appendChild(lbl);
    wrap.appendChild(btn);
    return wrap;
  }

  /* ── أزرار متجاورة ── */
  function segmentedCtl(f, row) {
    var opts = SCHEMA.options(f);
    var v = valueOf(f);
    var wrap = U.el('<div class="cpseg"></div>');
    var hintEl = null;

    var group = U.el('<div class="cpseg__group" role="radiogroup"></div>');
    group.setAttribute("aria-label", f.label);
    opts.forEach(function (o) {
      var b = U.el('<button type="button" role="radio" class="cpseg__btn" aria-checked="' +
        (o.v === v) + '">' + U.escapeHtml(o.t) + "</button>");
      if (o.h) b.title = o.h;
      b.addEventListener("click", function () {
        v = o.v;
        Array.prototype.forEach.call(group.children, function (c) { c.setAttribute("aria-checked", "false"); });
        b.setAttribute("aria-checked", "true");
        if (hintEl) hintEl.textContent = o.h || "";
        setValue(f, o.v);
      });
      group.appendChild(b);
    });
    wrap.appendChild(group);

    if (opts.some(function (o) { return o.h; })) {
      var cur = opts.filter(function (o) { return o.v === v; })[0];
      hintEl = U.el('<p class="cpseg__hint">' + U.escapeHtml(cur ? (cur.h || "") : "") + "</p>");
      wrap.appendChild(hintEl);
    }
    return wrap;
  }

  /* ── بطاقات مشروحة: للقرارات التي يحتاج كل خيار فيها جملة ── */
  function cardsCtl(f) {
    var opts = SCHEMA.options(f);
    var v = valueOf(f);
    var wrap = U.el('<div class="cpcards" role="radiogroup"></div>');
    wrap.setAttribute("aria-label", f.label);

    opts.forEach(function (o) {
      var warn = /^⛔/.test(o.h || "");
      var c = U.el(
        '<button type="button" role="radio" class="cpcard" aria-checked="' + (o.v === v) + '"' +
          (warn ? ' data-warn="1"' : "") + ">" +
          '<span class="cpcard__dot"></span>' +
          '<span class="cpcard__body">' +
            '<b>' + U.escapeHtml(o.t) + "</b>" +
            (o.h ? "<small>" + U.escapeHtml(o.h) + "</small>" : "") +
          "</span>" +
        "</button>"
      );
      c.addEventListener("click", function () {
        Array.prototype.forEach.call(wrap.children, function (x) { x.setAttribute("aria-checked", "false"); });
        c.setAttribute("aria-checked", "true");
        setValue(f, o.v);
      });
      wrap.appendChild(c);
    });
    return wrap;
  }

  /* ── قائمة منسدلة ── */
  function selectCtl(f) {
    var opts = SCHEMA.options(f);
    var v = valueOf(f);
    var sel = U.el('<select class="cpsel"></select>');
    sel.setAttribute("aria-label", f.label);
    var ph = U.el('<option value="">— لم يُحدَّد —</option>');
    sel.appendChild(ph);
    opts.forEach(function (o) {
      var op = U.el("<option></option>");
      op.value = o.v;
      op.textContent = o.h ? o.t + " — " + o.h : o.t;
      if (o.v === v) op.selected = true;
      sel.appendChild(op);
    });
    if (v == null || v === "") ph.selected = true;
    sel.addEventListener("change", function () { setValue(f, sel.value || null); });
    return sel;
  }

  /* ── إدخال ── */
  function inputCtl(f) {
    var v = valueOf(f);
    var el = U.el('<input class="cpinp' + (f.ltr ? " ltr" : "") + '" type="' +
      (f.type === "number" ? "number" : "text") + '">');
    el.setAttribute("aria-label", f.label);
    if (f.min !== undefined) el.min = f.min;
    if (f.max !== undefined) el.max = f.max;
    el.value = v == null ? "" : v;
    el.placeholder = f.state === "pending" ? "اقرأها من الشاشة…" : "—";
    el.addEventListener("change", function () {
      var raw = el.value.trim();
      setValue(f, raw === "" ? null : (f.type === "number" ? Number(raw) : raw));
    });
    return el;
  }

  /* ── منتقي حساب من دليلكم: بحث + قائمة — لا كتابة حرة ── */
  var accCache = null;
  function accountOptions(prefix) {
    if (!accCache) {
      accCache = IDX.flat.filter(function (n) {
        return n._module && n._module.variant === "accounts" && n.code;
      });
    }
    var list = accCache;
    if (prefix) list = list.filter(function (n) { return String(n.code).indexOf(prefix) === 0; });
    return list.slice().sort(function (a, b) {
      var la = a._isLeaf ? 0 : 1, lb = b._isLeaf ? 0 : 1;
      return la - lb || String(a.code).localeCompare(String(b.code));
    });
  }

  function accountCtl(f) {
    var wrap = U.el('<div class="cpacc"></div>');
    var v = valueOf(f);

    var trigger = U.el('<button type="button" class="cpacc__btn" aria-haspopup="listbox" aria-expanded="false"></button>');
    trigger.setAttribute("aria-label", f.label);

    function label() {
      var cur = valueOf(f);
      if (!cur) return '<span class="cpacc__ph">— اختر حساباً —</span>' +
        '<span class="cpacc__chev">' + I.svg("chevronDown", { size: 14 }) + "</span>";
      var n = IDX.resolve("acc." + cur) || accountOptions().filter(function (x) { return x.code === cur; })[0];
      return '<span class="cpacc__code">' + U.escapeHtml(cur) + "</span>" +
        '<span class="cpacc__name">' + U.escapeHtml(n ? n.label : "") + "</span>" +
        '<span class="cpacc__chev">' + I.svg("chevronDown", { size: 14 }) + "</span>";
    }
    trigger.innerHTML = label();

    var pop = null;
    function close() {
      if (!pop) return;
      pop.remove(); pop = null;
      trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("mousedown", outside, true);
      document.removeEventListener("keydown", onKey, true);
    }
    function outside(e) { if (pop && !pop.contains(e.target) && e.target !== trigger) close(); }
    function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); close(); trigger.focus(); } }

    function open() {
      if (pop) { close(); return; }
      var list = accountOptions(f.prefix);
      pop = U.el(
        '<div class="cpacc__pop" role="listbox">' +
          '<div class="cpacc__search">' +
            I.svg("search", { size: 14, cls: "icon-sm" }) +
            '<input type="text" placeholder="ابحث برقم الحساب أو اسمه…" aria-label="بحث في الحسابات">' +
          "</div>" +
          '<div class="cpacc__list"></div>' +
          '<div class="cpacc__foot"></div>' +
        "</div>"
      );
      var listEl = pop.querySelector(".cpacc__list");
      var footEl = pop.querySelector(".cpacc__foot");
      var input = pop.querySelector("input");

      function paint(q) {
        listEl.innerHTML = "";
        var nq = U.normalizeArabic(q || "");
        var hits = !nq ? list : list.filter(function (n) {
          return String(n.code).indexOf(nq) === 0 || U.normalizeArabic(n.label).indexOf(nq) !== -1;
        });
        var cur = valueOf(f);

        if (cur) {
          var clr = U.el('<button type="button" class="cpacc__opt cpacc__opt--clear">— إزالة الاختيار —</button>');
          clr.addEventListener("click", function () {
            setValue(f, null); trigger.innerHTML = label(); close();
          });
          listEl.appendChild(clr);
        }

        hits.slice(0, 200).forEach(function (n) {
          var on = n.code === cur;
          var o = U.el(
            '<button type="button" class="cpacc__opt" role="option" aria-selected="' + on + '"' +
              (n._isLeaf ? "" : ' data-group="1"') + '>' +
              '<span class="cpacc__tick">' + (on ? I.svg("check", { size: 13 }) : "") + "</span>" +
              '<span class="cpacc__ocode">' + U.escapeHtml(n.code) + "</span>" +
              '<span class="cpacc__oname">' + U.escapeHtml(n.label) + "</span>" +
              (n._isLeaf ? "" : '<span class="cpacc__otag">مجمّع</span>') +
            "</button>"
          );
          /* ⛔ INV-5: لا قيد على حساب غير نهائي — نمنع اختياره أصلاً */
          if (!n._isLeaf) {
            o.disabled = true;
            o.title = "حساب مجمّع — لا يقع عليه قيد (INV-5)";
          } else {
            o.addEventListener("click", function () {
              setValue(f, n.code); trigger.innerHTML = label(); close();
            });
          }
          listEl.appendChild(o);
        });

        var leaves = hits.filter(function (n) { return n._isLeaf; }).length;
        footEl.textContent = hits.length
          ? U.formatNum(leaves, true) + " حساباً تفصيلياً قابلاً للاختيار" +
            (hits.length > 200 ? " · تُعرض أول ٢٠٠" : "")
          : "لا حساب يطابق البحث";
      }

      paint("");
      input.addEventListener("input", U.debounce(function () { paint(input.value.trim()); }, 120));
      wrap.appendChild(pop);
      trigger.setAttribute("aria-expanded", "true");
      input.focus();
      document.addEventListener("mousedown", outside, true);
      document.addEventListener("keydown", onKey, true);
    }

    trigger.addEventListener("click", open);
    wrap.appendChild(trigger);

    var openDoc = U.el('<button type="button" class="cpacc__doc" title="افتح الحساب في وثيقة المرجع">' +
      I.svg("book", { size: 14 }) + "</button>");
    openDoc.addEventListener("click", function () {
      var cur = valueOf(f);
      if (!cur) { UI.toast("اختر حساباً أولاً", { kind: "warn" }); return; }
      root.location.href = "reference.html#/acc." + cur;
    });
    wrap.appendChild(openDoc);
    return wrap;
  }

  function openRef(node) {
    if (node._module && node._module._zone === "core") { Nav.go(node); return; }
    root.location.href = "reference.html#/" + (node.ref || node._key);
  }

  /* ════════════════ البحث عبر كل الأقسام ════════════════ */
  function renderSearch() {
    var q = U.normalizeArabic(query);
    var hits = [];
    SCHEMA.tabs.forEach(function (t) {
      t.groups.forEach(function (g) {
        g.fields.forEach(function (f) {
          var hay = U.normalizeArabic(f.label + " " + (f.help || "") + " " + g.label + " " +
            t.label + " " + (f.src || ""));
          if (hay.indexOf(q) !== -1) hits.push({ t: t, g: g, f: f });
        });
      });
    });

    searchCountEl.textContent = hits.length ? U.formatNum(hits.length, true) + " بنداً" : "لا نتائج";

    innerEl.appendChild(U.el(
      '<header class="cp__head"><div class="cp__headicon">' + I.svg("search", { size: 22 }) + "</div>" +
      '<div class="cp__headtext"><h2>نتائج البحث</h2><p>' +
      (hits.length ? U.formatNum(hits.length, true) + " بنداً يطابق «" + U.escapeHtml(query) + "» عبر كل الأقسام."
                   : "لا يوجد بند يطابق «" + U.escapeHtml(query) + "».") +
      "</p></div></header>"
    ));

    var byTab = {};
    hits.forEach(function (h) { (byTab[h.t.id] = byTab[h.t.id] || { t: h.t, list: [] }).list.push(h); });

    Object.keys(byTab).forEach(function (k) {
      var b = byTab[k];
      var card = U.el(
        '<section class="cpg">' +
          '<div class="cpg__head"><h3>' + I.svg(b.t.icon, { size: 15, cls: "icon" }) + " " +
            U.escapeHtml(b.t.label) + "</h3>" +
            '<button type="button" class="cp__btn cp__btn--ghost">فتح القسم</button></div>' +
          '<div class="cpg__body"></div>' +
        "</section>"
      );
      card.querySelector("button").addEventListener("click", function () {
        searchEl.value = ""; query = ""; searchCountEl.textContent = "";
        showTab(b.t.id);
      });
      var body = card.querySelector(".cpg__body");
      b.list.forEach(function (h) { body.appendChild(fieldRow(h.f)); });
      innerEl.appendChild(card);
    });
  }

  /* ════════════════ شريط الحفظ والإنجاز ════════════════ */
  function refreshBar() {
    var n = Object.keys(draft).length;
    barEl.setAttribute("data-dirty", n ? "1" : "0");

    var pr = overallProgress();
    var fill = document.getElementById("cpProgressFill");
    var pct = document.getElementById("cpProgressPct");
    var txt = document.getElementById("cpProgressTxt");
    if (fill) fill.style.width = pr.pct + "%";
    if (pct) pct.textContent = U.formatNum(pr.pct, true) + "٪";
    if (txt) txt.textContent = "مكتمل · " + U.formatNum(pr.done, true) + " من " +
      U.formatNum(pr.total, true) + " بنداً";

    var dec = SCHEMA.allFields().filter(function (f) { return f.state === "decision" && !isSet(f); }).length;
    var pen = SCHEMA.allFields().filter(function (f) { return f.state === "pending" && !isSet(f); }).length;

    barInfoEl.innerHTML = "";
    if (n) {
      barInfoEl.appendChild(U.el('<span class="cp__dirty">' +
        U.formatNum(n, true) + " تغييراً غير محفوظ</span>"));
    }
    if (dec) {
      barInfoEl.appendChild(U.el('<span class="chip chip--danger chip--xs">' +
        U.formatNum(dec, true) + " قرار حاجب</span>"));
    }
    if (pen) {
      barInfoEl.appendChild(U.el('<span class="chip chip--wip chip--xs">' +
        U.formatNum(pen, true) + " يحتاج قراءة</span>"));
    }
    if (!n && !dec && !pen) {
      barInfoEl.appendChild(U.el('<span class="chip chip--ok chip--xs">' +
        I.svg("check", { size: 11, cls: "icon-sm" }) + "<span>كل شيء محسوم ومحفوظ</span></span>"));
    }
  }

  function save() {
    if (!isDirty()) { UI.toast("لا تغييرات لحفظها"); return; }
    var n = Object.keys(draft).length;
    Object.keys(draft).forEach(function (k) { saved[k] = draft[k]; });
    draft = {};
    writeRaw(KEY, saved);
    refreshBar(); buildSide(); markSide(); render();
    UI.toast("حُفظ " + U.formatNum(n, true) + " تغييراً", { kind: "ok", icon: "check" });
  }

  function discard() {
    if (!isDirty()) return;
    var n = Object.keys(draft).length;
    draft = {};
    refreshBar(); buildSide(); markSide(); render();
    UI.toast("رُجع عن " + U.formatNum(n, true) + " تغييراً", { icon: "info" });
  }

  function writeRaw(key, obj) {
    try { localStorage.setItem("onyx.v1." + key, JSON.stringify(obj)); } catch (e) {}
  }
  function readRaw(key) {
    try { return JSON.parse(localStorage.getItem("onyx.v1." + key)) || {}; } catch (e) { return {}; }
  }

  function exportText() {
    var pr = overallProgress();
    var lines = [];
    lines.push("إعدادات أونيكس ERP — " + root.ONYX_MOCK.org.name);
    lines.push("الفترة المالية " + root.ONYX_MOCK.org.fiscalPeriod +
      " · الإصدار المرجعي " + root.ONYX_MOCK.org.version);
    lines.push("الإنجاز: " + pr.done + " من " + pr.total + " بنداً (" + pr.pct + "٪)");
    lines.push("");

    SCHEMA.tabs.forEach(function (t) {
      lines.push("═══ " + t.label + " ═══");
      t.groups.forEach(function (g) {
        lines.push("── " + g.label);
        g.fields.forEach(function (f) {
          var v = valueOf(f);
          var shown = v === true ? "مفعّل" : v === false ? "معطّل"
                    : (v === null || v === undefined || v === "") ? "— لم يُحدَّد —" : String(v);
          var flag = f.state === "decision" && !isSet(f) ? "   [" + f.blocker + " قرار حاجب]"
                   : f.state === "pending" && !isSet(f) ? "   [يحتاج قراءة من " + (f.screen || f.src) + "]"
                   : "";
          lines.push("   " + f.label + ": " + shown + "   (" + f.src + ")" + flag);
        });
      });
      lines.push("");
    });
    UI.copy(lines.join("\n"));
  }

  /* ════════════════ التوجيه ════════════════ */
  function parseHash() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    if (!h) return null;
    h = decodeURIComponent(h);
    if (SCHEMA.tabs.some(function (t) { return t.id === h; })) return { tab: h };
    var fields = SCHEMA.fieldsForSource(h);
    if (fields.length) return { tab: fields[0]._tab, field: fields[0].id };
    var n = IDX.resolve(h);
    if (n) return { away: n };
    return null;
  }

  function handleHash() {
    var r = parseHash();
    if (!r) { showTab(SCHEMA.tabs[0].id, { silent: true }); return; }
    if (r.away) {
      if (r.away._module && r.away._module._zone === "core") Nav.go(r.away);
      else root.location.href = "reference.html#/" + (r.away.ref || r.away._key);
      return;
    }
    /* ضغط القسم يغيّر الـ hash فيرتدّ الحدث إلى هنا. لو كنّا فيه أصلاً فلا
       تُعِد الرسم — إعادة الرسم تهدم ما هو مفتوح (منتقي حساب مثلاً). */
    if (r.tab === activeTab && !r.field) return;
    showTab(r.tab, { silent: true });
    if (r.field) highlight(r.field);
  }

  function highlight(id) {
    var row = innerEl.querySelector('[data-field="' + id + '"]');
    if (!row) return;
    row.setAttribute("data-focus", "1");
    scrollTo(row, { block: "center" });
    setTimeout(function () { row.removeAttribute("data-focus"); }, 2600);
  }

  /* ════════════════ الإقلاع ════════════════ */
  function boot() {
    sideEl = document.getElementById("cpTabs");
    innerEl = document.getElementById("cpInner");
    barEl = document.getElementById("cpBar");
    barInfoEl = document.getElementById("cpBarInfo");
    searchEl = document.getElementById("cpSearch");
    searchCountEl = document.getElementById("cpSearchCount");

    Nav.setPage("settings");
    IDX.build();
    applyTheme();
    document.documentElement.setAttribute("data-density", S.getDensity());

    saved = readRaw(KEY);
    collapsed = readRaw(COLLAPSE_KEY);

    var org = document.getElementById("cpOrg");
    if (org) org.textContent = root.ONYX_MOCK.org.short + " · الفترة " + root.ONYX_MOCK.org.fiscalPeriod;

    buildSide();

    document.getElementById("cpTheme").addEventListener("click", function () {
      var order = ["system", "light", "dark"];
      S.setThemePref(order[(order.indexOf(S.getThemePref()) + 1) % 3]);
      applyTheme();
    });
    document.getElementById("cpSave").addEventListener("click", save);
    document.getElementById("cpDiscard").addEventListener("click", discard);
    document.getElementById("cpExport").addEventListener("click", exportText);

    searchEl.addEventListener("input", U.debounce(function () {
      query = searchEl.value.trim();
      if (!query) searchCountEl.textContent = "";
      render();
    }, 160));

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault(); searchEl.focus(); searchEl.select();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) { e.preventDefault(); save(); }
      if (e.key === "Escape" && document.activeElement === searchEl) {
        searchEl.value = ""; query = ""; searchCountEl.textContent = ""; render();
      }
      if (e.altKey && (e.key === "h" || e.key === "H")) { e.preventDefault(); Nav.goIndex(); }
    });

    root.addEventListener("beforeunload", function (e) {
      if (!isDirty()) return;
      e.preventDefault();
      e.returnValue = "";
    });

    root.addEventListener("hashchange", handleHash);

    handleHash();
    refreshBar();
  }

  root.OnyxSettings = {
    boot: boot,
    showTab: showTab,
    get saved() { return saved; },
    get draft() { return draft; },
    valueOf: valueOf,
    progress: overallProgress,
    save: save,
    discard: discard
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
