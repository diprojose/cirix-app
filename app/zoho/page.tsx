import type { Metadata } from "next";
import Link from "next/link";
import { CONTAINER, CONTAINER_READ } from "@/components/store/layout";
import { getCurrentLocale, pick, type Locale } from "@/lib/i18n";
import { makeGetCrmDashboard } from "@/modules/crm/infrastructure/di/crm-container";
import type { ActivityDto, LifecycleStage } from "@/modules/crm/application/dtos/crm-dashboard-dto";

export const metadata: Metadata = {
  title: "Zoho CRM",
  description:
    "A CRM operating dashboard for subscribers, leads, prospects, and customers.",
};

const STAGE_THEME: Record<
  LifecycleStage,
  { chip: string; panel: string; dot: string; ring: string }
> = {
  subscriber: {
    chip: "bg-sky-100 text-sky-700",
    panel: "bg-sky-50",
    dot: "bg-sky-500",
    ring: "ring-sky-200",
  },
  lead: {
    chip: "bg-amber-100 text-amber-800",
    panel: "bg-amber-50",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
  },
  prospect: {
    chip: "bg-violet-100 text-violet-700",
    panel: "bg-violet-50",
    dot: "bg-violet-500",
    ring: "ring-violet-200",
  },
  customer: {
    chip: "bg-emerald-100 text-emerald-700",
    panel: "bg-emerald-50",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
};

export default async function HozoPage() {
  const locale = await getCurrentLocale();
  const result = await makeGetCrmDashboard().execute();

  if (!result.ok) {
    return (
      <main
        className={`${CONTAINER_READ} flex min-h-dvh flex-col items-center justify-center gap-2 py-12 text-center`}
      >
        <p className="text-title font-semibold text-text">
          {pick(locale, {
            es: "No se pudo cargar el dashboard CRM.",
            en: "The CRM dashboard could not be loaded.",
          })}
        </p>
        <p className="text-body text-text-muted">
          {pick(locale, {
            es: "Vuelve a intentarlo en un momento.",
            en: "Please try again in a moment.",
          })}
        </p>
      </main>
    );
  }

  const dashboard = result.value;
  const recentActivity = [...dashboard.activities]
    .sort((left, right) => Date.parse(right.happenedAt) - Date.parse(left.happenedAt))
    .slice(0, 6);
  const contactsById = new Map(dashboard.contacts.map((contact) => [contact.id, contact]));
  const openOpportunities = dashboard.opportunities.filter((opportunity) => opportunity.status === "open");

  return (
    <main className="min-h-dvh bg-bg pb-14">
      <section className="border-b border-border bg-[radial-gradient(circle_at_top,rgba(183,99,37,0.16),transparent_48%),linear-gradient(180deg,var(--color-stone-0),var(--color-bg))]">
        <div className={`${CONTAINER} py-8 md:py-14`}>
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-pill border border-border bg-surface px-4 text-label font-medium text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              {pick(locale, {
                es: "Volver a modulos",
                en: "Back to modules",
              })}
            </Link>
            <span className="rounded-pill bg-action-soft px-3 py-1 text-caption font-semibold uppercase tracking-[0.18em] text-action-strong">
              {pick(locale, {
                es: "CRM operativo",
                en: "Operating CRM",
              })}
            </span>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] md:items-end">
            <div className="max-w-2xl">
              <p className="text-label font-semibold uppercase tracking-[0.18em] text-action-strong">
                Zoho CRM
              </p>
              <h1 className="mt-3 max-w-2xl text-[clamp(2.4rem,6vw,4.75rem)] font-bold leading-[0.95] tracking-[-0.04em] text-text">
                {pick(locale, {
                  es: "Del formulario publico al cierre, sin perder el hilo comercial.",
                  en: "From public form to closed business, without losing the sales thread.",
                })}
              </h1>
              <p className="mt-5 max-w-xl text-body text-text-muted md:text-lg">
                {pick(locale, {
                  es: "El MVP ya modela un flujo core reusable para verticales distintos: subscriber, lead, prospect y customer sobre una sola vista operativa.",
                  en: "The MVP now models a reusable core flow for multiple verticals: subscriber, lead, prospect, and customer in one operating view.",
                })}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/api/zoho/crm"
                  className="inline-flex min-h-12 items-center justify-center rounded-pill bg-action-fill px-6 text-title font-semibold text-on-action shadow-action transition-colors hover:bg-action-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {pick(locale, {
                    es: "Ver payload normalizado",
                    en: "View normalized payload",
                  })}
                </Link>
                <Link
                  href="/loyalty"
                  className="inline-flex min-h-12 items-center justify-center rounded-pill border border-border bg-surface px-6 text-title font-semibold text-text transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {pick(locale, {
                    es: "Abrir loyalty demo",
                    en: "Open loyalty demo",
                  })}
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {pick(locale, {
                      es: "Resumen semanal",
                      en: "Weekly snapshot",
                    })}
                  </p>
                  <p className="mt-1 text-h-section font-bold text-text">
                    {pick(locale, {
                      es: "Pipeline normalizado",
                      en: "Normalized pipeline",
                    })}
                  </p>
                </div>
                <div className="rounded-pill bg-accent-soft px-3 py-1 text-caption font-semibold text-accent-strong">
                  {dashboard.contacts.length} contacts
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {dashboard.stageSummary.map((step) => {
                  const theme = STAGE_THEME[step.stage];
                  return (
                    <div
                      key={step.stage}
                      className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-border px-4 py-3 ${theme.panel}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
                          <p className="text-title font-semibold text-text">{step.label}</p>
                        </div>
                        <p className="mt-1 text-caption text-text-muted">{step.note}</p>
                      </div>
                      <span className="text-display font-bold tracking-tight text-action-strong">
                        {step.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${CONTAINER} pt-8 md:pt-12`}>
        <div className="grid gap-4 md:grid-cols-4">
          {dashboard.conversions.map((item) => (
            <article
              key={item.label}
              className="rounded-xl border border-border bg-surface p-5 shadow-xs"
            >
              <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">
                {item.label}
              </p>
              <p className="mt-3 text-display font-bold tracking-tight text-text">{item.value}</p>
              <p className="mt-3 text-body text-text-muted">{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${CONTAINER} pt-8 md:pt-12`}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
                  {pick(locale, {
                    es: "Flujo core",
                    en: "Core flow",
                  })}
                </p>
                <h2 className="mt-2 text-display font-bold tracking-tight text-text">
                  {pick(locale, {
                    es: "Etapas y disparadores del embudo",
                    en: "Stage transitions and triggers",
                  })}
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {buildFlowCards(locale).map((card) => (
                <div
                  key={card.stage}
                  className={`rounded-lg border border-border p-4 ring-1 ${STAGE_THEME[card.stage].panel} ${STAGE_THEME[card.stage].ring}`}
                >
                  <span
                    className={`inline-flex rounded-pill px-3 py-1 text-caption font-semibold ${STAGE_THEME[card.stage].chip}`}
                  >
                    {card.title}
                  </span>
                  <p className="mt-3 text-body font-medium text-text">{card.body}</p>
                  <p className="mt-3 text-caption text-text-muted">{card.trigger}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
              {pick(locale, {
                es: "Follow-up prioritario",
                en: "Priority follow-up",
              })}
            </p>
            <h2 className="mt-2 text-display font-bold tracking-tight text-text">
              {pick(locale, {
                es: "Quien necesita atencion ahora",
                en: "Who needs attention now",
              })}
            </h2>
            <div className="mt-6 space-y-3">
              {dashboard.priorityFollowUps.map((followUp) => (
                <article
                  key={followUp.contactId}
                  className="rounded-lg border border-border bg-bg px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-title font-semibold text-text">{followUp.fullName}</p>
                      <p className="mt-1 text-caption text-text-muted">
                        {followUp.owner} · {followUp.source}
                      </p>
                    </div>
                    <span
                      className={`rounded-pill px-3 py-1 text-caption font-semibold ${
                        STAGE_THEME[followUp.lifecycleStage].chip
                      }`}
                    >
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
      </section>

      <section className={`${CONTAINER} pt-8 md:pt-12`}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
            <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
              {pick(locale, {
                es: "Base comercial",
                en: "Commercial base",
              })}
            </p>
            <h2 className="mt-2 text-display font-bold tracking-tight text-text">
              {pick(locale, {
                es: "Contactos digeridos desde Zoho",
                en: "Contacts normalized from Zoho",
              })}
            </h2>
            <div className="mt-6 overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] gap-3 border-b border-border bg-bg px-4 py-3 text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">
                <span>{pick(locale, { es: "Contacto", en: "Contact" })}</span>
                <span>{pick(locale, { es: "Origen", en: "Source" })}</span>
                <span>{pick(locale, { es: "Etapa", en: "Stage" })}</span>
              </div>
              <div className="divide-y divide-border">
                {dashboard.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] gap-3 px-4 py-4"
                  >
                    <div>
                      <p className="text-title font-semibold text-text">{contact.fullName}</p>
                      <p className="mt-1 text-caption text-text-muted">
                        {contact.email} · {contact.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-body text-text">{contact.source}</p>
                      <p className="mt-1 text-caption text-text-muted">
                        {contact.interestCategory ?? "General"}
                      </p>
                    </div>
                    <div className="flex items-start justify-end">
                      <span
                        className={`rounded-pill px-3 py-1 text-caption font-semibold ${
                          STAGE_THEME[contact.lifecycleStage].chip
                        }`}
                      >
                        {contact.lifecycleStage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
              <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
                {pick(locale, {
                  es: "Oportunidades",
                  en: "Opportunities",
                })}
              </p>
              <h2 className="mt-2 text-display font-bold tracking-tight text-text">
                {pick(locale, {
                  es: "Deals abiertos",
                  en: "Open deals",
                })}
              </h2>
              <div className="mt-6 space-y-3">
                {openOpportunities.map((opportunity) => {
                  const contact = contactsById.get(opportunity.contactId);
                  return (
                    <article
                      key={opportunity.id}
                      className="rounded-lg border border-border bg-bg px-4 py-4"
                    >
                      <p className="text-title font-semibold text-text">{opportunity.title}</p>
                      <p className="mt-1 text-caption text-text-muted">
                        {contact?.fullName ?? "Unknown contact"} · {opportunity.owner}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3 text-body text-text">
                        <span>{opportunity.stage}</span>
                        <span>
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
                {pick(locale, {
                  es: "Captura publica",
                  en: "Public capture",
                })}
              </p>
              <h2 className="mt-2 text-display font-bold tracking-tight text-text">
                {pick(locale, {
                  es: "Que entra al CRM desde la web",
                  en: "What enters the CRM from the web",
                })}
              </h2>
              <div className="mt-5 space-y-3 text-body text-text-muted">
                {buildFormFields(locale).map((field) => (
                  <div key={field} className="rounded-lg border border-border bg-bg px-4 py-3">
                    {field}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${CONTAINER_READ} pt-8 md:pt-12`}>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
            {pick(locale, {
              es: "Boundary de integracion",
              en: "Integration boundary",
            })}
          </p>
          <h2 className="mt-2 text-display font-bold tracking-tight text-text">
            {pick(locale, {
              es: "Zoho sigue siendo el CRM; el MVP ya consume un modelo core limpio.",
              en: "Zoho remains the CRM; the MVP now consumes a clean core model.",
            })}
          </h2>
          <p className="mt-4 text-body text-text-muted">
            {pick(locale, {
              es: "La lectura del dashboard sale de un adaptador normalizado y de un endpoint dedicado en `/api/zoho/crm`. Eso permite cambiar el mock por Zoho real sin reescribir la UI.",
              en: "The dashboard reads from a normalized adapter and a dedicated `/api/zoho/crm` endpoint. That lets you swap the mock for real Zoho data without rewriting the UI.",
            })}
          </p>
        </div>
      </section>

      <section className={`${CONTAINER} pt-8 md:pt-12`}>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="text-label font-semibold uppercase tracking-[0.18em] text-accent">
            {pick(locale, {
              es: "Actividad reciente",
              en: "Recent activity",
            })}
          </p>
          <h2 className="mt-2 text-display font-bold tracking-tight text-text">
            {pick(locale, {
              es: "Timeline comercial",
              en: "Commercial timeline",
            })}
          </h2>
          <div className="mt-6 grid gap-3">
            {recentActivity.map((activity) => {
              const contact = contactsById.get(activity.contactId);
              return (
                <article
                  key={activity.id}
                  className="rounded-lg border border-border bg-bg px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-title font-semibold text-text">
                        {activity.summary}
                      </p>
                      <p className="mt-1 text-caption text-text-muted">
                        {contact?.fullName ?? "Unknown contact"} · {formatActivityDate(locale, activity)}
                      </p>
                    </div>
                    {contact ? (
                      <span
                        className={`rounded-pill px-3 py-1 text-caption font-semibold ${
                          STAGE_THEME[contact.lifecycleStage].chip
                        }`}
                      >
                        {contact.lifecycleStage}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
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
        es: "Entra por newsletter, descarga de catalogo o promo sin pedido comercial directo.",
        en: "Comes from newsletter, catalog download, or promo opt-in without a direct sales request.",
      }),
      trigger: pick(locale, {
        es: "Disparador: formulario de suscripcion o consentimiento promocional.",
        en: "Trigger: subscription form or promotional consent.",
      }),
    },
    {
      stage: "lead",
      title: "Lead",
      body: pick(locale, {
        es: "Ya existe interes comercial: cotizar, pedir informacion o abrir conversacion.",
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
        es: "Lead calificado con encaje real, owner asignado y siguiente accion definida.",
        en: "Qualified lead with real fit, an owner assigned, and a defined next action.",
      }),
      trigger: pick(locale, {
        es: "Disparador: validacion comercial, presupuesto o necesidad confirmada.",
        en: "Trigger: sales validation, budget, or confirmed need.",
      }),
    },
    {
      stage: "customer",
      title: "Customer",
      body: pick(locale, {
        es: "Negocio ganado; desde aqui puede enganchar con loyalty o postventa.",
        en: "Business won; from here the account can move into loyalty or post-sale flows.",
      }),
      trigger: pick(locale, {
        es: "Disparador: deal won o conversion formal en Zoho.",
        en: "Trigger: won deal or formal conversion in Zoho.",
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
      es: "Email, interes y categoria del producto para segmentacion inicial.",
      en: "Email, interest, and product category for initial segmentation.",
    }),
    pick(locale, {
      es: "Source, campaign y tipo de intencion: subscription o commercial inquiry.",
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
