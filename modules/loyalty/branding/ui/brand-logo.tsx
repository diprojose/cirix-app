"use client";

import Image from "next/image";
import { useBrand } from "./brand-provider";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  const { profile } = useBrand();

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {profile.logoUrl ? (
        <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
          <Image
            src={profile.logoUrl}
            alt=""
            fill
            sizes="40px"
            unoptimized={profile.logoUrl.startsWith("https://")}
            className="object-contain p-1"
          />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-fill text-lg font-black text-on-accent"
        >
          {profile.displayName.slice(0, 1).toUpperCase()}
        </span>
      )}
      {!compact && (
        <span className="truncate font-heading text-lg font-extrabold tracking-[-0.03em] text-text">
          {profile.displayName}
        </span>
      )}
    </span>
  );
}
