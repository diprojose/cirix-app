import type { Metadata } from "next";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LocalizedLink } from "@/components/localized-link";
import { CONTAINER, CONTAINER_READ } from "@/components/store/layout";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { MVP_MODULES } from "@/shared/mvp-modules";

export const metadata: Metadata = { title: "Cirix Advertising" };

export default async function ModulesLandingPage() {
  const locale = await getCurrentLocale();

  return (
    <main className="min-h-dvh overflow-hidden bg-brand-950 text-white">
      <section className="relative isolate min-h-[82dvh] overflow-hidden bg-brand-900">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_12%,rgb(28_90_174_/_0.38),transparent_34%),linear-gradient(135deg,#030e1d_0%,#051934_54%,#0a244a_100%)]" />
        <div className="absolute -right-40 top-28 -z-10 h-96 w-96 rounded-full bg-action-fill/20 blur-3xl" />
        <header className="relative z-10 border-b border-white/10">
          <div className={CONTAINER + " flex items-center justify-between py-5 md:py-7"}>
            <LocalizedLink href="/" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900">
              <Image src="/brand/cirix-logo.png" alt="Cirix" width={136} height={44} className="h-9 w-auto object-contain brightness-0 invert" />
            </LocalizedLink>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <LocalizedLink href="/login" className="hidden min-h-11 items-center rounded-xl border border-white/20 px-4 text-label font-medium text-white transition-colors hover:border-action-fill hover:bg-action-fill sm:inline-flex">
                {pick(locale, { es: "Ingresar", en: "Sign in" })}
              </LocalizedLink>
            </div>
          </div>
        </header>

        <div className={CONTAINER + " flex min-h-[calc(82dvh-5rem)] items-center py-16 md:py-24"}>
          <div className="max-w-5xl">
            <p className="mb-6 text-label font-semibold uppercase tracking-[0.28em] text-cirix-gray">Cirix Advertising</p>
            <h1 className="max-w-5xl font-heading text-[clamp(3.5rem,11vw,9rem)] font-extrabold leading-[0.88] tracking-[-0.06em]">
              {pick(locale, { es: "Estrategias que traen clientes.", en: "Strategies that bring clients." })}
            </h1>
            <p className="mt-8 max-w-2xl text-lg font-light leading-relaxed text-cirix-gray md:text-2xl">
              {pick(locale, { es: "MVPs comerciales para CRM, loyalty y activación de clientes.", en: "Commercial MVPs for CRM, loyalty, and customer activation." })}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <LocalizedLink href={MVP_MODULES[0].href} className="inline-flex min-h-14 items-center justify-center rounded-xl bg-action-fill px-7 text-title font-bold text-white shadow-action transition-all hover:bg-action-strong hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900">
                {pick(locale, { es: "Explorar MVPs", en: "Explore MVPs" })}
              </LocalizedLink>
              <LocalizedLink href="/login" className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/20 px-7 text-title font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-brand-900">
                {pick(locale, { es: "Acceso operador", en: "Operator access" })}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <div className="border-y border-white/10 bg-action-fill py-5">
        <div className="mx-auto flex w-max items-center gap-12 px-6 text-sm font-semibold uppercase tracking-[0.24em] text-white/90">
          <span>CRM</span><span>LOYALTY</span><span>ACTIVATION</span><span>BRAND SYSTEMS</span>
          <span>CRM</span><span>LOYALTY</span><span>ACTIVATION</span><span>BRAND SYSTEMS</span>
        </div>
      </div>

      <section id="mvp-suites" className={CONTAINER + " py-20 md:py-28"}>
        <div className="max-w-3xl">
          <p className="text-label font-semibold uppercase tracking-[0.24em] text-cirix-cyan">{pick(locale, { es: "Suites MVP", en: "MVP suites" })}</p>
          <h2 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
            {pick(locale, { es: "Experiencias listas para demostrar.", en: "Experiences ready to demonstrate." })}
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {MVP_MODULES.map((module, index) => (
            <article key={module.slug} className="group flex min-h-80 flex-col justify-between rounded-2xl border border-white/10 bg-brand-800 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-action-fill/60 hover:shadow-float md:p-8">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <span className="font-heading text-5xl font-semibold text-white/15">0{index + 1}</span>
                  <span className="rounded-full border border-action-fill/40 bg-action-fill/10 px-3 py-1 text-caption font-semibold uppercase tracking-[0.16em] text-action-200">{module.badge[locale]}</span>
                </div>
                <p className="mt-10 text-label font-semibold uppercase tracking-[0.18em] text-cirix-gray">{module.eyebrow[locale]}</p>
                <h3 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.03em] text-white">{module.title}</h3>
                <p className="mt-4 max-w-xl text-body leading-relaxed text-cirix-gray">{module.summary[locale]}</p>
              </div>
              <LocalizedLink href={module.href} className="mt-8 inline-flex min-h-11 w-fit items-center rounded-xl bg-action-fill px-5 text-label font-semibold text-white transition-colors hover:bg-action-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800">
                {module.ctaLabel[locale]}<span aria-hidden="true" className="ml-3 transition-transform group-hover:translate-x-1">→</span>
              </LocalizedLink>
            </article>
          ))}
        </div>
      </section>

      <section className={CONTAINER_READ + " pb-20 md:pb-28"}>
        <div className="border-t border-white/10 pt-10">
          <p className="max-w-2xl font-heading text-2xl font-semibold leading-tight text-white md:text-4xl">
            {pick(locale, { es: "Construimos sistemas digitales que convierten atención en acción.", en: "We build digital systems that turn attention into action." })}
          </p>
          <p className="mt-5 max-w-xl text-body leading-relaxed text-cirix-gray">
            {pick(locale, { es: "La landing presenta la oferta; las rutas internas funcionan como demos operativas listas para pilotear.", en: "The landing presents the offer; internal routes remain operational demos ready to pilot." })}
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-brand-950">
        <div className={CONTAINER + " flex flex-col gap-4 py-8 text-caption text-cirix-gray sm:flex-row sm:items-center sm:justify-between"}>
          <Image src="/brand/cirix-logo.png" alt="Cirix" width={110} height={36} className="h-7 w-auto object-contain brightness-0 invert" />
          <span>© 2026 Cirix Agency</span>
        </div>
      </footer>
    </main>
  );
}
