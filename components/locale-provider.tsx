"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { stripLocaleFromPathname, type Locale } from "@/lib/locale";

const LocaleContext = createContext<Locale>("es");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const routeLocale = stripLocaleFromPathname(pathname).locale ?? locale;

  useEffect(() => {
    document.documentElement.lang = routeLocale;
  }, [routeLocale]);

  return <LocaleContext.Provider value={routeLocale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
