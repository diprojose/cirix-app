import type { Metadata } from "next";
import Link from "next/link";
import { CONTAINER, CONTAINER_READ } from "@/components/store/layout";
import { MVP_MODULES } from "@/shared/mvp-modules";

export const metadata: Metadata = {
  title: "MVP Modules",
  description: "Select the active Mixmag MVP demo modules from a single landing page.",
};

export default function ModulesLandingPage() {
  return (
    <main className="min-h-dvh bg-bg pb-12">
      <section className="border-b border-border bg-[radial-gradient(circle_at_top_left,rgba(45,130,73,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(183,99,37,0.16),transparent_34%),linear-gradient(180deg,var(--color-stone-0),var(--color-bg))]">
        <div className={`${CONTAINER} py-8 md:py-14`}>
          <div className="flex items-center justify-between gap-4">
            <p className="rounded-pill bg-surface px-4 py-2 text-caption font-semibold uppercase tracking-[0.18em] text-accent shadow-xs">
              Mixmag modules
            </p>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-pill border border-border bg-surface px-4 text-label font-medium text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] md:items-end">
            <div className="max-w-2xl">
              <p className="text-label font-semibold uppercase tracking-[0.18em] text-action-strong">
                Demo selector
              </p>
              <h1 className="mt-3 text-[clamp(2.6rem,7vw,5.4rem)] font-bold leading-[0.92] tracking-[-0.05em] text-text">
                One landing page for every MVP we want to show.
              </h1>
              <p className="mt-5 max-w-xl text-body text-text-muted md:text-lg">
                The storefront is no longer the default front door. This landing introduces the
                available MVP modules and lets the demo switch cleanly between commerce and CRM
                experiences.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">
                Active demos
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                {MVP_MODULES.map((module) => (
                  <div
                    key={module.slug}
                    className="rounded-lg border border-border bg-bg px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-title font-semibold text-text">{module.title}</p>
                      <span
                        className={`rounded-pill px-2.5 py-1 text-caption font-semibold ${
                          module.accent === "action"
                            ? "bg-action-soft text-action-strong"
                            : "bg-accent-soft text-accent-strong"
                        }`}
                      >
                        {module.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-caption text-text-muted">{module.audience}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${CONTAINER} pt-8 md:pt-12`}>
        <div className="grid gap-4 md:grid-cols-2">
          {MVP_MODULES.map((module) => (
            <article
              key={module.slug}
              className="flex h-full flex-col rounded-xl border border-border bg-surface p-6 shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-display font-bold tracking-tight text-text">{module.title}</p>
                  <p className="mt-2 text-body text-text-muted">{module.summary}</p>
                </div>
                <span
                  className={`rounded-pill px-3 py-1 text-caption font-semibold uppercase tracking-[0.14em] ${
                    module.accent === "action"
                      ? "bg-action-soft text-action-strong"
                      : "bg-accent-soft text-accent-strong"
                  }`}
                >
                  {module.status}
                </span>
              </div>
              <div className="mt-6 flex flex-1 items-end">
                <Link
                  href={module.href}
                  className={`inline-flex min-h-12 items-center justify-center rounded-pill px-5 text-title font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                    module.accent === "action"
                      ? "bg-action-fill text-on-action shadow-action hover:bg-action-strong focus-visible:ring-action-fill"
                      : "bg-accent-fill text-on-accent shadow-accent hover:bg-accent-strong focus-visible:ring-accent-fill"
                  }`}
                >
                  Open module
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${CONTAINER_READ} pt-8 md:pt-12`}>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
            Built to expand
          </p>
          <p className="mt-3 text-body text-text-muted">
            The landing is driven by a typed module dataset so more MVPs can be added without
            turning the home route back into a one-off screen.
          </p>
        </div>
      </section>
    </main>
  );
}
