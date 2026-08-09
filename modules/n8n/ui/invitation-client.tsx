"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/locale";
import {
  APPOINTMENT_STORAGE_EVENT,
  formatSlot,
  isSlotAvailable,
  readSnapshot,
  writeInvitations,
  type AppointmentInvitation,
} from "@/modules/n8n/lib/appointment-demo";

const button = "inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-300 disabled:cursor-not-allowed disabled:opacity-45";

export function InvitationClient({ locale, token }: { locale: Locale; token: string }) {
  const es = locale === "es";
  const [invitations, setInvitations] = useState<AppointmentInvitation[]>([]);
  const [ready, setReady] = useState(false);
  const [chosenId, setChosenId] = useState("");
  const invitation = invitations.find((item) => item.token === token);

  const load = () => { setInvitations(readSnapshot().invitations); setReady(true); };
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    window.addEventListener("storage", load);
    window.addEventListener(APPOINTMENT_STORAGE_EVENT, load);
    return () => { window.clearTimeout(timer); window.removeEventListener("storage", load); window.removeEventListener(APPOINTMENT_STORAGE_EVENT, load); };
  }, []);

  const available = useMemo(() => invitation?.slots.filter((slot) => {
    if (invitation.selectedSlotId === slot.id && invitation.status === "confirmed") return true;
    return isSlotAvailable(slot, invitations.filter((item) => item.id !== invitation.id));
  }) ?? [], [invitation, invitations]);

  const update = (status: "confirmed" | "declined") => {
    if (!invitation || invitation.status !== "pending") return;
    if (status === "confirmed" && invitation.mode === "proposal") {
      const chosen = invitation.slots.find((slot) => slot.id === chosenId);
      if (!chosen || !isSlotAvailable(chosen, invitations.filter((item) => item.id !== invitation.id))) { load(); return; }
    }
    const next = invitations.map((item) => item.id === invitation.id ? { ...item, status, selectedSlotId: status === "confirmed" ? (invitation.mode === "direct" ? invitation.slots[0]?.id : chosenId) : item.selectedSlotId } : item);
    writeInvitations(next);
    setInvitations(next);
  };

  if (!ready) return <Shell><p className="text-sm text-text-muted">{es ? "Cargando invitación…" : "Loading invitation…"}</p></Shell>;
  if (!invitation) return <Shell><Result title={es ? "Invitación no disponible" : "Invitation unavailable"} detail={es ? "Este enlace solo funciona en el navegador donde se creó la demostración." : "This link only works in the browser where the demo was created."} /></Shell>;

  if (invitation.status !== "pending") {
    const result = {
      confirmed: [es ? "Cita confirmada" : "Appointment confirmed", es ? "El horario quedó reservado. La empresa ya puede ver tu respuesta." : "The time is reserved. The company can now see your response."],
      declined: [es ? "Invitación rechazada" : "Invitation declined", es ? "Informamos a la empresa y liberamos el horario." : "The company has been notified and the time was released."],
      expired: [es ? "La invitación venció" : "Invitation expired", es ? "Solicita a la empresa una nueva lista de opciones." : "Ask the company for a new list of options."],
      cancelled: [es ? "Cita cancelada" : "Appointment cancelled", es ? "La empresa canceló esta invitación." : "The company cancelled this invitation."],
    }[invitation.status];
    return <Shell><Result title={result[0]} detail={result[1]}>{invitation.status === "confirmed" ? <p className="mt-4 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm font-semibold text-accent-strong">{formatSlot(invitation.slots.find((slot) => slot.id === invitation.selectedSlotId) ?? invitation.slots[0], locale)}</p> : null}</Result></Shell>;
  }

  return <Shell><div className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-7">
    <div className="mb-6 flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Cirix · {es ? "Invitación de cita" : "Appointment invitation"}</p><h1 className="mt-2 font-heading text-2xl font-semibold text-text">{invitation.subject}</h1><p className="mt-2 text-sm text-text-muted">{es ? `Hola ${invitation.customerName}, revisa los detalles de tu cita.` : `Hi ${invitation.customerName}, review your appointment details.`}</p></div><span className="rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-[10px] font-semibold uppercase text-accent-strong">Demo</span></div>
    {invitation.notes ? <p className="mb-5 rounded-xl border border-border bg-bg p-4 text-sm leading-6 text-text-muted">{invitation.notes}</p> : null}
    {invitation.mode === "direct" ? <div><p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{es ? "Horario propuesto" : "Proposed time"}</p><p className="mt-2 rounded-xl border border-accent/30 bg-accent-soft p-4 font-semibold text-accent-strong">{formatSlot(invitation.slots[0], locale)}</p><div className="mt-6 grid gap-2 sm:grid-cols-2"><button className={`${button} border border-border bg-bg text-text hover:border-border/70`} type="button" onClick={() => update("declined")}>{es ? "Rechazar" : "Decline"}</button><button className={`${button} bg-action-fill text-on-action hover:bg-action-600`} type="button" onClick={() => update("confirmed")}>{es ? "Aceptar cita" : "Accept appointment"}</button></div></div> : <div><p className="text-sm text-text-muted">{es ? "Selecciona una opción disponible. La invitación vence 72 horas después de su envío." : "Choose one available option. The invitation expires 72 hours after it is sent."}</p><div className="mt-4 space-y-2">{invitation.slots.map((slot) => { const open = available.some((item) => item.id === slot.id); return <button key={slot.id} disabled={!open} type="button" onClick={() => setChosenId(slot.id)} className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-4 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-300 ${chosenId === slot.id ? "border-action bg-action-soft text-text" : open ? "border-border bg-bg text-text hover:border-accent" : "cursor-not-allowed border-border/50 bg-bg/40 text-text-muted/45 line-through"}`}><span>{formatSlot(slot, locale)}</span><span className="text-xs">{open ? (chosenId === slot.id ? "✓" : "○") : (es ? "Ocupado" : "Taken")}</span></button>; })}</div>{available.length === 0 ? <p className="mt-3 text-sm text-action-300">{es ? "Ninguna opción sigue disponible. Solicita nuevos horarios." : "No option is still available. Request new times."}</p> : null}<button className={`${button} mt-5 w-full bg-action-fill text-on-action hover:bg-action-600`} disabled={!chosenId} type="button" onClick={() => update("confirmed")}>{es ? "Confirmar horario" : "Confirm time"}</button></div>}
    <p className="mt-6 border-t border-border pt-4 text-xs text-text-muted">{es ? "Todos los horarios se muestran en la zona America/New_York (Florida)." : "All times are shown in the America/New_York (Florida) time zone."}</p>
  </div></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) { return <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10 text-text"><div className="w-full max-w-xl">{children}</div></main>; }
function Result({ title, detail, children }: { title: string; detail: string; children?: React.ReactNode }) { return <div className="rounded-2xl border border-border bg-surface p-7 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-accent/30 bg-accent-soft text-xl text-accent">✓</div><h1 className="mt-4 font-heading text-2xl font-semibold">{title}</h1><p className="mt-2 text-sm leading-6 text-text-muted">{detail}</p>{children}</div>; }
