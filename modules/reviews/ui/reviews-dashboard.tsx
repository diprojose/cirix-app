"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/lib/locale";
import { invitationInput, type DashboardData, type GoogleSnapshot, type Invitation } from "../domain/reviews";
import { googleMetrics, invitationMetrics, visitMetrics } from "../domain/metrics";
import { invitationComposeLink, invitationMessage, publicReviewLink } from "../lib/invitation-links";
import s from "./reviews-dashboard.module.css";

type Contact = { id: string; fullName: string; email: string; phone: string; lifecycleStage: string };
const emptyDraft = { campaignId: "", clientName: "", email: "", phone: "", source: "email" as Invitation["source"], crmContactId: "" };
async function api(path: string, method = "GET", body?: unknown, signal?: AbortSignal) {
  const response = await fetch(path, { method, cache: "no-store", signal,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.error ?? "request_failed"); }
  return response.status === 204 ? null : response.json();
}
export function ReviewsDashboard({ locale }: { locale: Locale }) {
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const [data, setData] = useState<DashboardData | null>(null);
  const [google, setGoogle] = useState<GoogleSnapshot | null>(null);
  const [origin, setOrigin] = useState("");
  const [asOf, setAsOf] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [googleError, setGoogleError] = useState(false);
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<"campaign" | "invitation" | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [crmLoaded, setCrmLoaded] = useState(false);
  const [days, setDays] = useState(30);
  const [campaignId, setCampaignId] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(0);
  const mutation = useRef(false);
  const sync = useRef(false);
  const refresh = useCallback((signal?: AbortSignal) => {
    return api("/api/reviews/dashboard", "GET", undefined, signal).then((result: DashboardData) => {
      if (signal?.aborted) return;
      setData(result); setOrigin(window.location.origin); setAsOf(new Date().toISOString()); setError("");
    }).catch((cause: unknown) => {
      if (!signal?.aborted) setError(cause instanceof Error && cause.message === "report_capacity" ? "capacity" : "load");
    }).finally(() => { if (!signal?.aborted) setLoading(false); });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal); return () => controller.abort();
  }, [refresh]);
  const mutate = async (task: () => Promise<void>) => {
    if (mutation.current) return;
    mutation.current = true; setBusy(true); setError(""); setNotice("");
    try { await task(); } catch { setError("save"); }
    finally { mutation.current = false; setBusy(false); }
  };
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setNotice(t("Copiado.", "Copied.")); }
    catch { setError("clipboard"); }
  };
  const synchronize = async () => {
    if (sync.current) return; sync.current = true; setSyncing(true); setGoogleError(false);
    try { setGoogle(await api("/api/reviews/google", "POST", {})); setAsOf(new Date().toISOString()); }
    catch { setGoogleError(true); } finally { setSyncing(false); sync.current = false; }
  };
  const start = asOf ? new Date(Date.parse(asOf) - days * 86400_000).toISOString() : "";
  const metrics = invitationMetrics(data?.invitations ?? [], start, asOf, campaignId, source);
  const visits = visitMetrics(data?.visits ?? [], start, asOf, campaignId, source);
  const googleStats = asOf ? googleMetrics(google?.reviews ?? [], start, asOf) : null;
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const rate = (value: number | null) => value === null ? "—" : `${value}%`;
  const state = (item: Invitation) => !item.sentAt ? "draft" : item.clickedAt ? "clicked" : item.openedAt ? "opened" : "sent";
  const labels: Record<string, string> = { draft: t("Borrador", "Draft"), sent: t("Sin apertura registrada", "No recorded opening"), opened: t("Abrió · sin clic", "Opened · no click"), clicked: t("Continuó a Google", "Continued to Google") };
  const channels: Record<string, string> = { email: "Email", whatsapp: "WhatsApp", sms: "SMS", direct: t("Directo", "Direct"), qr: "QR" };
  const campaignLabel = (id: string) => data?.campaigns.find((item) => item.id === id)?.name ?? "—";
  const filtered = (data?.invitations ?? []).filter((item) => {
    const timestamp = item.sentAt ?? item.createdAt;
    return timestamp >= start && timestamp < asOf && (!campaignId || item.campaignId === campaignId) && (!source || item.source === source) &&
      (!status || state(item) === status) && `${item.clientName} ${item.email} ${item.phone}`.toLowerCase().includes(search.toLowerCase());
  });
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 20) - 1));
  const reviewList = (google?.reviews ?? []).filter((item) => item.createdAt >= start && item.createdAt < asOf && (!rating || item.rating === Number(rating)));
  const reset = () => setPage(0);
  return <main className={s.workspace}>
    <div className={s.container}>
      <header className={s.header}>
        <a href={`/${locale}`} aria-label={t("Inicio de Cirix", "Cirix home")}><Image src="/brand/logo-white.svg" alt="CIRIX" width={120} height={43} /></a>
        <span className={s.product}>Google Reviews</span><LanguageSwitcher />
      </header>
      <section className={s.hero}>
        <div><p className={s.eyebrow}>{t("RELACIONES QUE GENERAN CONFIANZA", "RELATIONSHIPS THAT BUILD TRUST")}</p>
          <h1>{t("Cada invitación.", "Every invitation.")}<br /><span>{t("Una oportunidad de escuchar.", "A chance to listen.")}</span></h1>
          <p>{t("Mide el recorrido de tus invitaciones y sigue la reputación de Cirix en Google.", "Measure your invitation journey and follow Cirix’s reputation on Google.")}</p></div>
        <div className={s.actions}><a className={s.button} href={`/${locale}/make-a-review`} target="_blank" rel="noreferrer">{t("Ver página pública", "View public page")} ↗</a>
          <button className={s.primary} disabled={!data || busy} onClick={() => { setDraft({ ...emptyDraft, campaignId: data?.campaigns[0]?.id ?? "" }); setPanel(data?.campaigns.length ? "invitation" : "campaign"); }}>{t("+ Nueva invitación", "+ New invitation")}</button></div>
      </section>
      {error && <p role="alert" className={s.alert}>{error === "capacity" ? t("El volumen supera la capacidad del informe. Amplía la agregación antes de interpretar los KPIs.", "This report exceeds its capacity. Expand aggregation before interpreting KPIs.") : error === "clipboard" ? t("No se pudo copiar. Selecciona el enlace visible para copiarlo manualmente.", "Could not copy. Select the visible link to copy it manually.") : t("No se pudo completar la operación. Revisa tu sesión y la conexión; los datos anteriores pueden estar desactualizados.", "The operation failed. Check your session and connection; previous data may be outdated.")}</p>}
      <div role="status" className={s.notice}>{notice}</div>
      {panel && <section className={s.panel} aria-labelledby="editor-title">
        <div className={s.sectionHead}><h2 id="editor-title">{panel === "campaign" ? t("Nueva campaña", "New campaign") : t("Preparar invitación", "Prepare invitation")}</h2><button className={s.button} disabled={busy} onClick={() => setPanel(null)}>{t("Cerrar", "Close")}</button></div>
        {panel === "campaign" ? <form className={s.form} onSubmit={(event) => { event.preventDefault(); void mutate(async () => { await api("/api/reviews/campaigns", "POST", { name: campaignName.trim() }); setCampaignName(""); setPanel(null); await refresh(); setNotice(t("Campaña creada. Ya puedes preparar invitaciones.", "Campaign created. You can now prepare invitations.")); }); }}>
          <label>{t("Nombre de la campaña", "Campaign name")}<input autoFocus required minLength={2} maxLength={100} value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder={t("Clientes · Septiembre", "Customers · September")} /></label><button className={s.primary} disabled={busy}>{t("Crear campaña", "Create campaign")}</button>
        </form> : <>
          <p className={s.muted}>{t("Usa un cliente del CRM o añade sus datos. Crear la invitación no envía mensajes.", "Choose a CRM customer or enter their details. Creating an invitation does not send messages.")}</p>
          <div className={s.actions}><button className={s.button} disabled={busy} onClick={() => void mutate(async () => { const crm = await api("/api/zoho/crm"); setContacts((crm.contacts as Contact[]).filter((item) => item.lifecycleStage === "customer")); setCrmLoaded(true); })}>{t("Cargar clientes del CRM", "Load CRM customers")}</button>
            {crmLoaded && <label>{t("Cliente del CRM", "CRM customer")}<select value={draft.crmContactId} onChange={(event) => { const contact = contacts.find((item) => item.id === event.target.value); if (contact) setDraft({ ...draft, crmContactId: contact.id, clientName: contact.fullName, email: contact.email ?? "", phone: contact.phone ?? "" }); else setDraft({ ...draft, crmContactId: "" }); }}><option value="">{t("Ingreso manual", "Manual entry")}</option>{contacts.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.email}</option>)}</select></label>}
            {crmLoaded && !contacts.length && <p className={s.muted}>{t("No hay clientes disponibles en el CRM.", "No CRM customers available.")}</p>}</div>
          <form className={s.form} onSubmit={(event) => { event.preventDefault(); const parsed = invitationInput.safeParse(draft); if (!parsed.success) { setError("save"); return; } void mutate(async () => { await api("/api/reviews/invitations", "POST", parsed.data); setPanel(null); setDraft(emptyDraft); await refresh(); setNotice(t("Invitación preparada. Envía el mensaje y registra el envío en la tabla.", "Invitation prepared. Send the message, then record the send in the table.")); }); }}>
            <label>{t("Campaña", "Campaign")}<select required value={draft.campaignId} onChange={(event) => setDraft({ ...draft, campaignId: event.target.value })}>{data?.campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>{t("Nombre del cliente", "Customer name")}<input required minLength={2} maxLength={100} value={draft.clientName} onChange={(event) => setDraft({ ...draft, clientName: event.target.value })} /></label>
            <label>{t("Canal", "Channel")}<select value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value as Invitation["source"] })}>{["email", "whatsapp", "sms", "direct"].map((value) => <option key={value} value={value}>{channels[value]}</option>)}</select></label>
            <label>Email<input type="email" required={draft.source === "email"} maxLength={254} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
            <label>{t("Teléfono con código de país", "Phone with country code")}<input type="tel" required={["sms", "whatsapp"].includes(draft.source)} maxLength={24} pattern="[+0-9 ()-]*" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
            <button className={s.primary} disabled={busy}>{t("Guardar invitación", "Save invitation")}</button>
          </form>
        </>}
      </section>}
      <div className={s.filters}>
        <label>{t("Período", "Period")}<select value={days} onChange={(event) => { setDays(Number(event.target.value)); reset(); }}>{[7, 30, 90].map((value) => <option key={value} value={value}>{t("Últimos", "Last")} {value} {t("días", "days")}</option>)}</select></label>
        <label>{t("Campaña", "Campaign")}<select value={campaignId} onChange={(event) => { setCampaignId(event.target.value); reset(); }}><option value="">{t("Todas las campañas", "All campaigns")}</option>{data?.campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>{t("Canal", "Channel")}<select value={source} onChange={(event) => { setSource(event.target.value); reset(); }}><option value="">{t("Todos los canales", "All channels")}</option>{Object.entries(channels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className={s.button} disabled={loading || busy} onClick={() => { setLoading(true); void refresh(); }}>{loading ? t("Cargando…", "Loading…") : t("Actualizar datos", "Refresh data")}</button>
      </div>
      <div className={s.cards}>{[
        [t("Invitaciones enviadas", "Invitations sent"), metrics.sent, t("Envíos registrados por el equipo", "Sends recorded by your team")],
        [t("Abiertas", "Opened"), metrics.opened, t("Enlaces individuales visitados", "Individual links visited")],
        [t("Continuaron a Google", "Continued to Google"), metrics.clicked, t("Invitaciones con clic registrado", "Invitations with a recorded click")],
        [t("Efectividad de invitación", "Invitation effectiveness"), rate(metrics.clickRate), t("Clics ÷ invitaciones enviadas", "Clicks ÷ invitations sent")],
      ].map(([label, value, hint]) => <article className={s.card} key={label}><p>{label}</p><strong>{data ? value : "—"}</strong><small>{hint}</small></article>)}</div>
      {data && <><section className={s.panel}>
        <div className={s.sectionHead}><h2>{t("El recorrido de tus invitaciones", "Your invitation journey")}</h2><span className={s.tag}>{days} {t("días", "days")}</span></div>
        <div className={s.journey}>{[[t("Enviadas", "Sent"), metrics.sent], [t("Abiertas", "Opened"), metrics.opened], [t("Clic a Google", "Clicked to Google"), metrics.clicked]].map(([label, count], index) => <div key={label}><small>0{index + 1} / {label}</small><strong>{data ? count : "—"}</strong><progress aria-label={String(label)} value={Number(count)} max={Math.max(1, metrics.sent)} /></div>)}</div>
        <p>{t("Tasa de apertura", "Open rate")}: <b>{rate(metrics.openRate)}</b> · {t("Abiertas sin clic", "Opened without a click")}: <b>{metrics.withoutClick}</b></p>
        <p className={s.muted}>{t("Se cuentan invitaciones enviadas en el período, una vez por enlace. Un clic indica intención; no confirma una reseña publicada. Las visitas bloqueadas por privacidad pueden no registrarse y los enlaces pueden reenviarse.", "Invitations sent in the period are counted once per link. A click indicates intent; it does not confirm a published review. Privacy controls can prevent tracking and links can be forwarded.")}</p>
        {asOf && <small className={s.muted}>{t("Datos consultados", "Data refreshed")}: {date(asOf)}</small>}
      </section>
      <section className={s.panel}>
        <div className={s.sectionHead}><div><p className={s.eyebrow}>{t("ENLACES Y QR", "LINKS & QR")}</p><h2>{t("Campañas abiertas", "Open campaigns")}</h2></div><button className={s.button} disabled={!data || busy} onClick={() => setPanel("campaign")}>{t("+ Nueva campaña", "+ New campaign")}</button></div>
        <p className={s.muted}>{t("Para mostrador, material impreso o enlaces compartidos. Estas sesiones se miden aparte de las invitaciones individuales.", "For counters, printed materials or shared links. These sessions are measured separately from individual invitations.")}</p>
        <div className={s.sessionStats}><span>{visits.opened} {t("sesiones", "sessions")}</span><span>{visits.clicked} {t("con clic", "with a click")}</span><span>{rate(visits.rate)} {t("continuó a Google", "continued to Google")}</span></div>
        <div className={s.campaigns}>{data?.campaigns.filter((item) => !campaignId || item.id === campaignId).map((item) => {
          const link = origin ? publicReviewLink(origin, item.token, "qr", locale) : "";
          return <article key={item.id} className={s.campaign}><h3>{item.name}</h3><label>{t("Enlace público · origen QR", "Public link · QR source")}<input readOnly value={link} onFocus={(event) => event.target.select()} /></label><div className={s.actions}><button className={s.button} onClick={() => void copy(link)}>{t("Copiar enlace", "Copy link")}</button><button className={s.button} disabled={busy} onClick={() => void mutate(async () => { const qr = await import("qrcode"); const href = await qr.toDataURL(link, { width: 600, margin: 4, errorCorrectionLevel: "M", color: { dark: "#051934", light: "#ffffff" } }); const anchor = document.createElement("a"); anchor.href = href; anchor.download = `cirix-review-${item.id}.png`; anchor.click(); })}>{t("Descargar QR", "Download QR")}</button></div></article>;
        })}</div>
        {data && !data.campaigns.length && <p className={s.empty}>{t("Crea tu primera campaña para generar enlaces e invitaciones.", "Create your first campaign to generate links and invitations.")}</p>}
      </section>
      <section className={s.panel}>
        <div className={s.sectionHead}><h2>{t("Seguimiento por cliente", "Customer follow-up")}</h2><span className={s.tag}>{filtered.length}</span></div>
        <p className={s.muted}>{t("Abre el mensaje en tu aplicación y envíalo. Después pulsa «Registrar envío». Los borradores no cuentan en los KPIs; regístralo inmediatamente para medir las aperturas posteriores.", "Open the message in your app and send it. Then select “Record send”. Drafts are excluded from KPIs; record sends immediately to measure subsequent openings.")}</p>
        <div className={s.filters}><label>{t("Buscar cliente", "Find customer")}<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); reset(); }} placeholder={t("Nombre, email o teléfono", "Name, email or phone")} /></label><label>{t("Estado", "Status")}<select value={status} onChange={(event) => { setStatus(event.target.value); reset(); }}><option value="">{t("Todos los estados", "All statuses")}</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <div className={s.tableWrap}><table><thead><tr>{[t("Cliente", "Customer"), t("Campaña / canal", "Campaign / channel"), t("Avance", "Progress"), t("Acciones", "Actions")].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{filtered.slice(currentPage * 20, currentPage * 20 + 20).map((item) => {
          const link = origin ? publicReviewLink(origin, item.token, item.source, locale) : "";
          const compose = invitationComposeLink(item, link, locale);
          return <tr key={item.id}><td><strong>{item.clientName}</strong><small>{item.email || item.phone || "—"}</small></td><td>{campaignLabel(item.campaignId)}<small>{channels[item.source]}</small></td><td><span className={item.clickedAt ? s.success : s.tag}>{labels[state(item)]}</span><small>{date(item.clickedAt ?? item.openedAt ?? item.sentAt ?? item.createdAt)}</small></td><td><div className={s.actions}>{compose && <a className={s.button} href={compose} target="_blank" rel="noreferrer">{t("Abrir mensaje", "Open message")} ↗</a>}<button className={s.button} onClick={() => void copy(invitationMessage(item, link, locale))}>{t("Copiar mensaje", "Copy message")}</button>{!item.sentAt && <button className={s.primary} disabled={busy} onClick={() => void mutate(async () => { await api(`/api/reviews/invitations/${item.id}`, "PATCH", { action: "mark_sent" }); await refresh(); })}>{t("Registrar envío", "Record send")}</button>}</div><details><summary>{t("Ver enlace", "View link")}</summary><input aria-label={t("Enlace individual", "Individual link")} readOnly value={link} onFocus={(event) => event.target.select()} /></details></td></tr>;
        })}</tbody></table></div>
        {!filtered.length && <p className={s.empty}>{loading ? t("Cargando invitaciones…", "Loading invitations…") : t("No hay invitaciones para estos filtros.", "No invitations match these filters.")}</p>}
        {filtered.length > 20 && <div className={s.pagination}><button className={s.button} disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>{t("Anterior", "Previous")}</button><span>{currentPage + 1} / {Math.ceil(filtered.length / 20)}</span><button className={s.button} disabled={(currentPage + 1) * 20 >= filtered.length} onClick={() => setPage(currentPage + 1)}>{t("Siguiente", "Next")}</button></div>}
      </section></>}
      <section className={s.panel}>
        <div className={s.sectionHead}><div><p className={s.eyebrow}>GOOGLE BUSINESS PROFILE</p><h2>{t("Lo que dicen tus clientes", "What your customers say")}</h2></div>{data?.googleConfigured && <button className={s.primary} disabled={syncing} onClick={() => void synchronize()}>{syncing ? t("Consultando Google…", "Fetching from Google…") : t("Consultar reseñas", "Fetch reviews")}</button>}</div>
        <p className={s.muted}>{t("Reseñas reales de todo el negocio. Se aplica el período seleccionado, pero no los filtros de campaña o canal. Google no comparte el email del autor ni permite vincularlo automáticamente a una invitación.", "Actual reviews for the entire business. The selected period applies, but campaign and channel filters do not. Google does not share reviewer email or allow automatic invitation matching.")}</p>
        {data && !data.googleConfigured && <div className={s.empty}><h3>{t("Conecta tu perfil de Google", "Connect your Google profile")}</h3><p>{t("El administrador debe configurar el acceso a Google Business Profile para consultar calificaciones y reseñas. Puedes usar las campañas y medir invitaciones desde ahora.", "Your administrator must configure Google Business Profile access to fetch ratings and reviews. Campaigns and invitation tracking are available now.")}</p></div>}
        {googleError && <p role="alert" className={s.alert}>{t("Google no respondió o el acceso no está autorizado. Reintenta la consulta; cualquier resultado anterior conserva su fecha de actualización.", "Google did not respond or access is unauthorized. Retry; any previous results retain their original refresh date.")}</p>}
        {data?.googleConfigured && !google && !googleError && <p className={s.empty}>{t("Consulta Google para cargar las reseñas actuales.", "Fetch reviews to load current Google data.")}</p>}
        {google && googleStats && <>
          <div className={s.cards}>{[[t("Reseñas nuevas", "New reviews"), googleStats.count], [t("Período anterior", "Previous period"), googleStats.previousCount], [t("Cambio entre períodos", "Period change"), rate(googleStats.growth)], [t("Calificación global", "Overall rating"), google.averageRating === null ? "—" : `${google.averageRating.toFixed(1)} / 5`]].map(([label, value]) => <article className={s.card} key={label}><p>{label}</p><strong>{value}</strong></article>)}</div>
          <p className={s.muted}>{google.totalReviewCount} {t("reseñas totales", "total reviews")} · {googleStats.unanswered} {t("sin respuesta en el período", "unanswered in this period")} · {t("Consulta", "Fetched")}: {date(google.fetchedAt)}</p>
          <div className={s.distribution}>{googleStats.distribution.map((count, index) => <div key={index}><span>{index + 1} ★</span><progress aria-label={`${index + 1} ${t("estrellas", "stars")}`} value={count} max={Math.max(1, googleStats.count)} /><span>{count}</span></div>)}</div>
          <label>{t("Calificación", "Rating")}<select value={rating} onChange={(event) => setRating(event.target.value)}><option value="">{t("Todas las calificaciones", "All ratings")}</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} ★</option>)}</select></label>
          <div className={s.reviews}>{reviewList.map((item) => <article className={s.review} key={item.id}><div className={s.sectionHead}><h3>{item.author || t("Usuario de Google", "Google user")}</h3><span className={s.stars} aria-label={`${item.rating} / 5`}>{"★".repeat(item.rating)}</span></div><small className={s.muted}>{date(item.createdAt)}</small><p>{item.comment || t("Sin comentario escrito.", "No written comment.")}</p>{item.reply && <blockquote><b>{t("Respuesta del negocio", "Business response")}</b><p>{item.reply}</p></blockquote>}</article>)}</div>
          {!reviewList.length && <p className={s.empty}>{t("No hay reseñas con estos filtros.", "No reviews match these filters.")}</p>}
        </>}
      </section>
    </div>
  </main>;
}
