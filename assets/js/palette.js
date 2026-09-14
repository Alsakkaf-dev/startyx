/* ============================================================================
   ONYX ERP — لوحة الأوامر (Ctrl+K): قفز سريع لأي شاشة في أي نظام
   ========================================================================== */
(function (root) {
  "use strict";

  var I = root.OnyxIcons, U = root.OnyxUtil, S = root.OnyxStore, IDX = root.OnyxIndex;

  var scrim = null, input = null, body = null, footCount = null;
  var results = [], active = 0, lastFocus = null;

  /* نطاق البحث — كل صفحة تبحث في محتواها وحده كي لا تختلط الشجرات.
     index.html: الأنظمة التشغيلية · settings.html: الدليل والإعدادات */
  var scopeFn = null, scopeHint = null;
  function inScope(n) { return !scopeFn || scopeFn(n); }
  function pool() { return scopeFn ? IDX.screens.filter(inScope) : IDX.screens; }

  function isOpen() { return !!scrim; }

  function open(prefill) {
    if (isOpen()) return;
    lastFocus = document.activeElement;

    scrim = U.el('<div class="palette-scrim"></div>');
    var box = U.el(
      '<div class="palette" role="dialog" aria-modal="true" aria-label="لوحة الأوامر">' +
        '<div class="palette__head">' + I.svg("search", { size: 20, cls: "icon" }) +
          '<input type="text" autocomplete="off" spellcheck="false" ' +
          'placeholder="اكتب اسم شاشة أو نظام…" aria-label="بحث" aria-controls="paletteList">' +
          '<span class="kbd">Esc</span>' +
        "</div>" +
        '<div class="palette__body" id="paletteList" role="listbox"></div>' +
        '<div class="palette__foot">' +
          '<span><span class="kbd">↑</span><span class="kbd">↓</span> للتنقل</span>' +
          '<span><span class="kbd">↵</span> للفتح</span>' +
          '<span><span class="kbd">Esc</span> للإغلاق</span>' +
          '<span style="margin-inline-start:auto" data-count></span>' +
        "</div>" +
      "</div>"
    );
    scrim.appendChild(box);
    document.body.appendChild(scrim);

    input = box.querySelector("input");
    body = box.querySelector(".palette__body");
    footCount = box.querySelector("[data-count]");

    if (prefill) input.value = prefill;
    render(input.value);
    input.focus();
    input.select();

    input.addEventListener("input", function () { render(input.value); });
    scrim.addEventListener("mousedown", function (e) { if (e.target === scrim) close(); });
    document.addEventListener("keydown", onKey, true);
  }

  function close() {
    if (!scrim) return;
    document.removeEventListener("keydown", onKey, true);
    if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
    scrim = input = body = footCount = null;
    results = []; active = 0;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (!isOpen()) return;
    switch (e.key) {
      case "Escape":
        e.preventDefault(); e.stopPropagation();
        if (input.value) { input.value = ""; render(""); }
        else close();
        break;
      case "ArrowDown": e.preventDefault(); e.stopPropagation(); move(1); break;
      case "ArrowUp":   e.preventDefault(); e.stopPropagation(); move(-1); break;
      case "Home":      if (results.length) { e.preventDefault(); setActive(0); } break;
      case "End":       if (results.length) { e.preventDefault(); setActive(results.length - 1); } break;
      case "PageDown":  e.preventDefault(); move(6); break;
      case "PageUp":    e.preventDefault(); move(-6); break;
      case "Enter":
        e.preventDefault(); e.stopPropagation();
        if (results[active]) { var n = results[active]; close(); root.OnyxApp.open(n); }
        break;
    }
  }

  function move(d) {
    if (!results.length) return;
    var i = active + d;
    if (i < 0) i = results.length - 1;
    if (i >= results.length) i = 0;
    setActive(i);
  }

  function setActive(i) {
    active = i;
    var rows = body.querySelectorAll(".palette__item");
    Array.prototype.forEach.call(rows, function (r, k) {
      if (k === i) {
        r.setAttribute("data-active", "1");
        r.setAttribute("aria-selected", "true");
        if (typeof r.scrollIntoView === "function") {
          var rb = r.getBoundingClientRect(), bb = body.getBoundingClientRect();
          if (rb.top < bb.top + 28 || rb.bottom > bb.bottom - 4) {
            try { r.scrollIntoView({ block: "center" }); } catch (e) {}
          }
        }
      } else {
        r.removeAttribute("data-active");
        r.setAttribute("aria-selected", "false");
      }
    });
  }

  /* ═════════ العرض ═════════ */
  function render(q) {
    q = (q || "").trim();
    body.innerHTML = "";
    active = 0;

    if (!q) { renderDefault(); return; }

    var scored = [];
    pool().forEach(function (n) {
      var s = U.fuzzyScore(q, n.label);
      if (s < 0 && n.labelEn) s = U.fuzzyScore(q, n.labelEn) - 10;
      if (s < 0) {
        /* جرّب مطابقة اسم النظام + الشاشة معاً */
        var s2 = U.fuzzyScore(q, n._module.label + " " + n.label);
        if (s2 >= 0) s = s2 - 25;
      }
      if (s >= 0) {
        if (n._effStatus === "wip") s -= 8;
        scored.push({ n: n, s: s });
      }
    });

    scored.sort(function (a, b) { return b.s - a.s || a.n.label.length - b.n.label.length; });
    var top = scored.slice(0, 60);
    results = top.map(function (x) { return x.n; });

    if (!results.length) {
      body.appendChild(U.el(
        '<div class="empty"><div class="empty__icon">' + I.svg("search", { size: 22, cls: "icon" }) + "</div>" +
        "<h3>لا توجد نتائج</h3><p>لم نعثر على شاشة تطابق «" + U.escapeHtml(q) + "».</p></div>"
      ));
      footCount.textContent = "";
      return;
    }

    /* تجميع حسب النظام مع الحفاظ على الترتيب */
    var seen = Object.create(null), order = [], byMod = Object.create(null);
    results.forEach(function (n) {
      var mid = n._module._id;
      if (!seen[mid]) { seen[mid] = 1; order.push(n._module); byMod[mid] = []; }
      byMod[mid].push(n);
    });

    var flatIndex = 0;
    order.forEach(function (m) {
      body.appendChild(U.el(
        '<div class="palette__group" data-accent="' + U.escapeHtml(m.accent || "slate") + '">' +
        I.svg(m.icon || "grid", { size: 14, cls: "icon" }) + "<span>" + U.escapeHtml(m.label) + "</span></div>"
      ));
      byMod[m._id].forEach(function (n) {
        body.appendChild(itemRow(n, q, flatIndex++));
      });
    });

    /* أعد ترتيب results لتطابق ترتيب العرض */
    results = [];
    order.forEach(function (m) { byMod[m._id].forEach(function (n) { results.push(n); }); });

    footCount.textContent = U.plural(results.length, U.COUNT_WORDS.result);
    setActive(0);
  }

  function renderDefault() {
    var rec = S.getRecent(), favs = S.getFavorites();
    results = [];
    var i = 0;

    if (rec.length) {
      body.appendChild(U.el('<div class="palette__group">' + I.svg("clock", { size: 14, cls: "icon" }) +
        "<span>آخر ما فُتح</span></div>"));
      rec.slice(0, 6).forEach(function (r) {
        var n = IDX.byPath[r.path];
        if (!n || !inScope(n)) return;
        results.push(n);
        body.appendChild(itemRow(n, "", i++));
      });
    }

    if (favs.length) {
      body.appendChild(U.el('<div class="palette__group">' + I.svg("starFill", { size: 14, cls: "icon" }) +
        "<span>المفضلة</span></div>"));
      favs.slice().reverse().slice(0, 8).forEach(function (k) {
        var n = IDX.byPath[k];
        if (!n || !inScope(n)) return;
        results.push(n);
        body.appendChild(itemRow(n, "", i++));
      });
    }

    if (!results.length) {
      body.appendChild(U.el(
        '<div class="empty"><div class="empty__icon">' + I.svg("command", { size: 22, cls: "icon" }) + "</div>" +
        "<h3>ابحث في الشاشات</h3>" +
        "<p>" + U.escapeHtml(scopeHint || "اكتب أي جزء من اسم الشاشة") +
        " — البحث يتجاهل الهمزات والتشكيل.</p></div>"
      ));
      footCount.textContent = "";
      return;
    }

    footCount.textContent = "";
    setActive(0);
  }

  function itemRow(n, q, i) {
    var crumb = IDX.ancestors(n).map(function (a) { return a.label; }).join(" ‹ ");
    var row = U.el(
      '<button type="button" class="palette__item" role="option" aria-selected="false">' +
        I.svg(n._effStatus === "wip" ? "sliders" : "file", { size: 17, cls: "icon" }) +
        '<span class="palette__text"><b>' + (q ? U.highlight(n.label, q) : U.escapeHtml(n.label)) + "</b>" +
        "<small>" + U.escapeHtml(crumb) + "</small></span>" +
        (n._effStatus === "wip" ? '<span class="pill pill--wip">قيد الإعداد</span>' : "") +
        '<span class="palette__enter">↵</span>' +
      "</button>"
    );
    row.addEventListener("click", function () { close(); root.OnyxApp.open(n); });
    row.addEventListener("mousemove", function () { if (active !== i) setActive(i); });
    return row;
  }

  root.OnyxPalette = {
    open: open, close: close, isOpen: isOpen,
    setScope: function (fn, hint) { scopeFn = fn || null; scopeHint = hint || null; }
  };
})(window);
