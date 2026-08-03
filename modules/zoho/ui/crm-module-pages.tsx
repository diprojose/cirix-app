import Link from "next/link";
import { LeadCaptureForm } from "@/modules/zoho/ui/lead-capture-form";
import { localizeHref, pick, type Locale } from "@/lib/locale";
import type {
  CommercialContactDto,
  CrmDashboardDto,
  LifecycleStage,
  OpportunityDto,
} from "@/modules/zoho/crm/application/dtos/crm-dashboard-dto";

const STAGE_LABELS: Record<LifecycleStage, Record<Locale, string>> = {
  subscriber: { es: "Subscribers", en: "Subscribers" },
  lead: { es: "Leads", en: "Leads" },
  prospect: { es: "Prospects", en: "Prospects" },
  customer: { es: "Customers", en: "Customers" },
};

const STAGE_THEME: Record<LifecycleStage, { chip: string; panel: string }> = {
  subscriber: { chip: "bg-sky-100 text-sky-700", panel: "bg-sky-50" },
  lead: { chip: "bg-action-soft text-action-strong", panel: "bg-action-subtle" },
  prospect: { chip: "bg-brand-100 text-accent-strong", panel: "bg-brand-50" },
  customer: { chip: "bg-cirix-cyan/15 text-brand-700", panel: "bg-cirix-cyan/15" },
};

type DashboardPageProps = {
  locale: Locale;
  dashboard: CrmDashboardDto;
};

