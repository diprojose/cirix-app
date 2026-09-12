const PUBLIC_ASSETS = new Set([
  "/favicon.ico", "/icon.png", "/apple-icon.png", "/manifest.webmanifest", "/sw.js",
  "/icon-192x192.png", "/icon-512x512.png", "/icon-maskable-192x192.png", "/icon-maskable-512x512.png",
  "/og.png", "/file.svg", "/globe.svg", "/next.svg", "/vercel.svg", "/window.svg",
]);

/** Public build/brand assets are explicit; module URLs with extensions stay private. */
export function isPublicAsset(pathname: string): boolean {
  return PUBLIC_ASSETS.has(pathname) || pathname.startsWith("/brand/") || pathname.startsWith("/products/");
}

/** These endpoints enforce session exchange, signed service calls or public marketing intake validation. */
export function isServiceEndpoint(pathname: string): boolean {
  return [
    "/api/auth/session",
    "/api/contact",
    "/api/webhooks/twilio/voice",
    "/api/webhooks/twilio/call-status",
    "/api/cron/rewards",
  ].includes(pathname);
}
