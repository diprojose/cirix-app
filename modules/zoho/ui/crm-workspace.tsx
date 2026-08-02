"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CONTAINER, CONTAINER_READ } from "@/modules/loyalty/ui/layout";
import { LeadCaptureForm } from "@/modules/zoho/ui/lead-capture-form";
import { pick, type Locale } from "@/lib/locale";
import type {
  ActivityDto,
  CommercialContactDto,
  CrmDashboardDto,
  LifecycleStage,
  OpportunityDto,
} from "@/modules/zoho/crm/application/dtos/crm-dashboard-dto";

type WorkspaceView = "overview" | "pipeline" | "contacts" | "capture";

const VIEW_TABS: Array<{
  id: WorkspaceView;
  label: Record<Locale, string>;
  note: Record<Locale, string>;
}> = [
  {
    id: "overview",
    label: { es: "Resumen", en: "Overview" },
    note: { es: "Pulso comercial", en: "Commercial pulse" },
  },
  {
    id: "pipeline",
    label: { es: "Pipeline", en: "Pipeline" },
    note: { es: "Etapas y deals", en: "Stages and deals" },
  },
  {
    id: "contacts",
    label: { es: "Contactos", en: "Contacts" },
    note: { es: "Base digerida", en: "Normalized base" },
  },
  {
    id: "capture",
    label: { es: "Captura", en: "Capture" },
    note: { es: "Entrada web", en: "Web intake" },
  },
];

const STAGE_THEME: Record<
  LifecycleStage,
  { chip: string; panel: string; ring: string }
> = {
  subscriber: {
    chip: "bg-sky-100 text-sky-700",
    panel: "bg-sky-50",
    ring: "ring-sky-200",
  },
  lead: {
    chip: "bg-amber-100 text-amber-800",
    panel: "bg-amber-50",
    ring: "ring-amber-200",
  },
  prospect: {
    chip: "bg-violet-100 text-violet-700",
    panel: "bg-violet-50",
    ring: "ring-violet-200",
  },
  customer: {
    chip: "bg-emerald-100 text-emerald-700",
    panel: "bg-emerald-50",
    ring: "ring-emerald-200",
  },
};

