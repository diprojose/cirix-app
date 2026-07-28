import Link from "next/link";
import { LeadCaptureForm } from "@/components/zoho/lead-capture-form";
import { localizeHref, pick, type Locale } from "@/lib/locale";
import type {
  ActivityDto,
  CommercialContactDto,
  CrmDashboardDto,
  LifecycleStage,
  OpportunityDto,
} from "@/modules/crm/application/dtos/crm-dashboard-dto";

const STAGE_LABELS: Record<LifecycleStage, Record<Locale, string>> = {
  subscriber: { es: "Subscribers", en: "Subscribers" },
  lead: { es: "Leads", en: "Leads" },
  prospect: { es: "Prospects", en: "Prospects" },
  customer: { es: "Customers", en: "Customers" },
};

const STAGE_THEME: Record<LifecycleStage, { chip: string; panel: string }> = {
  subscriber: { chip: "bg-sky-100 text-sky-700", panel: "bg-sky-50" },
  lead: { chip: "bg-amber-100 text-amber-800", panel: "bg-amber-50" },
  prospect: { chip: "bg-violet-100 text-violet-700", panel: "bg-violet-50" },
  customer: { chip: "bg-emerald-100 text-emerald-700", panel: "bg-emerald-50" },
};

export function CrmLandingPage({
  locale,
  dashboard,
}: {
  locale: Locale;
  dashboard: CrmDashboardDto;
}) {
  const openDeals = dashboard.opportunities.filter((opportunity) => opportunity.status === "open");
  const recentActivity = getRecentActivities(dashboard.activities, 4);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_22rem]">
        <div className="rounded-[1.75rem] border border-border bg-[linear-gradient(160deg,var(--color-surface),rgba(244,237,229,0.9))] p-6 shadow-card">
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-action-strong">
            Zoho CRM
          </p>
          <h1 className="mt-3 max-w-3xl text-[clamp(2.2rem,5vw,4.2rem)] font-bold leading-[0.95] tracking-[-0.045em] text-text">
            {pick(locale, {
              es: "Módulo CRM con rutas claras por etapa, KPIs y captura demo.",
              en: "CRM module with clear stage routes, KPIs, and demo capture.",
            })}
          </h1>
          <p className="mt-5 max-w-2xl text-body text-text-muted md:text-lg">
            {pick(locale, {
              es: "Entra por un landing de módulo y luego navega a pantallas operativas para subscribers, leads, prospects, customers y formulario demo.",
              en: "Start on a module landing page, then move into operational screens for subscribers, leads, prospects, customers, and the demo form.",
            })}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={localizeHref(locale, "/zoho/kpis")}
              className="inline-flex min-h-12 items-center justify-center rounded-pill bg-action-fill px-6 text-title font-semibold text-on-action shadow-action transition-colors hover:bg-action-strong"
            >
              {pick(locale, { es: "Abrir KPIs", en: "Open KPIs" })}
            </Link>
            <Link
              href={localizeHref(locale, "/zoho/demo-form")}
              className="inline-flex min-h-12 items-center justify-center rounded-pill border border-border bg-surface px-6 text-title font-semibold text-text transition-colors hover:bg-stone-100"
            >
              {pick(locale, { es: "Probar formulario demo", en: "Try demo form" })}
            </Link>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-surface p-5 shadow-card">
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">
            {pick(locale, { es: "Snapshot", en: "Snapshot" })}
          </p>
          <h2 className="mt-1 text-h-section font-bold text-text">
            {pick(locale, { es: "Estado actual del funnel", en: "Current funnel state" })}
          </h2>
          <div className="mt-5 grid gap-3">
            <MetricCard
              label={pick(locale, { es: "Contactos", en: "Contacts" })}
              value={String(dashboard.contacts.length)}
              note={pick(locale, { es: "base activa", en: "active base" })}
            />
            <MetricCard
              label={pick(locale, { es: "Deals abiertos", en: "Open deals" })}
              value={String(openDeals.length)}
              note={pick(locale, {
                es: `${dashboard.priorityFollowUps.length} seguimientos vivos`,
                en: `${dashboard.priorityFollowUps.length} live follow-ups`,
              })}
            />
            <MetricCard
              label={pick(locale, { es: "Actividad", en: "Activity" })}
              value={String(dashboard.activities.length)}
              note={pick(locale, { es: "señales procesadas", en: "signals processed" })}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.stageSummary.map((step) => (
          <Link
            key={step.stage}
            href={localizeHref(locale, stageHref(step.stage))}
            className={`rounded-xl border border-border p-5 transition-transform hover:-translate-y-0.5 ${STAGE_THEME[step.stage].panel}`}
          >
            <span className={`inline-flex rounded-pill px-3 py-1 text-caption font-semibold ${STAGE_THEME[step.stage].chip}`}>
              {step.label}
            </span>
            <p className="mt-4 text-display font-bold tracking-tight text-text">{step.count}</p>
            <p className="mt-2 text-body text-text-muted">{step.note}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
            {pick(locale, { es: "Rutas del módulo", en: "Module routes" })}
          </p>
          <h2 className="mt-2 text-display font-bold tracking-tight text-text">
            {pick(locale, { es: "Qué puedes abrir desde aquí", en: "What you can open from here" })}
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {buildLandingLinks(locale).map((item) => (
              <Link
                key={item.href}
                href={localizeHref(locale, item.href)}
                className="rounded-xl border border-border bg-bg px-4 py-4 transition-colors hover:bg-surface"
              >
                <p className="text-title font-semibold text-text">{item.title}</p>
                <p className="mt-1 text-body text-text-muted">{item.body}</p>
              </Link>
            ))}
          </div>
        </div>

        <InfoListCard
          locale={locale}
          eyebrow={{ es: "Timeline", en: "Timeline" }}
          title={{ es: "Actividad reciente", en: "Recent activity" }}
          items={recentActivity.map((activity) => `${activity.summary} · ${formatActivityDate(locale, activity)}`)}
        />
      </section>
    </div>
  );
}

