"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";

const SECTION = "flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5";
const BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-pill px-5 py-2 text-label font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60";
const QUIET = `${BUTTON} border border-border bg-surface text-text hover:bg-stone-100`;

type Change = { status: "active" | "suspended" } | { receiptDemo: boolean };
type Pending = "demo" | "status" | null;

/**
 * The two switches only Cirix may flip: receipt demo mode and the business's
 * status. Each asks for a second click that says exactly what will happen,
 * because both change what every customer of the business can do.
 */
export function BusinessAdminActions({
  slug,
  businessName,
  status,
  demoMode,
  storeNames,
}: {
  slug: string;
  businessName: string;
  status: "active" | "suspended";
  demoMode: boolean;
  storeNames: string[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState<Pending>(null);
  const [busy, setBusy] = useState<Pending>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function apply(which: Exclude<Pending, null>, change: Change, done: string) {
    setBusy(which);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/businesses/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
      if (response.ok) {
        setMessage({ kind: "ok", text: done });
        setConfirming(null);
        router.refresh();
      } else {
        setMessage({ kind: "error", text: pick(locale, { es: "No se pudo guardar. Intenta de nuevo.", en: "Could not save. Please try again." }) });
      }
    } catch {
      setMessage({ kind: "error", text: pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }) });
    }
    setBusy(null);
  }

  const receiptsName = storeNames.length > 0 ? storeNames.join(", ") : businessName;
  const suspended = status === "suspended";

  return (
    <>
      <section aria-labelledby="receipt-demo" className={SECTION}>
        <div className="flex flex-col gap-1">
          <h2 id="receipt-demo" className="text-title font-semibold text-text">{pick(locale, { es: "Recibos: modo demostración", en: "Receipts: demo mode" })}</h2>
          {demoMode ? (
            <p className="text-label text-text">
              {pick(locale, {
                es: "Encendido. Se acepta cualquier recibo, de cualquier tienda, las veces que sea, sin monto máximo ni límite diario. Sirve para mostrar la app; nunca para un negocio con clientes reales.",
                en: "On. Any receipt from any store is accepted, as often as wanted, with no top amount or daily limit. It is for showing the app; never for a business with real customers.",
              })}
            </p>
          ) : (
            <p className="text-label text-text">
              {pick(locale, {
                es: `Apagado. Solo cuentan los recibos de este negocio: el recibo debe decir "${receiptsName}" o traer su código de comercio, con todas las protecciones activas.`,
                en: `Off. Only this business's receipts count: the receipt must say "${receiptsName}" or carry its merchant ID, with every protection on.`,
              })}
            </p>
          )}
          {demoMode && storeNames.length === 0 && (
            <p className="text-caption text-text-muted">
              {pick(locale, {
                es: `Al apagarlo, se buscará "${businessName}" en el recibo. Si el recibo trae otro nombre o la dirección, el dueño debe escribirlo en Recibos, en su panel.`,
                en: `Once off, the receipt is checked for "${businessName}". If receipts show another name or the address, the owner must enter it under Receipts in their panel.`,
              })}
            </p>
          )}
        </div>
        {confirming === "demo" ? (
          <div className="flex flex-col gap-3 rounded-xl bg-stone-100 p-4">
            <p className="text-label font-medium text-text">
              {demoMode
                ? pick(locale, { es: "¿Apagar el modo demostración? Desde ahora solo cuentan los recibos de este negocio.", en: "Turn demo mode off? From now on only this business's receipts count." })
                : pick(locale, { es: "¿Encender el modo demostración? Se apagan todas las protecciones contra trampas.", en: "Turn demo mode on? Every protection against cheating goes off." })}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy !== null}
                onClick={() => apply("demo", { receiptDemo: !demoMode }, demoMode
                  ? pick(locale, { es: "Modo demostración apagado.", en: "Demo mode is off." })
                  : pick(locale, { es: "Modo demostración encendido.", en: "Demo mode is on." }))}
                className={`${BUTTON} bg-accent-fill text-on-accent hover:bg-accent-fill-strong`}>
                {busy === "demo"
                  ? pick(locale, { es: "Guardando…", en: "Saving…" })
                  : demoMode
                    ? pick(locale, { es: "Sí, apagarlo", en: "Yes, turn it off" })
                    : pick(locale, { es: "Sí, encenderlo", en: "Yes, turn it on" })}
              </button>
              <button type="button" disabled={busy !== null} onClick={() => setConfirming(null)} className={QUIET}>
                {pick(locale, { es: "Cancelar", en: "Cancel" })}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" disabled={busy !== null} onClick={() => { setMessage(null); setConfirming("demo"); }} className={`${QUIET} self-start`}>
            {demoMode
              ? pick(locale, { es: "Apagar modo demostración", en: "Turn demo mode off" })
              : pick(locale, { es: "Encender modo demostración", en: "Turn demo mode on" })}
          </button>
        )}
      </section>

      <section aria-labelledby="business-status" className={SECTION}>
        <div className="flex flex-col gap-1">
          <h2 id="business-status" className="text-title font-semibold text-text">
            {suspended ? pick(locale, { es: "Negocio suspendido", en: "Business suspended" }) : pick(locale, { es: "Suspender el negocio", en: "Suspend the business" })}
          </h2>
          <p className="text-label text-text">
            {suspended
              ? pick(locale, {
                  es: "Sus clientes y su equipo no pueden usarlo. Todos sus datos siguen guardados: al reactivarlo, todo vuelve como estaba.",
                  en: "Its customers and team cannot use it. All its data is kept: when reactivated, everything is back as it was.",
                })
              : pick(locale, {
                  es: "Por ejemplo, si deja de pagar o termina el contrato. Sus clientes y su equipo dejan de poder usarlo, pero no se borra nada y se puede reactivar.",
                  en: "For example, if it stops paying or the contract ends. Its customers and team can no longer use it, but nothing is deleted and it can be reactivated.",
                })}
          </p>
        </div>
        {confirming === "status" ? (
          <div className="flex flex-col gap-3 rounded-xl bg-stone-100 p-4">
            <p className="text-label font-medium text-text">
              {suspended
                ? pick(locale, { es: `¿Reactivar ${businessName}?`, en: `Reactivate ${businessName}?` })
                : pick(locale, { es: `¿Suspender ${businessName}? Sus clientes y su equipo pierden el acceso al momento.`, en: `Suspend ${businessName}? Its customers and team lose access at once.` })}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy !== null}
                onClick={() => apply("status", { status: suspended ? "active" : "suspended" }, suspended
                  ? pick(locale, { es: "El negocio está activo otra vez.", en: "The business is active again." })
                  : pick(locale, { es: "El negocio quedó suspendido.", en: "The business is suspended." }))}
                className={`${BUTTON} ${suspended ? "bg-accent-fill text-on-accent hover:bg-accent-fill-strong" : "bg-danger text-on-danger hover:opacity-90"}`}>
                {busy === "status"
                  ? pick(locale, { es: "Guardando…", en: "Saving…" })
                  : suspended
                    ? pick(locale, { es: "Sí, reactivarlo", en: "Yes, reactivate it" })
                    : pick(locale, { es: "Sí, suspenderlo", en: "Yes, suspend it" })}
              </button>
              <button type="button" disabled={busy !== null} onClick={() => setConfirming(null)} className={QUIET}>
                {pick(locale, { es: "Cancelar", en: "Cancel" })}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" disabled={busy !== null} onClick={() => { setMessage(null); setConfirming("status"); }}
            className={`${QUIET} self-start ${suspended ? "" : "text-danger"}`}>
            {suspended ? pick(locale, { es: "Reactivar negocio", en: "Reactivate business" }) : pick(locale, { es: "Suspender negocio", en: "Suspend business" })}
          </button>
        )}
      </section>

      <p role="status" aria-live="polite" className={`text-label ${message?.kind === "error" ? "text-danger" : "text-text-muted"}`}>
        {message?.text}
      </p>
    </>
  );
}
