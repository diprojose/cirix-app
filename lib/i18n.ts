import { headers } from "next/headers";
export {
  DEFAULT_LOCALE,
  LOCALES,
  detectPreferredLocale,
  hasLocale,
  localizeHref,
  pick,
  stripLocaleFromPathname,
} from "@/lib/locale";
import { DEFAULT_LOCALE, hasLocale, localizeHref } from "@/lib/locale";
import type { Locale } from "@/lib/locale";

export async function getCurrentLocale(): Promise<Locale> {
  const headerStore = await headers();
  const value = headerStore.get("x-mixmag-locale") ?? DEFAULT_LOCALE;
  return hasLocale(value) ? value : DEFAULT_LOCALE;
}

export async function localizeForCurrentRequest(path: string): Promise<string> {
  return localizeHref(await getCurrentLocale(), path);
}
