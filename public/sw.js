/*
 * Storefront service worker.
 *
 * Provides the offline capability required for an installable PWA:
 *  - Pre-caches a minimal app shell on install.
 *  - Serves navigations network-first with an offline fallback.
 *  - Serves static assets stale-while-revalidate.
 *  - Ships push + notification handlers so web push can be enabled later.
 *
 * Bump CACHE_VERSION on any change so old caches are purged on activation.
 */
const CACHE_VERSION = "v6";
const CACHE_NAME = `mixmag-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

// App-shell resources cached up front so the app opens without a network.
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest"];

// Keep this list aligned with lib/locale.ts. The service worker is a static
// public asset, so it cannot import application modules.
const SUPPORTED_LOCALES = new Set(["es", "en"]);

// Private/subscriber routes whose responses must never be cached. Classification
// happens after locale and white-label demo prefixes have been removed.
const PRIVATE_PATH_PREFIXES = [
  "/billetera",
  "/orders",
  "/checkout",
  "/admin",
  "/notificaciones",
  "/referidos",
];

function normalizeAppPath(pathname) {
  let decodedPathname = pathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    // Keep the original path when the URL contains malformed escapes.
  }

  const segments = decodedPathname
    .replace(/\/{2,}/g, "/")
    .split("/")
    .filter(Boolean);

  if (SUPPORTED_LOCALES.has((segments[0] || "").toLowerCase())) {
    segments.shift();
  }

  // /demo/{brandSlug}/... mirrors the regular application routes.
  if ((segments[0] || "").toLowerCase() === "demo" && segments.length >= 2) {
    segments.splice(0, 2);
  }

  return `/${segments.join("/")}`.toLowerCase();
}

function isPrivatePath(pathname) {
  const normalizedPath = normalizeAppPath(pathname);
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) =>
      normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );
}

function isApiPath(pathname) {
  const normalizedPath = normalizeAppPath(pathname);
  return normalizedPath === "/api" || normalizedPath.startsWith("/api/");
}

function isCacheableStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname === "/_next/image" ||
    pathname.startsWith("/brand/") ||
    pathname.startsWith("/products/") ||
    /^\/(?:apple-)?icon(?:-[^/]+)?\.(?:png|svg|webp)$/.test(pathname) ||
    /^\/(?:es|en)\/demo\/[^/]+\/app-icon\.png$/.test(pathname)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests; let everything else hit the network.
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Classify before checking request.mode. This also protects RSC and client
  // fetches whose URL is a private page but whose mode is not "navigate".
  // Network-only means these responses are never read from or written to Cache.
  if (isApiPath(url.pathname) || isPrivatePath(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  // Dynamic HTML is always network-only. The offline document is the sole
  // fallback; personalized page output must never be replayed from Cache.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          return (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })()
    );
    return;
  }

  // RSC/client fetches and any unknown GET stay network-only. Only immutable or
  // explicitly public visual assets use stale-while-revalidate.
  if (!isCacheableStaticAsset(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  // Static public assets: stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })()
  );
});

// --- Web Push (ready to use once VAPID keys and subscriptions are wired up) ---
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "Nueva notificación", {
      body: data.body,
      icon: data.icon || "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: data.data || {},
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.openWindow(target));
});
