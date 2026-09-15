export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
const INTERNAL_PATH = /^\/(?!\/)/;

export function hasLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function pick<T>(locale: Locale, copy: Record<Locale, T>): T {
  return copy[locale];
}

export function localizeHref(locale: Locale, href: string): string {
  if (!INTERNAL_PATH.test(href)) return href;

  const [pathWithQuery, hash = ""] = href.split("#");
  const [pathname, search = ""] = pathWithQuery.split("?");
  const normalized = pathname === "/" ? "" : pathname;
  const withLocale = hasLocale(normalized.split("/")[1] ?? "")
    ? pathname
    : `/${locale}${normalized}`;

  return `${withLocale}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
}

export function stripLocaleFromPathname(pathname: string): {
  locale: Locale | null;
  pathname: string;
} {
  const segments = pathname.split("/");
  const candidate = segments[1] ?? "";
  if (!hasLocale(candidate)) {
    return { locale: null, pathname };
  }

  const stripped = `/${segments.slice(2).join("/")}`.replace(/\/+/g, "/");
  return { locale: candidate, pathname: stripped === "/" ? "/" : stripped.replace(/\/$/, "") || "/" };
}

export function detectPreferredLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const preferences = acceptLanguage.toLowerCase().split(",").map((entry) => {
    const [tag, ...parameters] = entry.trim().split(";");
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    return {
      locale: tag.split("-")[0],
      quality: quality ? Number(quality.trim().slice(2)) : 1,
    };
  }).sort((a, b) => b.quality - a.quality);

  for (const preference of preferences) {
    if (hasLocale(preference.locale) && preference.quality > 0) return preference.locale;
  }
  return DEFAULT_LOCALE;
}
