import type { ReactNode } from "react";
import Image from "next/image";
import { LocalizedLink } from "@/components/localized-link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { pick, type Locale } from "@/lib/locale";

const SIGN_OUT =
  "min-h-11 shrink-0 rounded-pill border border-border bg-surface px-4 py-2 text-label font-medium text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";

/**
 * The frame of Cirix's business administration: the Cirix mark, a way back to
 * the list, and sign-out. Light theme, like the business panel.
 */
export function AdminShell({ locale, back, children }: { locale: Locale; back?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/brand/logo-dark.svg" alt="CIRIX" width={160} height={57} className="h-auto w-16 shrink-0" />
            <span className="hidden truncate text-label font-medium text-text-muted sm:inline">
              {pick(locale, { es: "Administración de negocios", en: "Business administration" })}
            </span>
          </div>
          <SignOutButton className={SIGN_OUT} />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
        {back && (
          <LocalizedLink href="/businesses" className="w-fit text-label font-medium text-accent underline-offset-4 hover:underline">
            ← {pick(locale, { es: "Todos los negocios", en: "All businesses" })}
          </LocalizedLink>
        )}
        {children}
      </main>
    </div>
  );
}

export const KIND_LABEL = {
  restaurant: { es: "Restaurante", en: "Restaurant" },
  supermarket: { es: "Supermercado", en: "Supermarket" },
  other: { es: "Otro", en: "Other" },
} as const;

/** Active or suspended, at a glance. */
export function StatusPill({ locale, status }: { locale: Locale; status: "active" | "suspended" }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-50 px-2.5 py-0.5 text-caption font-medium text-emerald-800">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-600" />
      {pick(locale, { es: "Activo", en: "Active" })}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-stone-200 px-2.5 py-0.5 text-caption font-medium text-stone-700">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-stone-500" />
      {pick(locale, { es: "Suspendido", en: "Suspended" })}
    </span>
  );
}

/** Shown wherever receipt demo mode is on: every check against fraud is off. */
export function DemoPill({ locale }: { locale: Locale }) {
  return (
    <span className="inline-flex items-center rounded-pill bg-amber-100 px-2.5 py-0.5 text-caption font-medium text-amber-900">
      {pick(locale, { es: "Recibos en modo demo", en: "Receipts in demo mode" })}
    </span>
  );
}
