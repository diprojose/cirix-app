import Link from "next/link";
import { localizeHref, pick, type Locale } from "@/lib/locale";
import type { CrmDashboardDto, LifecycleStage } from "@/modules/crm/application/dtos/crm-dashboard-dto";

type CrmShellProps = {
  locale: Locale;
  dashboard: CrmDashboardDto;
  warning: string | null;
  children: React.ReactNode;
};

const PRIMARY_VIEWS = [
  { href: "/zoho", title: { es: "Overview", en: "Overview" } },
  { href: "/zoho/kpis", title: { es: "Performance", en: "Performance" } },
  { href: "/zoho/demo-form", title: { es: "Capture", en: "Capture" } },
] as const;

const SIDEBAR_GROUPS: Array<{
  label: Record<Locale, string>;
  items: Array<{
    href: string;
    title: Record<Locale, string>;
    note?: Record<Locale, string>;
    stage?: LifecycleStage;
  }>;
}> = [
  {
    label: { es: "Workspace", en: "Workspace" },
    items: [
      {
        href: "/zoho",
        title: { es: "Dashboard", en: "Dashboard" },
        note: { es: "Pulso comercial", en: "Commercial pulse" },
      },
      {
        href: "/zoho/kpis",
        title: { es: "Performance", en: "Performance" },
        note: { es: "Mix y conversiones", en: "Mix and conversions" },
      },
      {
        href: "/zoho/demo-form",
        title: { es: "Capture", en: "Capture" },
        note: { es: "Ingreso web", en: "Web intake" },
      },
    ],
  },
  {
    label: { es: "Pipeline", en: "Pipeline" },
    items: [
      { href: "/zoho/subscribers", title: { es: "Subscribers", en: "Subscribers" }, stage: "subscriber" },
      { href: "/zoho/leads", title: { es: "Leads", en: "Leads" }, stage: "lead" },
      { href: "/zoho/prospects", title: { es: "Prospects", en: "Prospects" }, stage: "prospect" },
      { href: "/zoho/customers", title: { es: "Customers", en: "Customers" }, stage: "customer" },
    ],
  },
  {
    label: { es: "Data", en: "Data" },
    items: [
      {
        href: "/api/zoho/crm",
        title: { es: "Payload", en: "Payload" },
        note: { es: "Modelo normalizado", en: "Normalized model" },
      },
    ],
  },
] as const;

export function CrmShell({ locale, dashboard, warning, children }: CrmShellProps) {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#f7f6f1_0%,#efede6_100%)]">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-[1600px] overflow-hidden bg-stone-100 shadow-[0_24px_70px_-28px_rgba(16,24,40,0.35)] md:min-h-[calc(100dvh-2rem)]">
        <aside className="hidden w-[280px] shrink-0 flex-col bg-[#171a37] text-white lg:flex">
          <div className="flex items-center justify-between px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#646cff,#7c5cff_55%,#4c9cff)] text-sm font-bold">
                Z
              </div>
              <div>
                <p className="text-[1.05rem] font-semibold tracking-[-0.02em]">Zoho CRM</p>
                <p className="text-xs text-white/55">Mixmag workspace</p>
              </div>
            </div>
            <span className="rounded-lg bg-white/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
              Live
            </span>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
            {SIDEBAR_GROUPS.map((group) => (
              <section key={group.label.en}>
                <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
                  {pick(locale, group.label)}
                </div>
                <div className="space-y-1.5">
                  {group.items.map((item) => (
                    <SidebarLink
                      key={item.href}
                      locale={locale}
                      href={item.href}
                      title={pick(locale, item.title)}
                      note={item.note ? pick(locale, item.note) : undefined}
                      badge={item.stage ? getStageCount(dashboard, item.stage) : null}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="p-4">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xs font-semibold text-white/88">CRM workspace</p>
              <p className="mt-1 text-xs leading-5 text-white/55">
                {pick(locale, {
                  es: "Shell operacional inspirado en un SaaS CRM clasico.",
                  en: "Operational shell inspired by a classic CRM SaaS.",
                })}
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 bg-[#fafafa]">
          <header className="bg-white">
            {warning ? (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:px-6">
                {warning}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-stone-400">
                  <span>Zoho</span>
                  <span>/</span>
                  <span className="text-stone-700">CRM Workspace</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h1 className="text-[1.55rem] font-semibold tracking-[-0.03em] text-stone-900">
                    Zoho CRM
                  </h1>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                    CRM
                  </span>
                </div>
                <p className="mt-1 max-w-3xl text-sm text-stone-500">
                  {pick(locale, {
                    es: "Workspace operativo con KPIs, listas de Zoho y captura comercial.",
                    en: "Operational workspace with KPIs, Zoho lists, and commercial capture.",
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <IconButton label={pick(locale, { es: "Ayuda", en: "Help" })}>?</IconButton>
                <IconButton label={pick(locale, { es: "Alertas", en: "Alerts" })}>!</IconButton>
                <Link
                  href={localizeHref(locale, "/zoho/demo-form")}
                  className="inline-flex min-h-10 items-center rounded-xl bg-[#59c36a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#49b65b]"
                >
                  + {pick(locale, { es: "Nuevo lead", en: "New lead" })}
                </Link>
              </div>
            </div>

            <div className="px-4 md:px-6">
              <div className="flex gap-6 overflow-x-auto">
                {PRIMARY_VIEWS.map((item) => (
                  <Link
                    key={item.href}
                    href={localizeHref(locale, item.href)}
                    className="border-b-2 border-transparent px-1 py-3 text-sm font-medium whitespace-nowrap text-stone-500 transition-colors hover:text-stone-900"
                  >
                    {pick(locale, item.title)}
                  </Link>
                ))}
              </div>
            </div>

            <div className="px-4 py-3 md:px-6">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-1 flex-wrap gap-2">
                  <ToolbarPill>{pick(locale, { es: "Buscar", en: "Search" })}</ToolbarPill>
                  <ToolbarPill>{pick(locale, { es: "Owner", en: "Owner" })}</ToolbarPill>
                  <ToolbarPill>{pick(locale, { es: "Stage", en: "Stage" })}</ToolbarPill>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={localizeHref(locale, "/")}
                    className="inline-flex min-h-10 items-center rounded-xl bg-stone-50 px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                  >
                    {pick(locale, { es: "Volver", en: "Back" })}
                  </Link>
                </div>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-6">
            <div className="rounded-[1.35rem] bg-white">
              <div className="p-4 md:p-5">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarLink({
  locale,
  href,
  title,
  note,
  badge,
}: {
  locale: Locale;
  href: string;
  title: string;
  note?: string;
  badge: number | null;
}) {
  return (
    <Link
      href={localizeHref(locale, href)}
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-white/70 transition-colors hover:bg-white/6 hover:text-white"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        {note ? <p className="mt-0.5 truncate text-xs text-white/42">{note}</p> : null}
      </div>
      {badge !== null ? (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80">{badge}</span>
      ) : null}
    </Link>
  );
}

function ToolbarPill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex min-h-10 items-center rounded-xl bg-stone-50 px-4 text-sm text-stone-500">{children}</span>;
}

function IconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-grid size-10 place-items-center rounded-xl bg-stone-50 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100"
    >
      {children}
    </button>
  );
}

function getStageCount(dashboard: CrmDashboardDto, stage: LifecycleStage) {
  return dashboard.stageSummary.find((item) => item.stage === stage)?.count ?? 0;
}
