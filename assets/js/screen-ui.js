/* ============================================================================
   ONYX ERP — محرّك عرض الشاشة الحيّة
   يرسم داخل المربع الفارغ لكل شاشة: الشريط الموحّد + الحقول + التبويبات + الجداول
   + اللوحة الجانبية + أثر السجل + نافذة الاختيار (F9).

   قاعدة الشريط (روح أونيكس):
     · أمر لا تملكه الشاشة  →  يختفي تماماً.
     · أمر تملكه ولا يناسب الوضع الحالي  →  يبقى في مكانه معطّلاً مع سبب مكتوب.
     · الاستثناء الوحيد: «خروج» ⇄ «تراجع» أثناء الإدخال.
   لذلك مواضع الأزرار لا تتحرك بين الشاشات، والعين تحفظ مكانها.
   ========================================================================== */
(function (root) {
  "use strict";

  var D = root.OnyxScreenDefs;
  var U = root.OnyxUtil;

  /* ── أيقونات الشريط (مسارات مضغوطة) ── */
  var P = {
    add:     "M12 5v14M5 12h14",
    addfrom: "M4 7h9M4 12h6M4 17h6M15 13v7M11.5 16.5h7",
    edit:    "m4 20 4-1 10-10-3-3L5 16z M14 6l3 3",
    del:     "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
    save:    "M5 4h11l3 3v13H5zM8 4v6h7V4M8 20v-6h8v6",
    undo:    "M9 7 4 12l5 5M4 12h9a6 6 0 0 1 0 12h-1",
    find:    "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4",
    filter:  "M3 5h18l-7 8v6l-4 2v-8z",
    first:   "m14 5-7 7 7 7M18 5v14",
    prev:    "m15 5-7 7 7 7",
    next:    "m9 5 7 7-7 7",
    last:    "m10 5 7 7-7 7M6 5v14",
    journal: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
    move:    "M4 18V9M10 18V5M16 18v-6M4 21h17",
    link:    "M10 13a4 4 0 0 0 6 0l2-2a4 4 0 1 0-6-6l-1 1M14 11a4 4 0 0 0-6 0l-2 2a4 4 0 1 0 6 6l1-1",
    excel:   "M6 3h8l5 5v13H6zM14 3v5h5M9 12l6 6M15 12l-6 6",
    print:   "M7 9V3h10v6M7 19H5v-7h14v7h-2M8 15h8v6H8z",
    report:  "M6 3h9l4 4v14H6zM9 13h6M9 17h6M9 9h3",
    archive: "M3 6h18v4H3zM5 10v10h14V10M10 14h4",
    screens: "M3 5h8v6H3zM13 5h8v6h-8zM3 13h8v6H3zM13 13h8v6h-8z",
    window:  "M4 5h16v14H4zM4 9h16M8 5v4",
    lock:    "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
    stop:    "M9 6h2v12H9zM13 6h2v12h-2z",
    exit:    "M14 5H6v14h8M11 12h9m0 0-3-3m3 3-3 3",
    more:    "M6 12h.01M12 12h.01M18 12h.01",
    help:    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3M12 17h.01",
    star:    "m12 4 2.5 5.2 5.5.8-4 3.9 1 5.6L12 16.9 7 19.5l1-5.6-4-3.9 5.5-.8z",
    copy:    "M9 9h11v11H9zM5 15H4V4h11v1",
    panel:   "M4 5h16v14H4zM15 5v14"
  };

  function svg(name, size) {
    var d = P[name] || P.help;
    return '<svg class="icon" width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  }); }

  var GROUP_LABEL = { record: "سجل", browse: "استعراض", analyse: "تحليل", output: "إخراج", system: "نظام" };

  /* حالة الشاشة المعروضة حالياً */
  var st = { ref: null, def: null, mode: "view", tab: 0, host: null, api: null, lookup: null, lookupTarget: null, lastPost: null, apiOk: null };

  function applyMode() {
    if (!st.host) return;
    st.host.setAttribute("data-mode", st.mode);
    var lock = st.mode === "view";
    Array.prototype.forEach.call(st.host.querySelectorAll(".scr__col input, .scr__col select, .chk input"), function (el) {
      if (el.closest(".criteria") || el.closest(".ctl--ro") || el.closest(".scr__quick")) return;
      if (el.tagName === "SELECT" || el.type === "checkbox") {
        el.disabled = lock;
      } else if (el.getAttribute("data-lock") === "1" || !el.readOnly || lock) {
        if (lock) {
          if (!el.readOnly) { el.readOnly = true; el.setAttribute("data-lock", "1"); }
        } else if (el.getAttribute("data-lock") === "1") {
          el.readOnly = false;
          el.removeAttribute("data-lock");
        }
      }
    });
  }

  function goRef(ref) {
    var idx = root.OnyxIndex;
    var n = idx && idx.byRef && idx.byRef[ref];
    if (n && root.OnyxApp && root.OnyxApp.open) {
      root.OnyxApp.open(n);
      return true;
    }
    note("الشاشة «" + ref + "» ليست في الشجرة");
    return false;
  }

  function searchLk() {
    if (st.def && st.def.searchLk && D.LOOKUPS[st.def.searchLk]) return st.def.searchLk;
    var keys = [];
    walkFields(st.def && st.def.blocks, function (f) {
      if (f && f.type === "ref" && f.lk) keys.push(f.lk);
    });
    var prefer = ["customer", "vendor", "item", "account", "store", "cashbox"];
    var i;
    for (i = 0; i < prefer.length; i++) if (keys.indexOf(prefer[i]) >= 0) return prefer[i];
    return (keys[0] && D.LOOKUPS[keys[0]]) ? keys[0] : "customer";
  }

  function cellLookup(col) {
    if (!col) return null;
    if (col === "الصنف") return "item";
    if (/عميل/.test(col)) return "customer";
    if (/مورد/.test(col) && col.indexOf("سعر") === -1) return "vendor";
    if (col === "الحساب" || col === "رقم الحساب" || col.indexOf("الحساب /") === 0) return "account";
    if (/مخزن/.test(col)) return "store";
    return null;
  }

  function note(msg) {
    if (root.OnyxUI && root.OnyxUI.toast) root.OnyxUI.toast(msg);
    else if (U && U.$) { var s = document.getElementById("statusText"); if (s) s.textContent = msg; }
  }

  /* ═══════════ الشريط الموحّد ═══════════ */
  function renderBar() {
    var bar = st.host.querySelector(".scr__bar");
    if (!bar) return;
    bar.innerHTML = "";

    var allowed = {}, i;
    for (i = 0; i < st.def.cmds.length; i++) allowed[st.def.cmds[i]] = true;

    var entry = st.mode !== "view";
    var rare = [];

    D.GROUP_ORDER.forEach(function (g) {
      var shown = D.COMMANDS.filter(function (c) {
        if (c.grp !== g || !allowed[c.id]) return false;
        if (entry && c.id === "exit") return false;          /* يستبدله «تراجع» */
        if (!entry && c.id === "cancelEntry") return false;
        if (c.rare) { rare.push(c); return false; }
        return true;
      });
      if (!shown.length) return;
      var grp = el("div", "scr__grp");
      var btns = el("div", "btns");
      shown.forEach(function (c) { btns.appendChild(c.type === "quick" ? quickBox() : cmdBtn(c)); });
      grp.appendChild(btns);
      grp.appendChild(el("div", "cap", GROUP_LABEL[g] || ""));
      bar.appendChild(grp);
    });

    bar.appendChild(el("div", "sp"));

    if (rare.length) {
      var wrap = el("div", "scr__grp");
      var wbtns = el("div", "btns");
      var b = el("button", "cmd", svg("more", 17));
      b.type = "button";
      b.setAttribute("aria-label", "أوامر أقل استخداماً");
      if (root.OnyxUI && root.OnyxUI.tip) root.OnyxUI.tip(b, "أوامر أقل استخداماً", "bottom");
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var old = wrap.querySelector(".scr__menu");
        if (old) { old.remove(); return; }
        var m = el("div", "scr__menu");
        rare.forEach(function (c) { m.appendChild(cmdBtn(c, true)); });
        wrap.appendChild(m);
        setTimeout(function () {
          document.addEventListener("click", function h() { m.remove(); document.removeEventListener("click", h); });
        }, 0);
      });
      wbtns.appendChild(b);
      wrap.appendChild(wbtns);
      wrap.appendChild(el("div", "cap", "أخرى"));
      bar.appendChild(wrap);
    }

    applyMode();
    renderState();
  }

  /* شارة الحالة في رأس الشاشة — ثابتة المكان، تتبدّل مع الوضع */
  function renderState() {
    var box = st.host.querySelector(".scr__state");
    if (!box) return;
    if (st.mode === "add")       box.innerHTML = '<span class="statechip s-new"><i></i>سجل جديد — غير محفوظ</span>';
    else if (st.mode === "edit") box.innerHTML = '<span class="statechip s-pending"><i></i>تعديل — تغييرات غير محفوظة</span>';
    else if (st.lastPost && st.lastPost.status === "posted")
      box.innerHTML = '<span class="statechip s-posted"><i></i>مرحّل من الخادم — ' + esc(String(st.lastPost.documentNumber)) + "</span>";
    else if (st.lastPost && st.lastPost.status === "pending")
      box.innerHTML = '<span class="statechip s-pending"><i></i>معلّق — فرق ' + esc(String(st.lastPost.imbalance)) + "</span>";
    else if (st.def.state)       box.innerHTML = '<span class="statechip ' + st.def.state.cls + '"><i></i>' + esc(st.def.state.label) + "</span>";
    else box.innerHTML = "";
    if (st.apiOk === true) {
      box.innerHTML += '<span class="statechip s-live"><i></i>الخادم حي</span>';
    } else if (st.apiOk === false) {
      box.innerHTML += '<span class="statechip s-offline"><i></i>الخادم غير متصل</span>';
    }
  }

  /* زر أمر: أيقونة فقط، واسمه يظهر في تلميح عند المرور — ليتّسع الشريط لكل الأوامر */
  function cmdBtn(c, withLabel) {
    var entry = st.mode !== "view";
    var off = c.modes && c.modes.indexOf(st.mode) === -1;
    var b = el("button", "cmd" + (c.primary && entry ? " cmd--key" : "") + (c.danger && !off ? " cmd--danger" : ""));
    b.type = "button";
    b.innerHTML = svg(c.icon, 17) + (withLabel ? '<span class="lbl">' + esc(c.t) + "</span>" : "");
    var text = off
      ? c.t + " — غير متاح " + (entry ? "أثناء الإدخال؛ احفظ أو تراجع أولاً" : "قبل بدء إدخال أو تعديل")
      : (c.key ? c.t + "  ·  " + c.key : c.t);
    b.setAttribute("aria-label", text);
    if (root.OnyxUI && root.OnyxUI.tip) root.OnyxUI.tip(b, text, "bottom");
    else b.title = text;
    if (off) b.disabled = true;
    b.addEventListener("click", function () { run(c.id); });
    return b;
  }

  function quickBox() {
    var q = el("div", "scr__quick", svg("find", 15) +
      '<input type="search" placeholder="بحث سريع…" aria-label="بحث سريع في السجلات">');
    var inp = q.querySelector("input");
    inp.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      openLookup(searchLk(), "بحث سريع", null, inp.value.trim());
    });
    return q;
  }

  /* ═══════════ قراءة الشاشة الحيّة → حمولة الترحيل ═══════════ */
  function money(s) {
    if (s == null) return "0";
    var t = String(s).replace(/[^\d.\-]/g, "");
    return t === "" || t === "-" || t === "." ? "0" : t;
  }
  function isoDate(s) {
    var m = String(s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return String(s).slice(0, 10);
    return "2026-09-20";
  }
  function walkFields(blocks, fn) {
    (blocks || []).forEach(function (b) {
      if (b.grid) b.grid.forEach(fn);
      if (b.fields) b.fields.forEach(fn);
      if (b.kind === "tabs" && b.tabs) b.tabs.forEach(function (t) { walkFields(t.body, fn); });
      if (b.body) walkFields(b.body, fn);
    });
  }
  function walkTables(blocks, out) {
    (blocks || []).forEach(function (b) {
      if (b.kind === "table") out.push(b);
      if (b.kind === "tabs" && b.tabs) b.tabs.forEach(function (t) { walkTables(t.body, out); });
      if (b.body) walkTables(b.body, out);
    });
  }
  function fieldBox(label) {
    if (!st.host) return null;
    return st.host.querySelector('.fld[data-k="' + label + '"]');
  }
  function fieldVal(label) {
    var box = fieldBox(label);
    if (box) {
      var inp = box.querySelector("input, select");
      if (inp) return inp.value;
      var b = box.querySelector(".refval b");
      if (b) return b.textContent.trim();
    }
    var found = "";
    walkFields(st.def && st.def.blocks, function (f) {
      if (found !== "" || !f || f.label !== label) return;
      if (f.type === "ref") found = String(f.code || "");
      else if (f.type === "select") found = String((f.options && f.options[0]) || "");
      else found = String(f.value == null ? "" : f.value);
    });
    return found;
  }
  function fieldText(label) {
    var box = fieldBox(label);
    if (box) {
      var sp = box.querySelector(".refval span");
      if (sp) return sp.textContent.trim();
    }
    var found = "";
    walkFields(st.def && st.def.blocks, function (f) {
      if (found !== "" || !f || f.label !== label) return;
      found = String(f.text || f.value || f.code || "");
    });
    return found || fieldVal(label);
  }
  function accCode(s) {
    var m = String(s || "").match(/(\d{4,})/);
    return m ? m[1] : "";
  }
  function partyId(s) {
    var n = parseInt(String(s || "").replace(/\D/g, ""), 10);
    return isNaN(n) ? 1 : n;
  }
  function colIndex(cols, name) {
    var i = cols.indexOf(name);
    return i;
  }
  function cellVal(tr, cols, name) {
    var i = colIndex(cols, name);
    if (i < 0) return "";
    if (tr.fake) return String(tr.cells[i] == null ? "" : tr.cells[i]).trim();
    var td = tr.cells[i];
    if (!td) return "";
    var inp = td.querySelector("input");
    return (inp ? inp.value : td.textContent).trim();
  }
  function workRows(needCol) {
    var tbl = st.host && st.host.querySelector(".scr__col table");
    var cols = [];
    var rows = [];
    if (tbl) {
      Array.prototype.forEach.call(tbl.querySelectorAll("thead th"), function (th) { cols.push(th.textContent.trim()); });
      rows = Array.prototype.slice.call(tbl.querySelectorAll("tbody tr"));
      if (!needCol || colIndex(cols, needCol) >= 0) return { cols: cols, rows: rows };
    }
    var tables = [];
    walkTables(st.def && st.def.blocks, tables);
    var t = null;
    tables.forEach(function (x) {
      if (!t && (!needCol || (x.cols || []).indexOf(needCol) >= 0)) t = x;
    });
    if (!t) return { cols: cols, rows: rows };
    return {
      cols: t.cols || [],
      rows: (t.rows || []).map(function (r) { return { fake: true, cells: r }; })
    };
  }
  function payOf(label) {
    var raw = fieldVal(label) || "آجل";
    var P = root.StartyxPostMap && root.StartyxPostMap.PAY;
    return (P && P[raw]) || "credit";
  }
  function taxLink() {
    return { taxTypeId: 1, pct: "0.15", zatcaCategory: "S" };
  }
  function itemLine(qty, price, disc, avg, extra) {
    var ln = {
      qty: money(qty),
      price: money(price),
      lineDiscountShare: money(disc),
      currentAvg: money(avg),
      incomingUnitCost: money(price),
      supplierOriginalPrice: money(price)
    };
    if (extra) for (var k in extra) ln[k] = extra[k];
    return ln;
  }
  function buildPostBody(spec) {
    var dateStr = fieldVal(spec.date || "التاريخ");
    if (!dateStr && spec.dateCol) {
      var wrDate = workRows(spec.dateCol);
      if (wrDate.rows[0]) dateStr = cellVal(wrDate.rows[0], wrDate.cols, spec.dateCol);
    }
    var body = {
      docKind: spec.kind,
      screenRef: st.ref,
      branchId: 1,
      docDate: isoDate(dateStr),
      currencyId: 1,
      fxRate: money(fieldVal("سعر الصرف") || "1"),
      fxOperator: "mul",
      paymentMethod: spec.pay ? payOf(spec.pay) : "credit",
      headerDiscount: money(fieldVal(spec.headerDiscount || "")),
      headerCharges: "0",
      skipIcv: true,
      partyAnalyticId: spec.party ? partyId(fieldVal(spec.party)) : null,
      cashAccount: (function () {
        var c = accCode(fieldVal(spec.cash || "الصندوق") || fieldText(spec.cash || "الصندوق"));
        return c && c.length >= 8 ? c : "";
      })(),
      lines: []
    };
    if (spec.charges) {
      var ch = 0;
      spec.charges.forEach(function (k) { ch += Number(money(fieldVal(k))); });
      body.headerCharges = String(ch);
    }
    var accHint = fieldVal(spec.headerAcc || "");
    if (!accHint && spec.headerAcc) accHint = fieldVal(spec.headerAcc);
    var headerAcc = accCode(accHint) || accCode(fieldText(spec.headerAcc || ""));

    var wr = workRows(spec.qtyCol || spec.drCol || (spec.shape === "voucher" ? "مدين" : "الكمية"));
    var cols = wr.cols;

    if (spec.shape === "items") {
      var qtyC = spec.qtyCol || "الكمية";
      var priceC = spec.priceCol || "السعر";
      if (colIndex(cols, priceC) < 0 && colIndex(cols, "السعر (من الأصل)") >= 0) priceC = "السعر (من الأصل)";
      wr.rows.forEach(function (tr) {
        var qty = cellVal(tr, cols, qtyC);
        var price = cellVal(tr, cols, priceC);
        var disc = cellVal(tr, cols, "الخصم") || cellVal(tr, cols, "حصة خصم الرأس");
        var free = cellVal(tr, cols, "المجاني");
        var extra = spec.tax ? { itemTaxLink: taxLink(), taxPct: "0.15" } : {};
        extra.currentAvg = spec.defaultAvg || "40";
        if (spec.purchase) {
          extra.incomingUnitCost = money(price);
          extra.supplierOriginalPrice = money(price);
          extra.taxPct = "0.15";
        }
        body.lines.push(itemLine(qty, price, disc, extra.currentAvg, extra));
        if (Number(money(free)) > 0) {
          var fl = itemLine(free, price, "0", extra.currentAvg, extra);
          fl.isFree = true;
          body.lines.push(fl);
        }
      });
    } else if (spec.shape === "voucher") {
      var amt = money(fieldVal(spec.amount || "المبلغ"));
      wr.rows.forEach(function (tr) {
        var dr = money(cellVal(tr, cols, "مدين"));
        var cr = money(cellVal(tr, cols, "دائن"));
        var a = Number(dr) > 0 ? dr : (Number(cr) > 0 ? cr : amt);
        var acc = accCode(cellVal(tr, cols, cols[1] || "الحساب / العميل"));
        body.lines.push({
          amount: a,
          accountCode: acc || (spec.partyType === "vendor" ? "2101010001" : "1203010001"),
          analyticType: spec.partyType || "customer",
          analyticId: body.partyAnalyticId
        });
      });
      if (!body.lines.length) {
        body.lines.push({
          amount: amt,
          accountCode: spec.partyType === "vendor" ? "2101010001" : "1203010001",
          analyticType: spec.partyType || "customer",
          analyticId: body.partyAnalyticId
        });
      }
    } else if (spec.shape === "journal" || spec.shape === "opening") {
      wr.rows.forEach(function (tr) {
        var dr = money(cellVal(tr, cols, spec.drCol || "مدين"));
        var cr = money(cellVal(tr, cols, spec.crCol || "دائن"));
        var acc = accCode(cellVal(tr, cols, spec.accCol || "الحساب") || cellVal(tr, cols, "رقم الحساب"));
        var pid = partyId(cellVal(tr, cols, spec.partyCol || "التحليلي"));
        var side = Number(dr) >= Number(cr) ? "debit" : "credit";
        var amount = Number(dr) >= Number(cr) ? dr : cr;
        if (Number(amount) === 0 && Number(cr) > 0) { side = "credit"; amount = cr; }
        var at = spec.partyType || "general";
        if (acc.indexOf("120301") === 0) at = "customer";
        if (acc.indexOf("220202") === 0 || acc.indexOf("210101") === 0) at = "vendor";
        body.lines.push({
          accountCode: acc || "1203010001",
          side: side,
          amount: amount,
          analyticType: at,
          analyticId: at === "general" ? null : pid
        });
      });
    } else if (spec.shape === "stock") {
      wr.rows.forEach(function (tr) {
        var qty = cellVal(tr, cols, spec.qtyCol || "الكمية");
        var cost = cellVal(tr, cols, spec.costCol || "التكلفة");
        var avg = money(cost);
        if (avg === "0") avg = "10";
        body.lines.push({
          qty: money(qty),
          currentAvg: avg,
          incomingUnitCost: avg,
          headerAccount: headerAcc || "1202010009",
          packSize: "1"
        });
      });
    }
    return body;
  }

  function moneyFmt(v, keepZero) {
    var n = Number(String(v).replace(/,/g, ""));
    if (isNaN(n) || (!keepZero && n === 0)) return "";
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function accName(code) {
    /* الاسم من الدليل عبر الخادم (accountNames) — لا قائمة أسماء ثابتة في الواجهة */
    var N = st.accNames || {};
    return N[code] ? code + " · " + N[code] : String(code);
  }
  function applyPosted(result) {
    st.lastPost = result;
    if (!st.host || !result) return;
    if (result.status === "posted" && result.documentNumber != null) {
      ["رقم الفاتورة", "رقم المردود", "رقم السند", "رقم القيد", "رقم التوريد", "رقم الصرف", "رقم التحويل", "رقم الاستلام"].forEach(function (k) {
        var inp = fieldBox(k) && fieldBox(k).querySelector("input");
        if (inp && !inp.readOnly) return;
        if (inp) inp.value = String(result.documentNumber);
      });
    }
    var lines = result.lines || [];
    var tbl = null;
    Array.prototype.forEach.call(st.host.querySelectorAll(".scr__side .pnl"), function (p) {
      var h = p.querySelector("h2");
      if (h && /قيد/.test(h.textContent)) {
        var t = p.querySelector("table tbody");
        if (t) tbl = t;
        var pill = p.querySelector(".pnl__pill");
        if (pill) pill.textContent = result.status === "posted" ? "مرحّل من الخادم" : "معلّق";
      }
    });
    if (tbl && lines.length) {
      tbl.innerHTML = lines.map(function (ln) {
        return "<tr><td>" + esc(accName(ln.accountCode)) + '</td><td class="n">' +
          esc(moneyFmt(ln.debit)) + '</td><td class="n">' + esc(moneyFmt(ln.credit)) + "</td></tr>";
      }).join("");
    }
    renderState();
  }

  function openJournalDlg(result) {
    var dlg = document.getElementById("scrJournal");
    if (!dlg) {
      dlg = el("dialog", "lkdlg");
      dlg.id = "scrJournal";
      dlg.innerHTML =
        '<div class="lkdlg__head"><h2>قيد اليومية</h2><span class="sp"></span>' +
        '<button type="button" class="mini" data-close>إغلاق</button></div>' +
        '<div class="lkdlg__body jnl-body" id="scrJournalBody"></div>';
      document.body.appendChild(dlg);
      dlg.querySelector("[data-close]").addEventListener("click", function () { dlg.close(); });
    }
    var body = dlg.querySelector("#scrJournalBody");
    if (!result || result.status !== "posted" || !result.lines || !result.lines.length) {
      body.innerHTML = '<div class="scrnote">' +
        (result && result.status === "pending"
          ? ("معلّق — فرق " + esc(String(result.imbalance)) + " — لا قيد مرحّل")
          : "لا قيد مرحّل من الخادم لهذه الشاشة بعد. احفظ مستنداً والخادم يعمل.") +
        "</div>";
    } else {
      var dr = 0, cr = 0;
      body.innerHTML = "<table><thead><tr><th>الحساب</th><th class=\"n\">مدين</th><th class=\"n\">دائن</th></tr></thead><tbody>" +
        result.lines.map(function (ln) {
          dr += Number(String(ln.debit || 0).replace(/,/g, "")) || 0;
          cr += Number(String(ln.credit || 0).replace(/,/g, "")) || 0;
          return "<tr><td>" + esc(accName(ln.accountCode)) + '</td><td class="n">' +
            esc(moneyFmt(ln.debit, true)) + '</td><td class="n">' + esc(moneyFmt(ln.credit, true)) + "</td></tr>";
        }).join("") + '</tbody><tfoot><tr><td>المجموع</td><td class="n">' +
        esc(moneyFmt(dr, true)) + '</td><td class="n">' + esc(moneyFmt(cr, true)) + "</td></tr></tfoot></table>";
    }
    dlg.showModal();
  }

  /* جسر شاشات البيانات الأساسية — تقرأ وتكتب من الخادم بدل اللقطة */
  function mastersHooks() {
    return {
      st: st,
      setMode: function (m) { st.mode = m; renderBar(); },
      rec: function (i, n) { st.def.rec = { i: i, n: n }; renderRec(); },
      audit: function (a) { st.def.audit = a; renderAudit(); },
      state: renderState,
      applyMode: applyMode,
      note: note
    };
  }
  function masters() {
    /* شاشات المستندات الحيّة (الطبقة ٤) لها إطارها — نفس الجسر */
    var D = root.StartyxDocs;
    if (D && D.handles(st.ref)) return D;
    var M = root.StartyxMasters;
    return M && M.handles(st.ref) ? M : null;
  }

  /* ═══════════ تنفيذ الأوامر ═══════════ */
  function run(id) {
    var M = masters();
    if (M && M.command(id, mastersHooks())) return;
    switch (id) {
      case "add":         st.mode = "add";  note("وضع الإضافة — «تراجع» يحلّ محل «خروج»"); break;
      case "addFrom":     st.mode = "add";  note("إضافة من مستند سابق — الرقم الجديد من المحرّك بعد الحفظ"); break;
      case "edit":        st.mode = "edit"; note("وضع التعديل"); break;
      case "save":
        saveNow();
        return;
      case "cancelEntry": st.mode = "view"; st.lastPost = st.lastPost; note("تم التراجع"); break;
      case "delete":      note("الحذف يتطلب تأكيداً يذكر الأثر والارتباطات"); return;
      case "search":      openLookup(searchLk(), "بحث"); return;
      case "related":     openRelated(); return;
      case "allScreens":  if (root.OnyxPalette && root.OnyxPalette.open) root.OnyxPalette.open(); return;
      case "navFirst": case "navPrev": case "navNext": case "navLast": {
        if (!st.def.rec || !st.def.rec.n) return;
        var d = { navFirst: -1e6, navPrev: -1, navNext: 1, navLast: 1e6 }[id];
        st.def.rec.i = Math.min(st.def.rec.n, Math.max(1, st.def.rec.i + d));
        renderRec(); return;
      }
      case "viewJournal":
        if (st.lastPost) { openJournalDlg(st.lastPost); return; }
        if (root.StartyxApi && root.StartyxApi.lastDocument) {
          root.StartyxApi.lastDocument(st.ref).then(function (j) {
            var row = j.documents && j.documents[0];
            if (row) { st.lastPost = row; openJournalDlg(row); }
            else openJournalDlg(null);
          }).catch(function () { openJournalDlg(null); });
          return;
        }
        note("القيد الفعلي من محرّك الترحيل — المعلّق يوضّح «لا قيد مرحّل»");
        return;
      case "print":       note("عدّاد الطباعة يزيد بعد نجاح الطباعة فقط"); return;
      case "lockSession": note("قفل الجلسة — كلمة المرور لإعادة الفتح"); return;
      default:            note("أمر تجريبي في نسخة التصفّح"); return;
    }
    renderBar();
  }

  function saveNow() {
    var spec = root.StartyxPostMap && root.StartyxPostMap.MAP[st.ref];
    st.mode = "view";
    renderBar();
    if (!spec) {
      note("محفوظ — شاشة بلا قيد يومية");
      return;
    }
    if (!root.StartyxApi || !root.StartyxApi.postDocument) {
      note("محفوظ — لقطة حتى ردّ الخادم");
      return;
    }
    var body = buildPostBody(spec);
    root.StartyxApi.postDocument(body).then(function (r) {
      st.accNames = r.accountNames || {};
      applyPosted(r);
      if (r.status === "posted") note("مرحّل — رقم " + r.documentNumber + " · قيد " + r.glEntryId);
      else note("معلّق — فرق " + r.imbalance + " — لا قيد في الدفتر");
    }).catch(function (e) {
      var msg = (e && (e.message || e.error)) ? (e.error ? e.error + ": " : "") + (e.message || "") : "";
      note(msg ? ("رفض الخادم — " + msg) : "محفوظ محلياً — الخادم غير متصل (لقطة)");
    });
  }

  /* ═══════════ الكتل ═══════════ */
  function header(title, pill) {
    var h = el("header", "", "<h2>" + esc(title || "") + '</h2><span class="sp"></span>');
    if (pill) h.appendChild(el("span", "pnl__pill", esc(pill)));
    return h;
  }

  function field(f) {
    var d = el("div", "fld c" + (f.span || 3));
    d.setAttribute("data-k", f.label || "");
    d.appendChild(el("label", "", esc(f.label) +
      (f.req ? '<span class="req">*</span>' : "") +
      (f.ro ? '<span class="ro-tag">قراءة</span>' : "")));
    var c = el("div", "ctl" + (f.ro ? " ctl--ro" : ""));
    if (f.type === "ref") {
      c.innerHTML = '<span class="refval"><b>' + esc(f.code) + "</b><span>" + esc(f.text) + "</span></span>";
      var b = el("button", "ctl__f9", svg("find", 15));
      b.type = "button";
      b.title = "اختيار · F9";
      b.setAttribute("aria-label", "اختيار " + f.label + " · F9");
      b.addEventListener("click", function () {
        openLookup(f.lk, f.label, st.mode === "view" ? null : { kind: "ref", el: c });
      });
      c.appendChild(b);
    } else if (f.type === "select") {
      c.innerHTML = "<select>" + (f.options || []).map(function (o) { return "<option>" + esc(o) + "</option>"; }).join("") + "</select>";
    } else {
      var i = el("input");
      i.value = f.value == null ? "" : f.value;
      i.setAttribute("aria-label", f.label);
      if (f.ro) i.readOnly = true;
      if (f.mono) i.className = "num";
      c.appendChild(i);
    }
    d.appendChild(c);
    return d;
  }

  function gridOf(fields) {
    var g = el("div", "grid12");
    fields.forEach(function (f) { g.appendChild(field(f)); });
    return g;
  }

  function tableOf(t) {
    var wrap = el("div", "tblwrap");
    if (t.max) wrap.style.maxHeight = t.max;
    var cols = t.cols || [];
    var rows = t.rows || [];
    var num = {}; (t.num || []).forEach(function (i) { num[i] = true; });
    var tb = el("table", cols[0] === "#" ? "tbl--sheet" : "");
    tb.innerHTML = "<thead><tr>" + cols.map(function (c, i) {
      return '<th class="' + (num[i] ? "n" : "") + '">' + esc(c) + "</th>";
    }).join("") + "</tr></thead>";
    var body = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      cols.forEach(function (colName, i) {
        var v = r[i] == null ? "" : r[i];
        var editable = t.editable && num[i];
        var td = el("td", (num[i] ? "n" : "") + (editable ? " edit" : ""));
        td.setAttribute("data-col", colName || "");
        if (editable) {
          var inp = el("input", "cell");
          inp.value = v;
          inp.setAttribute("aria-label", colName);
          td.appendChild(inp);
        } else td.textContent = v;
        var lkCell = cellLookup(colName);
        if (lkCell) {
          td.tabIndex = 0;
          td.setAttribute("data-lk", lkCell);
          td.addEventListener("dblclick", function () {
            if (st.mode === "view") return;
            openLookup(lkCell, colName, { kind: "cell", el: td });
          });
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    tb.appendChild(body);
    if (t.foot) {
      tb.appendChild(el("tfoot", "", "<tr>" + t.foot.map(function (v, i) {
        return '<td class="' + (num[i] ? "n" : "") + '">' + esc(v) + "</td>";
      }).join("") + "</tr>"));
    }
    wrap.appendChild(tb);
    return wrap;
  }

  function linksOf(links) {
    var d = el("div", "totals");
    links.forEach(function (p) {
      var ref = p[2] || (/^op\./.test(p[1]) ? p[1] : null);
      if (ref) {
        var b = el("button", "t t--go", "<span>" + esc(p[0]) + "</span><b>" + esc(p[1]) + "</b>");
        b.type = "button";
        b.addEventListener("click", function () { goRef(ref); });
        d.appendChild(b);
      } else {
        d.appendChild(el("div", "t", "<span>" + esc(p[0]) + "</span><b>" + esc(p[1]) + "</b>"));
      }
    });
    return d;
  }

  function tabsOf(tabs) {
    var p = el("div", "pnl");
    var nav = el("div", "tabstrip");
    nav.setAttribute("role", "tablist");
    tabs.forEach(function (t, i) {
      var b = el("button", "", esc(t.t) + (t.n ? '<span class="n">' + t.n + "</span>" : ""));
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", i === st.tab ? "true" : "false");
      b.addEventListener("click", function () { st.tab = i; renderWork(); });
      nav.appendChild(b);
    });
    p.appendChild(nav);
    var host = el("div", "tabhost");
    (tabs[st.tab] || tabs[0]).body.forEach(function (b) { host.appendChild(block(b)); });
    p.appendChild(host);
    return p;
  }

  function block(b) {
    switch (b.kind) {
      case "panel": {
        var p = el("div", "pnl");
        p.appendChild(header(b.title, b.pill));
        if (b.grid)  { var d = el("div", "pnl__body"); d.appendChild(gridOf(b.grid)); p.appendChild(d); }
        if (b.table) p.appendChild(tableOf(b.table));
        if (b.links) p.appendChild(linksOf(b.links));
        return p;
      }
      case "grid": {
        var g = el("div", "pnl");
        var gb = el("div", "pnl__body");
        gb.appendChild(gridOf(b.fields));
        g.appendChild(gb);
        return g;
      }
      case "tabs": return tabsOf(b.tabs);
      case "table": {
        var t = el("div", "pnl");
        if (b.title) t.appendChild(header(b.title, b.rows ? b.rows.length + " سطر" : ""));
        t.appendChild(tableOf(b));
        if (b.actions) {
          var f = el("div", "tblfoot");
          b.actions.forEach(function (a) {
            var mb = el("button", "mini", esc(a.t));
            mb.type = "button";
            mb.addEventListener("click", function () {
              if (a.t === "+ سطر جديد") {
                if (st.mode === "view") { note("ابدأ الإضافة أو التعديل أولاً"); return; }
                if (!b.rows) b.rows = [];
                b.rows.push((b.cols || []).map(function (col, i) {
                  return i === 0 && col === "#" ? b.rows.length + 1 : "";
                }));
                renderWork();
                note("أضيف سطر جديد — أدخل الصنف والكمية والسعر ثم احفظ");
                return;
              }
              note("إجراء سطور — عرض توضيحي");
            });
            f.appendChild(mb);
          });
          f.appendChild(el("span", "hint", "الأرقام هنا مثال ثابت للتصميم"));
          t.appendChild(f);
        }
        return t;
      }
      case "criteria": {
        var c = el("div", "pnl");
        c.appendChild(header("معايير العرض", "تُحفظ كقالب للمستخدم"));
        var box = el("div", "criteria");
        b.fields.forEach(function (f) { box.appendChild(field(f)); });
        var ap = el("button", "mini", "تطبيق");
        ap.type = "button";
        ap.addEventListener("click", function () { note("تطبيق المعايير — عرض توضيحي"); });
        box.appendChild(ap);
        c.appendChild(box);
        return c;
      }
      case "recon": {
        var r = el("div", "pnl");
        var rb = el("div", "recon");
        b.items.forEach(function (it) {
          rb.appendChild(el("div", it[2] || "", "<span>" + esc(it[0]) + "</span><b>" + esc(it[1]) + "</b>"));
        });
        r.appendChild(rb);
        return r;
      }
      case "totals": {
        var tp = el("div", "pnl totals");
        tp.appendChild(el("div", "totals__big",
          "<small>" + esc(b.big.label) + "</small><b>" + esc(b.big.value) + "</b><i>" + esc(b.big.cur) + "</i>"));
        b.rows.forEach(function (p2) { tp.appendChild(el("div", "t", "<span>" + esc(p2[0]) + "</span><b>" + esc(p2[1]) + "</b>")); });
        return tp;
      }
      case "note":    return el("div", "pnl", '<div class="scrnote">' + b.text + "</div>");
      case "feature": return el("div", "pnl", '<div class="scrnote">' + svg("help", 14) + " " + esc(b.text) + "</div>");
      case "empty":   return el("div", "pnl", '<div class="scrnote" style="text-align:center;padding:26px">' + esc(b.text) + "</div>");
      case "checks": {
        var cp = el("div", "pnl");
        if (b.title) cp.appendChild(header(b.title, b.items.length + " خيار"));
        var cb = el("div", "pnl__body");
        var grid = el("div", "chkgrid");
        b.items.forEach(function (it) {
          var l = el("label", "chk");
          l.innerHTML = '<input type="checkbox"' + (it[1] ? " checked" : "") + "><span>" + esc(it[0]) + "</span>";
          grid.appendChild(l);
        });
        cb.appendChild(grid);
        cp.appendChild(cb);
        return cp;
      }
    }
    return el("div", "pnl", '<div class="scrnote">كتلة غير معروفة في تعريف الشاشة</div>');
  }

  /* ═══════════ مساحة العمل + تقسيم قابل للسحب ═══════════ */
  function layoutKey() { return "onyx.v1.scrLayout." + st.ref; }
  function loadLayout() {
    try { return JSON.parse(localStorage.getItem(layoutKey())) || {}; } catch (e) { return {}; }
  }
  function saveLayout(l) {
    try { localStorage.setItem(layoutKey(), JSON.stringify(l)); } catch (e) {}
  }

  function renderWork() {
    var w = st.host.querySelector(".scr__work");
    var saved = loadLayout();
    w.innerHTML = "";

    var row = el("div", "scr__row");
    var col = el("div", "scr__col");
    buildStack(col, st.def.blocks, "rows", saved);
    row.appendChild(col);

    if (st.def.side && st.def.side.length) {
      var side = el("div", "scr__side");
      buildStack(side, st.def.side, "sideRows", saved);
      row.appendChild(colSplitter(side));
      row.appendChild(side);
      if (saved.side) side.style.flex = "0 0 " + saved.side + "px";
    }
    w.appendChild(row);
    if (st.lastPost) applyPosted(st.lastPost);
    applyMode();
  }

  /* عمود لوحات: آخر لوحة تمتد، وبين كل لوحتين مقبض سحب */
  function buildStack(host, blocks, key, saved) {
    var panels = [];
    blocks.forEach(function (b) {
      var p = block(b);
      panels.push(p);
      host.appendChild(p);
    });

    var flexible = null, k;
    for (k = panels.length - 1; k >= 0; k--) {
      if (panels[k].querySelector(".tblwrap")) { flexible = panels[k]; break; }
    }
    if (!flexible && panels.length) flexible = panels[panels.length - 1];
    if (flexible) flexible.classList.add("stretch");

    panels.forEach(function (p, i) {
      if (p === flexible || i === panels.length - 1) return;
      host.insertBefore(rowSplitter(p, key, i), p.nextSibling);
      var h = saved[key] && saved[key][i];
      if (h) p.style.flex = "0 0 " + h + "px";
    });
  }

  /* فاصل عمودي: يغيّر عرض اللوحة الجانبية (نقرتان = إرجاع الافتراضي) */
  function colSplitter(side) {
    var s = el("div", "splt splt--v");
    s.setAttribute("role", "separator");
    s.setAttribute("aria-orientation", "vertical");
    s.setAttribute("aria-label", "تغيير عرض اللوحة الجانبية");
    s.tabIndex = 0;
    drag(s, function (e) {
      var row = st.host.querySelector(".scr__row").getBoundingClientRect();
      var px = Math.max(210, Math.min(row.width - 360, e.clientX - row.left));
      side.style.flex = "0 0 " + Math.round(px) + "px";
      var l = loadLayout(); l.side = Math.round(px); saveLayout(l);
    });
    s.addEventListener("dblclick", function () {
      side.style.flex = "";
      var l = loadLayout(); delete l.side; saveLayout(l);
    });
    s.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowLeft" ? 24 : e.key === "ArrowRight" ? -24 : 0;
      if (!d) return;
      e.preventDefault();
      var px = Math.max(210, side.getBoundingClientRect().width + d);
      side.style.flex = "0 0 " + Math.round(px) + "px";
      var l = loadLayout(); l.side = Math.round(px); saveLayout(l);
    });
    return s;
  }

  /* فاصل أفقي: يغيّر ارتفاع اللوحة التي فوقه */
  function rowSplitter(panel, key, index) {
    var s = el("div", "splt splt--h");
    s.setAttribute("role", "separator");
    s.setAttribute("aria-orientation", "horizontal");
    s.setAttribute("aria-label", "تغيير ارتفاع اللوحة");
    s.tabIndex = 0;
    drag(s, function (e) {
      var host = s.parentNode;
      var px = Math.max(64, Math.min(host.getBoundingClientRect().height - 120, e.clientY - panel.getBoundingClientRect().top));
      panel.style.flex = "0 0 " + Math.round(px) + "px";
      var l = loadLayout(); l[key] = l[key] || {}; l[key][index] = Math.round(px); saveLayout(l);
    });
    s.addEventListener("dblclick", function () {
      panel.style.flex = "";
      var l = loadLayout(); if (l[key]) delete l[key][index]; saveLayout(l);
    });
    return s;
  }

  function drag(handle, onMove) {
    handle.addEventListener("mousedown", function (e) {
      e.preventDefault();
      handle.setAttribute("data-dragging", "true");
      document.body.style.userSelect = "none";
      function move(ev) { onMove(ev); }
      function up() {
        handle.removeAttribute("data-dragging");
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      }
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
  }

  function renderRec() {
    var r = st.host.querySelector(".scr__rec");
    if (!r) return;
    if (!st.def.rec) { r.innerHTML = "شاشة بلا تنقّل سجلات"; return; }
    if (!st.def.rec.n) { r.innerHTML = "لا سجلات — F6 للإضافة"; return; }
    r.innerHTML = "سجل <b>" + st.def.rec.i + "</b> من <b>" + st.def.rec.n.toLocaleString("ar-EG") + "</b>";
  }

  function renderAudit() {
    var a = st.def.audit, box = st.host.querySelector(".scr__audit");
    if (!a || !box) return;
    function cell(k, v) { return '<span class="a"><s>' + k + "</s><b>" + esc(v) + "</b></span>"; }
    box.innerHTML =
      cell("مدخل السجل", a.by) + cell("تاريخ الإدخال", a.at) + cell("الجهاز", a.dev) +
      cell("معدّل السجل", a.upd) + cell("مرات التعديل", a.updc) + cell("مرات الطباعة", a.prints) +
      '<span class="sp"></span>' +
      '<button type="button" data-log>' + svg("journal", 14) + " سجل التغييرات</button>" +
      cell("إصدار الشاشة", a.ver);
    box.querySelector("[data-log]").addEventListener("click", function () {
      note("سجل تفصيلي: من، متى، الجهاز، القيمة قبل وبعد");
    });
  }

  /* ═══════════ نافذة الاختيار (F9) ═══════════ */
  function selectedLookupRow() {
    var tbl = document.getElementById("scrLkTable");
    var tr = tbl && tbl.querySelector('tbody tr[aria-selected="true"]');
    if (!tr || !st.lookupRows) return null;
    return st.lookupRows[Number(tr.getAttribute("data-i"))] || null;
  }

  function applyLookupRow(row) {
    var dlg = document.getElementById("scrLookup");
    if (dlg && dlg.open) try { dlg.close(); } catch (e0) {}
    if (!row) { note("اختر سطراً أولاً"); return; }
    var tgt = st.lookupTarget;
    var code = row[0], text = row[1] || row[0];
    if (!tgt || st.mode === "view") {
      note("عُرض «" + text + "»");
      return;
    }
    if (tgt.kind === "ref" && tgt.el) {
      var b = tgt.el.querySelector(".refval b");
      var s = tgt.el.querySelector(".refval span");
      if (b) b.textContent = code;
      if (s) s.textContent = text;
    } else if (tgt.kind === "input" && tgt.el) {
      tgt.el.value = code + (text && text !== String(code) ? " · " + text : "");
    } else if (tgt.kind === "cell" && tgt.el) {
      var shown = code + (text && text !== String(code) ? " · " + text : "");
      var inp = tgt.el.querySelector("input");
      if (inp) inp.value = shown; else tgt.el.textContent = shown;
    }
    note("اختير " + text);
  }

  function dialogEl() {
    var dlg = document.getElementById("scrLookup");
    if (dlg) return dlg;
    dlg = el("dialog", "lkdlg");
    dlg.id = "scrLookup";
    dlg.innerHTML =
      '<div class="lkdlg__head"><h2 id="scrLkTitle"></h2>' +
      '<input type="search" id="scrLkQ" placeholder="اكتب أي جزء من الرقم أو الاسم — بلا علامة %" aria-label="بحث في القائمة">' +
      '<button type="button" class="mini" data-close>إغلاق</button></div>' +
      '<div class="lkdlg__body scr"><table id="scrLkTable"></table></div>' +
      '<div class="lkdlg__foot"><span id="scrLkCount"></span>' +
      '<span class="acts"><button type="button" class="mini" data-close>إلغاء</button>' +
      '<button type="button" class="mini" data-ok>اختيار</button></span></div>';
    document.body.appendChild(dlg);
    dlg.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
    dlg.querySelector("[data-ok]").addEventListener("click", function () { applyLookupRow(selectedLookupRow()); });
    dlg.querySelector("#scrLkQ").addEventListener("input", function (e) { drawLookup(e.target.value.trim()); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); applyLookupRow(selectedLookupRow()); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      var tbl = document.getElementById("scrLkTable");
      var rows = tbl && tbl.querySelectorAll("tbody tr");
      if (!rows || !rows.length) return;
      var cur = -1, i;
      for (i = 0; i < rows.length; i++) if (rows[i].getAttribute("aria-selected") === "true") cur = i;
      var next = e.key === "ArrowDown" ? Math.min(rows.length - 1, cur + 1) : Math.max(0, cur - 1);
      for (i = 0; i < rows.length; i++) rows[i].setAttribute("aria-selected", i === next ? "true" : "false");
      if (rows[next] && rows[next].scrollIntoView) rows[next].scrollIntoView({ block: "nearest" });
    });
    return dlg;
  }

  function dismissDialogs() {
    ["scrLookup", "scrDocs", "scrJournal", "scrRelated"].forEach(function (id) {
      var d = document.getElementById(id);
      if (!d) return;
      try { if (d.open) d.close(); } catch (e0) {}
      if (d.parentNode) d.parentNode.removeChild(d);
    });
    st.lookup = null;
    st.lookupTarget = null;
    st.lookupRows = null;
  }

  function openLookup(key, label, target, q0) {
    if (!key || !D.LOOKUPS[key]) {
      note("لا قائمة اختيار لهذا الحقل");
      return;
    }
    st.lookup = D.LOOKUPS[key];
    st.lookupTarget = target || null;
    var dlg = dialogEl();
    dlg.querySelector("#scrLkTitle").textContent = st.lookup.title + (label ? " — " + label : "");
    dlg.querySelector("#scrLkQ").value = q0 || "";
    drawLookup(q0 || "");
    dlg.showModal();
    setTimeout(function () { dlg.querySelector("#scrLkQ").focus(); }, 30);
  }

  function drawLookup(q) {
    var src = st.lookup;
    if (!src) return;
    var rows = src.rows.filter(function (r) {
      return !q || r.some(function (c) { return String(c).indexOf(q) !== -1; });
    });
    st.lookupRows = rows;
    var tbl = document.getElementById("scrLkTable");
    tbl.innerHTML =
      "<thead><tr>" + src.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead>" +
      "<tbody>" + rows.map(function (r, i) {
        return '<tr data-i="' + i + '" aria-selected="' + (i === 0) + '">' + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody>";
    document.getElementById("scrLkCount").textContent =
      rows.length + " من " + src.rows.length + " · بحث فوري بلا علامة %";
    tbl.querySelectorAll("tbody tr").forEach(function (tr) {
      tr.addEventListener("click", function () {
        tbl.querySelectorAll("tbody tr").forEach(function (x) { x.setAttribute("aria-selected", "false"); });
        tr.setAttribute("aria-selected", "true");
      });
      tr.addEventListener("dblclick", function () {
        applyLookupRow(rows[Number(tr.getAttribute("data-i"))]);
      });
    });
  }

  function collectRelated() {
    var out = [];
    function add(ref, label) {
      if (!ref || !/^op\./.test(ref)) return;
      if (out.some(function (x) { return x.ref === ref; })) return;
      var n = root.OnyxIndex && root.OnyxIndex.byRef[ref];
      out.push({
        ref: ref,
        label: label || (n && n.label) || ref,
        live: !!(root.OnyxScreen && root.OnyxScreen.has(ref))
      });
    }
    function walk(blocks) {
      (blocks || []).forEach(function (b) {
        (b.links || []).forEach(function (p) {
          add(p[2] || (/^op\./.test(p[1]) ? p[1] : null), p[0]);
        });
        if (b.kind === "tabs" && b.tabs) b.tabs.forEach(function (t) { walk(t.body); });
        if (b.text) {
          var m = String(b.text).match(/op\.\d[\w.]*/g);
          if (m) m.forEach(function (r) { add(r); });
        }
      });
    }
    walk((st.def.blocks || []).concat(st.def.side || []));
    return out;
  }

  function openRelated() {
    var rows = collectRelated();
    if (!rows.length) { note("لا شاشات مرتبطة مسجّلة هنا"); return; }
    var dlg = document.getElementById("scrRelated");
    if (!dlg) {
      dlg = el("dialog", "lkdlg");
      dlg.id = "scrRelated";
      dlg.innerHTML =
        '<div class="lkdlg__head"><h2>الشاشات المرتبطة</h2><span class="sp"></span>' +
        '<button type="button" class="mini" data-close>إغلاق</button></div>' +
        '<div class="lkdlg__body" id="scrRelatedBody"></div>';
      document.body.appendChild(dlg);
      dlg.querySelector("[data-close]").addEventListener("click", function () { dlg.close(); });
    }
    var body = dlg.querySelector("#scrRelatedBody");
    body.innerHTML = "";
    rows.forEach(function (r) {
      var b = el("button", "t t--go", "<span>" + esc(r.label) + "</span><b>" + esc(r.ref) + (r.live ? " · حيّة" : "") + "</b>");
      b.type = "button";
      b.addEventListener("click", function () { dlg.close(); goRef(r.ref); });
      body.appendChild(b);
    });
    dlg.showModal();
  }

  /* مسار الشاشة كنص قصير (المسار الكامل يظهر في شريط الحالة أسفل النافذة) */
  function pathOf(node) {
    var parts = [], p = node._parent, guard = 0;
    while (p && p.label && guard++ < 4) { parts.unshift(p.label); p = p._parent; }
    return parts.length ? "‹ " + parts.join(" · ") : "";
  }

  /* ═══════════ نافذة التوثيق الهندسي ═══════════ */
  function openDocs() {
    var dlg = document.getElementById("scrDocs");
    if (!dlg) {
      dlg = el("dialog", "lkdlg docsdlg");
      dlg.id = "scrDocs";
      dlg.innerHTML =
        '<div class="lkdlg__head"><h2>التوثيق الهندسي للشاشة</h2><span style="flex:1"></span>' +
        '<button type="button" class="mini" data-close>إغلاق</button></div>' +
        '<div class="lkdlg__body" id="scrDocsBody"></div>';
      document.body.appendChild(dlg);
      dlg.querySelector("[data-close]").addEventListener("click", function () { dlg.close(); });
    }
    var body = dlg.querySelector("#scrDocsBody");
    body.innerHTML = "";
    var ok = st.api.renderDocs && st.api.renderDocs(body);
    if (!ok) body.innerHTML = '<div class="scrnote">لا توثيق هندسي مسجّل لهذه الشاشة بعد.</div>';
    dlg.showModal();
  }

  /* ═══════════ الرسم الكامل ═══════════ */
  function render(hostEl, node, api) {
    var def = D.SCREENS[node.ref];
    if (!def) return false;

    dismissDialogs();
    st.ref = node.ref; st.def = def; st.mode = "view"; st.tab = 0; st.api = api || {}; st.lastPost = null;

    var wrap = el("div", "scr");
    wrap.setAttribute("data-mode", "view");
    var hasSide = !!(def.side && def.side.length);
    wrap.innerHTML =
      '<div class="scr__head">' +
        '<div class="scr__title"><h1>' + esc(node.label) + '</h1>' +
        '<span class="code">' + esc(node.code || node.ref) + "</span>" +
        '<span class="scr__state"></span></div>' +
        '<span class="scr__path">' + esc(pathOf(node)) + "</span>" +
        '<span class="sp"></span>' +
        '<span class="scr__rec"></span>' +
        (hasSide ? '<button type="button" class="scr__iconbtn" data-side aria-label="طيّ اللوحة الجانبية" title="طيّ اللوحة الجانبية">' + svg("panel") + "</button>" : "") +
        '<button type="button" class="scr__iconbtn" data-docs aria-label="التوثيق الهندسي للشاشة" title="التوثيق الهندسي للشاشة">' + svg("report") + "</button>" +
        '<button type="button" class="scr__iconbtn" data-fav aria-label="إضافة للمفضلة" title="إضافة للمفضلة">' + svg("star") + "</button>" +
        '<button type="button" class="scr__iconbtn" data-copy aria-label="نسخ رابط الشاشة" title="نسخ رابط الشاشة">' + svg("copy") + "</button>" +
      "</div>" +
      '<div class="scr__bar" role="toolbar" aria-label="أوامر الشاشة"></div>' +
      '<div class="scr__work"></div>' +
      '<div class="scr__audit"></div>';

    hostEl.appendChild(wrap);
    st.host = wrap;

    var fav = wrap.querySelector("[data-fav]");
    if (st.api.isFavorite && st.api.isFavorite()) fav.setAttribute("aria-pressed", "true");
    fav.addEventListener("click", function () {
      if (st.api.toggleFavorite) st.api.toggleFavorite();
    });
    wrap.querySelector("[data-copy]").addEventListener("click", function () {
      if (st.api.copyLink) st.api.copyLink();
    });
    var sideBtn = wrap.querySelector("[data-side]");
    if (sideBtn) sideBtn.addEventListener("click", function () {
      var off = wrap.getAttribute("data-side") === "off";
      wrap.setAttribute("data-side", off ? "on" : "off");
      sideBtn.setAttribute("aria-pressed", off ? "false" : "true");
    });
    var docsBtn = wrap.querySelector("[data-docs]");
    if (st.api.renderDocs) docsBtn.addEventListener("click", openDocs);
    else docsBtn.remove();

    /* تلميحات موحّدة بدل تلميح المتصفح البطيء */
    if (root.OnyxUI && root.OnyxUI.tip) {
      Array.prototype.forEach.call(wrap.querySelectorAll(".scr__iconbtn[title]"), function (b) {
        root.OnyxUI.tip(b, b.getAttribute("title"), "bottom");
        b.removeAttribute("title");
      });
    }

    renderBar(); renderWork(); renderRec(); renderAudit();
    var M = masters();
    if (M) M.mount(mastersHooks());
    if (root.StartyxApi && root.StartyxApi.ping) {
      root.StartyxApi.ping().then(function (h) {
        st.apiOk = !!h;
        renderState();
      });
    }
    return true;
  }

  /* ═══════════ اختصارات لوحة المفاتيح ═══════════ */
  document.addEventListener("keydown", function (e) {
    if (!st.host || !document.body.contains(st.host)) return;
    if (document.querySelector("dialog[open]")) return;
    var has = function (id) { return st.def.cmds.indexOf(id) !== -1; };
    var typing = /input|textarea|select/i.test(e.target.tagName);

    if (e.key === "F9") {
      e.preventDefault();
      var t = e.target;
      var fld = t.closest ? t.closest(".fld") : null;
      if (fld) {
        var label = fld.getAttribute("data-k");
        var fdef = null;
        walkFields((st.def.blocks || []).concat(st.def.side || []), function (f) {
          if (!fdef && f.label === label) fdef = f;
        });
        if (fdef && fdef.lk) {
          var ctl = fld.querySelector(".ctl");
          var tgt = st.mode === "view" ? null : (fdef.type === "ref"
            ? { kind: "ref", el: ctl }
            : { kind: "input", el: fld.querySelector("input") });
          openLookup(fdef.lk, fdef.label, tgt);
          return;
        }
      }
      var td = t.closest ? t.closest("td[data-lk]") : null;
      if (td) {
        openLookup(td.getAttribute("data-lk"), td.getAttribute("data-col"),
          st.mode === "view" ? null : { kind: "cell", el: td });
        return;
      }
      openLookup(searchLk(), "F9");
      return;
    }
    if (e.key === "F10") { e.preventDefault(); if (st.mode !== "view") run("save"); return; }
    if (e.key === "F6")  { e.preventDefault(); if (has("add") && st.mode === "view") run("add"); return; }
    if (e.key === "F3")  { e.preventDefault(); if (has("edit") && st.mode === "view") run("edit"); return; }
    if (e.key === "F7")  { e.preventDefault(); if (has("search")) run("search"); return; }
    if (e.key === "F8" && e.shiftKey) { e.preventDefault(); if (has("print")) run("print"); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault(); if (st.mode !== "view") run("save"); return;
    }
    if (e.key === "Escape" && !typing && st.mode !== "view") { e.preventDefault(); run("cancelEntry"); }
  });

  root.OnyxScreen = {
    has: function (ref) { return !!(ref && D.SCREENS[ref]); },
    render: render,
    dismissDialogs: dismissDialogs,
    count: function () { return Object.keys(D.SCREENS).length; }
  };
})(window);
