/** عميل API — مرحلة ح. إن لم يعمل الخادم تبقى اللقطة. */
(function (root) {
  var BASE = root.STARTYX_API || "http://127.0.0.1:8787";
  var online = null;

  function parseJson(r) {
    return r.text().then(function (t) {
      var j = {};
      try { j = t ? JSON.parse(t) : {}; } catch (e) { j = { error: "BAD_JSON", message: t }; }
      if (!r.ok) throw j;
      return j;
    });
  }

  function get(path) {
    return fetch(BASE + path).then(parseJson);
  }

  function post(path, body) {
    return fetch(BASE + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(parseJson);
  }

  root.StartyxApi = {
    base: BASE,
    isOnline: function () { return online === true; },
    health: function () {
      return get("/api/health").then(function (j) {
        online = true;
        return j;
      }).catch(function (e) {
        online = false;
        throw e;
      });
    },
    ping: function () {
      return get("/api/health").then(function (j) {
        online = true;
        return j;
      }).catch(function () {
        online = false;
        return null;
      });
    },
    postDocument: function (body) {
      return post("/api/documents/post", body);
    },
    lastDocument: function (screen) {
      var q = "/api/documents?last=1";
      if (screen) q += "&screen=" + encodeURIComponent(screen);
      return get(q);
    },
    document: function (id) {
      return get("/api/documents/" + id);
    },
    recon: function () {
      return get("/api/migration/recon");
    },
    facts: function () {
      return get("/api/migration/facts");
    },
    counts: function () {
      return get("/api/masters/counts");
    },
    tax: function (body) {
      return post("/api/engines/tax", body);
    },
    costing: function (body) {
      return post("/api/engines/costing", body);
    },
  };
})(window);
