"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/locale";
import s from "./automation-studio.module.css";
import {
  APPOINTMENT_STORAGE_EVENT,
  addDays,
  createInvitation,
  formatSlot,
  isSlotAvailable,
  localDateKey,
  readSnapshot,
  startOfWeek,
  writeInvitations,
  type AppointmentInvitation,
  type AppointmentSlot,
  type InvitationMode,
} from "@/modules/n8n/lib/appointment-demo";

type Props = { locale: Locale };
type Duration = 30 | 45 | 60;

const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text outline-none transition focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action/30";
const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-xl bg-action-fill px-4 text-sm font-semibold text-on-action transition hover:bg-action-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-300 disabled:cursor-not-allowed disabled:opacity-45";
const secondaryButton = "inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text transition hover:border-accent hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-300";

export function AppointmentStudio({ locale }: Props) {
  const es = locale === "es";
  const demoCustomer = es ? "María González" : "Maria Gonzalez";
  const demoSubject = es ? "Reunión comercial" : "Commercial meeting";
  const demoNotes = es
    ? "Revisaremos tus necesidades y los próximos pasos de la propuesta."
    : "We will review your needs and the next steps for the proposal.";
  const [invitations, setInvitations] = useState<AppointmentInvitation[]>([]);
  const [ready, setReady] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(localDateKey(new Date())));
  const [mode, setMode] = useState<InvitationMode>("direct");
  const [duration, setDuration] = useState<Duration>(30);
  const [selected, setSelected] = useState<AppointmentSlot[]>([]);
  const [customerName, setCustomerName] = useState(demoCustomer);
  const [customerEmail, setCustomerEmail] = useState("maria.gonzalez@example.com");
  const [subject, setSubject] = useState(demoSubject);
  const [notes, setNotes] = useState(demoNotes);
  const [sent, setSent] = useState<AppointmentInvitation | null>(null);
  const today = localDateKey(new Date());

  useEffect(() => {
    const load = () => {
      const next = readSnapshot().invitations;
      setInvitations(next);
      writeExpiredOnly(next);
      setReady(true);
    };
    load();
    window.addEventListener("storage", load);
    window.addEventListener(APPOINTMENT_STORAGE_EVENT, load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener(APPOINTMENT_STORAGE_EVENT, load);
      window.removeEventListener("focus", load);
    };
  }, []);

  const days = useMemo(() => Array.from({ length: 5 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const availableCount = useMemo(() => days.reduce((total, day) => total + buildDaySlots(day, duration).filter((slot) => slot.startsAt.slice(0, 10) >= today && isSlotAvailable(slot, invitations)).length, 0), [days, duration, invitations, today]);

  const toggleSlot = (slot: AppointmentSlot) => {
    if (!isSlotAvailable(slot, invitations) || slot.startsAt.slice(0, 10) < today) return;
    setSelected((current) => {
      if (current.some((item) => item.id === slot.id)) return current.filter((item) => item.id !== slot.id);
      if (mode === "direct") return [slot];
      if (current.length >= 5) return current;
      return [...current, slot].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    });
  };

  const validSelection = mode === "direct" ? selected.length === 1 : selected.length >= 2 && selected.length <= 5;
  const canSend = ready && customerName.trim().length > 1 && /^\S+@\S+\.\S+$/.test(customerEmail) && subject.trim().length > 1 && validSelection;

  const send = () => {
    if (!canSend) return;
    if (selected.some((slot) => !isSlotAvailable(slot, invitations))) {
      setSelected((current) => current.filter((slot) => isSlotAvailable(slot, invitations)));
      return;
    }
    const invitation = createInvitation({
      mode,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      subject: subject.trim(),
      notes: notes.trim(),
      slots: selected,
    });
    const next = [invitation, ...invitations];
    writeInvitations(next);
    setInvitations(next);
    setSent(invitation);
    setSelected([]);
  };

  const cancel = (id: string) => {
    const next = invitations.map((item) => item.id === id && (item.status === "pending" || item.status === "confirmed") ? { ...item, status: "cancelled" as const } : item);
    writeInvitations(next);
    setInvitations(next);
  };

  const reset = () => {
    writeInvitations([]);
    setInvitations([]);
    setSent(null);
    setSelected([]);
    setCustomerName(demoCustomer);
    setCustomerEmail("maria.gonzalez@example.com");
    setSubject(demoSubject);
    setNotes(demoNotes);
  };

  return <div className={`${s.appointments} space-y-5`}>
    <section className={s.appointmentMetrics}>
      <Metric label={es ? "Invitaciones" : "Invitations"} value={invitations.length} />
      <Metric label={es ? "Confirmadas" : "Confirmed"} value={invitations.filter((item) => item.status === "confirmed").length} tone="success" />
      <Metric label={es ? "Slots libres esta semana" : "Open slots this week"} value={availableCount} tone="accent" />
    </section>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
      <div className={s.appointmentPanel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{es ? "Agenda interna" : "Internal calendar"}</p><h2 className="mt-1 font-heading text-xl font-semibold">{formatWeek(weekStart, locale)}</h2><p className="mt-1 text-xs text-text-muted">{es ? "Lun–vie · 9:00–17:00 · hora de Florida" : "Mon–Fri · 9:00–17:00 · Florida time"}</p></div>
          <div className="flex gap-2"><button type="button" className={secondaryButton} onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={es ? "Semana anterior" : "Previous week"}>←</button><button type="button" className={secondaryButton} onClick={() => setWeekStart(startOfWeek(today))}>{es ? "Hoy" : "Today"}</button><button type="button" className={secondaryButton} onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label={es ? "Semana siguiente" : "Next week"}>→</button></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-5">
          {days.map((day) => <div key={day} className={s.appointmentDay}><p className="mb-2 text-center text-xs font-semibold text-text">{formatDay(day, locale)}</p><div className="grid grid-cols-2 gap-1 sm:grid-cols-1">{buildDaySlots(day, duration).map((slot) => {
            const chosen = selected.some((item) => item.id === slot.id);
            const available = day >= today && isSlotAvailable(slot, invitations);
            return <button key={slot.id} type="button" disabled={!available} aria-pressed={chosen} aria-label={formatSlot(slot, locale)} onClick={() => toggleSlot(slot)} className={`min-h-9 rounded-lg border px-1 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-300 ${chosen ? "border-action bg-action-fill text-on-action" : available ? "border-border bg-surface text-text hover:border-accent hover:text-accent" : "cursor-not-allowed border-transparent bg-bg/55 text-text-muted/40 line-through"}`}>{slot.startsAt.slice(11, 16)}</button>;
          })}</div></div>)}
        </div>
      </div>

      <div className={s.appointmentPanel}>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{es ? "Nueva invitación" : "New invitation"}</p>
        <h2 className="mt-1 font-heading text-xl font-semibold">{es ? "Configurar cita" : "Set up appointment"}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label={es ? "Modalidad" : "Mode"}>{(["direct", "proposal"] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); setSelected([]); }} className={`min-h-11 rounded-xl border px-2 text-xs font-semibold ${mode === value ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-bg text-text-muted"}`}>{value === "direct" ? (es ? "Fecha directa" : "Direct date") : (es ? "Enviar opciones" : "Send options")}</button>)}</div>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-text-muted">{es ? "Nombre del cliente" : "Customer name"}<input className={`${fieldClass} mt-1`} value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
          <label className="block text-xs text-text-muted">Email<input className={`${fieldClass} mt-1`} type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} /></label>
          <label className="block text-xs text-text-muted">{es ? "Asunto" : "Subject"}<input className={`${fieldClass} mt-1`} value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
          <label className="block text-xs text-text-muted">{es ? "Duración" : "Duration"}<select className={`${fieldClass} mt-1`} value={duration} onChange={(event) => { setDuration(Number(event.target.value) as Duration); setSelected([]); }}><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option></select></label>
          <label className="block text-xs text-text-muted">{es ? "Notas (opcional)" : "Notes (optional)"}<textarea className={`${fieldClass} mt-1 min-h-20 py-3`} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-bg p-3 text-xs text-text-muted"><strong className="text-text">{selected.length}</strong> {mode === "direct" ? (es ? "de 1 horario seleccionado" : "of 1 slot selected") : (es ? "de 2–5 opciones seleccionadas" : "of 2–5 options selected")}</div>
        <button type="button" className={`${primaryButton} mt-4 w-full`} disabled={!canSend} onClick={send}>{es ? "Simular envío" : "Simulate send"}</button>
      </div>
    </section>

    {sent ? <SentPreview invitation={sent} locale={locale} onClose={() => setSent(null)} /> : null}

    <section className={s.appointmentPanel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{es ? "Seguimiento" : "Tracking"}</p><h2 className="mt-1 font-heading text-xl font-semibold">{es ? "Citas e invitaciones" : "Appointments and invitations"}</h2></div><button type="button" onClick={reset} className={secondaryButton}>{es ? "Reiniciar demo" : "Reset demo"}</button></div>
      {invitations.length === 0 ? <p className="rounded-xl border border-dashed border-border p-7 text-center text-sm text-text-muted">{es ? "Aún no hay invitaciones. Selecciona un horario para comenzar." : "No invitations yet. Select a slot to begin."}</p> : <div className="space-y-2">{invitations.map((invitation) => <article key={invitation.id} className="flex flex-col gap-3 rounded-xl border border-border bg-bg/50 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-text">{invitation.subject}</p><StatusBadge status={invitation.status} es={es} /></div><p className="mt-1 text-xs text-text-muted">{invitation.customerName} · {invitation.customerEmail}</p><p className="mt-1 text-xs text-text-muted">{invitation.mode === "direct" ? formatSlot(invitation.slots[0], locale) : `${invitation.slots.length} ${es ? "opciones · vence en 72 h" : "options · expires in 72 h"}`}</p></div><div className="flex shrink-0 gap-2"><a className={secondaryButton} href={`/${locale}/n8n/invitacion/${invitation.token}`} target="_blank" rel="noreferrer">{es ? "Abrir" : "Open"}</a>{invitation.status === "pending" || invitation.status === "confirmed" ? <button type="button" className={secondaryButton} onClick={() => cancel(invitation.id)}>{es ? "Cancelar" : "Cancel"}</button> : null}</div></article>)}</div>}
    </section>
  </div>;
}

