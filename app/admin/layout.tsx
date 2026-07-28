import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireOperator } from "@/lib/auth/dal";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { template: "%s · Panel mixmag", default: "Panel de operador" },
  robots: { index: false, follow: false },
};

/**
 * Admin shell (server layout): enforces the operator guard for every /admin
 * page — guests go to login, non-operators back to the storefront — and frames
 * the section with its own header and tab navigation. Each admin server action
 * re-checks the guard on its own; this layout is UX, the actions are the wall.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await requireOperator();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-text">Panel de operador</p>
            <p className="truncate text-xs text-text-muted">{viewer.email}</p>
          </div>
          <Link
            href="/loyalty"
            className="shrink-0 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-stone-100"
          >
            ← Tienda
          </Link>
        </div>
        <div className="mx-auto w-full max-w-3xl px-5 pb-3">
          <AdminNav />
        </div>
      </header>

      <main className="flex-1 pb-16">
        <div className="mx-auto w-full max-w-3xl px-5 pt-5">{children}</div>
      </main>
    </div>
  );
}