export function CrmWorkspace({
  locale,
  dashboard,
}: {
  locale: Locale;
  dashboard: CrmDashboardDto;
}) {
  const [view, setView] = useState<WorkspaceView>("overview");

  const contactsById = useMemo(
    () => new Map(dashboard.contacts.map((contact) => [contact.id, contact])),
    [dashboard.contacts]
  );
  const recentActivity = useMemo(
    () =>
      [...dashboard.activities]
        .sort((left, right) => Date.parse(right.happenedAt) - Date.parse(left.happenedAt))
        .slice(0, 6),
    [dashboard.activities]
  );
  const openOpportunities = dashboard.opportunities.filter((opportunity) => opportunity.status === "open");
  const sourceMix = summarizeSources(dashboard.contacts);
  const ownerLoad = summarizeOwners(dashboard.contacts, openOpportunities);
  const stalledContacts = [...dashboard.contacts]
    .sort(
      (left, right) =>
        Date.parse(left.lastActivityAt ?? left.createdAt) - Date.parse(right.lastActivityAt ?? right.createdAt)
    )
    .slice(0, 4);

  return (
    <main className="min-h-dvh bg-bg pb-14">
      <section className="border-b border-border bg-[radial-gradient(circle_at_top,rgba(183,99,37,0.16),transparent_48%),linear-gradient(180deg,var(--color-stone-0),var(--color-bg))]">
        <div className={`${CONTAINER} py-8 md:py-14`}>
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-pill border border-border bg-surface px-4 text-label font-medium text-text transition-colors hover:bg-stone-100"
            >
              {pick(locale, { es: "Volver a modulos", en: "Back to modules" })}
            </Link>
            <span className="rounded-pill bg-action-soft px-3 py-1 text-caption font-semibold uppercase tracking-[0.18em] text-action-strong">
              {pick(locale, { es: "CRM operativo", en: "Operating CRM" })}
            </span>
          </div>

          <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_24rem]">
            <div className="max-w-3xl">
              <p className="text-label font-semibold uppercase tracking-[0.18em] text-action-strong">
                Zoho CRM
              </p>
              <h1 className="mt-3 max-w-3xl text-[clamp(2.4rem,6vw,5rem)] font-bold leading-[0.94] tracking-[-0.045em] text-text">
                {pick(locale, {
                  es: "Un workspace comercial con vistas claras para operar el embudo.",
                  en: "A commercial workspace with clear views to run the pipeline.",
                })}
              </h1>
              <p className="mt-5 max-w-2xl text-body text-text-muted md:text-lg">
                {pick(locale, {
                  es: "Separa lectura ejecutiva, pipeline, base comercial y captura web sin obligarte a recorrer una sola pantalla infinita.",
                  en: "Split executive readout, pipeline, commercial base, and web capture without forcing everything into one long screen.",
                })}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {VIEW_TABS.map((tab) => {
                  const active = view === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setView(tab.id)}
                      className={`inline-flex min-h-12 flex-col items-start rounded-2xl border px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-action-fill bg-surface text-text shadow-card"
                          : "border-border bg-surface/60 text-text-muted hover:bg-surface hover:text-text"
                      }`}
                    >
                      <span className="text-sm font-semibold">{pick(locale, tab.label)}</span>
                      <span className="text-xs">{pick(locale, tab.note)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="rounded-[1.5rem] border border-border bg-surface p-5 shadow-card">
              <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">
                {pick(locale, { es: "Snapshot", en: "Snapshot" })}
              </p>
              <h2 className="mt-1 text-h-section font-bold text-text">
                {pick(locale, { es: "Salud del pipeline", en: "Pipeline health" })}
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SnapshotStat
                  label={pick(locale, { es: "Contactos", en: "Contacts" })}
                  value={String(dashboard.contacts.length)}
                  note={pick(locale, { es: "base comercial activa", en: "active commercial base" })}
                />
                <SnapshotStat
                  label={pick(locale, { es: "Deals abiertos", en: "Open deals" })}
                  value={String(openOpportunities.length)}
                  note={pick(locale, {
                    es: `${dashboard.priorityFollowUps.length} seguimientos vivos`,
                    en: `${dashboard.priorityFollowUps.length} live follow-ups`,
                  })}
                />
                <SnapshotStat
                  label={pick(locale, { es: "Actividad", en: "Activity" })}
                  value={String(dashboard.activities.length)}
                  note={pick(locale, { es: "señales comercializadas", en: "commercial signals" })}
                />
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row xl:flex-col">
                <Link
                  href="/api/zoho/crm"
                  className="inline-flex min-h-11 items-center justify-center rounded-pill bg-action-fill px-5 text-sm font-semibold text-on-action shadow-action transition-colors hover:bg-action-strong"
                >
                  {pick(locale, { es: "Ver payload", en: "View payload" })}
                </Link>
                <Link
                  href="/loyalty"
                  className="inline-flex min-h-11 items-center justify-center rounded-pill border border-border bg-bg px-5 text-sm font-semibold text-text transition-colors hover:bg-stone-100"
                >
                  {pick(locale, { es: "Abrir loyalty", en: "Open loyalty" })}
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className={`${CONTAINER} pt-8 md:pt-10`}>
        {view === "overview" ? (
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-4">
              {dashboard.conversions.map((item, index) => (
                <article key={`${item.label}-${item.value}-${index}`} className="rounded-xl border border-border bg-surface p-5 shadow-xs">
                  <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {item.label}
                  </p>
                  <p className="mt-3 text-display font-bold tracking-tight text-text">{item.value}</p>
                  <p className="mt-3 text-body text-text-muted">{item.note}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
              <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
                <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
                  {pick(locale, { es: "Timeline", en: "Timeline" })}
                </p>
                <h2 className="mt-2 text-display font-bold tracking-tight text-text">
                  {pick(locale, { es: "Actividad reciente del embudo", en: "Recent pipeline activity" })}
                </h2>
                <div className="mt-6 grid gap-3">
                  {recentActivity.map((activity) => {
                    const contact = contactsById.get(activity.contactId);
                    return (
                      <article key={activity.id} className="rounded-lg border border-border bg-bg px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-title font-semibold text-text">{activity.summary}</p>
                            <p className="mt-1 text-caption text-text-muted">
                              {contact?.fullName ?? "Unknown contact"} · {formatActivityDate(locale, activity)}
                            </p>
                          </div>
                          {contact ? (
                            <span className={`rounded-pill px-3 py-1 text-caption font-semibold ${STAGE_THEME[contact.lifecycleStage].chip}`}>
                              {contact.lifecycleStage}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <InfoListCard
                  locale={locale}
                  eyebrow={{ es: "Origen", en: "Source mix" }}
                  title={{ es: "De dónde entra la demanda", en: "Where demand is coming from" }}
                  items={sourceMix.map((item) => `${item.label} · ${item.count}`)}
                />
                <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
                  <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
                    {pick(locale, { es: "Riesgo", en: "Risk" })}
                  </p>
                  <h2 className="mt-2 text-display font-bold tracking-tight text-text">
                    {pick(locale, { es: "Contactos sin movimiento reciente", en: "Contacts with stale movement" })}
                  </h2>
                  <div className="mt-6 space-y-3">
                    {stalledContacts.map((contact) => (
                      <article key={contact.id} className="rounded-lg border border-border bg-bg px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-title font-semibold text-text">{contact.fullName}</p>
                            <p className="mt-1 text-caption text-text-muted">
                              {contact.owner} · {contact.source}
                            </p>
                          </div>
                          <span className={`rounded-pill px-3 py-1 text-caption font-semibold ${STAGE_THEME[contact.lifecycleStage].chip}`}>
                            {contact.lifecycleStage}
                          </span>
                        </div>
                        <p className="mt-3 text-caption text-text-muted">
                          {pick(locale, { es: "Última actividad", en: "Last activity" })}:{" "}
                          {formatShortDate(locale, contact.lastActivityAt ?? contact.createdAt)}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {view === "pipeline" ? (
          <div className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
              <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
                <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
                  {pick(locale, { es: "Embudo", en: "Funnel" })}
                </p>
                <h2 className="mt-2 text-display font-bold tracking-tight text-text">
                  {pick(locale, { es: "Etapas y disparadores del flujo core", en: "Stages and triggers in the core flow" })}
                </h2>
                <div className="mt-6 grid gap-3 md:grid-cols-4">
                  {buildFlowCards(locale).map((card) => (
                    <div
                      key={card.stage}
                      className={`rounded-lg border border-border p-4 ring-1 ${STAGE_THEME[card.stage].panel} ${STAGE_THEME[card.stage].ring}`}
                    >
                      <span className={`inline-flex rounded-pill px-3 py-1 text-caption font-semibold ${STAGE_THEME[card.stage].chip}`}>
                        {card.title}
                      </span>
                      <p className="mt-3 text-body font-medium text-text">{card.body}</p>
                      <p className="mt-3 text-caption text-text-muted">{card.trigger}</p>
                    </div>
                  ))}
                </div>
              </div>

              <InfoListCard
                locale={locale}
                eyebrow={{ es: "Carga", en: "Load" }}
                title={{ es: "Distribución por owner", en: "Distribution by owner" }}
                items={ownerLoad.map((row) => `${row.owner} · ${row.contacts} contacts · ${row.deals} deals`)}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
              <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
                <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
                  {pick(locale, { es: "Deals", en: "Deals" })}
                </p>
                <h2 className="mt-2 text-display font-bold tracking-tight text-text">
                  {pick(locale, { es: "Oportunidades abiertas", en: "Open opportunities" })}
                </h2>
                <div className="mt-6 space-y-3">
                  {openOpportunities.map((opportunity) => {
                    const contact = contactsById.get(opportunity.contactId);
                    return (
                      <article key={opportunity.id} className="rounded-lg border border-border bg-bg px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-title font-semibold text-text">{opportunity.title}</p>
                            <p className="mt-1 text-caption text-text-muted">
                              {contact?.fullName ?? "Unknown contact"} · {opportunity.owner}
                            </p>
                          </div>
                          <span className="rounded-pill bg-amber-100 px-3 py-1 text-caption font-semibold text-amber-800">
                            {opportunity.stage}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-body text-text">
                          <span>
                            {opportunity.expectedCloseDate
                              ? `${pick(locale, { es: "Cierre", en: "Close" })}: ${formatShortDate(locale, opportunity.expectedCloseDate)}`
                              : pick(locale, { es: "Sin fecha estimada", en: "No close date" })}
                          </span>
                          <span className="font-semibold tabular-nums">
                            {opportunity.value ? `$${opportunity.value.toLocaleString("en-US")}` : "TBD"}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
                <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
                  {pick(locale, { es: "Prioridad", en: "Priority" })}
                </p>
                <h2 className="mt-2 text-display font-bold tracking-tight text-text">
                  {pick(locale, { es: "Quién necesita atención ahora", en: "Who needs attention now" })}
                </h2>
                <div className="mt-6 space-y-3">
                  {dashboard.priorityFollowUps.map((followUp, index) => (
                    <article key={`${followUp.contactId}-${followUp.nextAction}-${index}`} className="rounded-lg border border-border bg-bg px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-title font-semibold text-text">{followUp.fullName}</p>
                          <p className="mt-1 text-caption text-text-muted">
                            {followUp.owner} · {followUp.source}
                          </p>
                        </div>
                        <span className={`rounded-pill px-3 py-1 text-caption font-semibold ${STAGE_THEME[followUp.lifecycleStage].chip}`}>
                          {followUp.lifecycleStage}
                        </span>
                      </div>
                      <p className="mt-3 text-body text-text">{followUp.nextAction}</p>
                      <p className="mt-2 text-caption text-text-muted">{followUp.dueLabel}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {view === "contacts" ? <ContactsView locale={locale} contacts={dashboard.contacts} /> : null}

        {view === "capture" ? <CaptureView locale={locale} /> : null}
      </section>

      <section className={`${CONTAINER_READ} pt-8 md:pt-12`}>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
            {pick(locale, { es: "Boundary de integración", en: "Integration boundary" })}
          </p>
          <h2 className="mt-2 text-display font-bold tracking-tight text-text">
            {pick(locale, {
              es: "Zoho sigue siendo el CRM; la UI ya opera como workspace desacoplado.",
              en: "Zoho remains the CRM; the UI now behaves as a decoupled workspace.",
            })}
          </h2>
          <p className="mt-4 text-body text-text-muted">
            {pick(locale, {
              es: "La lectura sigue saliendo del modelo normalizado y la captura entra por un endpoint propio, así que puedes cambiar el origen real sin reescribir estas vistas.",
              en: "The read path still comes from the normalized model and capture flows through its own endpoint, so you can swap the real source without rewriting these views.",
            })}
          </p>
        </div>
      </section>
    </main>
  );
}

function ContactsView({
  locale,
  contacts,
}: {
  locale: Locale;
  contacts: CommercialContactDto[];
}) {
  const [stageFilter, setStageFilter] = useState<LifecycleStage | "all">("all");
  const filteredContacts =
    stageFilter === "all"
      ? contacts
      : contacts.filter((contact) => contact.lifecycleStage === stageFilter);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {(["all", "subscriber", "lead", "prospect", "customer"] as const).map((stage) => {
          const active = stageFilter === stage;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setStageFilter(stage)}
              className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-ink text-on-accent"
                  : "border border-border bg-surface text-text-muted hover:bg-stone-100 hover:text-text"
              }`}
            >
              {stage === "all" ? pick(locale, { es: "Todos", en: "All" }) : stage}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
            {pick(locale, { es: "Base comercial", en: "Commercial base" })}
          </p>
          <h2 className="mt-2 text-display font-bold tracking-tight text-text">
            {pick(locale, { es: "Contactos normalizados desde el CRM", en: "Contacts normalized from CRM" })}
          </h2>
          <div className="mt-6 space-y-3">
            {filteredContacts.map((contact) => (
              <article key={contact.id} className="rounded-xl border border-border bg-bg px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-title font-semibold text-text">{contact.fullName}</p>
                    <p className="mt-1 text-caption text-text-muted">
                      {contact.email} · {contact.phone}
                    </p>
                  </div>
                  <span className={`rounded-pill px-3 py-1 text-caption font-semibold ${STAGE_THEME[contact.lifecycleStage].chip}`}>
                    {contact.lifecycleStage}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <ContactFact label="Owner" value={contact.owner} />
                  <ContactFact label={pick(locale, { es: "Origen", en: "Source" })} value={contact.source} />
                  <ContactFact
                    label={pick(locale, { es: "Categoría", en: "Category" })}
                    value={contact.interestCategory ?? "General"}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>

        <InfoListCard
          locale={locale}
          eyebrow={{ es: "Entrada web", en: "Web intake" }}
          title={{ es: "Qué entra a esta base", en: "What enters this base" }}
          items={buildFormFields(locale)}
        />
      </div>
    </div>
  );
}

function CaptureView({ locale }: { locale: Locale }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
          {pick(locale, { es: "Captura pública", en: "Public capture" })}
        </p>
        <h2 className="mt-2 text-display font-bold tracking-tight text-text">
          {pick(locale, { es: "Formulario de entrada al CRM", en: "Lead intake form into CRM" })}
        </h2>
        <p className="mt-4 max-w-2xl text-body text-text-muted">
          {pick(locale, {
            es: "Esta vista sirve para probar el write-path comercial sin salir del dashboard: persiste localmente, sincroniza con Zoho y te deja validar el flujo de punta a punta.",
            en: "This view lets you test the commercial write path without leaving the dashboard: it persists locally, syncs with Zoho, and validates the end-to-end flow.",
          })}
        </p>
        <LeadCaptureForm locale={locale} />
      </div>

      <InfoListCard
        locale={locale}
        eyebrow={{ es: "Checklist", en: "Checklist" }}
        title={{ es: "Campos mínimos operativos", en: "Minimum operating fields" }}
        items={buildFormFields(locale)}
      />
    </div>
  );
}

function SnapshotStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg px-4 py-4">
      <p className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <p className="mt-2 text-display font-bold tracking-tight text-text">{value}</p>
      <p className="mt-2 text-caption text-text-muted">{note}</p>
    </div>
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
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-lg border border-border bg-bg px-4 py-3 text-body text-text-muted">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-3">
      <p className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <p className="mt-1 text-body text-text">{value}</p>
    </div>
  );
}

function buildFlowCards(locale: Locale): Array<{
  stage: LifecycleStage;
  title: string;
  body: string;
  trigger: string;
}> {
  return [
    {
      stage: "subscriber",
      title: "Subscriber",
      body: pick(locale, {
        es: "Entra por newsletter, descarga de catálogo o promo sin pedido comercial directo.",
        en: "Comes from newsletter, catalog download, or promo opt-in without a direct sales request.",
      }),
      trigger: pick(locale, {
        es: "Disparador: formulario de suscripción o consentimiento promocional.",
        en: "Trigger: subscription form or promotional consent.",
      }),
    },
    {
      stage: "lead",
      title: "Lead",
      body: pick(locale, {
        es: "Ya existe interés comercial: cotizar, pedir información o abrir conversación.",
        en: "Commercial intent exists: request a quote, ask for information, or start a conversation.",
      }),
      trigger: pick(locale, {
        es: "Disparador: formulario de contacto, WhatsApp o anuncio lead-gen.",
        en: "Trigger: contact form, WhatsApp, or lead-gen ad.",
      }),
    },
    {
      stage: "prospect",
      title: "Prospect",
      body: pick(locale, {
        es: "Lead calificado con encaje real, owner asignado y siguiente acción definida.",
        en: "Qualified lead with real fit, an owner assigned, and a defined next action.",
      }),
      trigger: pick(locale, {
        es: "Disparador: validación comercial, presupuesto o necesidad confirmada.",
        en: "Trigger: sales validation, budget, or confirmed need.",
      }),
    },
    {
      stage: "customer",
      title: "Customer",
      body: pick(locale, {
        es: "Negocio ganado; desde aquí puede enganchar con loyalty o postventa.",
        en: "Business won; from here the account can move into loyalty or post-sale flows.",
      }),
      trigger: pick(locale, {
        es: "Disparador: deal won o conversión formal en Zoho.",
        en: "Trigger: won deal or formal conversion in Zoho.",
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
      es: "Email, interés y categoría del producto para segmentación inicial.",
      en: "Email, interest, and product category for initial segmentation.",
    }),
    pick(locale, {
      es: "Source, campaign y tipo de intención: subscription o commercial inquiry.",
      en: "Source, campaign, and intent type: subscription or commercial inquiry.",
    }),
    pick(locale, {
      es: "Mensaje libre y metadata del vertical sin romper el core.",
      en: "Free-text message and vertical metadata without breaking the core.",
    }),
  ];
}

function formatActivityDate(locale: Locale, activity: ActivityDto): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(activity.happenedAt));
}

function formatShortDate(locale: Locale, isoDate: string): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(isoDate));
}

function summarizeSources(contacts: CommercialContactDto[]) {
  const counts = new Map<string, number>();
  for (const contact of contacts) {
    counts.set(contact.source, (counts.get(contact.source) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
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

  return [...counts.values()].sort((left, right) => right.deals - left.deals || right.contacts - left.contacts);
}
