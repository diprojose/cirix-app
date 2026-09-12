/* CIRIX Pixel v1. No storage or collection until the host CMP grants analytics. */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.cirixPixel) return;
  var siteId = script.getAttribute("data-site");
  if (!/^[0-9a-f-]{36}$/i.test(siteId || "")) return;
  var endpoint = new URL("/api/pixels/collect", script.src);
  endpoint.searchParams.set("siteId", siteId);
  var key = "cirix-pixel:" + siteId;
  var allowed = false, marketing = false, version = "1", visitorId, sessionId;
  var names = ["page_view", "view_item", "add_to_cart", "begin_checkout", "purchase", "generate_lead", "contact"];
  function uuid() { return crypto.randomUUID(); }
  function storage(name, suffix, remove) {
    try {
      var store = window[name];
      if (remove) { store.removeItem(key + suffix); return; }
      var existing = JSON.parse(store.getItem(key + suffix) || "null");
      if (existing && existing.expires > Date.now() && /^[0-9a-f-]{36}$/i.test(existing.id)) return existing.id;
      var id = uuid();
      store.setItem(key + suffix, JSON.stringify({ id: id, expires: Date.now() + (name === "localStorage" ? 90 * 86400000 : 30 * 60000) }));
      return id;
    } catch { return remove ? undefined : (suffix === ":visitor" ? visitorId : sessionId) || uuid(); }
  }
  function blocked() { return navigator.globalPrivacyControl === true || navigator.doNotTrack === "1"; }
  function reset() {
    allowed = false; marketing = false; visitorId = undefined; sessionId = undefined;
    storage("localStorage", ":visitor", true); storage("sessionStorage", ":session", true);
  }
  function track(name, properties) {
    if (!allowed || blocked() || names.indexOf(name) === -1) return false;
    properties = properties || {};
    visitorId = storage("localStorage", ":visitor");
    sessionId = storage("sessionStorage", ":session");
    var campaign = {}, clickIds = {}, query = new URL(location.href).searchParams;
    ["source", "medium", "campaign"].forEach(function (field) {
      var value = query.get("utm_" + field);
      if (value && value.length <= 160 && /^[\w .~+-]*$/.test(value)) campaign[field] = value;
    });
    if (marketing) ["gclid", "fbclid", "ttclid"].forEach(function (field) {
      var value = query.get(field);
      if (value && value.length <= 256 && /^[\w.-]+$/.test(value)) clickIds[field] = value;
    });
    var payload = { siteId: siteId, eventId: properties.eventId || uuid(), visitorId: visitorId, sessionId: sessionId, name: name,
      pagePath: location.pathname, campaign: campaign, clickIds: clickIds, consent: { analytics: true, marketing: marketing, version: version } };
    if (typeof properties.value === "number") payload.value = properties.value;
    if (typeof properties.currency === "string") payload.currency = properties.currency;
    return fetch(endpoint.href, { method: "POST", mode: "cors", credentials: "omit", keepalive: true,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (response) { return response.ok; }).catch(function () { return false; });
  }
  window.cirixPixel = {
    consent: function (choice) {
      if (!choice || choice.analytics !== true || blocked()) { reset(); return; }
      var wasAllowed = allowed;
      allowed = true; marketing = choice.marketing === true;
      version = typeof choice.version === "string" && /^[\w.-]{1,40}$/.test(choice.version) ? choice.version : "1";
      if (!wasAllowed) track("page_view");
    },
    track: track,
    revoke: reset
  };
  window.dispatchEvent(new Event("cirix:ready"));
})();
