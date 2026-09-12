import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { localizeHref, pick, type Locale } from "@/lib/locale";
import type { CallStatus, TrackedCall } from "../domain/call";
import type { CallListFilters } from "../application/call-tracking-service";
import { maskPhoneNumber } from "./phone-format";
import s from "./calls.module.css";

type Stats = Awaited<ReturnType<import("../application/call-tracking-service").CallTrackingService["stats"]>>;
type IconName = "phone" | "people" | "answered" | "missed" | "filter" | "clock" | "repeat";

export function CallsDashboard({ locale, timeZone, trialMode, configured, filters, calls, total, stats }: {
  locale: Locale;
  timeZone: string;
  trialMode: boolean;
  configured: boolean;
  filters: CallListFilters;
  calls: TrackedCall[];
  total: number;
  stats: Stats;
}) {
  const t = (es: string, en: string) => pick(locale, { es, en });
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  return (
    <div className={s.dashboard}>
      <section className={s.hero} aria-labelledby="calls-title">
        <div className={s.heroCopy}>
          <p className={s.eyebrow}><span className={s.brandDot} /> CALL TRACKING / {t("VISTA GENERAL", "OVERVIEW")}</p>
          <h1 id="calls-title">{t("Cada llamada,", "Every call,")}<br /><span>{t("una oportunidad.", "an opportunity.")}</span></h1>
          <p className={s.description}>{t("Conoce quién llama, cómo responde tu equipo y quién vuelve a conectar con tu negocio.", "See who calls, how your team responds, and who reconnects with your business.")}</p>
          <a href="#call-history" className={s.textLink}>{t("Explorar llamadas", "Explore calls")}<span aria-hidden="true">↓</span></a>
        </div>
        <div className={s.performance}>
          <p className={s.eyebrow}>{t("ATENCIÓN EN EL PERÍODO", "ANSWER PERFORMANCE")}</p>
          <div className={s.performanceMain}>
            <div className={s.rateRing} style={{ "--rate": `${stats.answerRate}%` } as CSSProperties}>
              <strong>{stats.totalCalls ? `${number(stats.answerRate)}%` : "—"}</strong>
              <span>{t("atendidas", "answered")}</span>
            </div>
            <div className={s.performanceCopy}><h2>{t("Cada conexión cuenta.", "Every connection counts.")}</h2><p>{stats.totalCalls ? t(`${number(stats.answeredCalls)} de ${number(stats.totalCalls)} llamadas atendidas.`, `${number(stats.answeredCalls)} of ${number(stats.totalCalls)} calls answered.`) : t("Tu actividad aparecerá aquí con las primeras llamadas.", "Your activity will appear here with your first calls.")}</p></div>
          </div>
          <div className={s.performanceMetrics}>
            <div><span><Icon name="clock" />{t("Duración promedio", "Average duration")}</span><strong>{stats.answeredCalls ? formatDuration(stats.averageDurationSeconds) : "—"}</strong></div>
            <div><span><Icon name="repeat" />{t("Llamadas repetidas", "Repeat calls")}</span><strong>{number(stats.repeatCalls)}</strong></div>
          </div>
        </div>
      </section>

      {(trialMode || !configured) && <aside className={s.notice}>
        <span className={s.noticeLabel}>{!configured ? t("Configuración pendiente", "Setup pending") : t("Modo Trial", "Trial mode")}</span>
        <p>{!configured ? t("La integración con Twilio aún necesita configuración para recibir llamadas.", "The Twilio integration still needs configuration to receive calls.") : t("Estás utilizando la integración de llamadas en modo de prueba.", "You are using the call integration in trial mode.")}</p>
      </aside>}

      <section aria-labelledby="summary-title">
        <div className={s.sectionHeading}><h2 id="summary-title">{t("El pulso de tus llamadas", "Your calls at a glance")}</h2><span>{t("Resumen del período seleccionado", "Selected date range summary")}</span></div>
        <div className={s.kpiGrid}>
          <Kpi label={t("Llamadas totales", "Total calls")} value={number(stats.totalCalls)} note={t("Todas las llamadas entrantes", "All inbound calls")} icon="phone" tone="accent" />
          <Kpi label={t("Números únicos", "Unique callers")} value={number(stats.uniqueCallers)} note={t("Personas que se conectan", "People connecting with you")} icon="people" tone="blue" />
          <Kpi label={t("Atendidas", "Answered")} value={number(stats.answeredCalls)} note={t("Conversaciones iniciadas", "Conversations started")} icon="answered" tone="green" />
          <Kpi label={t("Perdidas", "Missed")} value={number(stats.missedCalls)} note={t("Oportunidades de reconectar", "Opportunities to reconnect")} icon="missed" tone="amber" />
        </div>
      </section>

      <section id="call-history" className={s.history} aria-labelledby="history-title">
        <div className={s.historyHeading}>
          <div><p className={s.eyebrow}>{t("EXPLORA LA ACTIVIDAD", "EXPLORE ACTIVITY")}</p><h2 id="history-title">{t("Historial de llamadas", "Call history")}<span className={s.count}>{number(total)}</span></h2></div>
          <span className={s.timeZone}><Icon name="clock" />{timeZone.replaceAll("_", " ")}</span>
        </div>
        <form method="get" className={s.filters}>
          <input type="hidden" name="limit" value={filters.limit} />
          <Filter label={t("Desde", "From")}><input name="from" type="date" defaultValue={filters.from ?? ""} className={s.field} /></Filter>
          <Filter label={t("Hasta", "To")}><input name="to" type="date" defaultValue={filters.to ?? ""} className={s.field} /></Filter>
          <Filter label={t("Estado", "Status")}><select name="status" defaultValue={filters.status ?? ""} className={s.field}>
            <option value="">{t("Todos los estados", "All statuses")}</option>
            {(["initiated", "ringing", "answered", "completed", "no_answer", "busy", "failed", "canceled"] as CallStatus[]).map((status) => <option key={status} value={status}>{statusLabel(locale, status)}</option>)}
          </select></Filter>
          <Filter label={t("Teléfono", "Phone")}><input name="phone" type="tel" defaultValue={filters.phone ?? ""} placeholder="+584121234567" pattern="\+[1-9][0-9]{6,14}" title={t("Incluye + y el código de país, sin espacios.", "Include + and the country code, without spaces.")} className={s.field} /></Filter>
          <button type="submit" className={s.primaryButton}><Icon name="filter" />{t("Filtrar", "Filter")}</button>
          <div className={s.filterFooter}><p>{t("Las métricas resumen las fechas seleccionadas; estado y teléfono filtran el historial.", "Metrics summarize the selected dates; status and phone filter the history.")}</p><Link href={localizeHref(locale, "/calls")} className={s.resetLink}>{t("Restablecer filtros", "Reset filters")}</Link></div>
        </form>
        {calls.length === 0 ? <div className={s.emptyState}>
          <span className={s.emptyIcon}><Icon name="phone" /></span><h3>{t("Sin llamadas en esta vista", "No calls in this view")}</h3><p>{t("Prueba con otras fechas o restablece los filtros para explorar tu actividad.", "Try another date range or reset the filters to explore your activity.")}</p>
          <Link href={localizeHref(locale, "/calls")} className={s.secondaryButton}>{t("Restablecer filtros", "Reset filters")}<span aria-hidden="true">↗</span></Link>
        </div> : <div className={s.tableScroll} role="region" aria-label={t("Historial de llamadas", "Call history")} tabIndex={0}>
          <table className={s.table}>
            <thead><tr><th scope="col">{t("Teléfono", "Phone")}</th><th scope="col">{t("Fecha", "Date")}</th><th scope="col">{t("Hora", "Time")}</th><th scope="col">{t("Duración", "Duration")}</th><th scope="col">{t("Estado", "Status")}</th><th scope="col"><span className={s.srOnly}>{t("Detalle", "Details")}</span></th></tr></thead>
            <tbody>{calls.map((call) => <tr key={call.id}>
              <td><Link className={s.phoneLink} href={localizeHref(locale, `/calls/${encodeURIComponent(call.id)}`)}><span className={s.phoneIcon}><Icon name="phone" /></span><span>{maskPhoneNumber(call.callerPhone)}<small>{t("Llamada entrante", "Inbound call")}</small></span></Link></td>
              <td>{formatDate(call.startedAt, locale, timeZone)}</td><td>{formatTime(call.startedAt, locale, timeZone)}</td><td className={s.duration}>{call.durationSeconds === null ? "—" : formatDuration(call.durationSeconds)}</td><td><StatusBadge locale={locale} status={call.status} /></td>
              <td><Link className={s.detailLink} href={localizeHref(locale, `/calls/${encodeURIComponent(call.id)}`)} aria-label={t(`Ver llamada de ${maskPhoneNumber(call.callerPhone)}`, `View call from ${maskPhoneNumber(call.callerPhone)}`)}><span aria-hidden="true">↗</span></Link></td>
            </tr>)}</tbody>
          </table>
        </div>}
        <Pagination locale={locale} filters={filters} total={total} />
      </section>
    </div>
  );
}

