/* CIRIX Pixel v2. Collection and storage require analytics consent. */
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
  var visitorExpiry = 0, sessionExpiry = 0, attribution, campaign = {}, clickIds = {};
  var activePath, activeMs = 0, lastTick = 0, lastInput = 0, scrollReached = 0;
  var names = ["page_view", "view_item", "add_to_cart", "begin_checkout", "purchase", "generate_lead", "contact", "engagement", "scroll"];
  function blocked() { return navigator.globalPrivacyControl === true || navigator.doNotTrack === "1"; }
  function read(store, suffix) { try { return JSON.parse(window[store].getItem(key + suffix) || "null"); } catch { return null; } }
  function write(store, suffix, value) { try { window[store].setItem(key + suffix, JSON.stringify(value)); } catch { /* Memory fallback. */ } }
  function remove(store, suffix) { try { window[store].removeItem(key + suffix); } catch { /* No storage. */ } }
  function validPath(path) { return typeof path === "string" && path.length <= 500 && /^\/(?!\/)[^?#\s\\]*$/.test(path); }
  function campaignFields(source) {
    var result = {};
    ["source", "medium", "campaign"].forEach(function (field) {
      var value = source && source[field];
      if (typeof value === "string" && value.length <= 160 && /^[\w .~+-]*$/.test(value)) result[field] = value;
    });
    return result;
  }
  function adFields(source) {
    var result = {};
    if (marketing) ["gclid", "fbclid", "ttclid"].forEach(function (field) {
      var value = source && source[field];
      if (typeof value === "string" && value.length <= 256 && /^[\w.-]+$/.test(value)) result[field] = value;
    });
    return result;
  }
  function saveAttribution() {
    write("sessionStorage", ":attribution", { sessionId: sessionId, campaign: campaign, clickIds: clickIds, attribution: attribution });
  }
  function identity() {
    var now = Date.now(), saved;
    if (!visitorId || visitorExpiry <= now) {
      saved = read("localStorage", ":visitor");
      visitorId = saved && saved.expires > now && /^[0-9a-f-]{36}$/i.test(saved.id) ? saved.id : crypto.randomUUID();
      visitorExpiry = saved && saved.id === visitorId ? saved.expires : now + 90 * 86400000;
      write("localStorage", ":visitor", { id: visitorId, expires: visitorExpiry });
    }
    if (!sessionId || sessionExpiry <= now) {
      saved = read("sessionStorage", ":session");
      var next = saved && saved.expires > now && /^[0-9a-f-]{36}$/i.test(saved.id) ? saved.id : crypto.randomUUID();
      if (next !== sessionId) {
        sessionId = next;
        var prior = read("sessionStorage", ":attribution");
        campaign = {}; clickIds = {}; attribution = { landingPath: location.pathname };
        if (prior && prior.sessionId === sessionId && prior.attribution && validPath(prior.attribution.landingPath)) {
          campaign = campaignFields(prior.campaign); clickIds = adFields(prior.clickIds);
          attribution.landingPath = prior.attribution.landingPath;
          if (/^[a-zA-Z0-9.-]{1,253}$/.test(prior.attribution.referrerHost || "")) attribution.referrerHost = prior.attribution.referrerHost;
        } else {
          var query = new URL(location.href).searchParams, raw = {}, ads = {};
          ["source", "medium", "campaign"].forEach(function (field) { raw[field] = query.get("utm_" + field); });
          ["gclid", "fbclid", "ttclid"].forEach(function (field) { ads[field] = query.get(field); });
          campaign = campaignFields(raw); clickIds = adFields(ads);
          try {
            var ref = new URL(document.referrer);
            if (/^https?:$/.test(ref.protocol) && ref.hostname !== new URL(location.href).hostname && /^[a-zA-Z0-9.-]{1,253}$/.test(ref.hostname)) attribution.referrerHost = ref.hostname;
          } catch { /* No referrer is not proof of direct traffic. */ }
        }
      }
    }
    sessionExpiry = now + 30 * 60000;
    write("sessionStorage", ":session", { id: sessionId, expires: sessionExpiry });
    saveAttribution();
  }
  function context() {
    var ua = navigator.userAgent || "", result = {
      device: /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) ? "tablet" : /Mobi|iPhone|iPod/i.test(ua) ? "mobile" : ua ? "desktop" : "unknown",
      browser: /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Chrome|CriOS/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Other",
      os: /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Macintosh|Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Other"
    };
    if (/^[a-zA-Z0-9-]{1,35}$/.test(navigator.language || "")) result.language = navigator.language;
    return result;
  }
  function reset() {
    allowed = false; marketing = false; visitorId = undefined; sessionId = undefined;
    visitorExpiry = 0; sessionExpiry = 0; attribution = undefined; campaign = {}; clickIds = {};
    activeMs = 0; activePath = undefined; scrollReached = 0; lastTick = 0; lastInput = 0;
    remove("localStorage", ":visitor"); remove("sessionStorage", ":session"); remove("sessionStorage", ":attribution");
  }
  function track(name, properties, path) {
    if (!allowed || blocked() || names.indexOf(name) === -1) return false;
    properties = properties || {};
    if (!validPath(path || location.pathname)) return false;
    if (name === "page_view") {
      flush(); activePath = location.pathname; activeMs = 0; scrollReached = 0; lastTick = Date.now(); lastInput = lastTick;
    }
    identity();
    var payload = { siteId: siteId, eventId: properties.eventId || crypto.randomUUID(), visitorId: visitorId, sessionId: sessionId, name: name,
      pagePath: path || location.pathname, campaign: campaign, clickIds: marketing ? clickIds : {}, attribution: attribution, context: context(),
      consent: { analytics: true, marketing: marketing, version: version } };
    if (typeof properties.value === "number") payload.value = properties.value;
    if (typeof properties.currency === "string") payload.currency = properties.currency;
    if (["whatsapp", "phone", "email", "form", "other"].indexOf(properties.contactChannel) !== -1) payload.contactChannel = properties.contactChannel;
    if (name === "engagement" && Number.isInteger(properties.engagementMs) && properties.engagementMs >= 0 && properties.engagementMs <= 60000) payload.engagementMs = properties.engagementMs;
    if (name === "scroll" && [25, 50, 75, 100].indexOf(properties.scrollPercent) !== -1) payload.scrollPercent = properties.scrollPercent;
    return fetch(endpoint.href, { method: "POST", mode: "cors", credentials: "omit", keepalive: true,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (response) { return response.ok; }).catch(function () { return false; });
  }
  function tick() {
    var now = Date.now();
    if (allowed && !blocked() && document.visibilityState !== "hidden" && (!document.hasFocus || document.hasFocus()) && lastTick && now - lastInput < 60000) activeMs += Math.max(0, Math.min(now - lastTick, 2000));
    lastTick = now;
  }
  function flush() {
    if (activeMs > 0 && activePath) {
      var duration = Math.min(60000, Math.round(activeMs)); activeMs = 0;
      track("engagement", { engagementMs: duration }, activePath);
    }
  }
  window.cirixPixel = {
    version: 2,
    consent: function (choice) {
      if (!choice || choice.analytics !== true || blocked()) { reset(); return; }
      var wasAllowed = allowed, wasMarketing = marketing;
      allowed = true; marketing = choice.marketing === true;
      version = typeof choice.version === "string" && /^[\w.-]{1,40}$/.test(choice.version) ? choice.version : "1";
      if (!marketing) clickIds = {};
      if (wasAllowed && marketing && !wasMarketing) {
        var query = new URL(location.href).searchParams, ads = {};
        ["gclid", "fbclid", "ttclid"].forEach(function (field) { ads[field] = query.get(field); });
        clickIds = adFields(ads);
      }
      if (wasAllowed) saveAttribution();
      if (!wasAllowed) track("page_view");
    },
    track: track,
    revoke: reset
  };
  if (document.addEventListener) {
    ["pointerdown", "keydown", "mousemove", "scroll"].forEach(function (name) {
      document.addEventListener(name, function () { if (allowed && !blocked()) lastInput = Date.now(); }, { passive: true });
    });
    document.addEventListener("scroll", function () {
      if (!allowed || blocked() || !activePath || activePath !== location.pathname) return;
      var root = document.documentElement, height = root.scrollHeight - window.innerHeight;
      if (height <= 0) return;
      var percent = Math.min(100, Math.round((window.scrollY || root.scrollTop || 0) / height * 100));
      var milestone = Math.floor(percent / 25) * 25;
      if (milestone > scrollReached) { scrollReached = milestone; track("scroll", { scrollPercent: milestone }); }
    }, { passive: true });
    document.addEventListener("click", function (event) {
      if (!allowed || blocked()) return;
      var target = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!target) return;
      var href = target.getAttribute("href") || "", channel;
      if (/^tel:/i.test(href)) channel = "phone";
      else if (/^mailto:/i.test(href)) channel = "email";
      else { try { var url = new URL(href, location.href); if (url.protocol === "https:" && /^(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)$/.test(url.hostname)) channel = "whatsapp"; } catch { /* Invalid URL. */ } }
      if (channel) track("contact", { contactChannel: channel });
    });
    document.addEventListener("visibilitychange", function () { flush(); lastTick = Date.now(); });
  }
  if (window.addEventListener) window.addEventListener("pagehide", flush);
  if (window.setInterval) window.setInterval(function () { tick(); if (activeMs >= 30000) flush(); }, 1000);
  window.dispatchEvent(new Event("cirix:ready"));
})();
