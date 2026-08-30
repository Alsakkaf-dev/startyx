/* ============================================================================
   ONYX ERP — أدوات مساعدة عامة
   ========================================================================== */
(function (root) {
  "use strict";

  /* ---- تطبيع النص العربي للبحث ---- */
  var TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
  var TATWEEL = /ـ/g;
  function normalizeArabic(s) {
    if (!s) return "";
    return String(s)
      .replace(TASHKEEL, "")
      .replace(TATWEEL, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  /* ---- تحويل تسمية إلى معرّف (slug) يحافظ على العربية ---- */
  function slugify(s) {
    return String(s || "")
      .replace(TASHKEEL, "")
      .replace(/[()[\]{}.,،؛:"'«»/\\|]+/g, " ")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ---- تظليل مطابقة نصية (آمن) ---- */
  function highlight(label, query) {
    var safe = escapeHtml(label);
    if (!query) return safe;
    var nLabel = normalizeArabic(label);
    var nQuery = normalizeArabic(query);
    var idx = nLabel.indexOf(nQuery);
    if (idx === -1 || !nQuery) return safe;
    /* التطبيع قد يغيّر الأطوال قليلاً؛ نستخدم مطابقة تقريبية على النص الأصلي */
    var re;
    try {
      var pat = query.trim().split(/\s+/).map(function (w) {
        return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }).join("|");
      re = new RegExp("(" + pat + ")", "gi");
    } catch (e) { return safe; }
    return safe.replace(re, "<mark>$1</mark>");
  }

  /* ---- تقييم مطابقة ضبابية (subsequence + مكافآت) ---- */
  function fuzzyScore(query, target) {
    var q = normalizeArabic(query), t = normalizeArabic(target);
    if (!q) return 0;
    if (t.indexOf(q) !== -1) {
      var base = 120 - t.indexOf(q);            // مكافأة للبداية
      if (t === q) base += 60;
      if (t.split(" ").some(function (w) { return w.indexOf(q) === 0; })) base += 25;
      return base + Math.max(0, 30 - (t.length - q.length) / 3);
    }
    var qi = 0, score = 0, streak = 0, prevIdx = -1;
    for (var ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        score += 4;
        if (prevIdx === ti - 1) { streak++; score += streak * 3; } else { streak = 0; }
        if (ti === 0 || t[ti - 1] === " ") score += 6;
        prevIdx = ti; qi++;
      }
    }
    if (qi < q.length) return -1;               // لم تُطابق كل الحروف
    return score - Math.max(0, t.length - q.length) / 4;
  }

  /* ---- وقت نسبي بالعربية ---- */
  var RTF = (function () {
    try { return new Intl.RelativeTimeFormat("ar", { numeric: "auto" }); } catch (e) { return null; }
  })();
  function relTime(ts) {
    var diff = (ts - Date.now()) / 1000;        // بالثواني (سالب للماضي)
    var abs = Math.abs(diff);
    var units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
    for (var i = 0; i < units.length; i++) {
      if (abs >= units[i][1] || units[i][0] === "second") {
        var v = Math.round(diff / units[i][1]);
        if (RTF) return RTF.format(v, units[i][0]);
        return "قبل قليل";
      }
    }
    return "";
  }

  /* ---- تنسيق رقم ---- */
  var NF_AR = (function () { try { return new Intl.NumberFormat("ar-EG"); } catch (e) { return null; } })();
  var NF = (function () { try { return new Intl.NumberFormat("en-US"); } catch (e) { return null; } })();
  function formatNum(n, arabic) {
    if (arabic && NF_AR) return NF_AR.format(n);
    if (NF) return NF.format(n);
    return String(n);
  }

  /* ---- تعداد عربي صحيح: مفرد / مثنى / جمع قلة / تمييز مفرد ----
     مثال: plural(0..n, ["نتيجة","نتيجتان","نتائج","نتيجة"])
       0        -> "لا نتائج"        (يُمرَّر zero اختيارياً)
       1        -> "نتيجة واحدة"
       2        -> "نتيجتان"
       3..10    -> "٧ نتائج"
       11+      -> "١٥ نتيجة"                                        */
  function plural(n, forms, opts) {
    opts = opts || {};
    var num = formatNum(n, opts.latin ? false : true);
    if (n === 0) return opts.zero || ("لا " + forms[2]);
    if (n === 1) return opts.one || (forms[0] + " واحدة");
    if (n === 2) return forms[1];
    var mod100 = n % 100;
    if (mod100 >= 3 && mod100 <= 10) return num + " " + forms[2];
    return num + " " + forms[3];
  }

  var COUNT_WORDS = {
    result: ["نتيجة", "نتيجتان", "نتائج", "نتيجة"],
    screen: ["شاشة", "شاشتان", "شاشات", "شاشة"],
    system: ["نظام", "نظامان", "أنظمة", "نظاماً"]
  };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---- إنشاء عنصر DOM من HTML ---- */
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  }

  root.OnyxUtil = {
    normalizeArabic: normalizeArabic,
    slugify: slugify,
    debounce: debounce,
    escapeHtml: escapeHtml,
    highlight: highlight,
    fuzzyScore: fuzzyScore,
    relTime: relTime,
    formatNum: formatNum,
    plural: plural,
    COUNT_WORDS: COUNT_WORDS,
    clamp: clamp,
    el: el
  };
})(window);
