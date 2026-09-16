"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { LocalizedLink } from "@/components/localized-link";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/lib/locale";
import { PROVIDERS, siteInputSchema, type PixelEvent, type PixelSite, type PixelSiteInput } from "../domain/pixel";
import { PixelAnalytics } from "./pixel-analytics";
import { createIntegrationGuide } from "./integration-guide";
import s from "./pixel-dashboard.module.css";

const providerNames = { meta: "Meta", google_ads: "Google Ads", ga4: "Google Analytics 4", tiktok: "TikTok", linkedin: "LinkedIn", pinterest: "Pinterest", snapchat: "Snapchat", other: "Other" };
const blank: PixelSiteInput = { name: "", origin: "https://", active: true, destinations: [] };

export function PixelDashboard({ locale }: { locale: Locale }) {
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const [sites, setSites] = useState<PixelSite[]>([]);
  const [selected, setSelected] = useState<PixelSite | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [events, setEvents] = useState<PixelEvent[]>([]);
  const [draft, setDraft] = useState<PixelSiteInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const sequence = useRef(0);
  const fetchError = locale === "es" ? "No se pudieron cargar los datos. Comprueba tu sesión y la conexión con Firestore." : "Could not load data. Check your session and Firestore connection.";

  const loadSite = useCallback(async (site: PixelSite, signal?: AbortSignal) => {
    const requestId = ++sequence.current;
    setSelected(site); setEvents([]); setLoading(true); setError("");
    try {
      const response = await fetch(`/api/pixels/sites/${site.id}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (requestId === sequence.current && !signal?.aborted) { setSelected(data.site); setEvents(data.events); setRefreshKey((value) => value + 1); }
    } catch { if (requestId === sequence.current && !signal?.aborted) setError(fetchError); }
    finally { if (requestId === sequence.current && !signal?.aborted) setLoading(false); }
  }, [fetchError]);

  const loadSites = useCallback(async () => {
    try {
      const response = await fetch("/api/pixels/sites", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setError(""); setBaseUrl(window.location.origin);
      setSites(data.sites);
      if (data.sites[0]) await loadSite(data.sites[0]);
    } catch { setError(fetchError); }
    finally { setLoading(false); }
  }, [fetchError, loadSite]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/pixels/sites", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (controller.signal.aborted) return;
        setBaseUrl(window.location.origin); setSites(data.sites);
        if (data.sites[0]) await loadSite(data.sites[0], controller.signal);
      })
      .catch(() => { if (!controller.signal.aborted) setError(fetchError); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); };
  }, [fetchError, loadSite]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = siteInputSchema.safeParse(draft);
    if (!parsed.success) { setError(t("Revisa el nombre, el dominio HTTPS (sin rutas) y los IDs de los píxeles.", "Check the name, HTTPS origin (without paths) and pixel IDs.")); return; }
    setBusy(true); setError(""); setFeedback("");
    try {
      const response = await fetch(editingId ? `/api/pixels/sites/${editingId}` : "/api/pixels/sites", {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const site = editingId ? { ...selected!, ...parsed.data } : data.site as PixelSite;
      setSites((current) => editingId ? current.map((item) => item.id === editingId ? site : item) : [site, ...current]);
      setDraft(null); setEditingId(null); setFeedback(t("Sitio guardado.", "Site saved."));
      await loadSite(site);
    } catch { setError(t("No se pudo guardar. Comprueba tu sesión y vuelve a intentarlo.", "Could not save. Check your session and try again.")); }
    finally { setBusy(false); }
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setFeedback(t("Código copiado.", "Code copied.")); }
    catch { setError(t("No se pudo copiar. Selecciona y copia el código manualmente.", "Could not copy. Select and copy the code manually.")); }
  }
  function downloadGuide() {
    const guide = createIntegrationGuide(locale, window.location.origin, selected);
    const url = URL.createObjectURL(new Blob([guide], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `pixel-hub-${selected?.id ?? "integration"}-${locale}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback(t("Guía de integración .md generada.", "Integration guide .md generated."));
  }
  const snippet = selected ? `<script src="${baseUrl}/pixel.js" data-site="${selected.id}" defer></script>` : "";
  const agencyConfig = selected ? `window.CIRIX_PIXEL_CONFIG = ${JSON.stringify({ endpoint: baseUrl, siteId: selected.id }, null, 2)};` : "";
  // Only the latest consent observed for each browser qualifies it for the local preview.
  const latest = new Map<string, PixelEvent>();
  events.forEach((event) => { if (!latest.has(event.visitorId)) latest.set(event.visitorId, event); });
  const marketingVisitors = [...latest.values()].filter((event) => event.consent.marketing).length;

  return <div className={s.workspace}><div className={s.container}>
    <a className={s.skipLink} href="#pixel-content">{t("Saltar al contenido", "Skip to content")}</a>
    <header className={s.header}><div className={s.brand}><LocalizedLink href="/" aria-label={t("CIRIX · Inicio", "CIRIX · Home")}><Image src="/brand/logo-white.svg" width={116} height={42} alt="CIRIX" /></LocalizedLink><span>Pixel Hub</span></div><div className={s.headerActions}><LocalizedLink href="/" className={s.backLink}>{t("Volver al ecosistema", "Back to ecosystem")} <span aria-hidden="true">↗</span></LocalizedLink><LanguageSwitcher /></div></header>
    <main id="pixel-content">
      <section className={s.hero} aria-labelledby="pixel-title">
        <div className={s.heroCopy}><span className={s.eyebrow}><span className={s.statusDot} />Pixel Hub · {t("Inteligencia de visitantes", "Visitor intelligence")}</span><h1 id="pixel-title">{t("Cada visita,", "Every visit,")}<br /><span>{t("una conexión.", "a connection.")}</span></h1><p>{t("Conecta tus sitios, entiende cada visita y mide lo que hace crecer tu negocio. Todo, desde un solo lugar.", "Connect your sites, understand every visit and measure what grows your business. All in one place.")}</p><div className={s.heroActions}><button className={s.primary} onClick={() => { setDraft({ ...blank, destinations: [] }); setEditingId(null); }}>{t("Registrar sitio", "Register site")} <span aria-hidden="true">↗</span></button><button className={s.textButton} onClick={downloadGuide}>{t("Descargar guía .md", "Download guide .md")} <span aria-hidden="true">↓</span></button></div><p className={s.heroNote}><span />{t("Medición propia. Consentimiento primero.", "First-party measurement. Consent first.")}</p></div>
        <div className={s.signalVisual} aria-label={t("Recorrido de la medición", "Measurement journey")}>
          <div className={s.visualHeading}><span>CIRIX / PIXEL HUB</span><span className={s.badge}>{t("CÓMO FUNCIONA", "HOW IT WORKS")}</span></div>
          <div className={s.signalOrbit} aria-hidden="true"><div className={s.orbitRing} /><div className={s.orbitRingInner} /><div className={s.orbitCenter}><span>◎</span><strong>Pixel Hub</strong></div><span className={`${s.orbitLabel} ${s.orbitLabelTop}`}>01 / {t("Tu sitio", "Your site")}</span><span className={`${s.orbitLabel} ${s.orbitLabelBottom}`}>02 / {t("Consentimiento", "Consent")}</span></div>
          <div className={s.visualFooter}><span className={s.statusDot} /><span>03 / {t("Eventos que cuentan una historia", "Events that tell a story")}</span><span aria-hidden="true">↗</span></div>
        </div>
      </section>
      <div className={s.sectionHeading}><span className={s.eyebrow}>01 / {t("TU CENTRO DE MEDICIÓN", "YOUR MEASUREMENT HUB")}</span><span>{t("Conecta. Mide. Comprende.", "Connect. Measure. Understand.")}</span></div>
      {error && <div className={s.notice} role="alert">{error} <button onClick={() => void (selected ? loadSite(selected) : loadSites())}>{t("Reintentar", "Retry")}</button></div>}
      {feedback && <div className={s.notice} role="status">{feedback}</div>}
      {draft && <section className={s.panel}><h2>{editingId ? t("Configuración del sitio", "Site settings") : t("Nuevo sitio web", "New website")}</h2><form className={s.form} onSubmit={save}>
        <label>{t("Nombre", "Name")}<input required minLength={2} maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Cirix Agency" /></label>
        <label>{t("Origen autorizado", "Allowed origin")}<input required type="url" value={draft.origin} onChange={(event) => setDraft({ ...draft, origin: event.target.value })} placeholder="https://cirixad.com" /></label>
        <p className={s.muted}>{t("Registra www y otros subdominios como sitios independientes. Solo se aceptan eventos del origen exacto.", "Register www and other subdomains as separate sites. Events require the exact origin.")}</p>
        <label>{t("Recepción de eventos", "Event collection")}<select value={String(draft.active)} onChange={(event) => setDraft({ ...draft, active: event.target.value === "true" })}><option value="true">{t("Habilitada", "Enabled")}</option><option value="false">{t("Pausada", "Paused")}</option></select></label>
        <h2>{t("Inventario de píxeles publicitarios", "Advertising pixel registry")}</h2><p>{t("Guarda aquí los IDs públicos. Este inventario no instala etiquetas ni envía datos a proveedores. No introduzcas tokens ni claves privadas.", "Store public IDs here. This registry does not install tags or send data to providers. Do not enter tokens or private keys.")}</p>
        {draft.destinations.map((destination, index) => <div className={s.destination} key={index}><select aria-label={t("Proveedor", "Provider")} value={destination.provider} onChange={(event) => setDraft({ ...draft, destinations: draft.destinations.map((item, i) => i === index ? { ...item, provider: event.target.value as typeof destination.provider } : item) })}>{PROVIDERS.map((provider) => <option key={provider} value={provider}>{providerNames[provider]}</option>)}</select><input aria-label="Pixel ID" required value={destination.pixelId} placeholder="Pixel / Measurement ID" onChange={(event) => setDraft({ ...draft, destinations: draft.destinations.map((item, i) => i === index ? { ...item, pixelId: event.target.value } : item) })} /><button type="button" onClick={() => setDraft({ ...draft, destinations: draft.destinations.filter((_, i) => i !== index) })}>{t("Quitar", "Remove")}</button></div>)}
        <div className={s.actions}><button type="button" disabled={draft.destinations.length >= 16} onClick={() => setDraft({ ...draft, destinations: [...draft.destinations, { provider: "meta", pixelId: "" }] })}>+ {t("Añadir píxel", "Add pixel")}</button><button type="submit" className={s.primary} disabled={busy}>{busy ? t("Guardando…", "Saving…") : t("Guardar sitio", "Save site")}</button><button type="button" disabled={busy} onClick={() => setDraft(null)}>{t("Cancelar", "Cancel")}</button></div>
      </form></section>}
      <div className={s.grid}><aside className={`${s.panel} ${s.sidebar}`}><div className={s.row}><h2>{t("Mis sitios", "My sites")}</h2><span className={s.badge}>{sites.length}</span></div><p className={s.muted}>{t("Selecciona una web para explorar su actividad.", "Select a website to explore its activity.")}</p><div className={s.sites}>{sites.map((site) => <button key={site.id} disabled={busy} aria-pressed={selected?.id === site.id} onClick={() => { setDraft(null); void loadSite(site); }}><strong>{site.name}<span aria-hidden="true">↗</span></strong><span className={s.muted}>{site.origin}</span><span className={s.siteStatus} data-active={site.active}>{site.active ? t("Recepción habilitada", "Collection enabled") : t("En pausa", "Paused")}</span></button>)}</div>{!sites.length && <p>{loading ? t("Cargando…", "Loading…") : t("Aún no hay sitios registrados.", "No sites registered yet.")}</p>}<div className={s.sidebarGuide}><span className={s.eyebrow}>{t("DE LA WEB AL PANEL", "FROM WEBSITE TO DASHBOARD")}</span><h3>{t("Tu próxima conexión empieza aquí.", "Your next connection starts here.")}</h3><p>{t("Lleva contigo los pasos, el código y las comprobaciones de la integración.", "Take the steps, code and integration checks with you.")}</p><button onClick={downloadGuide}>{t("Descargar guía .md", "Download guide .md")} <span aria-hidden="true">↓</span></button></div></aside>
      <div aria-busy={loading}>{!selected ? <section className={`${s.panel} ${s.empty}`}><span className={s.eyebrow}>01 / {t("Conecta", "Connect")}</span><h2>{t("Empieza por tu primera web.", "Start with your first website.")}</h2><p>{t("Registra Cirix, instala el seguimiento y recibe eventos después del consentimiento.", "Register Cirix, install tracking and receive events after consent.")}</p><button className={s.primary} onClick={() => { setEditingId(null); setDraft({ ...blank, name: "Cirix Agency", origin: "https://cirixad.com" }); }}>{t("Configurar cirixad.com", "Set up cirixad.com")}</button></section> : <>
        <section className={s.panel}><div className={s.row}><div><h2>{selected.name}</h2><p>{selected.origin}</p></div><div className={s.actions}><button disabled={loading || busy} onClick={() => void loadSite(selected)}>{t("Actualizar", "Refresh")}</button><button onClick={() => { setEditingId(selected.id); setDraft({ name: selected.name, origin: selected.origin, active: selected.active, destinations: selected.destinations }); }}>{t("Configurar", "Settings")}</button></div></div>
        </section>
        <PixelAnalytics key={selected.id} siteId={selected.id} locale={locale} refreshKey={refreshKey} />
        <section className={s.panel}><h2>{t("Preparación de audiencias", "Audience preparation")}</h2><p>{t(`${marketingVisitors} navegadores tienen permiso publicitario en su último evento de esta muestra.`, `${marketingVisitors} browsers have marketing consent in their latest event in this sample.`)}</p><p className={s.muted}>{t("Muestra de los últimos 100 eventos dentro de 90 días; no es una audiencia exportable. La activación requiere un registro central de consentimiento y revocaciones, reglas de segmentación y un conector publicitario.", "Sample of the latest 100 events within 90 days; this is not an exportable audience. Activation requires a central consent and revocation ledger, segmentation rules and an advertising connector.")}</p><div className={s.sites}>{selected.destinations.map((destination, index) => <div key={index}><strong>{providerNames[destination.provider]}</strong> · {destination.pixelId}<br /><span className={s.muted}>{t("ID registrado · envío no conectado", "ID registered · delivery not connected")}</span></div>)}</div></section>
        <section className={`${s.panel} ${s.installation}`}><div className={s.row}><div><span className={s.eyebrow}>02 / {t("CONECTA TU WEB", "CONNECT YOUR WEBSITE")}</span><h2>{t("Instalación y diagnóstico", "Installation and diagnostics")}</h2></div><button className={s.primary} onClick={downloadGuide}>{t("Descargar guía .md", "Download guide .md")} <span aria-hidden="true">↓</span></button></div><p>{t("El script espera el consentimiento de tu banner. Colócalo en cada página pública que quieras medir. La guía descargable incluye la configuración de este sitio.", "The script waits for consent from your banner. Add it to every public page you want to measure. The downloadable guide includes this site's configuration.")}</p><pre className={s.code}>{snippet}</pre><button onClick={() => void copy(snippet)}>{t("Copiar script", "Copy script")}</button>
          <details><summary>{t("Conectar el banner de consentimiento", "Connect your consent banner")}</summary><p>{t("Ejecuta esto solo con la elección real del visitante. Escucha cirix:ready si el script aún no ha cargado. Para una navegación SPA, llama track('page_view') después de cambiar la ruta.", "Run this only with the visitor's actual choice. Listen for cirix:ready if the script has not loaded. For SPA navigation, call track('page_view') after the route changes.")}</p><pre className={s.code}>{`window.cirixPixel.consent({\n  analytics: choice.analytics,\n  marketing: choice.marketing,\n  version: "1"\n});\n// On withdrawal:\nwindow.cirixPixel.revoke();\n// After a confirmed conversion (stable UUID per transaction):\nwindow.cirixPixel.track("purchase", {\n  eventId: order.trackingEventId, value: 99, currency: "USD"\n});`}</pre></details>
          <details><summary>{t("Configuración para cirix/index.html", "Configuration for cirix/index.html")}</summary><p>{t("Copia este contenido a js/pixel-config.js de la web Cirix. El adaptador de consentimiento y contacto usa esta configuración.", "Copy this to js/pixel-config.js in the Cirix website. The consent and contact adapter uses this configuration.")}</p><pre className={s.code}>{agencyConfig}</pre><button onClick={() => void copy(agencyConfig)}>{t("Copiar configuración", "Copy configuration")}</button></details>
          <details><summary>{t("Qué se recopila", "What is collected")}</summary><p>{t("Evento, ruta sin query, campaña de sesión, dominio referente, categorías de dispositivo y navegador, idioma, país/región aproximados cuando están disponibles, interacción, consentimiento, IDs aleatorios y valor de conversión. Los IDs de clic solo se guardan con permiso publicitario. No capturamos formularios, correos, teléfonos, IP ni huellas del dispositivo en los eventos.", "Event, path without query, session campaign, referrer domain, broad device/browser categories, language, approximate country/region when available, interaction, random IDs and conversion value. Click IDs require marketing consent. Events do not capture forms, emails, phones, IP or device fingerprints.")}</p><p>{t("La retención lógica es de 90 días. El borrado físico requiere activar las políticas TTL de Firestore indicadas en la documentación del módulo.", "Logical retention is 90 days. Physical deletion requires enabling the Firestore TTL policies documented for this module.")}</p></details>
        </section>
      </>}</div></div>
    </main>
    <footer className={s.footer}><span>CIRIX · DIGITAL BUSINESS SOLUTIONS</span><span>Pixel Hub / {t("Cada conexión cuenta.", "Every connection counts.")}</span></footer>
  </div></div>;
}