function buildDaySlots(day: string, duration: Duration): AppointmentSlot[] {
  const slots: AppointmentSlot[] = [];
  for (let minute = 9 * 60; minute + duration <= 17 * 60; minute += 30) {
    const hour = String(Math.floor(minute / 60)).padStart(2, "0");
    const mins = String(minute % 60).padStart(2, "0");
    const startsAt = `${day}T${hour}:${mins}`;
    slots.push({ id: `${startsAt}-${duration}`, startsAt, durationMinutes: duration });
  }
  return slots;
}

function formatDay(day: string, locale: Locale): string { const [y, m, d] = day.split("-").map(Number); return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { weekday: "short", day: "numeric" }).format(new Date(y, m - 1, d, 12)); }
function formatWeek(day: string, locale: Locale): string { const end = addDays(day, 4); const format = (value: string) => { const [y, m, d] = value.split("-").map(Number); return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(y, m - 1, d, 12)); }; return `${format(day)} — ${format(end)}`; }
function writeExpiredOnly(invitations: AppointmentInvitation[]) { const stored = readSnapshot().invitations; if (JSON.stringify(stored) !== JSON.stringify(invitations)) writeInvitations(invitations); }

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "accent" }) { return <div className={s.appointmentMetric}><p className="text-xs text-text-muted">{label}</p><p className={`mt-2 font-heading text-3xl font-semibold ${tone === "success" ? "text-[#7ff0b2]" : tone === "accent" ? "text-accent-strong" : "text-text"}`}>{value}</p></div>; }

