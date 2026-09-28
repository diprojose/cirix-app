const INTERNAL_ORIGIN = "https://internal.invalid";

/** Accept only local destinations, excluding login loops and URL ambiguities. */
export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") ||
      value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN || /^\/(?:es\/|en\/)?login(?:\/|$)/.test(parsed.pathname)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