export function CallDetail({ locale, timeZone, call, history }: { locale: Locale; timeZone: string; call: TrackedCall; history: { totalCalls: number; firstCallAt: string | null; lastCallAt: string | null } }) {
  const t = (es: string, en: string) => pick(locale, { es, en });
  return <div className={s.detail}>
    <Link href={localizeHref(locale, "/calls")} className={s.textLink}>← {t("Volver a llamadas", "Back to calls")}</Link>
    <div className={s.detailHeading}><p className={s.eyebrow}><span className={s.brandDot} />CALL TRACKING / {t("DETALLE", "DETAILS")}</p><h1>{t("Una conversación.", "One conversation.")}<br /><span>{t("Todo el contexto.", "All the context.")}</span></h1></div>
    <section className={s.detailCard}>
      <div className={s.callerHeading}><span className={s.emptyIcon}><Icon name="phone" /></span><div><p className={s.eyebrow}>{t("LLAMADA ENTRANTE", "INBOUND CALL")}</p><h2>{call.callerPhone}</h2></div><StatusBadge locale={locale} status={call.status} /></div>
      <dl className={s.detailGrid}>
        <Detail label={t("Fecha", "Date")} value={formatDate(call.startedAt, locale, timeZone)} />
        <Detail label={t("Hora", "Time")} value={formatTime(call.startedAt, locale, timeZone)} />
        <Detail label={t("Duración", "Duration")} value={call.durationSeconds === null ? "—" : formatDuration(call.durationSeconds)} />
        <Detail label={t("Zona horaria", "Time zone")} value={timeZone.replaceAll("_", " ")} />
      </dl>
    </section>
    <section className={s.detailCard} aria-labelledby="caller-history-title">
      <div className={s.sectionHeading}><h2 id="caller-history-title">{t("Su historia con tu negocio", "Their history with your business")}</h2><Icon name="repeat" /></div>
      <dl className={`${s.detailGrid} ${s.callerHistory}`}>
        <Detail label={t("Total de llamadas", "Total calls")} value={new Intl.NumberFormat(locale).format(history.totalCalls)} />
        <Detail label={t("Primera llamada", "First call")} value={history.firstCallAt ? formatDate(history.firstCallAt, locale, timeZone) : "—"} />
        <Detail label={t("Última llamada", "Last call")} value={history.lastCallAt ? formatDate(history.lastCallAt, locale, timeZone) : "—"} />
      </dl>
    </section>
  </div>;
}

