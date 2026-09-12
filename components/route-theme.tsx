"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DEFAULT_BRAND_PROFILE } from "@/modules/loyalty/branding/infrastructure/brand-profile-seed";
import { BrandTheme } from "@/modules/loyalty/branding/ui/brand-theme";

const COMMERCE_ROUTE =
  /^\/(?:loyalty|cart|checkout|product|billetera|referidos|notificaciones|orders|offline)(?:\/|$)/;

/** Keeps the legacy Cirix workspace theme isolated from the loyalty store. */
export function RouteTheme({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const barePath = pathname.replace(/^\/(?:es|en)(?=\/|$)/, "") || "/";
  // Demo layouts own their live, visitor-specific theme.
  const isStorefront = COMMERCE_ROUTE.test(barePath);

  if (!isStorefront) return children;

  return <BrandTheme profile={DEFAULT_BRAND_PROFILE}>{children}</BrandTheme>;
}
