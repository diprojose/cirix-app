"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { localizeHref } from "@/lib/locale";
import { useLocale } from "@/components/locale-provider";

type LinkProps = ComponentProps<typeof Link>;

export function LocalizedLink({ href, ...props }: LinkProps) {
  const locale = useLocale();
  const resolvedHref = typeof href === "string" ? localizeHref(locale, href) : href;

  return <Link href={resolvedHref} {...props} />;
}
