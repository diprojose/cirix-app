import Link from "next/link";
import type { ReactNode } from "react";
import { localizeHref, pick, type Locale } from "@/lib/locale";
import type { ActivityDto, CommercialContactDto, OpportunityDto } from "../crm/application/dtos/crm-dashboard-dto";
import { stageHref } from "./crm-contact-links";
import s from "./crm.module.css";

export function CrmContactDetail({ locale, contact, activities, opportunities }: {
  locale: Locale;
  contact: CommercialContactDto;
  activities: ActivityDto[];
  opportunities: OpportunityDto[];
}) {
  const t = (es: string, en: string) => pick(locale, { es, en });
  const stage = {
    subscriber: t("Suscriptor", "Subscriber"), lead: "Lead",
    prospect: t("Prospecto", "Prospect"), customer: t("Cliente", "Customer"),
  }[contact.lifecycleStage];
  const qualification = { new: t("Nuevo", "New"), contacted: t("Contactado", "Contacted"), qualified: t("Calificado", "Qualified"), unqualified: t("No calificado", "Unqualified") };
  const activityLabels: Record<ActivityDto["kind"], string> = { form: t("Formulario", "Form"), note: t("Nota", "Note"), task: t("Tarea", "Task"), call: t("Llamada", "Call"), message: t("Mensaje", "Message"), deal: t("Negocio", "Deal") };
  const recentActivities = [...activities].sort((a, b) => Date.parse(b.happenedAt) - Date.parse(a.happenedAt));
  const phone = contact.phone && contact.phone !== "-" ? contact.phone : null;

  return <div className={s.page}>
    <nav aria-label={t("Ubicación del contacto", "Contact location")} className={s.detailBreadcrumb}>
      <Link href={localizeHref(locale, stageHref(contact.lifecycleStage))} className={s.textLink}>← {t("Volver al listado", "Back to list")}</Link>
      <span aria-hidden="true">/</span><span>{t("Detalle del contacto", "Contact details")}</span>
    </nav>
    <header className={`${s.pageIntro} ${s.contactIntro}`}>
      <p className={s.eyebrow}>{t("PIPELINE COMERCIAL / DETALLE", "SALES PIPELINE / DETAILS")}</p>
      <h1 className={s.pageTitle}>{contact.fullName}</h1>
      <div className={s.contactSummary}><span className={`${s.stageChip} ${s[contact.lifecycleStage]}`}>{stage}</span><span>{contact.companyName || t("Sin empresa registrada", "No company recorded")}</span><span>{t("Responsable", "Owner")}: {contact.owner}</span></div>
    </header>

    <div className={s.contactDetailGrid}>
      <div className={s.detailStack}>
        <section className={s.panel} aria-labelledby="contact-info-title">
          <p className={s.eyebrow}>{t("LA RELACIÓN EMPIEZA AQUÍ", "WHERE THE RELATIONSHIP STARTS")}</p>
          <h2 id="contact-info-title" className={s.panelTitle}>{t("Información del contacto", "Contact information")}</h2>
          <dl className={s.contactFacts}>
            <Fact label={t("Nombre completo", "Full name")}>{contact.fullName}</Fact>
            <Fact label={t("Empresa", "Company")}>{contact.companyName}</Fact>
            <Fact label={t("Correo electrónico", "Email")}>{contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}</Fact>
            <Fact label={t("Teléfono", "Phone")}>{phone ? <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a> : null}</Fact>
            <Fact label={t("Origen", "Source")}>{contact.source}</Fact>
            <Fact label={t("Interés", "Interest")}>{contact.interestCategory}</Fact>
          </dl>
        </section>
        <section className={s.panel} aria-labelledby="description-title">
          <p className={s.eyebrow}>{t("EL CONTEXTO COMPLETO", "THE FULL CONTEXT")}</p>
          <h2 id="description-title" className={s.panelTitle}>{t("Descripción", "Description")}</h2>
          <p className={s.detailBody}>{contact.description || t("Este contacto aún no tiene una descripción registrada.", "This contact does not have a recorded description yet.")}</p>
        </section>
        <section className={s.panel} aria-labelledby="activity-title">
          <p className={s.eyebrow}>{t("CONVERSACIONES Y SEGUIMIENTO", "CONVERSATIONS AND FOLLOW-UP")}</p>
          <h2 id="activity-title" className={s.panelTitle}>{t("Actividad reciente", "Recent activity")}</h2>
          {recentActivities.length ? <ol className={s.activityTimeline}>
            {recentActivities.map((activity) => <li key={activity.id}>
              <div className={s.activityHeading}><span>{activityLabels[activity.kind]}</span><time dateTime={activity.happenedAt}>{formatDate(locale, activity.happenedAt)}</time></div>
              <p>{activity.summary}</p>
            </li>)}
          </ol> : <p className={s.detailBody}>{t("No hay actividad reciente disponible para este contacto.", "No recent activity is available for this contact.")}</p>}
        </section>
        <section className={s.panel} aria-labelledby="opportunities-title">
          <p className={s.eyebrow}>{t("OPORTUNIDADES CONECTADAS", "CONNECTED OPPORTUNITIES")}</p>
          <h2 id="opportunities-title" className={s.panelTitle}>{t("Negocios asociados", "Related deals")} · {opportunities.length}</h2>
          {opportunities.length ? <div className={s.detailDeals}>{opportunities.map((deal) => <article key={deal.id}>
            <div className={s.activityHeading}><h3>{deal.title}</h3><span>{deal.stage}</span></div>
            <dl className={s.contactFacts}>
              <Fact label={t("Responsable", "Owner")}>{deal.owner}</Fact>
              <Fact label={t("Cierre previsto", "Expected close")}>{formatDate(locale, deal.expectedCloseDate)}</Fact>
              <Fact label={t("Valor registrado", "Recorded value")}>{deal.value === null ? "—" : new Intl.NumberFormat(locale).format(deal.value)}</Fact>
              <Fact label={t("Estado", "Status")}>{{ open: t("Abierto", "Open"), won: t("Ganado", "Won"), lost: t("Perdido", "Lost") }[deal.status]}</Fact>
            </dl>
          </article>)}</div> : <p className={s.detailBody}>{t("Todavía no hay negocios asociados a este contacto.", "There are no deals associated with this contact yet.")}</p>}
        </section>
      </div>
      <aside className={s.detailStack}>
        <section className={`${s.panel} ${s.nextActionPanel}`} aria-labelledby="next-action-title">
          <p className={s.eyebrow}>{t("DA CONTINUIDAD", "KEEP IT MOVING")}</p>
          <h2 id="next-action-title" className={s.panelTitle}>{t("Próximo paso", "Next step")}</h2>
          <p className={s.detailBody}>{contact.nextAction || t("Aún no se ha definido un próximo paso.", "A next step has not been defined yet.")}</p>
          <p className={s.contactMeta}>{t("Responsable", "Owner")}: {contact.owner}</p>
        </section>
        <section className={s.panel} aria-labelledby="tracking-title">
          <h2 id="tracking-title" className={s.panelTitle}>{t("Seguimiento comercial", "Sales tracking")}</h2>
          <dl className={`${s.contactFacts} ${s.trackingFacts}`}>
            <Fact label={t("Calificación", "Qualification")}>{contact.qualificationStatus ? qualification[contact.qualificationStatus] : null}</Fact>
            <Fact label={t("Suscripción", "Subscription")}>{contact.subscriptionStatus ? (contact.subscriptionStatus === "subscribed" ? t("Suscrito", "Subscribed") : t("Dado de baja", "Unsubscribed")) : null}</Fact>
            <Fact label={t("Fecha de registro", "Created")}>{formatDate(locale, contact.createdAt)}</Fact>
            <Fact label={t("Última actualización", "Last updated")}>{formatDate(locale, contact.updatedAt)}</Fact>
            <Fact label={t("Última actividad", "Last activity")}>{formatDate(locale, contact.lastActivityAt)}</Fact>
            {contact.convertedAt && <Fact label={t("Fecha de conversión", "Converted")}>{formatDate(locale, contact.convertedAt)}</Fact>}
          </dl>
        </section>
      </aside>
    </div>
  </div>;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children || "—"}</dd></div>;
}

function formatDate(locale: Locale, value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value)) || Date.parse(value) === 0) return "—";
  return new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}
