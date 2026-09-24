/* ============================================================================
   شاشات المستندات الحيّة (الطبقة ٤) — رأس + سطور، تقرأ من /api/docs وتكتب عبر /api/documents/post وحده.
   نفس جسر masters-ui مع screen-ui: mount · command · handles. لا قيم أمثلة: الشاشة تبدأ بآخر مستند حقيقي،
   و«إضافة» تفرغها، و«إضافة من» تنسخ المعروض لمستند جديد برقم الخدمة ٢، والبحث والتنقل على مستندات الخادم.
   البند 39 — قيود اليومية op.4.1.3.14 [GO/04 §op.4.1.3.14 · GLST001]
   ========================================================================== */
(function (root) {
  "use strict";

  var MAP = {
    "op.4.1.3.14": {
      kind: "manual_journal",
      noun: "القيد",
      head: { no: "رقم القيد", branch: "الفرع", date: "التاريخ", type: "نوع القيد", ref: "رقم المرجع", desc: "البيان" },
      panel: "السطور",
      cols: [
        { t: "#", k: "line_no", ro: true },
        { t: "الحساب", k: "account_code", mono: true },
        { t: "اسم الحساب", k: "account_name", ro: true },
        { t: "التحليلي", k: "analytic_code", mono: true },
        { t: "اسم التحليلي", k: "analytic_name", ro: true },
        { t: "البيان", k: "description" },
        { t: "مدين", k: "debit", n: true },
        { t: "دائن", k: "credit", n: true },
        { t: "المركز", k: "cost_center", mono: true }
      ]
    }
  };

  var st = { ref: null, cfg: null, h: null, rows: [], idx: -1, doc: null, lines: [], q: "", summary: null, copyFrom: null };

  function api() { return root.StartyxApi; }
  function host() { return st.h && st.h.st && st.h.st.host; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function num(v) {
    var n = Number(String(v == null ? "" : v).replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  }
  function money(v) {
    return num(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function dmy(iso) {
    var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
  }
  function iso(v) {
    var s = String(v || "").trim();
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  }
  function today() {
    var d = new Date();
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  }
  function errText(e) {
    return (e && (e.message || e.error)) || "تعذّر الوصول للخادم";
  }

  /* ── الرأس ── */
  function box(label) {
    var h = host();
    return h ? h.querySelector('.fld[data-k="' + label + '"]') : null;
  }
  function input(label) {
    var b = box(label);
    return b ? b.querySelector("input, select") : null;
  }
  function setVal(label, v) {
    var i = input(label);
    if (!i) return;
    if (i.tagName === "SELECT") {
      var want = String(v == null ? "" : v);
      var hit = "";
      Array.prototype.forEach.call(i.options, function (o) { if (o.value === want || o.text.split(" ")[0] === want) hit = o.value; });
      i.value = hit;
    } else i.value = v == null ? "" : String(v);
  }
  function getVal(label) {
    var i = input(label);
    return i ? String(i.value || "").trim() : "";
  }
  /* خيارات «نوع القيد» من JV_TYPES عبر الخادم — لا قائمة ثابتة */
  function fillTypes() {
    var i = input(st.cfg.head.type);
    if (!i || i.tagName !== "SELECT" || !st.summary) return;
    i.innerHTML = '<option value=""></option>' + (st.summary.jvTypes || []).map(function (t) {
      return '<option value="' + esc(t.no) + '">' + esc(t.no + " " + t.name) + "</option>";
    }).join("");
  }

  /* ── السطور ── */
  function tableWrap() {
    var h = host();
    if (!h) return null;
    var found = null;
    Array.prototype.forEach.call(h.querySelectorAll(".scr__col .pnl"), function (p) {
      var t = p.querySelector("header h2");
      if (!found && t && t.textContent === st.cfg.panel) found = p;
    });
    return found && found.querySelector(".tblwrap");
  }
  function editing() { return st.h.st.mode !== "view"; }

  function renderLines() {
    var wrap = tableWrap();
    if (!wrap) return;
    var cols = st.cfg.cols;
    var dr = 0, cr = 0;
    st.lines.forEach(function (l) { dr += num(l.debit); cr += num(l.credit); });
    var head = "<thead><tr>" + cols.map(function (c) { return '<th class="' + (c.n ? "n" : "") + '">' + esc(c.t) + "</th>"; }).join("") + "</tr></thead>";
    var body = st.lines.length ? st.lines.map(function (l, i) {
      return '<tr data-i="' + i + '">' + cols.map(function (c) {
        var v = c.k === "line_no" ? i + 1 : l[c.k];
        if (c.n && !editing()) v = num(v) ? money(v) : "";
        if (editing() && !c.ro) {
          return '<td class="edit' + (c.n ? " n" : "") + '"><input class="cell' + (c.mono ? " num" : "") + '" data-k="' + c.k + '" value="' + esc(v == null ? "" : v) + '" aria-label="' + esc(c.t) + '"></td>';
        }
        return '<td class="' + (c.n ? "n" : "") + '">' + esc(v == null ? "" : v) + "</td>";
      }).join("") + "</tr>";
    }).join("") : '<tr><td colspan="' + cols.length + '">' + (editing() ? "أضف سطراً" : "لا سطور") + "</td></tr>";
    var diff = dr - cr;
    var foot = '<tfoot><tr><td colspan="' + (cols.length - 3) + '">الإجمالي' + (Math.abs(diff) > 0.004 ? ' · <b class="bad">الفرق ' + money(diff) + "</b>" : "") +
      '</td><td class="n">' + money(dr) + '</td><td class="n">' + money(cr) + "</td><td></td></tr></tfoot>";
    var tbl = wrap.querySelector("table");
    if (!tbl) { tbl = document.createElement("table"); tbl.className = "tbl--sheet"; wrap.appendChild(tbl); }
    tbl.innerHTML = head + "<tbody>" + body + "</tbody>" + foot;
    Array.prototype.forEach.call(tbl.querySelectorAll("input.cell"), function (inp) {
      inp.addEventListener("change", function () {
        var tr = inp.closest("tr");
        var i = Number(tr.getAttribute("data-i"));
        var k = inp.getAttribute("data-k");
        st.lines[i][k] = inp.value.trim();
        if (k === "debit" && num(inp.value)) st.lines[i].credit = "";
        if (k === "credit" && num(inp.value)) st.lines[i].debit = "";
        if (k === "account_code") lookupAccount(i);
        else renderLines();
      });
    });
    var footBar = wrap.parentNode && wrap.parentNode.querySelector(".docs-actions");
    if (!footBar && wrap.parentNode) {
      footBar = document.createElement("div");
      footBar.className = "tblfoot docs-actions";
      wrap.parentNode.appendChild(footBar);
    }
    if (footBar) {
      footBar.innerHTML = editing() ? '<button type="button" class="mini" data-a="add">+ سطر</button> <button type="button" class="mini" data-a="del">حذف آخر سطر</button>' : "";
      Array.prototype.forEach.call(footBar.querySelectorAll("button"), function (b) {
        b.addEventListener("click", function () {
          if (b.getAttribute("data-a") === "add") st.lines.push(blankLine());
          else if (st.lines.length) st.lines.pop();
          renderLines();
        });
      });
    }
    var hd = wrap.parentNode && wrap.parentNode.querySelector("header h2 + *");
    if (hd && hd.tagName !== "BUTTON") hd.textContent = st.lines.length + " سطر";
  }
  function blankLine() {
    return { account_code: "", account_name: "", analytic_code: "", analytic_name: "", description: "", debit: "", credit: "", cost_center: "" };
  }
  /* اسم الحساب من الدليل عبر الخادم — لا أسماء في الواجهة */
  function lookupAccount(i) {
    var code = st.lines[i] && st.lines[i].account_code;
    if (!code || !api()) { renderLines(); return; }
    api().masters("account/" + encodeURIComponent(code)).then(function (r) {
      st.lines[i].account_name = r && r.name_ar ? r.name_ar : "رقم الحساب غير صحيح";
      renderLines();
    }).catch(function () { st.lines[i].account_name = "رقم الحساب غير صحيح"; renderLines(); });
  }

  /* ── العرض ── */
  function paint(doc) {
    var H = st.cfg.head, hd = doc ? doc.header : null;
    setVal(H.no, hd ? hd.doc_no : "");
    setVal(H.branch, hd ? hd.branch_no : "");
    setVal(H.date, hd ? dmy(hd.doc_date) : "");
    setVal(H.type, hd ? hd.jv_type : "");
    setVal(H.ref, hd ? hd.ref_no : "");
    setVal(H.desc, hd ? hd.description : "");
    st.lines = doc ? doc.lines.map(function (l) { return Object.assign({}, l); }) : [];
    renderLines();
    var ver = (st.h.st.def.audit && st.h.st.def.audit.ver) || "V8.1.14";
    st.h.audit(hd ? {
      by: hd.created_by || "—", at: hd.created_at || "—", dev: "—", upd: hd.updated_by || "—",
      updc: hd.update_count == null ? 0 : hd.update_count, prints: "—", ver: ver
    } : { by: "—", at: "—", dev: "—", upd: "—", updc: 0, prints: "—", ver: ver });
    var d = st.h.st.def;
    if (!hd) d.state = { label: "لا مستند معروض", cls: "s-pending" };
    else if (hd.status === "pending") d.state = { label: "معلّق — غير متوازن", cls: "s-pending" };
    else if (hd.status === "posted_onyx") d.state = { label: "مرحّل", cls: "s-posted" };
    else d.state = { label: hd.source === "onyx" ? "غير مرحّل · أونيكس" : "محفوظ", cls: "s-draft" };
    st.h.state();
    st.h.applyMode();
  }
  function show(i) {
    st.idx = st.rows.length ? Math.min(st.rows.length - 1, Math.max(0, i)) : -1;
    st.h.rec(st.idx + 1, st.rows.length);
    var row = st.rows[st.idx];
    if (!row) { st.doc = null; paint(null); return Promise.resolve(); }
    return api().doc(st.ref, row.doc_key).then(function (doc) {
      st.doc = doc;
      paint(doc);
    }).catch(function (e) { st.h.note(errText(e)); });
  }
  function load(selectKey) {
    var q = "?limit=5000" + (st.q ? "&q=" + encodeURIComponent(st.q) : "");
    return api().docs(st.ref, q).then(function (j) {
      st.rows = j.rows || [];
      var i = st.rows.length - 1;
      if (selectKey) st.rows.forEach(function (r, k) { if (r.doc_key === selectKey) i = k; });
      return show(i).then(function () { return j; });
    }).catch(function (e) {
      st.rows = [];
      show(-1);
      st.h.note(errText(e) + " — الشاشة فاضية حتى يعمل الخادم");
    });
  }
  /* اللوحة الجانبية: أعداد حقيقية من الخادم بدل المثال */
  function paintSummary() {
    var s = st.summary, h = host();
    if (!s || !h) return;
    var t = h.querySelector(".totals");
    if (!t) return;
    var big = t.querySelector(".totals__big");
    if (big) big.innerHTML = "<small>قيود 2026</small><b>" + esc(Number(s.docs).toLocaleString("en-US")) + "</b><i>" + esc(Number(s.lines).toLocaleString("en-US")) + " سطراً</i>";
    var rows = t.querySelectorAll(".t");
    var vals = [["يومية", s.jv1], ["بنكية", s.jv11], ["مرحّل", s.posted_onyx], ["من startyx", s.live]];
    Array.prototype.forEach.call(rows, function (r, i) {
      if (vals[i]) r.innerHTML = "<span>" + esc(vals[i][0]) + "</span><b>" + esc(Number(vals[i][1]).toLocaleString("en-US")) + "</b>";
    });
  }

  /* ── الرقم التالي: بعد اختيار الفرع ونوع القيد (GL-R7) ── */
  function peekNo() {
    var br = getVal(st.cfg.head.branch), ty = getVal(st.cfg.head.type);
    if (!br || !ty || !editing()) { setVal(st.cfg.head.no, ""); return; }
    api().docNext(st.ref, "?branch=" + encodeURIComponent(br) + "&jvType=" + encodeURIComponent(ty)).then(function (j) {
      if (editing()) setVal(st.cfg.head.no, j.next);
    }).catch(function () { setVal(st.cfg.head.no, ""); });
  }
  function wireHead() {
    [st.cfg.head.branch, st.cfg.head.type].forEach(function (label) {
      var i = input(label);
      if (!i || i.getAttribute("data-docs") === "1") return;
      i.setAttribute("data-docs", "1");
      i.addEventListener("change", peekNo);
    });
  }
  function wireQuick() {
    var h = host();
    var inp = h && h.querySelector(".scr__quick input");
    if (!inp || inp.getAttribute("data-docs") === "1") return;
    inp.setAttribute("data-docs", "1");
    inp.placeholder = "بحث برقم " + st.cfg.noun + " أو البيان أو المرجع…";
    inp.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      st.q = inp.value.trim();
      load().then(function () { st.h.note(st.q ? "نتائج البحث: " + st.rows.length : "كل المستندات: " + st.rows.length); });
    }, true);
  }

  /* ── الحفظ: جسم الترحيل من الشاشة — لا قيمة افتراضية صامتة (الفرع والتاريخ والنوع إلزامية) ── */
  function body() {
    var H = st.cfg.head;
    return {
      docKind: st.cfg.kind,
      screenRef: st.ref,
      branchId: getVal(H.branch),
      docDate: iso(getVal(H.date)),
      jvType: getVal(H.type),
      refNo: getVal(H.ref),
      description: getVal(H.desc),
      currencyId: 1,
      fxRate: "1",
      lines: st.lines.filter(function (l) {
        return l.account_code || num(l.debit) || num(l.credit);
      }).map(function (l) {
        var dr = num(l.debit), cr = num(l.credit);
        return {
          accountCode: l.account_code,
          analyticId: l.analytic_code || null,
          side: dr > 0 ? "debit" : "credit",
          amount: String(dr > 0 ? dr : cr),
          description: l.description || "",
          costCenter: l.cost_center || null
        };
      })
    };
  }
  function save() {
    var b = body();
    if (!b.lines.length) { st.h.note("أدخل سطور " + st.cfg.noun + " أولاً"); return; }
    api().postDocument(b).then(function (r) {
      st.copyFrom = null;
      st.h.setMode("view");
      var key = r.liveDocumentId ? "live:" + r.liveDocumentId : null;
      return load(key).then(function () {
        st.h.note(r.status === "posted"
          ? "حُفظ ورُحِّل — " + st.cfg.head.no + " " + r.documentNumber
          : "حُفظ معلّقاً (غير متوازن بفرق " + r.imbalance + ") — لا قيد في الدفتر حتى يتوازن");
      });
    }).catch(function (e) { st.h.note(errText(e)); });
  }

  function command(id, h) {
    st.h = h;
    switch (id) {
      case "add":
        st.copyFrom = null;
        h.setMode("add");
        paint(null);
        st.lines = [blankLine(), blankLine()];
        setVal(st.cfg.head.date, today());
        renderLines();
        h.rec(0, st.rows.length);
        h.applyMode();
        h.note(st.cfg.noun + " جديد — اختر الفرع ونوع القيد ليظهر الرقم؛ التاريخ آلي قابل للتعديل (DATE_GEN_GL)");
        return true;
      case "addFrom": {
        /* T1 — نسخ المعروض لمستند جديد برقم جديد من الخدمة ٢، قابل للتعديل قبل الحفظ */
        if (!st.doc) { h.note("اعرض المستند المراد النسخ منه أولاً"); return true; }
        var src = st.doc;
        st.copyFrom = src.header.doc_key;
        h.setMode("add");
        paint(src);
        st.lines = src.lines.filter(function (l) { return !l.is_generated; }).map(function (l) {
          return { account_code: l.account_code, account_name: l.account_name, analytic_code: l.analytic_code || "",
            analytic_name: l.analytic_name || "", description: l.description || "", debit: num(l.debit) ? String(num(l.debit)) : "",
            credit: num(l.credit) ? String(num(l.credit)) : "", cost_center: l.cost_center || "" };
        });
        setVal(st.cfg.head.date, today());
        renderLines();
        st.h.audit({ by: "—", at: "—", dev: "—", upd: "—", updc: 0, prints: "—", ver: (st.h.st.def.audit && st.h.st.def.audit.ver) || "V8.1.14" });
        h.rec(0, st.rows.length);
        h.applyMode();
        peekNo();
        h.note("إضافة من " + st.cfg.noun + " " + src.header.doc_no + " — الرقم الجديد من التسلسل؛ عدّل ثم احفظ");
        return true;
      }
      case "save": save(); return true;
      case "cancelEntry":
        st.copyFrom = null;
        h.setMode("view");
        paint(st.doc);
        h.rec(st.idx + 1, st.rows.length);
        h.note("تم التراجع");
        return true;
      case "edit":
      case "delete":
        /* لا سلوك وهمي: تعديل/حذف المستند المحفوظ ينتظر قرار المستخدم (أونيكس يسمح حتى الترحيل USE_MOD_GL/USE_DEL_GL ☑،
           والنواة الحالية تجعل كل قيد محفوظ مرحّلاً لا يُعدَّل — INV-6) */
        h.note("تعديل/حذف " + st.cfg.noun + " المحفوظ غير مبني بعد — ينتظر قرار: هل يُعدَّل حتى «الترحيل» كأونيكس أم يُعكس بقيد عكسي");
        return true;
      case "search": {
        var inp = host() && host().querySelector(".scr__quick input");
        if (inp) { inp.focus(); h.note("اكتب رقم " + st.cfg.noun + " أو كلمة من البيان ثم Enter"); }
        return true;
      }
      case "navFirst": show(0); return true;
      case "navPrev": show(st.idx - 1); return true;
      case "navNext": show(st.idx + 1); return true;
      case "navLast": show(st.rows.length - 1); return true;
      case "viewJournal":
        h.note(st.doc ? "المعروض هو القيد نفسه: " + st.doc.lines.length + " سطر · مدين " + money(st.doc.header.debit) + " · دائن " + money(st.doc.header.credit) : "لا مستند معروض");
        return true;
      case "print":
      case "openReport":
      case "importExcel":
        h.note("غير مبنيّ بعد لهذه الشاشة — لا قالب طباعة ولا استيراد");
        return true;
      default:
        return false;
    }
  }

  function mount(h) {
    st.h = h;
    st.ref = h.st.ref;
    st.cfg = MAP[st.ref];
    st.rows = [];
    st.idx = -1;
    st.doc = null;
    st.q = "";
    st.copyFrom = null;
    if (!api() || !api().docs) return;
    wireQuick();
    wireHead();
    renderLines();
    api().docSummary(st.ref).then(function (s) {
      st.summary = s;
      fillTypes();
      paintSummary();
      return load();
    }).catch(function (e) { st.h.note(errText(e)); });
  }

  root.StartyxDocs = {
    MAP: MAP,
    handles: function (ref) { return !!MAP[ref]; },
    mount: mount,
    command: command
  };
})(window);
