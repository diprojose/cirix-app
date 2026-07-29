import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedLink } from "@/components/localized-link";
import { CONTAINER, CONTAINER_READ } from "@/components/store/layout";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { MVP_MODULES } from "@/shared/mvp-modules";

export const metadata: Metadata = {
  title: "Cirix Advertising",
};

const landingTheme: CSSProperties = {
  ["--landing-accent" as string]: "oklch(0.62 0.24 28)",
  ["--landing-accent-strong" as string]: "oklch(0.52 0.21 28)",
  ["--landing-accent-soft" as string]: "oklch(0.95 0.04 28)",
  ["--landing-accent-subtle" as string]: "oklch(0.985 0.016 28)",
};

export default async function ModulesLandingPage() {
  const locale = await getCurrentLocale();

  return (
    <main style={landingTheme} className="min-h-dvh bg-bg pb-12">
      <section className="border-b border-border bg-[radial-gradient(circle_at_top_left,var(--landing-accent-soft),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(164,206,255,0.22),transparent_28%),linear-gradient(180deg,var(--landing-accent-subtle),var(--color-bg))]">
        <div className={`${CONTAINER} py-8 md:py-14`}>
          <div className="flex items-center justify-between gap-4">
            <p className="rounded-pill bg-surface px-4 py-2 text-caption font-semibold uppercase tracking-[0.18em] text-[var(--landing-accent-strong)] shadow-xs">
              Cirix Advertising
            </p>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <LocalizedLink
                href="/login"
                className="inline-flex min-h-11 items-center rounded-pill border border-border bg-surface px-4 text-label font-medium text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {pick(locale, { es: "Ingresar", en: "Sign in" })}
              </LocalizedLink>
            </div>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)] md:items-start">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-surface p-3 shadow-card">
                  <img
                    src="data:image/webp;base64,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"
                    alt="Cirix Advertising logo"
                    className="h-16 w-16 object-contain md:h-[4.5rem] md:w-[4.5rem]"
                  />
                </div>
                <div>
                  <p className="text-label font-semibold uppercase tracking-[0.18em] text-[var(--landing-accent-strong)]">
                    {pick(locale, {
                      es: "Landing de MVP comercial",
                      en: "Brand-led MVP landing",
                    })}
                  </p>
                  <h1 className="mt-2 text-[clamp(2.5rem,7vw,5.2rem)] font-bold leading-[0.9] tracking-[-0.05em] text-text">
                    Cirix
                    <span className="block text-[var(--landing-accent-strong)]">Advertising</span>
                  </h1>
                </div>
              </div>

              <div className="mt-8 max-w-2xl space-y-4">
                <p className="text-h-section font-semibold text-text">
                  {pick(locale, {
                    es: "MVPs comerciales para CRM, loyalty y activacion de clientes.",
                    en: "Commercial MVPs for CRM, loyalty, and customer activation.",
                  })}
                </p>
                <p className="text-body text-text-muted md:text-lg">
                  {pick(locale, {
                    es: "Cirix Advertising empaqueta experiencias listas para vender, pilotear y demostrar con contexto real de operacion.",
                    en: "Cirix Advertising packages demo-ready experiences that can be sold, piloted, and presented with real operating context.",
                  })}
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <LocalizedLink
                  href={MVP_MODULES[0].href}
                  className="inline-flex min-h-12 items-center justify-center rounded-pill bg-[var(--landing-accent-strong)] px-5 text-title font-semibold text-white shadow-[0_12px_26px_-10px_rgba(198,58,42,0.48)] transition-colors hover:bg-[var(--landing-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {pick(locale, { es: "Ver MVPs", en: "Explore MVPs" })}
                </LocalizedLink>
                <LocalizedLink
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-pill border border-[color:var(--landing-accent)] bg-surface px-5 text-title font-semibold text-[var(--landing-accent-strong)] transition-colors hover:bg-[var(--landing-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--landing-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {pick(locale, {
                    es: "Acceso operador",
                    en: "Operator access",
                  })}
                </LocalizedLink>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">
                {pick(locale, {
                  es: "Lo que vende Cirix",
                  en: "What Cirix sells",
                })}
              </p>
              <div className="mt-4 space-y-3">
                {[
                  {
                    es: "MVPs listos para discovery comercial y demos ejecutivas.",
                    en: "MVPs ready for sales discovery and executive demos.",
                  },
                  {
                    es: "Suites conectadas a CRM, retencion y operacion real.",
                    en: "Suites connected to CRM, retention, and real operator workflows.",
                  },
                  {
                    es: "Un solo idioma por vista, segun la conversacion comercial.",
                    en: "One language per view, matched to the audience in the room.",
                  },
                ].map((highlight) => (
                  <div
                    key={highlight.en}
                    className="rounded-lg border border-border bg-[var(--landing-accent-subtle)] px-4 py-4"
                  >
                    <p className="text-title font-semibold text-text">{highlight[locale]}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-lg border border-border bg-bg px-4 py-4">
                <p className="text-caption font-semibold uppercase tracking-[0.16em] text-[var(--landing-accent-strong)]">
                  {pick(locale, { es: "Suites activas", en: "Active suites" })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MVP_MODULES.map((module) => (
                    <span
                      key={module.slug}
                      className="rounded-pill bg-[var(--landing-accent-soft)] px-3 py-1 text-caption font-semibold text-[var(--landing-accent-strong)]"
                    >
                      {module.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${CONTAINER} pt-8 md:pt-12`}>
        <div>
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-[var(--landing-accent-strong)]">
            {pick(locale, { es: "Suites MVP", en: "MVP suites" })}
          </p>
          <h2 className="mt-2 text-display font-bold tracking-tight text-text">
            {pick(locale, {
              es: "Modulos listos para vender.",
              en: "Modules ready to sell.",
            })}
          </h2>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {MVP_MODULES.map((module) => (
            <article
              key={module.slug}
              className="flex h-full flex-col rounded-xl border border-border bg-surface p-6 shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-label font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {module.eyebrow[locale]}
                  </p>
                  <p className="mt-4 text-display font-bold tracking-tight text-text">
                    {module.title}
                  </p>
                </div>
                <span
                  className={`rounded-pill px-3 py-1 text-caption font-semibold uppercase tracking-[0.14em] ${
                    module.accent === "action"
                      ? "bg-action-soft text-action-strong"
                      : "bg-[var(--landing-accent-soft)] text-[var(--landing-accent-strong)]"
                  }`}
                >
                  {module.badge[locale]}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-body text-text">{module.summary[locale]}</p>
                <div className="rounded-lg border border-border bg-bg px-4 py-4">
                  <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {pick(locale, { es: "Audiencia", en: "Audience" })}
                  </p>
                  <p className="mt-2 text-title font-semibold text-text">
                    {module.audience[locale]}
                  </p>
                </div>
                <div className="space-y-2">
                  {module.capabilities.map((capability) => (
                    <div key={capability.en} className="flex gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          module.accent === "action"
                            ? "bg-action-fill"
                            : "bg-[var(--landing-accent)]"
                        }`}
                      />
                      <p className="text-body text-text">{capability[locale]}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-1 items-end">
                <LocalizedLink
                  href={module.href}
                  className={`inline-flex min-h-12 items-center justify-center rounded-pill px-5 text-title font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                    module.accent === "action"
                      ? "bg-action-fill text-on-action shadow-action hover:bg-action-strong focus-visible:ring-action-fill"
                      : "bg-[var(--landing-accent-strong)] text-white shadow-[0_12px_26px_-10px_rgba(198,58,42,0.48)] hover:bg-[var(--landing-accent)] focus-visible:ring-[var(--landing-accent)]"
                  }`}
                >
                  {module.ctaLabel[locale]}
                </LocalizedLink>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${CONTAINER_READ} pt-8 md:pt-12`}>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-[var(--landing-accent-strong)]">
            {pick(locale, {
              es: "Marco comercial",
              en: "Commercial framing",
            })}
          </p>
          <p className="mt-3 text-body text-text">
            {pick(locale, {
              es: "La landing queda enfocada en venta y presentacion de oferta, mientras las rutas internas siguen funcionando como demos operativas.",
              en: "The landing stays sales-facing while the internal routes continue to behave as working product demos.",
            })}
          </p>
        </div>
      </section>
    </main>
  );
}