export function CrmKpisPage({
  locale,
  dashboard,
}: {
  locale: Locale;
  dashboard: CrmDashboardDto;
}) {
  const openDeals = dashboard.opportunities.filter((opportunity) => opportunity.status === "open").length;
  const wonDeals = dashboard.opportunities.filter((opportunity) => opportunity.status === "won").length;
  const lostDeals = dashboard.opportunities.filter((opportunity) => opportunity.status === "lost").length;
  const sourceMix = summarizeSources(dashboard.contacts);
  const ownerLoad = summarizeOwners(dashboard.contacts, dashboard.opportunities);

  return (
    <div className="space-y-8">
      <PageIntro
        locale={locale}
        eyebrow={{ es: "KPIs", en: "KPIs" }}
        title={{
          es: "Visión ejecutiva del módulo CRM.",
          en: "Executive view of the CRM module.",
        }}
        body={{
          es: "Lee el pulso comercial completo: mix de etapas, conversiones, actividad, deals y distribución operativa.",
          en: "Read the full commercial pulse: stage mix, conversions, activity, deals, and operational distribution.",
        }}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label={pick(locale, { es: "Contactos", en: "Contacts" })}
          value={String(dashboard.contacts.length)}
          note={pick(locale, { es: "base activa", en: "active base" })}
        />
        <MetricCard
          label={pick(locale, { es: "Deals abiertos", en: "Open deals" })}
          value={String(openDeals)}
          note={pick(locale, { es: `${wonDeals} ganados`, en: `${wonDeals} won` })}
        />
        <MetricCard
          label={pick(locale, { es: "Deals perdidos", en: "Lost deals" })}
          value={String(lostDeals)}
          note={pick(locale, { es: "feedback para ajustes", en: "feedback for adjustments" })}
        />
        <MetricCard
          label={pick(locale, { es: "Actividad", en: "Activity" })}
          value={String(dashboard.activities.length)}
          note={pick(locale, { es: "señales registradas", en: "signals recorded" })}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
            {pick(locale, { es: "Mix de etapas", en: "Stage mix" })}
          </p>
          <h2 className="mt-2 text-display font-bold tracking-tight text-text">
            {pick(locale, { es: "Conteo por lifecycle stage", en: "Counts by lifecycle stage" })}
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {dashboard.stageSummary.map((step) => (
              <div key={step.stage} className={`rounded-lg border border-border p-4 ${STAGE_THEME[step.stage].panel}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-pill px-3 py-1 text-caption font-semibold ${STAGE_THEME[step.stage].chip}`}>
                    {step.label}
                  </span>
                  <span className="text-display font-bold tracking-tight text-text">{step.count}</span>
                </div>
                <p className="mt-3 text-body text-text-muted">{step.note}</p>
              </div>
            ))}
          </div>
        </div>

        <InfoListCard
          locale={locale}
          eyebrow={{ es: "Conversiones", en: "Conversions" }}
          title={{ es: "Lecturas rápidas", en: "Quick reads" }}
          items={dashboard.conversions.map((item) => `${item.label}: ${item.value}`)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem_22rem]">
        <InfoListCard
          locale={locale}
          eyebrow={{ es: "Origen", en: "Source mix" }}
          title={{ es: "De dónde entra la demanda", en: "Where demand comes from" }}
          items={sourceMix.map((item) => `${item.label} · ${item.count}`)}
        />
        <InfoListCard
          locale={locale}
          eyebrow={{ es: "Owners", en: "Owners" }}
          title={{ es: "Carga operativa", en: "Operational load" }}
          items={ownerLoad.map((item) => `${item.owner} · ${item.contacts} contacts · ${item.deals} deals`)}
        />
        <InfoListCard
          locale={locale}
          eyebrow={{ es: "Follow-ups", en: "Follow-ups" }}
          title={{ es: "Acciones prioritarias", en: "Priority actions" }}
          items={dashboard.priorityFollowUps.slice(0, 5).map((item) => `${item.fullName} · ${item.nextAction}`)}
        />
      </div>
    </div>
  );
}

