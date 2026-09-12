/* Restricted platform: never store or replay private HTML, RSC, API or demo responses. */
const CACHE_NAME = "cirix-public-assets-v7";
const PRECACHE_URLS = ["/brand/favicon.svg", "/manifest.webmanifest"];

function isCacheableStaticAsset(pathname) {
  return pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/brand/") || pathname.startsWith("/products/") ||
    /^\/(?:apple-)?icon(?:-[^/]+)?\.(?:png|svg|webp)$/.test(pathname);
}
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then((cache) => cache.addAll(PRECACHE_URLS))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate" || !isCacheableStaticAsset(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const network = fetch(request).then(async (response) => {
      if (response.status === 200 && !response.redirected &&
          !/private|no-store/i.test(response.headers.get("cache-control") || "")) {
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(() => cached || Response.error());
    event.waitUntil(network);
    return cached || network;
  })());
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
