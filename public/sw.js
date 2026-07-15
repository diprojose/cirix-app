/*
 * mixmag service worker.
 *
 * Provides the offline capability required for an installable PWA:
 *  - Pre-caches a minimal app shell on install.
 *  - Serves navigations network-first with an offline fallback.
 *  - Serves static assets stale-while-revalidate.
 *  - Ships push + notification handlers so web push can be enabled later.
 *
 * Bump CACHE_VERSION on any change so old caches are purged on activation.
 */
const CACHE_VERSION = "v2";
const CACHE_NAME = `mixmag-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

// App-shell resources cached up front so the app opens without a network.
const PRECACHE_URLS = ["/", OFFLINE_URL, "/manifest.webmanifest"];

// Private/subscriber routes whose responses must never be cached (authenticated
// content and recipes). These are served network-only.
const PRIVATE_PATH_PREFIXES = ["/premium", "/recetas", "/pedidos"];

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
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

  // Never cache API traffic (auth session, and any future authenticated APIs).
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Navigations.
  if (request.mode === "navigate") {
    // Private/subscriber pages: network-only, never cached. Offline → offline page.
    if (isPrivatePath(url.pathname)) {
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

    // Public pages: network-first, cache for offline, fall back to cache/offline.
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, network.clone());
          return network;
        } catch {
          const cached = await caches.match(request);
          return cached || (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })()
    );
    return;
  }

  // Static assets: stale-while-revalidate.
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
    self.registration.showNotification(data.title || "mixmag", {
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
