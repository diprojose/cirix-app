const PUBLIC_ASSETS = new Set([
  "/robots.txt", "/sitemap.xml",
  "/favicon.ico", "/icon.png", "/apple-icon.png", "/manifest.webmanifest", "/sw.js",
  "/icon-192x192.png", "/icon-512x512.png", "/icon-maskable-192x192.png", "/icon-maskable-512x512.png",
  "/og.png", "/file.svg", "/globe.svg", "/next.svg", "/vercel.svg", "/window.svg", "/pixel.js",
]);

/** Exact public pages; nested module routes remain private by default. */
export function isPublicPage(pathname: string): boolean {
  return pathname === "/" || pathname === "/login" || pathname === "/privacy";
}

/** These exact pages accept any verified Firebase account, without module access. */
export function isReviewPage(pathname: string): boolean {
  return pathname === "/review" || pathname === "/make-a-review";
}

/**
 * Customer and business areas. Any verified account may open them, so every page
 * and API behind them must also authorize the person for the specific business:
 * - /me and /me/cards/<slug>: the person's own area and one of their cards.
 * - /b/<slug>: the join page a business QR code opens.
 * - /biz/<slug>[/...]: the business dashboard; its layout enforces membership.
 */
export function isMemberPage(pathname: string): boolean {
  return /^\/me(?:\/(?:cards|points)\/[a-z0-9-]+)?\/?$/i.test(pathname) ||
    /^\/b\/[a-z0-9-]+\/?$/i.test(pathname) ||
    /^\/biz\/[a-z0-9-]+(?:\/.*)?$/i.test(pathname);
}

/**
 * True for pages that need an administrator-admitted (platform) account. The
 * root layout enforces this as a second barrier behind the proxy, so both must
 * agree on which pages are open to other kinds of verified accounts.
 */
export function requiresPlatformAccess(pathname: string): boolean {
  return !isPublicPage(pathname) && !isReviewPage(pathname) && !isMemberPage(pathname);
}

/** Member-area APIs; each handler authorizes against one specific business. */
export function isMemberApi(pathname: string): boolean {
  return pathname.startsWith("/api/member/");
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