function StatusBadge({ status, es }: { status: AppointmentInvitation["status"]; es: boolean }) { const labels = { pending: es ? "Pendiente" : "Pending", confirmed: es ? "Confirmada" : "Confirmed", declined: es ? "Rechazada" : "Declined", expired: es ? "Vencida" : "Expired", cancelled: es ? "Cancelada" : "Cancelled" }; const tone = status === "confirmed" ? "border-[#37d98a]/30 bg-[#37d98a]/10 text-[#7ff0b2]" : status === "pending" ? "border-accent/30 bg-accent-soft text-accent-strong" : "border-border bg-surface text-text-muted"; return <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${tone}`}>{labels[status]}</span>; }

function SentPreview({ invitation, locale, onClose }: { invitation: AppointmentInvitation; locale: Locale; onClose: () => void }) {
  const es = locale === "es";
  const href = `/${locale}/n8n/invitacion/${invitation.token}`;
  const copyLink = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}${href}`); } catch { /* Clipboard can be unavailable in preview environments. */ } };
  return <section className="rounded-2xl border border-accent/35 bg-accent-soft p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{es ? "Correo simulado" : "Simulated email"}</p><h2 className="mt-1 font-heading text-xl font-semibold">{es ? "Invitación lista" : "Invitation ready"}</h2></div><button type="button" className={secondaryButton} onClick={onClose} aria-label={es ? "Cerrar" : "Close"}>×</button></div><div className="mt-4 rounded-xl border border-border bg-bg p-4 text-sm"><p className="text-text-muted">{es ? "Para" : "To"}: <strong className="text-text">{invitation.customerEmail}</strong></p><p className="mt-3 font-semibold text-text">{invitation.subject}</p><p className="mt-2 leading-6 text-text-muted">{invitation.mode === "direct" ? (es ? `Te invitamos a confirmar la cita del ${formatSlot(invitation.slots[0], locale)}.` : `Please confirm your appointment for ${formatSlot(invitation.slots[0], locale)}.`) : (es ? "Selecciona el horario que mejor te convenga. El enlace vence en 72 horas." : "Choose the time that works best for you. The link expires in 72 hours.")}</p></div><p className="mt-3 text-xs text-text-muted">{es ? "Demo: el enlace solo contiene datos en este navegador." : "Demo: the link only has data in this browser."}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={secondaryButton} onClick={copyLink}>{es ? "Copiar enlace" : "Copy link"}</button><a className={primaryButton} href={href} target="_blank" rel="noreferrer">{es ? "Abrir como cliente" : "Open as customer"}</a></div></section>;
}

export { StatusBadge };
