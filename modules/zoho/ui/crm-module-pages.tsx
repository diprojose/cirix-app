import Link from "next/link";
import s from "./crm.module.css";
import { LeadCaptureForm } from "@/modules/zoho/ui/lead-capture-form";
import { localizeHref, pick, type Locale } from "@/lib/locale";
import type {
  CommercialContactDto,
  CrmDashboardDto,
  LifecycleStage,
  OpportunityDto,
} from "@/modules/zoho/crm/application/dtos/crm-dashboard-dto";

const STAGE_LABELS: Record<LifecycleStage, Record<Locale, string>> = {
  subscriber: { es: "Suscriptores", en: "Subscribers" },
  lead: { es: "Leads", en: "Leads" },
  prospect: { es: "Prospectos", en: "Prospects" },
  customer: { es: "Clientes", en: "Customers" },
};

const STAGE_NOTES: Record<LifecycleStage, Record<Locale, string>> = {
  subscriber: { es: "Tu audiencia, lista para iniciar una relación.", en: "Your audience, ready to start a relationship." },
  lead: { es: "Interés comercial que espera el próximo paso.", en: "Commercial interest waiting for the next step." },
  prospect: { es: "Oportunidades calificadas para avanzar.", en: "Qualified opportunities ready to move forward." },
  customer: { es: "Negocios ganados. Relaciones que continúan.", en: "Business won. Relationships that continue." },
};

const CONVERSION_COPY: Record<string, { label: string; note: string }> = {
  "Subscriber to lead": { label: "De suscriptor a lead", note: "De audiencia a interés comercial." },
  "Lead to prospect": { label: "De lead a prospecto", note: "Contactos calificados por el equipo comercial." },
  "Prospect to customer": { label: "De prospecto a cliente", note: "Negocios cerrados sobre el pipeline activo." },
  "Won deals": { label: "Negocios ganados", note: "Oportunidades marcadas como ganadas en el CRM." },
};

