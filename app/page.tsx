import type { Metadata } from "next";
import Image from "next/image";
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
                  <Image
                    src="/brand/cirix-logo.webp"
                    alt="Cirix Advertising logo"
                    width={88}
                    height={88}
                    priority
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
