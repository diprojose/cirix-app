"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BrandProfile } from "../application/brand-profile";
import { DEFAULT_BRAND_PROFILE } from "../infrastructure/brand-profile-seed";

type BrandContextValue = {
  profile: BrandProfile;
  /** Unlocalized base path for a shareable client demo. */
  basePath: string | null;
};

const BrandContext = createContext<BrandContextValue>({
  profile: DEFAULT_BRAND_PROFILE,
  basePath: null,
});

export function BrandProvider({
  profile,
  basePath = null,
  children,
}: {
  profile: BrandProfile;
  basePath?: string | null;
  children: ReactNode;
}) {
  return (
    <BrandContext.Provider value={{ profile, basePath }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand(): BrandContextValue {
  return useContext(BrandContext);
}

const STOREFRONT_PREFIXES = [
  "/loyalty",
  "/cart",
  "/checkout",
  "/product",
  "/billetera",
  "/referidos",
  "/notificaciones",
  "/orders",
  "/login",
];

/** Keeps internal commerce links inside the current client's branded demo. */
export function brandHref(href: string, basePath: string | null): string {
  if (!basePath || !href.startsWith("/")) return href;
  const suffixIndex = href.search(/[?#]/);
  const pathname = suffixIndex === -1 ? href : href.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : href.slice(suffixIndex);
  const match = STOREFRONT_PREFIXES.find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!match) return href;
  if (match === "/loyalty") {
    return `${basePath}/home${pathname.slice(match.length)}${suffix}`;
  }
  return `${basePath}${href}`;
}
