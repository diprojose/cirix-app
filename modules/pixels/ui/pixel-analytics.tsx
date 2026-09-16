"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/locale";
import { EVENT_NAMES, type PixelEvent } from "../domain/pixel";
import { eventsCsv, isConversion, sessionKey, sourceKey, summarizeEvents, type EventPage } from "../domain/report";
import s from "./pixel-dashboard.module.css";

const labels: Record<PixelEvent["name"], [string, string]> = {
  page_view: ["Visita de página", "Page view"], view_item: ["Servicio / producto", "Service / product"],
  add_to_cart: ["Añadido al carrito", "Added to cart"], begin_checkout: ["Inicio de compra", "Checkout started"],
  purchase: ["Compra", "Purchase"], generate_lead: ["Solicitud recibida", "Lead received"], contact: ["Clic de contacto", "Contact click"],
  engagement: ["Tiempo activo", "Active time"], scroll: ["Profundidad de lectura", "Scroll depth"],
};
const channels: Record<string, [string, string]> = { whatsapp: ["WhatsApp", "WhatsApp"], phone: ["Teléfono", "Phone"], email: ["Correo", "Email"], form: ["Formulario", "Form"], other: ["Otro", "Other"] };
const devices: Record<string, [string, string]> = { mobile: ["Móvil", "Mobile"], desktop: ["Escritorio", "Desktop"], tablet: ["Tablet", "Tablet"], unknown: ["Sin datos", "Unavailable"] };
const dateInput = (date: Date) => date.toISOString().slice(0, 10);
function initialDates() {
  const now = new Date();
  return { from: dateInput(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 6 * 86400_000)), to: dateInput(now) };
}

