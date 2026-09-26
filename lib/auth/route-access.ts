const PUBLIC_ASSETS = new Set([
  "/robots.txt", "/sitemap.xml",
  "/favicon.ico", "/icon.png", "/apple-icon.png", "/manifest.webmanifest", "/sw.js",
  "/icon-192x192.png", "/icon-512x512.png", "/icon-maskable-192x192.png", "/icon-maskable-512x512.png",
  "/og.png", "/file.svg", "/globe.svg", "/next.svg", "/vercel.svg", "/window.svg", "/pixel.js",
]);

/** Exact public pages; nested module routes remain private by default. */
export function isPublicPage(pathname: string): boolean {
  return pathname === "/" || pathname === "/login";
}

/** These exact pages accept any verified Firebase account, without module access. */
export function isReviewPage(pathname: string): boolean {
  return pathname === "/review" || pathname === "/make-a-review";
}

/** Public build/brand assets are explicit; module URLs with extensions stay private. */
export function isPublicAsset(pathname: string): boolean {
  return PUBLIC_ASSETS.has(pathname) || pathname.startsWith("/brand/") || pathname.startsWith("/products/");
}

/** These endpoints enforce session exchange, signed service calls or public marketing intake validation. */
export function isServiceEndpoint(pathname: string): boolean {
  return [
    "/api/auth/session",
    "/api/contact",
    "/api/reviews/events",
    "/api/pixels/collect",
    "/api/webhooks/twilio/voice",
    "/api/webhooks/twilio/call-status",
    "/api/webhooks/resend",
    "/api/cron/rewards",
  ].includes(pathname);
}