export function CrmStagePage({
  locale,
  dashboard,
  stage,
}: {
  locale: Locale;
  dashboard: CrmDashboardDto;
  stage: LifecycleStage;
}) {
  const contacts = dashboard.contacts.filter((contact) => contact.lifecycleStage === stage);
  const contactIds = new Set(contacts.map((contact) => contact.id));
  const opportunities = dashboard.opportunities.filter((opportunity) => contactIds.has(opportunity.contactId));
  const recentActivity = getRecentActivities(
    dashboard.activities.filter((activity) => contactIds.has(activity.contactId)),
    6
  );
  const sourceMix = summarizeSources(contacts);
  const ownerLoad = summarizeOwners(contacts, opportunities);
  const followUps = dashboard.priorityFollowUps.filter((followUp) => contactIds.has(followUp.contactId));

  return (
    <div className="space-y-8">
      <PageIntro
        locale={locale}
        eyebrow={STAGE_LABELS[stage]}
        title={{
          es: `Pantalla operativa de ${pick(locale, STAGE_LABELS[stage])}.`,
          en: `${pick(locale, STAGE_LABELS[stage])} operational screen.`,
        }}
        body={{
          es: "Combina KPIs del stage, lista de registros y contexto comercial para revisar esta etapa sin salir de la ruta.",
          en: "Combine stage KPIs, record lists, and commercial context to review this stage without leaving the route.",
        }}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label={pick(locale, { es: "Registros", en: "Records" })}
          value={String(contacts.length)}
          note={pick(locale, { es: "en este stage", en: "in this stage" })}
        />
        <MetricCard
          label={pick(locale, { es: "Deals", en: "Deals" })}
          value={String(opportunities.filter((opportunity) => opportunity.status === "open").length)}
          note={pick(locale, { es: "oportunidades abiertas", en: "open opportunities" })}
        />
        <MetricCard
          label={pick(locale, { es: "Follow-ups", en: "Follow-ups" })}
          value={String(followUps.length)}
          note={pick(locale, { es: "requieren acción", en: "need action" })}
        />
        <MetricCard
          label={pick(locale, { es: "Owners", en: "Owners" })}
          value={String(ownerLoad.length)}
          note={pick(locale, { es: "carga distribuida", en: "distributed load" })}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_22rem]">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
            {pick(locale, { es: "Lista operativa", en: "Operational list" })}
          </p>
          <h2 className="mt-2 text-display font-bold tracking-tight text-text">{pick(locale, STAGE_LABELS[stage])}</h2>
          {contacts.length === 0 ? (
            <p className="mt-6 text-body text-text-muted">
              {pick(locale, {
                es: "Todavía no hay registros en esta etapa.",
                en: "There are no records in this stage yet.",
              })}
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {contacts.map((contact) => (
                <article key={contact.id} className="rounded-xl border border-border bg-bg px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-title font-semibold text-text">{contact.fullName}</p>
                      <p className="mt-1 text-caption text-text-muted">
                        {contact.email} · {contact.phone}
                      </p>
                    </div>
                    <span className={`rounded-pill px-3 py-1 text-caption font-semibold ${STAGE_THEME[stage].chip}`}>
                      {pick(locale, STAGE_LABELS[stage])}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <Fact label="Owner" value={contact.owner} />
                    <Fact label={pick(locale, { es: "Origen", en: "Source" })} value={contact.source} />
                    <Fact
                      label={pick(locale, { es: "Categoría", en: "Category" })}
                      value={contact.interestCategory ?? "General"}
                    />
                    <Fact
                      label={pick(locale, { es: "Última actividad", en: "Last activity" })}
                      value={formatShortDate(locale, contact.lastActivityAt ?? contact.createdAt)}
                    />
                  </div>
                  {contact.nextAction ? (
                    <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-3">
                      <p className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">
                        {pick(locale, { es: "Next action", en: "Next action" })}
                      </p>
                      <p className="mt-1 text-body text-text">{contact.nextAction}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <InfoListCard
            locale={locale}
            eyebrow={{ es: "Origen", en: "Source mix" }}
            title={{ es: "Mix de fuente", en: "Source mix" }}
            items={sourceMix.map((item) => `${item.label} · ${item.count}`)}
          />
          <InfoListCard
            locale={locale}
            eyebrow={{ es: "Owners", en: "Owners" }}
            title={{ es: "Carga del stage", en: "Stage load" }}
            items={ownerLoad.map((item) => `${item.owner} · ${item.contacts} contacts · ${item.deals} deals`)}
          />
          <InfoListCard
            locale={locale}
            eyebrow={{ es: "Actividad", en: "Activity" }}
            title={{ es: "Señales recientes", en: "Recent signals" }}
            items={recentActivity.map((activity) => `${activity.summary} · ${formatActivityDate(locale, activity)}`)}
          />
        </div>
      </div>
    </div>
  );
}

export function CrmDemoFormPage({ locale }: { locale: Locale }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <PageIntro
          locale={locale}
          eyebrow={{ es: "Demo form", en: "Demo form" }}
          title={{
            es: "Formulario demo para probar la captura CRM.",
            en: "Demo form to test CRM capture.",
          }}
          body={{
            es: "Rellena los datos, envía el lead y valida el resultado local + Zoho dentro de la misma pantalla.",
            en: "Fill the data, submit the lead, and validate the local + Zoho result on the same screen.",
          }}
        />
        <LeadCaptureForm locale={locale} />
      </div>

      <div className="space-y-6">
        <InfoListCard
          locale={locale}
          eyebrow={{ es: "Campos", en: "Fields" }}
          title={{ es: "Datos mínimos", en: "Minimum data" }}
          items={buildFormFields(locale)}
        />
        <InfoListCard
          locale={locale}
          eyebrow={{ es: "Resultado", en: "Result" }}
          title={{ es: "Qué valida este flujo", en: "What this flow validates" }}
          items={[
            pick(locale, { es: "Persistencia local del lead", en: "Local lead persistence" }),
            pick(locale, { es: "Estado de sincronización con Zoho", en: "Zoho sync status" }),
            pick(locale, { es: "Payload/resumen enviado desde la web", en: "Payload/summary sent from the web" }),
          ]}
        />
      </div>
    </div>
  );
}

function PageIntro({
  locale,
  eyebrow,
  title,
  body,
}: {
  locale: Locale;
  eyebrow: Record<Locale, string>;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-label font-semibold uppercase tracking-[0.18em] text-action-strong">
        {pick(locale, eyebrow)}
      </p>
      <h1 className="mt-2 text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[0.96] tracking-[-0.04em] text-text">
        {pick(locale, title)}
      </h1>
      <p className="mt-4 text-body text-text-muted md:text-lg">{pick(locale, body)}</p>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="mt-3 text-display font-bold tracking-tight text-text">{value}</p>
      <p className="mt-3 text-body text-text-muted">{note}</p>
    </article>
  );
}

function InfoListCard({
  locale,
  eyebrow,
  title,
  items,
}: {
  locale: Locale;
  eyebrow: Record<Locale, string>;
  title: Record<Locale, string>;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
      <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
        {pick(locale, eyebrow)}
      </p>
      <h2 className="mt-2 text-display font-bold tracking-tight text-text">{pick(locale, title)}</h2>
      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <p className="text-body text-text-muted">
            {pick(locale, { es: "Sin datos todavía.", en: "No data yet." })}
          </p>
        ) : (
          items.map((item) => (
            <div key={item} className="rounded-lg border border-border bg-bg px-4 py-3 text-body text-text-muted">
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-3">
      <p className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <p className="mt-1 text-body text-text">{value}</p>
    </div>
  );
}

function stageHref(stage: LifecycleStage) {
  switch (stage) {
    case "subscriber":
      return "/zoho/subscribers";
    case "lead":
      return "/zoho/leads";
    case "prospect":
      return "/zoho/prospects";
    case "customer":
      return "/zoho/customers";
  }
}

function buildLandingLinks(locale: Locale) {
  return [
    {
      href: "/zoho/kpis",
      title: pick(locale, { es: "KPIs", en: "KPIs" }),
      body: pick(locale, {
        es: "Resumen ejecutivo del pipeline, conversiones y carga operativa.",
        en: "Executive summary of pipeline, conversions, and operational load.",
      }),
    },
    {
      href: "/zoho/subscribers",
      title: pick(locale, { es: "Subscribers", en: "Subscribers" }),
      body: pick(locale, {
        es: "Base temprana y entradas de intención baja.",
        en: "Early base and low-intent entries.",
      }),
    },
    {
      href: "/zoho/leads",
      title: pick(locale, { es: "Leads", en: "Leads" }),
      body: pick(locale, {
        es: "Interés comercial abierto y próximos pasos.",
        en: "Open commercial interest and next steps.",
      }),
    },
    {
      href: "/zoho/prospects",
      title: pick(locale, { es: "Prospects", en: "Prospects" }),
      body: pick(locale, {
        es: "Leads ya calificados con contexto de deals.",
        en: "Qualified leads with deal context.",
      }),
    },
    {
      href: "/zoho/customers",
      title: pick(locale, { es: "Customers", en: "Customers" }),
      body: pick(locale, {
        es: "Negocios cerrados y relaciones activas.",
        en: "Closed business and active relationships.",
      }),
    },
    {
      href: "/zoho/demo-form",
      title: pick(locale, { es: "Demo form", en: "Demo form" }),
      body: pick(locale, {
        es: "Formulario para probar la escritura al CRM.",
        en: "Form to test the CRM write-path.",
      }),
    },
  ];
}

function buildFormFields(locale: Locale): string[] {
  return [
    pick(locale, {
      es: "Nombre y teléfono como mínimos operativos para seguimiento.",
      en: "Name and phone as the minimum operating fields for follow-up.",
    }),
    pick(locale, {
      es: "Email, interés y categoría para segmentación inicial.",
      en: "Email, interest, and category for initial segmentation.",
    }),
    pick(locale, {
      es: "Source y campaign para trazabilidad del lead.",
      en: "Source and campaign for lead traceability.",
    }),
    pick(locale, {
      es: "Mensaje libre y contexto comercial.",
      en: "Free-text message and commercial context.",
    }),
  ];
}

function summarizeSources(contacts: CommercialContactDto[]) {
  const counts = new Map<string, number>();
  for (const contact of contacts) {
    counts.set(contact.source, (counts.get(contact.source) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
}

function summarizeOwners(contacts: CommercialContactDto[], opportunities: OpportunityDto[]) {
  const counts = new Map<string, { owner: string; contacts: number; deals: number }>();

  for (const contact of contacts) {
    const current = counts.get(contact.owner) ?? { owner: contact.owner, contacts: 0, deals: 0 };
    current.contacts += 1;
    counts.set(contact.owner, current);
  }

  for (const opportunity of opportunities) {
    const current =
      counts.get(opportunity.owner) ?? { owner: opportunity.owner, contacts: 0, deals: 0 };
    current.deals += 1;
    counts.set(opportunity.owner, current);
  }

  return [...counts.values()].sort(
    (left, right) => right.deals - left.deals || right.contacts - left.contacts
  );
}

function getRecentActivities(activities: ActivityDto[], limit: number) {
  return [...activities]
    .sort((left, right) => Date.parse(right.happenedAt) - Date.parse(left.happenedAt))
    .slice(0, limit);
}

function formatActivityDate(locale: Locale, activity: ActivityDto) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(activity.happenedAt));
}

function formatShortDate(locale: Locale, isoDate: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(isoDate));
}

