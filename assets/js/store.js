/* ============================================================================
   ONYX ERP — التخزين المحلي + ناقل الأحداث (تفضيلات المستخدم فقط، لا بيانات أعمال)
   المفاتيح تحت المسافة  onyx.v1.*
   ========================================================================== */
(function (root) {
  "use strict";

  var NS = "onyx.v1.";
  var RECENT_MAX = 15;
  var mem = {};                 // بديل في الذاكرة عند تعطّل localStorage
  var storageOK = (function () {
    try { var k = NS + "__t"; localStorage.setItem(k, "1"); localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  })();

  function read(key, fallback) {
    try {
      var raw = storageOK ? localStorage.getItem(NS + key) : mem[key];
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    var raw = JSON.stringify(value);
    try { if (storageOK) localStorage.setItem(NS + key, raw); else mem[key] = raw; }
    catch (e) { mem[key] = raw; }
  }

  /* ---- ناقل أحداث صغير ---- */
  var listeners = {};
  function on(evt, cb) {
    (listeners[evt] || (listeners[evt] = [])).push(cb);
    return function off() {
      listeners[evt] = (listeners[evt] || []).filter(function (f) { return f !== cb; });
    };
  }
  function emit(evt, data) {
    (listeners[evt] || []).forEach(function (cb) { try { cb(data); } catch (e) { console.error(e); } });
  }

  var Store = {
    storageOK: storageOK,
    on: on, emit: emit,

    /* ---- السمة: system | light | dark ---- */
    getThemePref: function () { return read("themePref", "system"); },
    setThemePref: function (t) { write("themePref", t); emit("theme", t); },

    /* ---- الكثافة: comfortable | compact ---- */
    getDensity: function () { return read("density", "comfortable"); },
    setDensity: function (d) { write("density", d); emit("density", d); },

    /* ---- شريط الأنظمة موسّع؟ ---- */
    getRailExpanded: function () { return read("railExpanded", false); },
    setRailExpanded: function (v) { write("railExpanded", !!v); emit("rail", !!v); },

    /* ---- لوحة الشجرة مطويّة؟ افتراضياً نعم ---- */
    getTreeCollapsed: function () { return read("treeCollapsed", true); },
    setTreeCollapsed: function (v) { write("treeCollapsed", !!v); emit("treePane", !!v); },

    /* ---- عرض لوحة الشجرة ---- */
    getTreeWidth: function () { return read("treeWidth", 320); },
    setTreeWidth: function (px) { write("treeWidth", px); },

    /* ---- آخر مسار / آخر نظام ---- */
    getLastRoute: function () { return read("lastRoute", null); },
    setLastRoute: function (h) { write("lastRoute", h); },
    getLastModule: function () { return read("lastModule", null); },
    setLastModule: function (id) { write("lastModule", id); },

    /* ---- مجموعة العُقد المفتوحة لكل نظام ---- */
    getExpanded: function (moduleId) { return read("expanded." + moduleId, null); },
    setExpanded: function (moduleId, arr) { write("expanded." + moduleId, arr); },

    /* ---- المفضلة: مصفوفة مسارات (نصوص) ---- */
    getFavorites: function () { return read("favorites", []); },
    isFavorite: function (path) { return this.getFavorites().indexOf(path) !== -1; },
    toggleFavorite: function (path) {
      var f = this.getFavorites();
      var i = f.indexOf(path), added;
      if (i !== -1) { f.splice(i, 1); added = false; }
      else { f.push(path); added = true; }
      write("favorites", f); emit("favorites", f);
      return added;
    },

    /* ---- آخر ما فُتح: [{path, ts}] ---- */
    getRecent: function () { return read("recent", []); },
    pushRecent: function (path) {
      var list = this.getRecent().filter(function (r) { return r.path !== path; });
      list.unshift({ path: path, ts: Date.now() });
      if (list.length > RECENT_MAX) list = list.slice(0, RECENT_MAX);
      write("recent", list); emit("recent", list);
    },
    clearRecent: function () { write("recent", []); emit("recent", []); }
  };

  root.OnyxStore = Store;
})(window);