function Kpi({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: IconName; tone: string }) {
  return <div className={s.kpi} data-tone={tone}><div className={s.kpiHeading}><p>{label}</p><span className={s.kpiIcon}><Icon name={icon} /></span></div><strong>{value}</strong><p className={s.kpiNote}>{note}</p></div>;
}
function Filter({ label, children }: { label: string; children: ReactNode }) { return <label className={s.filterLabel}>{label}{children}</label>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function StatusBadge({ locale, status }: { locale: Locale; status: CallStatus }) { return <span className={s.status} data-status={status}><span aria-hidden="true" />{statusLabel(locale, status)}</span>; }
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L9 10.9a16 16 0 0 0 4.1 4.1l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 2.7 2Z" />,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 4v2" /></>,
    answered: <><path d="m7 11 4 4L21 5M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></>,
    missed: <><path d="m4 5 7 7 9-9M14 3h6v6M3 20c4-5 14-5 18 0M3 20v-4M21 20v-4" /></>,
    filter: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    repeat: <><path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" /></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Pagination({ locale, filters, total }: { locale: Locale; filters: CallListFilters; total: number }) {
  const pages = Math.max(1, Math.ceil(total / filters.limit));
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.status) params.set("status", filters.status);
    if (filters.phone) params.set("phone", filters.phone);
    params.set("page", String(page));
    params.set("limit", String(filters.limit));
    return `${localizeHref(locale, "/calls")}?${params}`;
  };
  return <div className={s.pagination}><span className={s.muted}>{pick(locale, { es: "Página", en: "Page" })} {filters.page} / {pages}</span><div className={s.paginationActions}>{filters.page > 1 && <Link className={s.secondaryButton} href={href(filters.page - 1)}>{pick(locale, { es: "Anterior", en: "Previous" })}</Link>}{filters.page < pages && <Link className={s.secondaryButton} href={href(filters.page + 1)}>{pick(locale, { es: "Siguiente", en: "Next" })}</Link>}</div></div>;
}

function statusLabel(locale: Locale, status: CallStatus): string {
  const labels: Record<CallStatus, Record<Locale, string>> = {
    initiated: { es: "Iniciada", en: "Initiated" }, ringing: { es: "Sonando", en: "Ringing" }, answered: { es: "Atendida", en: "Answered" }, completed: { es: "Atendida", en: "Completed" }, no_answer: { es: "No contestada", en: "No answer" }, busy: { es: "Ocupado", en: "Busy" }, failed: { es: "Fallida", en: "Failed" }, canceled: { es: "Cancelada", en: "Canceled" },
  };
  return pick(locale, labels[status]);
}
function formatDuration(seconds: number) { const minutes = Math.floor(seconds / 60); const rest = seconds % 60; return `${minutes}:${String(rest).padStart(2, "0")}`; }
function formatDate(value: string, locale: Locale, timeZone: string) { return new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", { dateStyle: "medium", timeZone }).format(new Date(value)); }
function formatTime(value: string, locale: Locale, timeZone: string) { return new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", { timeStyle: "short", timeZone }).format(new Date(value)); }