export function CrmLandingPage({ locale, dashboard }: DashboardPageProps) {
  const openDeals = dashboard.opportunities.filter((opportunity) => opportunity.status === "open").length;
  const wonDeals = dashboard.opportunities.filter((opportunity) => opportunity.status === "won").length;
  const recentContacts = [...dashboard.contacts]
    .sort(
      (left, right) =>
        Date.parse(right.lastActivityAt ?? right.createdAt) - Date.parse(left.lastActivityAt ?? left.createdAt)
    )
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={pick(locale, { es: "Contactos", en: "Contacts" })}
          value={String(dashboard.contacts.length)}
          note={pick(locale, { es: "base activa en CRM", en: "active base in CRM" })}
        />
        <MetricCard
          label={pick(locale, { es: "Deals abiertos", en: "Open deals" })}
          value={String(openDeals)}
          note={pick(locale, { es: "pipeline vivo", en: "live pipeline" })}
        />
        <MetricCard
          label={pick(locale, { es: "Deals ganados", en: "Won deals" })}
          value={String(wonDeals)}
          note={pick(locale, { es: "negocios convertidos", en: "converted business" })}
        />
        <MetricCard
          label={pick(locale, { es: "Follow-ups", en: "Follow-ups" })}
          value={String(dashboard.priorityFollowUps.length)}
          note={pick(locale, { es: "requieren accion", en: "require action" })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.stageSummary.map((step) => (
          <Link
            key={step.stage}
            href={localizeHref(locale, stageHref(step.stage))}
            className={`rounded-xl p-5 shadow-xs transition-transform hover:-translate-y-0.5 ${STAGE_THEME[step.stage].panel}`}
          >
            <span className={`inline-flex rounded-pill px-3 py-1 text-caption font-semibold ${STAGE_THEME[step.stage].chip}`}>
              {step.label}
            </span>
            <p className="mt-4 text-display font-bold tracking-tight text-text">{step.count}</p>
            <p className="mt-2 text-body text-text-muted">{step.note}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <RecordTable
          locale={locale}
          eyebrow={pick(locale, { es: "Zoho list", en: "Zoho list" })}
          title={pick(locale, { es: "Contactos recientes", en: "Recent contacts" })}
          contacts={recentContacts}
        />

        <SimpleListPanel
          locale={locale}
          eyebrow={{ es: "Shortcuts", en: "Shortcuts" }}
          title={{ es: "Abrir vistas", en: "Open views" }}
          items={buildLandingLinks(locale).map((item) => `${item.title} - ${item.body}`)}
        />
      </div>
    </div>
  );
}

export function CrmKpisPage({ locale, dashboard }: DashboardPageProps) {
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
          es: "Vision ejecutiva del modulo CRM.",
          en: "Executive view of the CRM module.",
        }}
        body={{
          es: "Resumen limpio del mix comercial, la conversion y la carga operativa.",
          en: "A cleaner summary of commercial mix, conversion, and operational load.",
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          note={pick(locale, { es: "feedback comercial", en: "commercial feedback" })}
        />
        <MetricCard
          label={pick(locale, { es: "Actividad", en: "Activity" })}
          value={String(dashboard.activities.length)}
          note={pick(locale, { es: "senales registradas", en: "signals recorded" })}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SimpleStatPanel
          locale={locale}
          eyebrow={{ es: "Mix de etapas", en: "Stage mix" }}
          title={{ es: "Conteo por lifecycle stage", en: "Counts by lifecycle stage" }}
          rows={dashboard.stageSummary.map((item) => ({
            label: item.label,
            value: String(item.count),
            note: item.note,
          }))}
        />
        <SimpleStatPanel
          locale={locale}
          eyebrow={{ es: "Conversiones", en: "Conversions" }}
          title={{ es: "Lecturas rapidas", en: "Quick reads" }}
          rows={dashboard.conversions.map((item) => ({
            label: item.label,
            value: item.value,
            note: item.note,
          }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SimpleListPanel
          locale={locale}
          eyebrow={{ es: "Origen", en: "Source mix" }}
          title={{ es: "De donde entra la demanda", en: "Where demand comes from" }}
          items={sourceMix.map((item) => `${item.label} - ${item.count}`)}
        />
        <SimpleListPanel
          locale={locale}
          eyebrow={{ es: "Owners", en: "Owners" }}
          title={{ es: "Carga operativa", en: "Operational load" }}
          items={ownerLoad.map((item) => `${item.owner} - ${item.contacts} contacts - ${item.deals} deals`)}
        />
      </div>

      <SimpleListPanel
        locale={locale}
        eyebrow={{ es: "Follow-ups", en: "Follow-ups" }}
        title={{ es: "Acciones prioritarias", en: "Priority actions" }}
        items={dashboard.priorityFollowUps.slice(0, 5).map((item) => `${item.fullName} - ${item.nextAction}`)}
      />
    </div>
  );
}

export function CrmStagePage({
  locale,
  dashboard,
  stage,
}: DashboardPageProps & { stage: LifecycleStage }) {
  const contacts = dashboard.contacts.filter((contact) => contact.lifecycleStage === stage);

  return (
    <div className="space-y-6">
      <RecordTable locale={locale} eyebrow="" title="" contacts={contacts} />
    </div>
  );
}

export function CrmDemoFormPage({ locale }: { locale: Locale }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="rounded-xl bg-surface p-6 shadow-card">
        <PageIntro
          locale={locale}
          eyebrow={{ es: "Demo form", en: "Demo form" }}
          title={{
            es: "Formulario demo para probar la captura CRM.",
            en: "Demo form to test CRM capture.",
          }}
          body={{
            es: "Rellena los datos, envia el lead y valida el resultado local + Zoho dentro de la misma pantalla.",
            en: "Fill the data, submit the lead, and validate the local + Zoho result on the same screen.",
          }}
        />
        <LeadCaptureForm locale={locale} />
      </div>

      <div className="space-y-6">
        <SimpleListPanel
          locale={locale}
          eyebrow={{ es: "Campos", en: "Fields" }}
          title={{ es: "Datos minimos", en: "Minimum data" }}
          items={buildFormFields(locale)}
        />
        <SimpleListPanel
          locale={locale}
          eyebrow={{ es: "Resultado", en: "Result" }}
          title={{ es: "Que valida este flujo", en: "What this flow validates" }}
          items={[
            pick(locale, { es: "Persistencia local del lead", en: "Local lead persistence" }),
            pick(locale, { es: "Estado de sincronizacion con Zoho", en: "Zoho sync status" }),
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
    <article className="rounded-xl border border-stone-200 bg-stone-50 p-5 shadow-xs">
      <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="mt-3 text-display font-bold tracking-tight text-text">{value}</p>
      <p className="mt-3 text-body text-text-muted">{note}</p>
    </article>
  );
}

function SimpleStatPanel({
  locale,
  eyebrow,
  title,
  rows,
}: {
  locale: Locale;
  eyebrow: Record<Locale, string>;
  title: Record<Locale, string>;
  rows: Array<{ label: string; value: string; note: string }>;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-surface p-6 shadow-xs">
      <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
        {pick(locale, eyebrow)}
      </p>
      <h2 className="mt-2 text-h-section font-semibold text-text">{pick(locale, title)}</h2>
      <div className="mt-5 divide-y divide-stone-200">
        {rows.map((row, index) => (
          <div key={`${row.label}-${row.value}-${index}`} className="grid gap-2 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div>
              <p className="text-body font-medium text-text">{row.label}</p>
              <p className="mt-1 text-caption text-text-muted">{row.note}</p>
            </div>
            <p className="text-title font-semibold text-text">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleListPanel({
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
    <div className="rounded-xl border border-stone-200 bg-surface p-6 shadow-xs">
      <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
        {pick(locale, eyebrow)}
      </p>
      <h2 className="mt-2 text-h-section font-semibold text-text">{pick(locale, title)}</h2>
      <div className="mt-5 space-y-2">
        {items.length === 0 ? (
          <p className="text-body text-text-muted">
            {pick(locale, { es: "Sin datos todavia.", en: "No data yet." })}
          </p>
        ) : (
          items.map((item, index) => (
            <div key={`${item}-${index}`} className="rounded-lg bg-stone-50 px-4 py-3 text-body text-text-muted">
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RecordTable({
  locale,
  eyebrow,
  title,
  contacts,
}: {
  locale: Locale;
  eyebrow: string;
  title: string;
  contacts: CommercialContactDto[];
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-surface p-6 shadow-xs">
      {eyebrow ? (
        <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      ) : null}
      {title ? <h2 className="mt-2 text-display font-bold tracking-tight text-text">{title}</h2> : null}

      {contacts.length === 0 ? (
        <p className={`${eyebrow || title ? "mt-6" : ""} text-body text-text-muted`}>
          {pick(locale, {
            es: "Todavia no hay registros en esta vista.",
            en: "There are no records in this view yet.",
          })}
        </p>
      ) : (
        <div className={`${eyebrow || title ? "mt-6" : ""} overflow-hidden rounded-xl bg-white`}>
          <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1.2fr] gap-3 border-b border-stone-200 px-4 py-3 text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">
            <span>{pick(locale, { es: "Contacto", en: "Contact" })}</span>
            <span>{pick(locale, { es: "Stage", en: "Stage" })}</span>
            <span>{pick(locale, { es: "Owner", en: "Owner" })}</span>
            <span>{pick(locale, { es: "Ultima actividad", en: "Last activity" })}</span>
          </div>
          <div className="space-y-2 px-2 py-2">
            {contacts.map((contact) => (
              <article
                key={contact.id}
                className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1.2fr] gap-3 rounded-lg bg-white px-3 py-3 shadow-xs"
              >
                <div className="min-w-0">
                  <p className="truncate text-title font-semibold text-text">{contact.fullName}</p>
                  <p className="mt-1 truncate text-caption text-text-muted">
                    {contact.email} - {contact.phone}
                  </p>
                  {contact.nextAction ? (
                    <p className="mt-2 truncate text-caption text-text-muted">
                      {pick(locale, { es: "Next", en: "Next" })}: {contact.nextAction}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-start">
                  <span
                    className={`inline-flex rounded-pill px-3 py-1 text-caption font-semibold ${STAGE_THEME[contact.lifecycleStage].chip}`}
                  >
                    {pick(locale, STAGE_LABELS[contact.lifecycleStage])}
                  </span>
                </div>
                <div className="text-body text-text">{contact.owner}</div>
                <div className="text-body text-text-muted">
                  <p>{formatShortDate(locale, contact.lastActivityAt ?? contact.createdAt)}</p>
                  <p className="mt-1 text-caption">{contact.source}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
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
        es: "Base temprana y entradas de intencion baja.",
        en: "Early base and low-intent entries.",
      }),
    },
    {
      href: "/zoho/leads",
      title: pick(locale, { es: "Leads", en: "Leads" }),
      body: pick(locale, {
        es: "Interes comercial abierto y proximos pasos.",
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
      es: "Nombre y telefono como minimos operativos para seguimiento.",
      en: "Name and phone as the minimum operating fields for follow-up.",
    }),
    pick(locale, {
      es: "Email, interes y categoria para segmentacion inicial.",
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
    const current = counts.get(opportunity.owner) ?? { owner: opportunity.owner, contacts: 0, deals: 0 };
    current.deals += 1;
    counts.set(opportunity.owner, current);
  }

  return [...counts.values()].sort(
    (left, right) => right.deals - left.deals || right.contacts - left.contacts
  );
}

function formatShortDate(locale: Locale, isoDate: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(isoDate));
}
