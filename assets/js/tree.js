/* ============================================================================
   ONYX ERP — متصفح الشجرة: بناء، فتح/طي، تحديد، لوحة مفاتيح (RTL)
   ========================================================================== */
(function (root) {
  "use strict";

  var I = root.OnyxIcons, U = root.OnyxUtil, S = root.OnyxStore, IDX = root.OnyxIndex;

  var container = null;          // <div class="treepane__scroll">
  var listEl = null;             // <ul class="tree" role="tree">
  var moduleNode = null;         // النظام المعروض حالياً
  var expanded = new Set();      // مفاتيح العقد المفتوحة
  var selectedKey = null;
  var rowByKey = Object.create(null);
  var liByKey = Object.create(null);
  var currentFocusKey = null;
  var typeBuffer = "", typeTimer = null;
  var searchActive = false;
  var preSearchExpanded = null;
  var autoTimer = null;          // مؤقّت الطي التلقائي
  var hovering = false;          // هل الفأر داخل لوحة الشجرة؟

  /* كم يبقى الفرع مفتوحاً قبل أن ينطوي وحده (مللي ثانية) — صفر يُعطّل الميزة */
  var AUTO_COLLAPSE_MS = 15000;

  /* تسميات حالات التحقق في شجرة «الإعدادات الفعّالة» */
  var CFG_LABEL = {
    verified_on: "مفعّل", verified_off: "معطّل", verified_info: "معلومة",
    inferred: "مرجّح", pending: "قيد التحقق"
  };

  /* ═════════ البناء ═════════ */

  function mount(mod, host) {
    container = host;
    moduleNode = mod;
    rowByKey = Object.create(null);
    liByKey = Object.create(null);
    selectedKey = null;
    currentFocusKey = null;
    searchActive = false;
    preSearchExpanded = null;

    clearAutoCollapse();
    /* الشجرة تبدأ مطويّة دائماً — لا استعادة لحالة محفوظة ولا فتح تلقائي */
    expanded = new Set();

    listEl = document.createElement("ul");
    listEl.className = "tree";
    listEl.setAttribute("role", "tree");
    listEl.setAttribute("aria-label", "شجرة " + mod.label);

    (mod.children || []).forEach(function (c) { listEl.appendChild(buildNode(c)); });

    container.innerHTML = "";
    container.appendChild(listEl);

    listEl.addEventListener("keydown", onKeyDown);
    if (!container.__onyxHoverBound) {
      container.__onyxHoverBound = true;
      container.addEventListener("pointerenter", function () { hovering = true; });
      container.addEventListener("pointerleave", function () { hovering = false; armAutoCollapse(); });
    }
    setFocusKey(firstVisibleKey());
  }

  function buildNode(node) {
    var li = document.createElement("li");
    li.dataset.key = node._key;
    liByKey[node._key] = li;

    var hasKids = !node._isLeaf;
    if (hasKids) li.setAttribute("aria-expanded", expanded.has(node._key) ? "true" : "false");

    var row = document.createElement("div");
    row.className = "node";
    row.setAttribute("role", "treeitem");
    row.setAttribute("tabindex", "-1");
    row.setAttribute("aria-level", String(node._level));
    row.dataset.key = node._key;
    row.dataset.kind = node.kind;
    row.dataset.status = node._effStatus;
    if (hasKids) row.setAttribute("aria-expanded", expanded.has(node._key) ? "true" : "false");
    if (node._module && node._module.accent) row.setAttribute("data-accent", node._module.accent);

    /* المسافة البادئة */
    var depth = node._level - 2;   /* المستوى 1 = النظام (غير معروض) */
    if (depth > 0) {
      var ind = document.createElement("span");
      ind.className = "node__indent";
      for (var i = 0; i < depth; i++) {
        var g = document.createElement("span");
        g.className = "node__guide";
        ind.appendChild(g);
      }
      row.appendChild(ind);
    }

    /* السهم أو النقطة */
    if (hasKids) {
      var ch = document.createElement("span");
      ch.className = "node__chevron";
      ch.innerHTML = I.svg("chevronLeft", { size: 15 });
      ch.addEventListener("click", function (e) {
        e.stopPropagation();
        toggle(node, e.altKey);
      });
      row.appendChild(ch);
    } else {
      var dot = document.createElement("span");
      dot.className = "node__dot";
      dot.innerHTML = "<i></i>";
      row.appendChild(dot);
    }

    /* الأيقونة */
    if (node.icon) {
      var ic = document.createElement("span");
      ic.className = "node__icon";
      ic.innerHTML = I.svg(node.icon, { size: 16 });
      row.appendChild(ic);
    } else if (hasKids) {
      var ic2 = document.createElement("span");
      ic2.className = "node__icon";
      ic2.innerHTML = I.svg("folder", { size: 16 });
      row.appendChild(ic2);
    }

    /* رقم الحساب (لشجرة الدليل المحاسبي) */
    if (node.code) {
      var cd = document.createElement("span");
      cd.className = "node__code";
      cd.textContent = node.code;
      row.appendChild(cd);
    }

    /* التسمية */
    var lbl = document.createElement("span");
    lbl.className = "node__label";
    lbl.textContent = node.label;
    lbl.title = node.label + (node.ref ? "  [" + node.ref + "]" : "");
    row.appendChild(lbl);

    /* الشارات: حالة التحقق (شجرة الإعدادات) أو قيد الإعداد (بقية الأشجار) */
    if (node.cfgStatus) {
      var cs = document.createElement("span");
      cs.className = "pill pill--" + node.cfgStatus.replace(/_/g, "-");
      cs.textContent = CFG_LABEL[node.cfgStatus] || node.cfgStatus;
      row.appendChild(cs);
    } else if (node._effStatus === "wip") {
      var p = document.createElement("span");
      p.className = "pill pill--wip";
      p.textContent = "قيد الإعداد";
      row.appendChild(p);
    }

    /* نجمة المفضلة (للأوراق) */
    if (node._isLeaf && node.kind === "screen") {
      var star = document.createElement("button");
      star.className = "node__star";
      star.type = "button";
      star.setAttribute("aria-label", "إضافة إلى المفضلة");
      var fav = S.isFavorite(node._key);
      star.setAttribute("aria-pressed", fav ? "true" : "false");
      star.innerHTML = I.svg(fav ? "starFill" : "star", { size: 15 });
      star.addEventListener("click", function (e) {
        e.stopPropagation();
        root.OnyxApp.toggleFavorite(node);
      });
      row.appendChild(star);
    }


    row.addEventListener("click", function (e) {
      if (e.target.closest(".node__star")) return;
      setFocusKey(node._key);
      if (hasKids) { toggle(node, e.altKey); select(node); }
      else root.OnyxApp.open(node);
    });

    li.appendChild(row);
    rowByKey[node._key] = row;

    if (hasKids) {
      var ul = document.createElement("ul");
      ul.setAttribute("role", "group");
      node.children.forEach(function (c) { ul.appendChild(buildNode(c)); });
      li.appendChild(ul);
    }
    return li;
  }

  /* ═════════ الفتح والطي ═════════ */

  function setExpanded(node, open) {
    if (node._isLeaf) return;
    var li = liByKey[node._key], row = rowByKey[node._key];
    if (open) expanded.add(node._key); else expanded.delete(node._key);
    if (li) li.setAttribute("aria-expanded", open ? "true" : "false");
    if (row) row.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function toggle(node, deep) {
    var open = !expanded.has(node._key);
    if (deep) {
      walkBranch(node, function (n) { if (!n._isLeaf) setExpanded(n, open); });
    } else {
      setExpanded(node, open);
    }
    armAutoCollapse();
  }

  function walkBranch(node, fn) {
    fn(node);
    (node.children || []).forEach(function (c) { walkBranch(c, fn); });
  }

  function expandAll() {
    (moduleNode.children || []).forEach(function (c) {
      walkBranch(c, function (n) { if (!n._isLeaf) setExpanded(n, true); });
    });
    armAutoCollapse();
  }

  function collapseAll() {
    (moduleNode.children || []).forEach(function (c) {
      walkBranch(c, function (n) { if (!n._isLeaf) setExpanded(n, false); });
    });
    clearAutoCollapse();
    var f = firstVisibleKey();
    if (f) setFocusKey(f);
  }

  /* ═════════ الطي التلقائي ═════════
     الشجرة تبدأ مطويّة دائماً. أي فرع تفتحه بنفسك ينطوي وحده بعد AUTO_COLLAPSE_MS،
     وعند الانتقال إلى شاشة أخرى ينطوي كل شيء عدا مسار الشاشة المفتوحة. */

  function clearAutoCollapse() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }

  /* يُسلَّح من تفاعل المستخدم وحده — لا من البحث ولا من بناء الشجرة */
  function armAutoCollapse() {
    clearAutoCollapse();
    if (searchActive || !AUTO_COLLAPSE_MS) return;
    autoTimer = setTimeout(function () {
      autoTimer = null;
      /* لا تسحب الشجرة من تحت المؤشر — أجّل ما دام الفأر داخل اللوحة */
      if (hovering) { armAutoCollapse(); return; }
      collapseAll();
    }, AUTO_COLLAPSE_MS);
  }

  /* اطوِ كل شيء دون نقل التركيز — تمهيداً لإعادة كشف مسار واحد */
  function collapseSilently() {
    if (!moduleNode) return;
    (moduleNode.children || []).forEach(function (c) {
      walkBranch(c, function (n) { if (!n._isLeaf) setExpanded(n, false); });
    });
  }

  /* افتح أسلاف عقدة معيّنة — ويُطوى كل ما عداها */
  function revealPath(node) {
    clearAutoCollapse();
    if (!searchActive) collapseSilently();
    IDX.ancestors(node).forEach(function (a) {
      if (a._level >= 2) setExpanded(a, true);
    });
    armAutoCollapse();
  }

  /* ═════════ التحديد ═════════ */

  function select(node, opts) {
    opts = opts || {};
    if (selectedKey && rowByKey[selectedKey]) {
      rowByKey[selectedKey].removeAttribute("aria-selected");
    }
    selectedKey = node ? node._key : null;
    var row = selectedKey && rowByKey[selectedKey];
    if (row) {
      row.setAttribute("aria-selected", "true");
      setFocusKey(selectedKey, opts.focus);
      if (opts.scroll !== false) scrollIntoView(row);
    }
  }

  function scrollIntoView(row) {
    if (!container || !row || typeof row.scrollIntoView !== "function") return;
    var cr = container.getBoundingClientRect();
    var rr = row.getBoundingClientRect();
    if (rr.top < cr.top + 8 || rr.bottom > cr.bottom - 8) {
      try { row.scrollIntoView({ block: "center", behavior: "smooth" }); }
      catch (e) { try { row.scrollIntoView(); } catch (e2) {} }
    }
  }

  /* ═════════ تنقّل لوحة المفاتيح (RTL) ═════════ */

  function visibleRows() {
    if (!listEl) return [];
    return Array.prototype.filter.call(
      listEl.querySelectorAll(".node"),
      function (r) {
        var li = r.parentElement;
        if (li.hasAttribute("hidden")) return false;
        var p = li.parentElement;
        while (p && p !== listEl) {
          if (p.tagName === "LI") {
            if (p.hasAttribute("hidden")) return false;
            if (p.getAttribute("aria-expanded") === "false") return false;
          }
          p = p.parentElement;
        }
        return true;
      }
    );
  }

  function firstVisibleKey() {
    var rows = visibleRows();
    return rows.length ? rows[0].dataset.key : null;
  }

  function setFocusKey(key, doFocus) {
    if (currentFocusKey && rowByKey[currentFocusKey]) rowByKey[currentFocusKey].setAttribute("tabindex", "-1");
    currentFocusKey = key;
    var row = key && rowByKey[key];
    if (row) {
      row.setAttribute("tabindex", "0");
      if (doFocus) row.focus();
    }
  }

  function nodeOf(key) { return IDX.byPath[key]; }

  function onKeyDown(e) {
    var rows = visibleRows();
    if (!rows.length) return;
    var idx = rows.findIndex(function (r) { return r.dataset.key === currentFocusKey; });
    if (idx === -1) idx = 0;
    var row = rows[idx];
    var node = nodeOf(row.dataset.key);
    var handled = true;

    switch (e.key) {
      case "ArrowDown":
        move(rows, Math.min(idx + 1, rows.length - 1));
        break;
      case "ArrowUp":
        move(rows, Math.max(idx - 1, 0));
        break;
      /* RTL: اليسار = دخول/فتح  |  اليمين = طي/خروج */
      case "ArrowLeft":
        if (!node._isLeaf && !expanded.has(node._key)) { setExpanded(node, true); armAutoCollapse(); }
        else if (!node._isLeaf) { move(rows, Math.min(idx + 1, rows.length - 1)); }
        break;
      case "ArrowRight":
        if (!node._isLeaf && expanded.has(node._key)) { setExpanded(node, false); clearAutoCollapse(); }
        else if (node._parent && node._parent._level >= 2) {
          var pKey = node._parent._key;
          var pIdx = rows.findIndex(function (r) { return r.dataset.key === pKey; });
          if (pIdx >= 0) move(rows, pIdx);
        }
        break;
      case "Home": move(rows, 0); break;
      case "End":  move(rows, rows.length - 1); break;
      case "Enter":
      case " ":
        if (node._isLeaf) root.OnyxApp.open(node);
        else { toggle(node); select(node); }
        break;
      case "*":
        (moduleNode.children || []).forEach(function (c) { if (!c._isLeaf) setExpanded(c, true); });
        armAutoCollapse();
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typeAhead(e.key, rows, idx);
        else handled = false;
    }
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  }

  function move(rows, i) {
    var r = rows[i];
    if (!r) return;
    setFocusKey(r.dataset.key, true);
    scrollIntoView(r);
    root.OnyxUI.status(nodeOf(r.dataset.key).label);
  }

  function typeAhead(ch, rows, from) {
    clearTimeout(typeTimer);
    typeBuffer += ch;
    typeTimer = setTimeout(function () { typeBuffer = ""; }, 650);
    var q = U.normalizeArabic(typeBuffer);
    for (var i = 1; i <= rows.length; i++) {
      var r = rows[(from + i) % rows.length];
      var n = nodeOf(r.dataset.key);
      if (U.normalizeArabic(n.label).indexOf(q) === 0) {
        move(rows, (from + i) % rows.length);
        return;
      }
    }
  }

  /* ═════════ البحث داخل الشجرة ═════════ */

  function search(query) {
    var q = (query || "").trim();

    if (!q) {
      clearAutoCollapse();
      if (searchActive) {
        /* بعد البحث تعود الشجرة مطويّة — لا نستعيد ما كان مفتوحاً قبله */
        preSearchExpanded = null;
        expanded = new Set();
        applyExpandedToDom();
      }
      searchActive = false;
      Object.keys(liByKey).forEach(function (k) { liByKey[k].removeAttribute("hidden"); });
      Object.keys(rowByKey).forEach(function (k) {
        var lbl = rowByKey[k].querySelector(".node__label");
        if (lbl) lbl.textContent = IDX.byPath[k].label;
      });
      return 0;
    }

    if (!searchActive) { preSearchExpanded = Array.from(expanded); searchActive = true; }

    var nq = U.normalizeArabic(q);
    var matches = 0;
    var keep = Object.create(null);

    /* اعثر على المطابقات وعلّم أسلافها */
    Object.keys(rowByKey).forEach(function (k) {
      var n = IDX.byPath[k];
      var hit = U.normalizeArabic(n.label).indexOf(nq) !== -1 ||
                (n.labelEn && U.normalizeArabic(n.labelEn).indexOf(nq) !== -1) ||
                (n.code && n.code.indexOf(q.trim()) !== -1) ||
                (n.ref && n.ref.indexOf(q.trim()) !== -1);
      if (hit) {
        matches++;
        keep[k] = "hit";
        IDX.ancestors(n).forEach(function (a) { if (!keep[a._key]) keep[a._key] = "anc"; });
        /* أظهر الذرّية المباشرة للمطابقة */
        (n.children || []).forEach(function (c) { if (!keep[c._key]) keep[c._key] = "desc"; });
      }
    });

    Object.keys(liByKey).forEach(function (k) {
      var li = liByKey[k];
      if (keep[k]) {
        li.removeAttribute("hidden");
        var n = IDX.byPath[k];
        if (!n._isLeaf && keep[k] !== "desc") setExpanded(n, true);
        var lbl = rowByKey[k].querySelector(".node__label");
        if (lbl) lbl.innerHTML = keep[k] === "hit" ? U.highlight(n.label, q) : U.escapeHtml(n.label);
      } else {
        li.setAttribute("hidden", "");
      }
    });

    var f = firstVisibleKey();
    if (f) setFocusKey(f);
    return matches;
  }

  function applyExpandedToDom() {
    Object.keys(liByKey).forEach(function (k) {
      var n = IDX.byPath[k];
      if (n._isLeaf) return;
      var open = expanded.has(k);
      liByKey[k].setAttribute("aria-expanded", open ? "true" : "false");
      rowByKey[k].setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ═════════ تحديث النجوم بعد تغيّر المفضلة ═════════ */
  function refreshStars() {
    Object.keys(rowByKey).forEach(function (k) {
      var star = rowByKey[k].querySelector(".node__star");
      if (!star) return;
      var fav = S.isFavorite(k);
      star.setAttribute("aria-pressed", fav ? "true" : "false");
      star.innerHTML = I.svg(fav ? "starFill" : "star", { size: 15 });
    });
  }

  root.OnyxTree = {
    mount: mount,
    select: select,
    revealPath: revealPath,
    expandAll: expandAll,
    collapseAll: collapseAll,
    search: search,
    refreshStars: refreshStars,
    get moduleNode() { return moduleNode; }
  };
})(window);
