import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tesseract runs in a worker thread that loads its own files from disk, so it cannot be bundled.
  serverExternalPackages: ["tesseract.js", "tesseract.js-core", "sharp"],
  outputFileTracingIncludes: {
    "/api/member/businesses/*/receipts": [
      "./node_modules/tesseract.js/src/**/*",
      "./node_modules/tesseract.js/package.json",
      "./node_modules/tesseract.js-core/tesseract-core*lstm.wasm*",
      "./node_modules/tesseract.js-core/package.json",
      "./node_modules/@tesseract.js-data/eng/4.0.0_best_int/**/*",
      "./node_modules/{bmp-js,is-url,node-fetch,regenerator-runtime,wasm-feature-detect,zlibjs,whatwg-url,tr46,webidl-conversions}/**/*",
    ],
  },
  images: {
    // Operators may point product images at external hosts (or Firebase
    // Storage later); the optimizer only ever fetches over https.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      {
        // Baseline security headers for every route.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Firebase's auth iframe must be embeddable by this same origin.
        source: "/__/auth/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      ...["/login", "/:locale(es|en)/login"].map((source) => ({
        source,
        // Email callback URLs contain a one-time credential. Do not send it
        // as a Referer, including to same-origin images or outbound links.
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      })),
      {
        // The service worker must always be revalidated so users get updates.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        // Authentication endpoints must never be cached by any layer.
        source: "/api/auth/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