export function PixelAnalytics({ siteId, locale, refreshKey }: { siteId: string; locale: Locale; refreshKey: number }) {
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const translated = (value: [string, string]) => value[locale === "es" ? 0 : 1];
  const [dates, setDates] = useState(initialDates);
  const [period, setPeriod] = useState(initialDates);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ events: PixelEvent[]; from: string; to: string } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const [rangeError, setRangeError] = useState(false);
  const [eventFilter, setEventFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<PixelEvent | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setStatus("loading"); setResult(null); setProgress(0); setPage(0); setSelected(null);
      const from = new Date(period.from + "T00:00:00.000Z").toISOString();
      // Freeze the upper boundary for the whole paginated read.
      const to = new Date(Math.min(Date.parse(period.to + "T00:00:00.000Z") + 86400_000, Date.now())).toISOString();
      const events = new Map<string, PixelEvent>();
      let cursor: EventPage["nextCursor"] = null;
      try {
        do {
          const params = new URLSearchParams({ from, to });
          if (cursor) { params.set("cursorTime", cursor.time); params.set("cursorId", cursor.id); }
          const response = await fetch(`/api/pixels/sites/${siteId}?${params}`, { cache: "no-store", signal: controller.signal });
          if (!response.ok) throw new Error("report_unavailable");
          const data: EventPage = await response.json();
          if (controller.signal.aborted) return;
          for (const event of data.events) events.set(event.eventId, event);
          if (data.nextCursor && cursor?.id === data.nextCursor.id && cursor.time === data.nextCursor.time) throw new Error("invalid_cursor");
          cursor = data.nextCursor;
          setProgress(events.size);
        } while (cursor && !controller.signal.aborted);
        if (!controller.signal.aborted) { setResult({ events: [...events.values()], from, to }); setStatus("ready"); }
      } catch { if (!controller.signal.aborted) setStatus("error"); }
    }
    void load();
    return () => controller.abort();
  }, [siteId, period, reload, refreshKey]);
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);
  const filtered = useMemo(() => (result?.events ?? []).filter((event) =>
    (!eventFilter || event.name === eventFilter) && (!sourceFilter || sourceKey(event) === sourceFilter) &&
    (!deviceFilter || (event.context?.device ?? "unknown") === deviceFilter) &&
    (!search.trim() || [event.pagePath, event.visitorId, event.sessionId, event.campaign.campaign, event.contactChannel, event.geo?.country, event.geo?.region].some((value) => value?.toLowerCase().includes(search.trim().toLowerCase())))
  ), [result, eventFilter, sourceFilter, deviceFilter, search]);
  // Overview reflects the complete period; activity filters only affect the table and CSV.
  const summary = useMemo(() => result ? summarizeEvents(result.events, result.from, result.to) : null, [result]);
  const sources = useMemo(() => [...new Set((result?.events ?? []).map(sourceKey))].sort(), [result]);
  const session = useMemo(() => selected ? (result?.events ?? []).filter((event) => sessionKey(event) === sessionKey(selected)).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt) || a.eventId.localeCompare(b.eventId)) : [], [selected, result]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pageCount - 1);
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const time = (value: string) => new Date(value).toLocaleString(locale, { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const sourceLabel = (value: string) => value === "(unattributed)" ? t("Sin atribución", "Unattributed") : value;
  const money = (value: number, currency: string) => `${number(value)} ${currency}`;
  function applyPeriod(next: { from: string; to: string }) {
    const start = Date.parse(next.from), end = Date.parse(next.to);
    const now = new Date().getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end - start >= 90 * 86400_000 || start < Date.parse(dateInput(new Date(now))) - 89 * 86400_000 || end > now) { setRangeError(true); return; }
    setRangeError(false); setDates(next); setPeriod({ ...next });
  }
  function preset(days: number) {
    const now = new Date();
    applyPeriod({ from: dateInput(new Date(Date.parse(dateInput(now)) - (days - 1) * 86400_000)), to: dateInput(now) });
  }
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([eventsCsv(filtered)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `pixel-${siteId}-${period.from}-${period.to}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const outcome = (event: PixelEvent) => event.value !== undefined && event.currency ? money(event.value, event.currency) : event.contactChannel ? translated(channels[event.contactChannel]) : event.name === "engagement" ? `${number((event.engagementMs ?? 0) / 1000)} s` : event.scrollPercent ? `${event.scrollPercent}%` : "—";
  const ranking = (items: { label: string; count: number }[], isSource: boolean) => items.length ? <ol className={s.ranking}>{items.slice(0, 6).map((item) => <li key={item.label}><div><span title={item.label}>{isSource ? sourceLabel(item.label) : item.label}</span><strong>{number(item.count)}</strong></div><span className={s.rankTrack}><span style={{ width: `${item.count / Math.max(1, items[0].count) * 100}%` }} /></span></li>)}</ol> : <p className={s.chartEmpty}>{t("Aún no hay datos en este período.", "No data in this period yet.")}</p>;

  return <>
    <section className={s.panel} aria-labelledby="analytics-title" aria-busy={status === "loading"}>
      <div className={s.row}><div><span className={s.eyebrow}>{t("DE LA VISITA AL RESULTADO", "FROM VISIT TO OUTCOME")}</span><h2 id="analytics-title">{t("Rendimiento del sitio", "Website performance")}</h2></div><span className={s.badge}>UTC · {t("Datos propios", "First-party data")}</span></div>
      <div className={s.periodPresets}>{[1, 7, 30, 90].map((days) => <button key={days} onClick={() => preset(days)}>{days === 1 ? t("Hoy", "Today") : `${days} ${t("días", "days")}`}</button>)}</div>
      <form className={s.periodForm} onSubmit={(event) => { event.preventDefault(); applyPeriod(dates); }}>
        <label>{t("Desde", "From")}<input type="date" required value={dates.from} onChange={(event) => setDates({ ...dates, from: event.target.value })} /></label>
        <label>{t("Hasta", "To")}<input type="date" required value={dates.to} onChange={(event) => setDates({ ...dates, to: event.target.value })} /></label>
        <button type="submit">{t("Aplicar período", "Apply period")}</button><button type="button" disabled={status === "loading"} onClick={() => setReload((value) => value + 1)}>{t("Actualizar", "Refresh")}</button>
      </form>
      {rangeError && <p role="alert">{t("Elige un intervalo válido dentro de los últimos 90 días, sin fechas futuras.", "Choose a valid range within the last 90 days, without future dates.")}</p>}
      {status === "loading" && <p role="status">{t("Consultando el período completo…", "Loading the complete period…")} {number(progress)} {t("eventos recibidos", "events loaded")}</p>}
      {status === "error" && <div className={s.notice} role="alert">{t("No se pudo completar el informe. Reintenta o selecciona un período más corto.", "Could not complete the report. Retry or select a shorter period.")} <button onClick={() => setReload((value) => value + 1)}>{t("Reintentar", "Retry")}</button></div>}
      {summary && result && <>
        <div className={`${s.metrics} ${s.reportMetrics}`}>{[
          [t("Sesiones", "Sessions"), number(summary.sessions)], [t("Navegadores únicos", "Unique browsers"), number(summary.browsers)],
          [t("Clics de contacto", "Contact clicks"), number(summary.contacts)], [t("Solicitudes", "Leads"), number(summary.leads)],
          [t("Compras", "Purchases"), number(summary.purchases)], [t("Conversión por sesión", "Session conversion"), `${number(summary.conversionRate)}%`],
        ].map(([label, value]) => <div className={s.metric} key={label}><span className={s.muted}>{label}</span><strong>{value}</strong></div>)}</div>
        <div className={s.reportFacts}><span>{number(result.events.length)} {t("eventos", "events")}</span><span>{t("Tiempo activo registrado", "Recorded active time")}: {number(summary.engagementMs / 60000)} min</span>{summary.revenue.map(([currency, value]) => <span key={currency}>{t("Ventas registradas", "Recorded sales")}: {money(value, currency)}</span>)}</div>
        <p className={s.muted}>{period.from} — {period.to} · {t("Sesiones con solicitud o compra ÷ sesiones del período. Un clic de contacto no confirma un lead. Los navegadores no equivalen a personas.", "Sessions with a lead or purchase ÷ sessions in the period. A contact click does not confirm a lead. Browsers do not equal people.")}</p>
        <div className={s.chartHeading}><h3>{t("Actividad por día", "Daily activity")}</h3><span><i className={s.viewKey} />{t("Vistas", "Views")} <i className={s.conversionKey} />{t("Conversiones", "Conversions")}</span></div>
        <div className={s.dailyChart} role="img" aria-label={t("Vistas y conversiones diarias. Valores exactos en la tabla desplegable siguiente.", "Daily views and conversions. Exact values in the expandable table below.")}>
          {summary.days.map((day) => { const max = Math.max(1, ...summary.days.map((d) => Math.max(d.views, d.conversions))); return <div className={s.dayBars} key={day.date} title={`${day.date}: ${day.views} ${t("vistas", "views")}, ${day.conversions} ${t("conversiones", "conversions")}`}><span style={{ height: `${day.views / max * 100}%` }} /><span style={{ height: `${day.conversions / max * 100}%` }} /></div>; })}
        </div>
        <div className={s.chartAxis}><span>{period.from}</span><span>{period.to}</span></div>
        <details><summary>{t("Ver cifras diarias", "View daily figures")}</summary><div className={s.dailyTable}><table className={s.table}><thead><tr><th>{t("Día UTC", "UTC day")}</th><th>{t("Vistas", "Views")}</th><th>{t("Conversiones", "Conversions")}</th></tr></thead><tbody>{summary.days.map((day) => <tr key={day.date}><td>{day.date}</td><td>{day.views}</td><td>{day.conversions}</td></tr>)}</tbody></table></div></details>
        <div className={s.reportCharts}><div><h3>{t("Origen del tráfico", "Traffic sources")}</h3><p className={s.muted}>{t("Sesiones por fuente observada", "Sessions per observed source")}</p>{ranking(summary.sources, true)}</div><div><h3>{t("Páginas que generan contactos", "Pages generating contacts")}</h3><p className={s.muted}>{t("Clics en enlaces de contacto", "Clicks on contact links")}</p>{ranking(summary.pages, false)}</div></div>
      </>}
    </section>
    <section className={s.panel} aria-labelledby="activity-title">
      <div className={s.row}><div><span className={s.eyebrow}>{t("EXPLORA CADA INTERACCIÓN", "EXPLORE EVERY INTERACTION")}</span><h2 id="activity-title">{t("Actividad reciente", "Recent activity")}</h2></div><button disabled={status !== "ready" || !filtered.length} onClick={exportCsv}>{t("Exportar CSV", "Export CSV")} ↓</button></div>
      <div className={s.activityFilters}>
        <label>{t("Buscar", "Search")}<input type="search" value={search} placeholder={t("Página, campaña o ID…", "Page, campaign or ID…")} onChange={(event) => { setSearch(event.target.value); setPage(0); }} /></label>
        <label>{t("Evento", "Event")}<select value={eventFilter} onChange={(event) => { setEventFilter(event.target.value); setPage(0); }}><option value="">{t("Todos", "All")}</option>{EVENT_NAMES.map((name) => <option key={name} value={name}>{translated(labels[name])}</option>)}</select></label>
        <label>{t("Fuente", "Source")}<select value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); setPage(0); }}><option value="">{t("Todas", "All")}</option>{sources.map((source) => <option key={source} value={source}>{sourceLabel(source)}</option>)}</select></label>
        <label>{t("Dispositivo", "Device")}<select value={deviceFilter} onChange={(event) => { setDeviceFilter(event.target.value); setPage(0); }}><option value="">{t("Todos", "All")}</option>{Object.entries(devices).map(([key, label]) => <option key={key} value={key}>{translated(label)}</option>)}</select></label>
      </div>
      <p className={s.muted}>{t("Los filtros se aplican a esta tabla y al CSV. El resumen superior conserva todo el período. Horas en UTC.", "Filters apply to this table and CSV. The overview keeps the full period. Times are in UTC.")}</p>
      {status === "ready" && <>
        {filtered.length ? <div className={s.tableWrap}><table className={`${s.table} ${s.activityTable}`}><thead><tr>{[t("Evento / página", "Event / page"), t("Visitante / sesión", "Visitor / session"), t("Fuente / campaña", "Source / campaign"), t("Contexto", "Context"), t("Resultado / hora", "Outcome / time"), t("Detalle", "Details")].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{filtered.slice(currentPage * 20, (currentPage + 1) * 20).map((event) => <tr key={event.eventId}>
          <td><span className={s.eventTag} data-conversion={isConversion(event)}>{translated(labels[event.name])}</span><span className={s.cellLine} title={event.pagePath}>{event.pagePath}</span></td>
          <td><strong title={event.visitorId}>{event.visitorId.slice(0, 8)}</strong><span className={s.cellLine} title={event.sessionId}>{t("Sesión", "Session")} {event.sessionId.slice(0, 8)}</span></td>
          <td><strong>{sourceLabel(sourceKey(event))}</strong><span className={s.cellLine}>{event.campaign.medium || "—"} · {event.campaign.campaign || t("Sin campaña", "No campaign")}</span></td>
          <td>{translated(devices[event.context?.device ?? "unknown"])}<span className={s.cellLine}>{event.context ? `${event.context.browser} · ${event.context.os}` : "—"}</span><span className={s.cellLine}>{event.geo ? [event.geo.country, event.geo.region].filter(Boolean).join(" / ") : t("Ubicación no disponible", "Location unavailable")}</span></td>
          <td><strong>{outcome(event)}</strong><span className={s.cellLine}>{time(event.receivedAt)}</span></td>
          <td><button aria-label={`${t("Ver detalle", "View details")}: ${event.name} ${event.pagePath} ${time(event.receivedAt)}`} onClick={() => setSelected(event)}>{t("Ver", "View")} ↗</button></td>
        </tr>)}</tbody></table></div> : <p className={s.chartEmpty}>{result?.events.length ? t("No hay coincidencias. Ajusta los filtros.", "No matches. Adjust the filters.") : t("Todavía no hay eventos en este período. Comprueba la instalación y el consentimiento del sitio.", "No events in this period yet. Check the site's installation and consent.")}</p>}
        <div className={s.pagination}><span>{number(filtered.length)} {t("eventos", "events")} · {currentPage + 1} / {pageCount}</span><div className={s.actions}><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t("Anterior", "Previous")}</button><button disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>{t("Siguiente", "Next")}</button></div></div>
      </>}
      {status !== "ready" && <p className={s.muted}>{status === "loading" ? t("Cargando actividad…", "Loading activity…") : t("La actividad estará disponible al completar la consulta.", "Activity will be available after the report loads.")}</p>}
    </section>
    <dialog ref={dialog} className={s.eventDialog} aria-labelledby="event-detail-title" onClose={() => setSelected(null)}>
      {selected && <><div className={s.row}><div><span className={s.eyebrow}>{t("DETALLE DEL EVENTO", "EVENT DETAILS")}</span><h2 id="event-detail-title">{translated(labels[selected.name])}</h2></div><button onClick={() => setSelected(null)}>{t("Cerrar", "Close")} ×</button></div>
        <p className={s.detailPath}>{selected.pagePath}</p>
        <dl className={s.detailGrid}>{[
          [t("Recibido (UTC)", "Received (UTC)"), time(selected.receivedAt)], [t("Resultado", "Outcome"), outcome(selected)],
          [t("Fuente / medio", "Source / medium"), `${sourceLabel(sourceKey(selected))} / ${selected.campaign.medium || "—"}`],
          [t("Campaña de la sesión", "Session campaign"), selected.campaign.campaign || "—"],
          [t("Página de entrada", "Landing page"), selected.attribution?.landingPath || t("No registrada", "Not recorded")],
          [t("Dominio referente", "Referrer domain"), selected.attribution?.referrerHost || t("No disponible", "Unavailable")],
          [t("Dispositivo", "Device"), selected.context ? `${translated(devices[selected.context.device])} · ${selected.context.browser} · ${selected.context.os}` : t("No registrado", "Not recorded")],
          [t("Ubicación aproximada", "Approximate location"), selected.geo ? `${selected.geo.country} ${selected.geo.region || ""}` : t("No disponible", "Unavailable")],
          [t("Permiso analítico", "Analytics consent"), selected.consent.analytics ? t("Sí", "Yes") : t("No", "No")],
          [t("Permiso publicitario", "Marketing consent"), selected.consent.marketing ? t("Sí", "Yes") : t("No", "No")],
          [t("Versión del consentimiento", "Consent version"), selected.consent.version], [t("Idioma del navegador", "Browser language"), selected.context?.language || "—"],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <details><summary>{t("Identificadores técnicos", "Technical identifiers")}</summary><dl className={s.detailGrid}>{[["Event ID", selected.eventId], ["Visitor ID", selected.visitorId], ["Session ID", selected.sessionId], ...Object.entries(selected.clickIds)].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>
        <h3>{t("Recorrido de esta sesión", "This session's journey")}</h3><p className={s.muted}>{t("Eventos observados dentro del período seleccionado; las sesiones pueden comenzar antes o continuar después.", "Events observed within the selected period; sessions can start earlier or continue later.")}</p>
        <ol className={s.timeline}>{session.map((event) => <li key={event.eventId} data-selected={event.eventId === selected.eventId}><time>{time(event.receivedAt)}</time><div><strong>{translated(labels[event.name])}</strong><span>{event.pagePath}</span><small>{outcome(event)}</small></div></li>)}</ol>
      </>}
    </dialog>
  </>;
}
