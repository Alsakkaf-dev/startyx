/* ============================================================================
   ONYX ERP — عرض «عقد الشاشة» داخل البرنامج
   ----------------------------------------------------------------------------
   يحوّل طبقة المواصفات إلى واجهة تُقرأ أثناء البرمجة:
     الدور · حقول الرأس والسطور · القيد الناتج · قواعد التحقق · الترابط
   ========================================================================== */

(function (root) {
  "use strict";

  var SIDE_AR = { debit: "مدين", credit: "دائن", both: "حسب الحالة" };

  function esc(s) { return root.OnyxUtil.escapeHtml(s); }

  /* ابحث عن مواصفة شاشة بأي من التصنيفات الثلاثة */
  function specFor(ref) {
    var S = root.ONYX_SPEC;
    if (!S || !ref) return null;
    var pick = function (arr) {
      return (arr || []).filter(function (d) { return d.ref === ref; })[0];
    };
    var doc = pick(S.documents);
    if (doc) return { kind: "doc", doc: doc };
    var np = pick(S.nonPosting);
    if (np) return { kind: "nonPosting", doc: np };
    var pd = pick(S.pendingSpec);
    if (pd) return { kind: "pending", doc: pd };
    return null;
  }

  /* الكيان الذي تديره هذه الشاشة (لشاشات البيانات الأساسية) */
  function entityFor(ref) {
    var S = root.ONYX_SPEC;
    if (!S || !ref) return null;
    var keys = Object.keys(S.entities || {});
    for (var i = 0; i < keys.length; i++) {
      var e = S.entities[keys[i]];
      if (e.screen === ref) return e;
      if ((e.screens || []).indexOf(ref) !== -1) return e;
    }
    return null;
  }

  /* ═════════ العرض ═════════ */
  function render(h, ref, deps) {
    var U = root.OnyxUtil, I = root.OnyxIcons, IDX = root.OnyxIndex;
    var detailRows = deps.detailRows, open = deps.open;
    var S = root.ONYX_SPEC;
    var sp = specFor(ref);
    var ent = entityFor(ref);
    if (!sp && !ent) return false;

    /* ── كيان بيانات أساسية ── */
    if (!sp && ent) {
      h.appendChild(U.el('<div class="section-head">' + I.svg("file", { size: 18, cls: "icon" }) +
        "<h2>عقد الشاشة</h2><span class=\"spacer\"></span>" +
        '<span class="pill pill--muted">' + esc(ent.kind === "master" ? "بيانات أساسية"
          : ent.kind === "config" ? "تهيئة" : ent.kind) + "</span></div>"));
      h.appendChild(detailRows([
        ["الكيان", ent.label],
        ["الدور", ent.note],
        ["المفتاح", Array.isArray(ent.key) ? ent.key.join(" + ") : ent.key],
        ["طبقة البناء", ent.layer != null ? U.formatNum(ent.layer, true) + " — " +
          ((S.layers || []).filter(function (l) { return l.n === ent.layer; })[0] || {}).label : null]
      ]) || U.el("<div></div>"));
      renderFields(h, ent, U, I, IDX, open);
      renderRules(h, ent.rules, "قواعد الكيان", U, I);
      return true;
    }

    /* ── وثيقة إجرائية ── */
    if (sp.kind === "nonPosting") {
      h.appendChild(U.el('<div class="section-head">' + I.svg("info", { size: 18, cls: "icon" }) +
        "<h2>عقد الشاشة</h2><span class=\"spacer\"></span>" +
        '<span class="pill pill--muted">إجرائية — لا تُرحَّل</span></div>'));
      var becomesNode = sp.doc.becomes ? IDX.resolve(String(sp.doc.becomes).split(" ")[0]) : null;
      h.appendChild(detailRows([
        ["الأثر المحاسبي", "لا يوجد — لا تُنتج قيداً"],
        ["لماذا", sp.doc.why],
        ["تتحوّل إلى", becomesNode ? becomesNode.label + "  [" + sp.doc.becomes + "]" : (sp.doc.becomes || "—")]
      ]) || U.el("<div></div>"));
      if (becomesNode) {
        var gb = U.el('<button type="button" class="btn btn--outline" style="margin-block-start:var(--space-4)">' +
          I.svg("arrowRight", { size: 15, cls: "icon-sm" }) +
          "<span>افتح الوثيقة التي تُرحَّل: " + esc(becomesNode.label) + "</span></button>");
        gb.addEventListener("click", function () { open(becomesNode); });
        h.appendChild(gb);
      }
      return true;
    }

    /* ── مواصفة لم تُكتب ── */
    if (sp.kind === "pending") {
      h.appendChild(U.el(
        '<div class="whybox" style="margin-block-start:var(--space-5)">' +
        '<div class="whybox__head">' + I.svg("clock", { size: 17, cls: "icon" }) +
        "<b>مواصفة هذه الوثيقة لم تُكتب بعد</b></div>" +
        "<p>هذه الشاشة تُرحَّل محاسبياً، لكن قاعدة ترحيلها غير موثَّقة. " +
        "لا تبرمجها قبل كتابة قاعدتها في <b>assets/js/spec-docs.js</b> — " +
        "وإلا ستخمّن الحسابات وتتورّط.</p></div>"));
      return true;
    }

    /* ── وثيقة كاملة ── */
    var d = sp.doc;
    h.appendChild(U.el('<div class="section-head">' + I.svg("layers", { size: 18, cls: "icon" }) +
      "<h2>عقد الشاشة</h2><span class=\"spacer\"></span>" +
      (d.keyDoc ? '<span class="pill pill--brand">وثيقة محورية</span>' : "") +
      '<span class="pill pill--ready">' + esc(d.family) + "</span></div>"));

    h.appendChild(detailRows([
      ["الدور", d.role],
      ["طبقة البناء", d.layer != null ? U.formatNum(d.layer, true) + " — " +
        ((S.layers || []).filter(function (l) { return l.n === d.layer; })[0] || {}).label : null],
      ["حقول الرأس", (d.header || []).join("  ·  ")],
      ["حقول السطور", (d.lines || []).join("  ·  ")]
    ]) || U.el("<div></div>"));

    /* القيد */
    if (d.posting && d.posting.legs) {
      h.appendChild(U.el('<div class="section-head">' + I.svg("book", { size: 18, cls: "icon" }) +
        "<h2>القيد الذي تُنتجه</h2></div>"));
      var legs = U.el('<div class="legs"></div>');
      d.posting.legs.forEach(function (l) {
        var a = l.account || {};
        var accTxt = a.fixed ? "حساب ثابت " + a.fixed
                   : a.map   ? "جدول الربط ← " + a.map
                   : "البيانات ← " + a.from;
        legs.appendChild(U.el(
          '<div class="leg leg--' + esc(l.side) + '">' +
            '<span class="leg__side">' + esc(SIDE_AR[l.side] || l.side) + "</span>" +
            '<span class="leg__acc">' + esc(accTxt) + "</span>" +
            '<span class="leg__amt">' + esc(l.amount || "") + "</span>" +
            (l.when ? '<span class="leg__when">' + esc(l.when) + "</span>" : "") +
            (l.note ? '<span class="leg__note">' + esc(l.note) + "</span>" : "") +
          "</div>"));
      });
      h.appendChild(legs);

      h.appendChild(U.el('<div class="screen__note">' + I.svg("check", { size: 15, cls: "icon" }) +
        "<span>مجموع المدين = مجموع الدائن — الثابت INV-1 يفرضه على كل قيد.</span></div>"));

      if (d.posting.note)
        h.appendChild(U.el('<div class="screen__note">' + I.svg("info", { size: 15, cls: "icon" }) +
          "<span>" + esc(d.posting.note) + "</span></div>"));

      if (d.posting.pendingDecision) {
        var pd = d.posting.pendingDecision;
        var box = U.el(
          '<div class="whybox" style="margin-block-start:var(--space-4)">' +
          '<div class="whybox__head">' + I.svg("info", { size: 17, cls: "icon" }) +
          "<b>قرار معلّق يحجب البرمجة</b></div>" +
          "<p><b>" + esc(pd.question) + "</b></p>" +
          '<p style="margin-block-start:var(--space-2)">' + esc(pd.why) + "</p>" +
          (pd.note ? '<p style="margin-block-start:var(--space-2)">' + esc(pd.note) + "</p>" : "") +
          '<div class="whybox__accs"></div></div>');
        var bn = pd.blockedBy ? IDX.resolve(pd.blockedBy) : null;
        if (bn) {
          var bb = U.el('<button type="button" class="btn btn--outline">' +
            I.svg("settings", { size: 15, cls: "icon-sm" }) +
            "<span>افتح البند المعلّق: " + esc(bn.label) + "</span></button>");
          bb.addEventListener("click", function () { open(bn); });
          box.querySelector(".whybox__accs").appendChild(bb);
        }
        h.appendChild(box);
      }
    }

    renderRules(h, d.validations, "قواعد التحقق قبل الترحيل", U, I);

    /* الترابط */
    var deps2 = d.dependsOn || [], feeds = d.feeds || [];
    if (deps2.length || feeds.length) {
      h.appendChild(U.el('<div class="section-head">' + I.svg("diagram", { size: 18, cls: "icon" }) +
        "<h2>الترابط</h2></div>"));
      var box2 = U.el('<div class="linkbox"></div>');
      if (deps2.length) box2.appendChild(chipRow("تعتمد على", deps2, U, I, IDX, open, S));
      if (feeds.length)  box2.appendChild(chipRow("تكتب في", feeds, U, I, IDX, null, S));
      h.appendChild(box2);
    }
    return true;
  }

  function chipRow(label, list, U, I, IDX, open, S) {
    var row = U.el('<div class="linkbox__row"><div class="linkbox__lbl">' + esc(label) +
      '</div><div class="linkbox__val chips"></div></div>');
    var box = row.querySelector(".chips");
    list.forEach(function (k) {
      var ent = (S.entities || {})[k];
      var lbl = ent ? ent.label : k;
      var target = ent && ent.screen ? IDX.resolve(ent.screen) : IDX.resolve(k);
      if (open && target) {
        var b = U.el('<button type="button" class="accchip"><span>' + esc(lbl) + "</span></button>");
        b.addEventListener("click", function () { open(target); });
        box.appendChild(b);
      } else {
        box.appendChild(U.el('<span class="accchip"><span>' + esc(lbl) + "</span></span>"));
      }
    });
    return row;
  }

  function renderRules(h, rules, title, U, I) {
    if (!rules || !rules.length) return;
    h.appendChild(U.el('<div class="section-head">' + I.svg("check", { size: 18, cls: "icon" }) +
      "<h2>" + esc(title) + "</h2></div>"));
    var list = U.el('<div class="ruleslist"></div>');
    rules.forEach(function (v) {
      var hard = String(v).indexOf("⛔") === 0;
      list.appendChild(U.el('<div class="rule' + (hard ? " rule--hard" : "") + '">' +
        I.svg(hard ? "info" : "check", { size: 14, cls: "icon-sm" }) +
        "<span>" + esc(String(v).replace(/^⛔\s*/, "")) + "</span></div>"));
    });
    h.appendChild(list);
  }

  function renderFields(h, ent, U, I, IDX, open) {
    if (!ent.fields || !ent.fields.length) return;
    h.appendChild(U.el('<div class="section-head">' + I.svg("list", { size: 18, cls: "icon" }) +
      "<h2>الحقول</h2><span class=\"spacer\"></span>" +
      '<span class="count">' + U.formatNum(ent.fields.length, true) + "</span></div>"));
    var t = U.el('<div class="fieldlist"></div>');
    ent.fields.forEach(function (f) {
      t.appendChild(U.el(
        '<div class="fieldrow">' +
          '<span class="fieldrow__name">' + esc(f.name) + "</span>" +
          '<span class="fieldrow__type">' + esc(f.type) + (f.to ? " → " + esc(f.to) : "") + "</span>" +
          '<span class="fieldrow__flags">' +
            (f.req ? '<span class="pill pill--wip">إلزامي</span>' : "") +
            (f.unique ? '<span class="pill pill--muted">فريد</span>' : "") +
            (f.calc ? '<span class="pill pill--brand">محسوب</span>' : "") +
            (f.pending ? '<span class="pill pill--pending">قيد التحقق</span>' : "") +
          "</span>" +
          (f.note ? '<span class="fieldrow__note">' + esc(f.note) + "</span>" : "") +
        "</div>"));
    });
    h.appendChild(t);
  }

  root.OnyxSpecView = { render: render, specFor: specFor, entityFor: entityFor };
})(window);
