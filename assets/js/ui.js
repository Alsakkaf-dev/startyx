/* ============================================================================
   ONYX ERP — عناصر واجهة مشتركة: الإشعارات، التلميحات، القوائم، شريط الحالة
   ========================================================================== */
(function (root) {
  "use strict";

  var I = root.OnyxIcons;
  var U = root.OnyxUtil;

  /* ═════════ الإشعارات العائمة ═════════ */
  var stack;
  function toastHost() {
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toasts";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(msg, opts) {
    opts = opts || {};
    var host = toastHost();
    while (host.children.length >= 3) host.removeChild(host.firstElementChild);

    var icon = opts.icon || (opts.kind === "ok" ? "check" : opts.kind === "warn" ? "info" : "info");
    var node = U.el(
      '<div class="toast' + (opts.kind ? " toast--" + opts.kind : "") + '" role="status">' +
        I.svg(icon, { size: 18, cls: "icon" }) +
        '<div class="toast__text">' + U.escapeHtml(msg) + "</div>" +
      "</div>"
    );

    if (opts.action) {
      var b = U.el('<button class="toast__action">' + U.escapeHtml(opts.action.label) + "</button>");
      b.addEventListener("click", function () { opts.action.run(); dismiss(); });
      node.appendChild(b);
    }

    host.appendChild(node);
    var timer = setTimeout(dismiss, opts.duration || 3200);
    node.addEventListener("mouseenter", function () { clearTimeout(timer); });
    node.addEventListener("mouseleave", function () { timer = setTimeout(dismiss, 1400); });

    function dismiss() {
      clearTimeout(timer);
      if (!node.parentNode) return;
      node.setAttribute("data-leaving", "1");
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 200);
    }
    return dismiss;
  }

  /* ═════════ التلميحات ═════════ */
  var tipEl = null, tipTimer = null;

  function showTip(target, text, placement) {
    hideTip();
    tipTimer = setTimeout(function () {
      tipEl = U.el('<div class="tooltip" role="tooltip">' + U.escapeHtml(text) + "</div>");
      document.body.appendChild(tipEl);
      var r = target.getBoundingClientRect();
      var t = tipEl.getBoundingClientRect();
      var top, left;
      if (placement === "inline-start") {
        top = r.top + (r.height - t.height) / 2;
        left = r.left - t.width - 10;                 /* RTL: inline-start = يسار */
        if (left < 8) left = r.right + 10;
      } else {
        top = r.bottom + 8;
        left = r.left + (r.width - t.width) / 2;
      }
      left = U.clamp(left, 8, window.innerWidth - t.width - 8);
      top = U.clamp(top, 8, window.innerHeight - t.height - 8);
      tipEl.style.top = top + "px";
      tipEl.style.left = left + "px";
    }, 260);
  }
  function hideTip() {
    clearTimeout(tipTimer);
    if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
    tipEl = null;
  }

  /* ربط تلميح بعنصر */
  function tip(elm, text, placement) {
    elm.addEventListener("mouseenter", function () { showTip(elm, text, placement); });
    elm.addEventListener("mouseleave", hideTip);
    elm.addEventListener("focus", function () { showTip(elm, text, placement); });
    elm.addEventListener("blur", hideTip);
    elm.addEventListener("click", hideTip);
  }

  /* ═════════ القوائم المنسدلة ═════════ */
  var openMenu = null;

  function menu(anchor, items, opts) {
    closeMenu();
    opts = opts || {};
    var m = U.el('<div class="menu" role="menu"></div>');

    items.forEach(function (it) {
      if (it === "-") { m.appendChild(U.el('<hr class="menu__sep">')); return; }
      if (it.head) { m.appendChild(U.el('<div class="menu__head">' + U.escapeHtml(it.head) + "</div>")); return; }
      var b = U.el(
        '<button class="menu__item" role="menuitem"' +
        (it.checked != null ? ' aria-checked="' + (it.checked ? "true" : "false") + '" role="menuitemradio"' : "") +
        ">" +
          (it.icon ? I.svg(it.icon, { size: 17, cls: "icon" }) : '<span style="width:17px"></span>') +
          "<span>" + U.escapeHtml(it.label) + "</span>" +
          '<span class="spacer"></span>' +
          (it.hint ? '<span class="kbd">' + U.escapeHtml(it.hint) + "</span>" : "") +
          (it.checked ? I.svg("check", { size: 15, cls: "icon" }) : "") +
        "</button>"
      );
      if (it.disabled) { b.setAttribute("aria-disabled", "true"); b.style.opacity = ".5"; }
      else b.addEventListener("click", function () { closeMenu(); it.run && it.run(); });
      m.appendChild(b);
    });

    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    var mr = m.getBoundingClientRect();
    var left = opts.alignStart ? r.right - mr.width : r.left;
    left = U.clamp(left, 8, window.innerWidth - mr.width - 8);
    var top = r.bottom + 6;
    if (top + mr.height > window.innerHeight - 8) top = Math.max(8, r.top - mr.height - 6);
    m.style.top = top + "px";
    m.style.left = left + "px";

    openMenu = m;
    setTimeout(function () {
      document.addEventListener("mousedown", outside, true);
      document.addEventListener("keydown", esc, true);
    }, 0);

    var first = m.querySelector(".menu__item");
    if (first) first.focus();

    function outside(e) { if (!m.contains(e.target)) closeMenu(); }
    function esc(e) {
      if (e.key === "Escape") { closeMenu(); anchor.focus(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var all = Array.prototype.slice.call(m.querySelectorAll(".menu__item:not([aria-disabled])"));
        var i = all.indexOf(document.activeElement);
        var n = e.key === "ArrowDown" ? i + 1 : i - 1;
        if (n < 0) n = all.length - 1;
        if (n >= all.length) n = 0;
        all[n] && all[n].focus();
      }
    }
    m._cleanup = function () {
      document.removeEventListener("mousedown", outside, true);
      document.removeEventListener("keydown", esc, true);
    };
    return m;
  }

  function closeMenu() {
    if (openMenu) {
      openMenu._cleanup && openMenu._cleanup();
      if (openMenu.parentNode) openMenu.parentNode.removeChild(openMenu);
      openMenu = null;
    }
  }

  /* ═════════ شريط الحالة ═════════ */
  function status(text) {
    var el = document.getElementById("statusText");
    if (el) el.textContent = text || "جاهز";
  }

  /* ═════════ نسخ إلى الحافظة ═════════ */
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        function () { toast("تم نسخ الرابط", { kind: "ok", icon: "check" }); },
        function () { fallback(); }
      );
    }
    fallback();
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast("تم نسخ الرابط", { kind: "ok", icon: "check" }); }
      catch (e) { toast("تعذّر النسخ", { kind: "warn" }); }
      document.body.removeChild(ta);
    }
  }

  root.OnyxUI = {
    toast: toast, tip: tip, hideTip: hideTip,
    menu: menu, closeMenu: closeMenu,
    status: status, copy: copy
  };
})(window);