const STAGE_THEME: Record<LifecycleStage, string> = {
  subscriber: s.subscriber,
  lead: s.lead,
  prospect: s.prospect,
  customer: s.customer,
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
    <div className={s.page}>
      <PageIntro locale={locale}
        eyebrow={{ es: "01 / VISIÓN COMERCIAL", en: "01 / COMMERCIAL OVERVIEW" }}
        title={{ es: "Cada oportunidad, en su lugar.", en: "Every opportunity, in the right place." }}
        body={{ es: "Una visión compartida de tus contactos, tu pipeline y lo que viene después.", en: "A shared view of your contacts, your pipeline, and what comes next." }}
      />
      <div className={s.metricGrid}>
        <MetricCard
          label={pick(locale, { es: "Contactos", en: "Contacts" })}
          value={String(dashboard.contacts.length)}
          note={pick(locale, { es: "base activa en CRM", en: "active base in CRM" })}
        />
        <MetricCard
          label={pick(locale, { es: "Negocios abiertos", en: "Open deals" })}
          value={String(openDeals)}
          note={pick(locale, { es: "pipeline vivo", en: "live pipeline" })}
        />
        <MetricCard
          label={pick(locale, { es: "Negocios ganados", en: "Won deals" })}
          value={String(wonDeals)}
          note={pick(locale, { es: "negocios convertidos", en: "converted business" })}
        />
        <MetricCard
          label={pick(locale, { es: "Seguimientos", en: "Follow-ups" })}
          value={String(dashboard.priorityFollowUps.length)}
          note={pick(locale, { es: "requieren acción", en: "require action" })}
        />
      </div>

      <div className={s.metricGrid}>
        {dashboard.stageSummary.map((step) => (
          <Link
            key={step.stage}
            href={localizeHref(locale, stageHref(step.stage))}
            className={`${s.stageCard} ${STAGE_THEME[step.stage]}`}
          >
            <span className={s.stageChip}>
              {pick(locale, STAGE_LABELS[step.stage])}
            </span>
            <p className={s.stageValue}>{step.count}<span aria-hidden="true">↗</span></p>
            <p className={s.description}>{pick(locale, STAGE_NOTES[step.stage])}</p>
          </Link>
        ))}
      </div>

      <div className={s.mainGrid}>
        <RecordTable
          locale={locale}
          eyebrow={pick(locale, { es: "RELACIONES EN MOVIMIENTO", en: "RELATIONSHIPS IN MOTION" })}
          title={pick(locale, { es: "Contactos recientes", en: "Recent contacts" })}
          contacts={recentContacts}
        />

        <section className={s.panel}>
          <p className={s.eyebrow}>{pick(locale, { es: "ACCESOS DIRECTOS", en: "SHORTCUTS" })}</p>
          <h2 className={s.panelTitle}>{pick(locale, { es: "Tu próximo paso", en: "Your next step" })}</h2>
          <div className={s.shortcuts}>
            {buildLandingLinks(locale).map((item) => (
              <Link key={item.href} href={localizeHref(locale, item.href)} className={s.shortcut}>
                <div><strong>{item.title}</strong><p>{item.body}</p></div><span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>
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
    <div className={s.page}>
      <PageIntro
        locale={locale}
        eyebrow={{ es: "KPIs", en: "KPIs" }}
        title={{
          es: "Tu actividad, en perspectiva.",
          en: "Your activity, in perspective.",
        }}
        body={{
          es: "Etapas, conversiones y actividad para orientar el próximo paso de tu equipo.",
          en: "Stages, conversions, and activity to guide your team’s next step.",
        }}
      />

      <div className={s.metricGrid}>
        <MetricCard
          label={pick(locale, { es: "Contactos", en: "Contacts" })}
          value={String(dashboard.contacts.length)}
          note={pick(locale, { es: "base activa", en: "active base" })}
        />
        <MetricCard
          label={pick(locale, { es: "Negocios abiertos", en: "Open deals" })}
          value={String(openDeals)}
          note={pick(locale, { es: `${wonDeals} ganados`, en: `${wonDeals} won` })}
        />
        <MetricCard
          label={pick(locale, { es: "Negocios perdidos", en: "Lost deals" })}
          value={String(lostDeals)}
          note={pick(locale, { es: "feedback comercial", en: "commercial feedback" })}
        />
        <MetricCard
          label={pick(locale, { es: "Actividad", en: "Activity" })}
          value={String(dashboard.activities.length)}
          note={pick(locale, { es: "señales registradas", en: "signals recorded" })}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <SimpleStatPanel
          locale={locale}
          eyebrow={{ es: "Mix de etapas", en: "Stage mix" }}
          title={{ es: "Contactos por etapa", en: "Counts by lifecycle stage" }}
          rows={dashboard.stageSummary.map((item) => ({
            label: pick(locale, STAGE_LABELS[item.stage]),
            value: String(item.count),
            note: pick(locale, STAGE_NOTES[item.stage]),
          }))}
        />
        <SimpleStatPanel
          locale={locale}
          eyebrow={{ es: "Conversiones", en: "Conversions" }}
          title={{ es: "Lecturas rápidas", en: "Quick reads" }}
          rows={dashboard.conversions.map((item) => ({
            label: locale === "es" ? CONVERSION_COPY[item.label]?.label ?? item.label : item.label,
            value: item.value,
            note: locale === "es" ? CONVERSION_COPY[item.label]?.note ?? item.note : item.note,
          }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SimpleListPanel
          locale={locale}
          eyebrow={{ es: "Origen", en: "Source mix" }}
          title={{ es: "De dónde llegan tus contactos", en: "Where demand comes from" }}
          items={sourceMix.map((item) => `${item.label} - ${item.count}`)}
        />
        <SimpleListPanel
          locale={locale}
          eyebrow={{ es: "Responsables", en: "Owners" }}
          title={{ es: "Carga operativa", en: "Operational load" }}
          items={ownerLoad.map((item) => `${item.owner} · ${item.contacts} ${pick(locale, { es: "contactos", en: "contacts" })} · ${item.deals} ${pick(locale, { es: "negocios", en: "deals" })}`)}
        />
      </div>

      <SimpleListPanel
        locale={locale}
        eyebrow={{ es: "Seguimientos", en: "Follow-ups" }}
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
    <div className={s.page}>
      <PageIntro locale={locale}
        eyebrow={{ es: "PIPELINE COMERCIAL", en: "SALES PIPELINE" }}
        title={STAGE_LABELS[stage]}
        body={{ es: "Contactos, responsables y próximos pasos para dar continuidad a cada relación.", en: "Contacts, owners, and next steps to keep every relationship moving." }}
      />
      <RecordTable locale={locale} eyebrow="" title={pick(locale, { es: `${contacts.length} registros`, en: `${contacts.length} records` })} contacts={contacts} />
    </div>
  );
}

export function CrmDemoFormPage({ locale }: { locale: Locale }) {
  return (
    <div className={s.mainGrid}>
      <div className={s.panel}>
        <PageIntro
          locale={locale}
          eyebrow={{ es: "CAPTURA COMERCIAL", en: "LEAD CAPTURE" }}
          title={{
            es: "Una conversación. Una oportunidad.",
            en: "A conversation. An opportunity.",
          }}
          body={{
            es: "Registra un contacto y dale a tu equipo el contexto para dar el próximo paso.",
            en: "Capture a contact and give your team the context to take the next step.",
          }}
        />
        <LeadCaptureForm locale={locale} />
      </div>

      <div className="space-y-6">
        <SimpleListPanel
          locale={locale}
          eyebrow={{ es: "Campos", en: "Fields" }}
          title={{ es: "Datos del contacto", en: "Minimum data" }}
          items={buildFormFields(locale)}
        />
        <SimpleListPanel
          locale={locale}
          eyebrow={{ es: "Resultado", en: "Result" }}
          title={{ es: "Después del envío", en: "After submission" }}
          items={[
            pick(locale, { es: "Contacto registrado para seguimiento", en: "Contact recorded for follow-up" }),
            pick(locale, { es: "Estado de sincronización con Zoho", en: "Zoho sync status" }),
            pick(locale, { es: "Resumen de los datos enviados", en: "Summary of submitted details" }),
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
    <div className={s.pageIntro}>
      <p className={s.eyebrow}>
        {pick(locale, eyebrow)}
      </p>
      <h1 className={s.pageTitle}>
        {pick(locale, title)}
      </h1>
      <p className={s.introDescription}>{pick(locale, body)}</p>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className={s.metricCard}>
      <p className={s.metricLabel}>{label}</p>
      <p className={s.metricValue}>{value}</p>
      <p className={s.description}>{note}</p>
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
    <div className={s.panel}>
      <p className={s.eyebrow}>
        {pick(locale, eyebrow)}
      </p>
      <h2 className={s.panelTitle}>{pick(locale, title)}</h2>
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
    <div className={s.panel}>
      <p className={s.eyebrow}>
        {pick(locale, eyebrow)}
      </p>
      <h2 className={s.panelTitle}>{pick(locale, title)}</h2>
      <div className="mt-5 space-y-2">
        {items.length === 0 ? (
          <p className={s.description}>
            {pick(locale, { es: "Sin datos todavía.", en: "No data yet." })}
          </p>
        ) : (
          items.map((item, index) => (
            <div key={`${item}-${index}`} className={s.listItem}>
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
    <section className={s.panel}>
      {eyebrow ? <p className={s.eyebrow}>{eyebrow}</p> : null}
      {title ? <h2 className={s.panelTitle}>{title}</h2> : null}
      {contacts.length === 0 ? (
        <div className={s.emptyState}>
          <span aria-hidden="true">◫</span>
          <p>{pick(locale, { es: "Todavía no hay registros en esta vista.", en: "There are no records in this view yet." })}</p>
          <Link className={s.textLink} href={localizeHref(locale, "/zoho/demo-form")}>
            {pick(locale, { es: "Registrar un contacto", en: "Capture a contact" })} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      ) : (
        <div className={s.tableScroll} role="region" aria-label={title || pick(locale, { es: "Contactos", en: "Contacts" })} tabIndex={0}>
          <table className={s.table}>
            <caption className={s.srOnly}>{title || pick(locale, { es: "Contactos", en: "Contacts" })}</caption>
            <thead><tr>
              <th scope="col">{pick(locale, { es: "Contacto", en: "Contact" })}</th>
              <th scope="col">{pick(locale, { es: "Etapa", en: "Stage" })}</th>
              <th scope="col">{pick(locale, { es: "Responsable", en: "Owner" })}</th>
              <th scope="col">{pick(locale, { es: "Última actividad", en: "Last activity" })}</th>
            </tr></thead>
            <tbody>{contacts.map((contact) => (
              <tr key={contact.id}>
                <td>
                  <div className={s.contact}>
                    <span className={s.avatar} aria-hidden="true">{contact.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
                    <div>
                      <p className={s.contactName}>{contact.fullName}</p>
                      <p className={s.contactMeta}>{[contact.email, contact.phone].filter(Boolean).join(" · ")}</p>
                      {contact.nextAction && <p className={s.contactNext}>{pick(locale, { es: "Próximo paso", en: "Next step" })}: {contact.nextAction}</p>}
                    </div>
                  </div>
                </td>
                <td><span className={`${s.stageChip} ${STAGE_THEME[contact.lifecycleStage]}`}>{pick(locale, STAGE_LABELS[contact.lifecycleStage])}</span></td>
                <td>{contact.owner}</td>
                <td><p>{formatShortDate(locale, contact.lastActivityAt ?? contact.createdAt)}</p><p className={s.contactMeta}>{contact.source}</p></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
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
      title: pick(locale, { es: "Suscriptores", en: "Subscribers" }),
      body: pick(locale, {
        es: "El inicio de cada relación comercial.",
        en: "Early base and low-intent entries.",
      }),
    },
    {
      href: "/zoho/leads",
      title: pick(locale, { es: "Leads", en: "Leads" }),
      body: pick(locale, {
        es: "Interés comercial y próximos pasos.",
        en: "Open commercial interest and next steps.",
      }),
    },
    {
      href: "/zoho/prospects",
      title: pick(locale, { es: "Prospectos", en: "Prospects" }),
      body: pick(locale, {
        es: "Oportunidades calificadas para avanzar.",
        en: "Qualified leads with deal context.",
      }),
    },
    {
      href: "/zoho/customers",
      title: pick(locale, { es: "Clientes", en: "Customers" }),
      body: pick(locale, {
        es: "Negocios cerrados y relaciones activas.",
        en: "Closed business and active relationships.",
      }),
    },
    {
      href: "/zoho/demo-form",
      title: pick(locale, { es: "Nuevo contacto", en: "New contact" }),
      body: pick(locale, {
        es: "Registra una nueva oportunidad comercial.",
        en: "Capture a new sales opportunity.",
      }),
    },
  ];
}

function buildFormFields(locale: Locale): string[] {
  return [
    pick(locale, {
      es: "Nombre y teléfono para iniciar el seguimiento.",
      en: "Name and phone as the minimum operating fields for follow-up.",
    }),
    pick(locale, {
      es: "Email y categoría para conocer mejor al contacto.",
      en: "Email, interest, and category for initial segmentation.",
    }),
    pick(locale, {
      es: "Campaña para identificar el origen de la oportunidad.",
      en: "Source and campaign for lead traceability.",
    }),
    pick(locale, {
      es: "Mensaje para compartir el contexto comercial.",
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
