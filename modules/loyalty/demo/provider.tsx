"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocale } from "@/components/locale-provider";
import type { BrandProfile } from "../branding/application/brand-profile";
import { BrandTheme } from "../branding/ui/brand-theme";
import { createDemoStore } from "./store";

type DemoContextValue = ReturnType<
  ReturnType<typeof createDemoStore>["getSnapshot"]
> & {
  dispatch: ReturnType<typeof createDemoStore>["dispatch"];
  reset: () => void;
  basePath: string;
  t: (es: string, en: string) => string;
  money: (cents: number) => string;
};
const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({
  brand,
  children,
}: {
  brand: BrandProfile;
  children: ReactNode;
}) {
  const [store] = useState(() => createDemoStore(brand));
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const locale = useLocale();
  useEffect(() => {
    document.title = snapshot.state.brand.displayName;
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content");
    meta?.setAttribute("content", snapshot.state.brand.primaryColor);
    return () => {
      if (previous) meta?.setAttribute("content", previous);
    };
  }, [snapshot.state.brand.displayName, snapshot.state.brand.primaryColor]);
  return (
    <DemoContext.Provider
      value={{
        ...snapshot,
        dispatch: store.dispatch,
        reset: store.reset,
        basePath: `/${locale}/demo/${brand.slug}`,
        t: (es, en) => (locale === "es" ? es : en),
        money: (cents) =>
          new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", {
            style: "currency",
            currency: "USD",
          }).format(cents / 100),
      }}
    >
      <BrandTheme
        profile={snapshot.state.brand}
        basePath={`/demo/${brand.slug}`}
      >
        {children}
      </BrandTheme>
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("DemoProvider is required");
  return value;
}
