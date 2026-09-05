"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { localizeHref } from "@/lib/locale";
import { useLocale } from "@/components/locale-provider";
import { brandHref, useBrand } from "@/modules/loyalty/branding/ui/brand-provider";

type LinkProps = ComponentProps<typeof Link>;

export function LocalizedLink({ href, ...props }: LinkProps) {
  const locale = useLocale();
  const { basePath } = useBrand();
  const resolvedHref =
    typeof href === "string"
      ? localizeHref(locale, brandHref(href, basePath))
      : href;

  return <Link href={resolvedHref} {...props} />;
}
