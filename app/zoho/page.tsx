import type { Metadata } from "next";
import Link from "next/link";
import { CONTAINER, CONTAINER_READ } from "@/components/store/layout";

export const metadata: Metadata = {
  title: "Zoho CRM",
  description:
    "A visual CRM MVP showing customer follow-up, pipeline visibility, and operator workflows.",
};

const FEATURE_CARDS = [
  {
    title: "Unified customer view",
    body: "Bring contacts, notes, open opportunities, and recent activity into one operator-facing workspace.",
  },
  {
    title: "Follow-up pipeline",
    body: "Track every account from first contact to conversion with explicit status, owner, and next action.",
  },
  {
    title: "Retention prompts",
    body: "Surface which accounts need attention now so teams can prioritize outreach before momentum is lost.",
  },
];

const PIPELINE_STEPS = [
  { label: "New lead", metric: "32", note: "Fresh contacts captured this week" },
  { label: "Qualified", metric: "14", note: "Accounts ready for a live follow-up" },
  { label: "Proposal", metric: "8", note: "Commercial conversations in progress" },
  { label: "Won", metric: "5", note: "Accounts already activated into the CRM" },
];

export default function HozoPage() {
  return (
    <main className="min-h-dvh bg-bg pb-14">
      <section className="border-b border-border bg-[radial-gradient(circle_at_top,rgba(183,99,37,0.16),transparent_48%),linear-gradient(180deg,var(--color-stone-0),var(--color-bg))]">
        <div className={`${CONTAINER} py-8 md:py-14`}>
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-pill border border-border bg-surface px-4 text-label font-medium text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Back to modules
            </Link>
            <span className="rounded-pill bg-action-soft px-3 py-1 text-caption font-semibold uppercase tracking-[0.18em] text-action-strong">
              MVP demo
            </span>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] md:items-end">
            <div className="max-w-2xl">
              <p className="text-label font-semibold uppercase tracking-[0.18em] text-action-strong">
                Zoho CRM
              </p>
              <h1 className="mt-3 max-w-xl text-[clamp(2.4rem,6vw,4.75rem)] font-bold leading-[0.95] tracking-[-0.04em] text-text">
                A cleaner front door for customer follow-up.
              </h1>
              <p className="mt-5 max-w-xl text-body text-text-muted md:text-lg">
                This demo presents Zoho as the CRM layer for account visibility, follow-up
                discipline, and team handoff. It is intentionally visual in this first
                release: no external sync, just the product story and workflow surface.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/loyalty"
                  className="inline-flex min-h-12 items-center justify-center rounded-pill bg-action-fill px-6 text-title font-semibold text-on-action shadow-action transition-colors hover:bg-action-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  Open loyalty demo
                </Link>
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center rounded-pill border border-border bg-surface px-6 text-title font-semibold text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  View all modules
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Operator snapshot
                  </p>
                  <p className="mt-1 text-h-section font-bold text-text">Weekly pipeline</p>
                </div>
                <div className="rounded-pill bg-accent-soft px-3 py-1 text-caption font-semibold text-accent-strong">
                  Demo data
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {PIPELINE_STEPS.map((step) => (
                  <div
                    key={step.label}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-border bg-bg px-4 py-3"
                  >
                    <div>
                      <p className="text-title font-semibold text-text">{step.label}</p>
                      <p className="mt-1 text-caption text-text-muted">{step.note}</p>
                    </div>
                    <span className="text-display font-bold tracking-tight text-action-strong">
                      {step.metric}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${CONTAINER} pt-8 md:pt-12`}>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURE_CARDS.map((card) => (
            <article
              key={card.title}
              className="rounded-xl border border-border bg-surface p-5 shadow-xs"
            >
              <p className="text-title font-semibold text-text">{card.title}</p>
              <p className="mt-3 text-body text-text-muted">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${CONTAINER_READ} pt-8 md:pt-12`}>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
            Integration path
          </p>
          <h2 className="mt-2 text-display font-bold tracking-tight text-text">
            Ready for real Zoho data when the contract is defined.
          </h2>
          <p className="mt-4 text-body text-text-muted">
            This page is currently a visual MVP. The next step is to introduce the actual Zoho
            integration boundary: authentication expectations, account payloads, and the
            synchronization flow that will feed the CRM screens from a real source.
          </p>
        </div>
      </section>
    </main>
  );
}
