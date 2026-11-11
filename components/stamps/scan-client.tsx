"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick, type Locale } from "@/lib/locale";
import type { StampCardDto } from "@/modules/stamp-card/application/dtos/stamp-card-dto";
import { QrScanner } from "./qr-scanner";

type Action = "preview" | "stamp" | "redeem";

type Scanned = { firstName: string; card: StampCardDto };

type Phase =
  | { kind: "scanning" }
  | { kind: "loading" }
  | { kind: "preview"; scanned: Scanned }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

type ApiError = { code?: string; retryAfterSeconds?: number };

const BUTTON =
  "min-h-12 w-full rounded-pill px-5 py-3 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50";

/** Plain-language reason for each failure, so staff know what to do next. */
function explain(error: ApiError | undefined, locale: Locale): string {
  switch (error?.code) {
    case "stamps/expired-token":
      return pick(locale, { es: "El código venció. Pídele al cliente que lo actualice y vuelve a escanear.", en: "The code expired. Ask the customer to refresh it and scan again." });
    case "stamps/invalid-token":
      return pick(locale, { es: "Este código no es válido para este negocio.", en: "This code isn't valid for this business." });
    case "stamps/not-a-customer":
      return pick(locale, { es: "Esta persona no está registrada en tu negocio.", en: "This person isn't registered at your business." });
    case "stamps/too-soon": {
      const minutes = Math.max(1, Math.ceil((error.retryAfterSeconds ?? 60) / 60));
      return pick(locale, { es: `Ya se registró una visita hace poco. Próxima en ${minutes} min.`, en: `A visit was already recorded a moment ago. Next one in ${minutes} min.` });
    }
    case "stamps/reward-pending":
      return pick(locale, { es: "La tarjeta está completa: canjea el premio antes de registrar más visitas.", en: "The card is complete: redeem the reward before recording more visits." });
    case "stamps/no-reward":
      return pick(locale, { es: "Esta tarjeta no tiene un premio por canjear.", en: "This card has no reward to redeem." });
    case "stamps/inactive":
      return pick(locale, { es: "El programa de visitas está en pausa.", en: "The visit program is paused." });
    case "stamps/misconfigured":
      return pick(locale, { es: "El servicio de visitas no está configurado. Avisa al administrador.", en: "The visit service isn't configured. Tell your administrator." });
    default:
      return pick(locale, { es: "No se pudo completar la acción. Intenta de nuevo.", en: "The action couldn't be completed. Please try again." });
  }
}

/**
 * The counter screen for staff: scan the customer's QR, see who it is and what
 * can be done, then confirm. Nothing changes until staff tap Stamp or Redeem,
 * so an accidental scan never adds a stamp.
 */
export function ScanClient({ slug }: { slug: string }) {
  const locale = useLocale();
  const [phase, setPhase] = useState<Phase>({ kind: "scanning" });
  const [manual, setManual] = useState("");
  const token = useRef("");

  const call = useCallback(
    async (action: Action): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error?: ApiError }> => {
      try {
        const response = await fetch(`/api/member/biz/${encodeURIComponent(slug)}/scan/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.current }),
        });
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: ApiError };
        return response.ok ? { ok: true, data: body } : { ok: false, error: body.error };
      } catch {
        return { ok: false };
      }
    },
    [slug]
  );

  const review = useCallback(
    async (text: string) => {
      token.current = text.trim();
      setPhase({ kind: "loading" });
      const result = await call("preview");
      setPhase(
        result.ok
          ? { kind: "preview", scanned: { firstName: String(result.data.firstName), card: result.data.card as StampCardDto } }
          : { kind: "error", message: explain(result.error, locale) }
      );
    },
    [call, locale]
  );

  async function act(action: "stamp" | "redeem") {
    setPhase({ kind: "loading" });
    const result = await call(action);
    if (!result.ok) {
      setPhase({ kind: "error", message: explain(result.error, locale) });
      return;
    }
    const { firstName, card } = result.data as { firstName: string; card: StampCardDto };
    const unlocked = Boolean(result.data.rewardUnlocked);
    setPhase({
      kind: "done",
      message:
        action === "redeem"
          ? pick(locale, { es: `Premio entregado a ${firstName}. Su tarjeta volvió a empezar.`, en: `Reward given to ${firstName}. Their card started over.` })
          : unlocked
            ? pick(locale, { es: `¡Tarjeta completa! ${firstName} ganó: ${card.rewardName}. Canjéalo ahora.`, en: `Card complete! ${firstName} earned: ${card.rewardName}. Redeem it now.` })
            : pick(locale, { es: `Visita registrada para ${firstName}: ${card.stamps} de ${card.required}.`, en: `Visit recorded for ${firstName}: ${card.stamps} of ${card.required}.` }),
    });
  }

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (manual.trim()) void review(manual);
    setManual("");
  }

  const reset = () => setPhase({ kind: "scanning" });

  return (
    <div className="flex flex-col gap-5">
      {phase.kind === "scanning" && (
        <>
          <QrScanner active onDetect={review} />
          <p className="text-center text-label text-text-muted">
            {pick(locale, { es: "Apunta la cámara al código QR del cliente.", en: "Point the camera at the customer's QR code." })}
          </p>
        </>
      )}

      {phase.kind === "loading" && (
        <p role="status" className="py-10 text-center text-body text-text-muted">
          {pick(locale, { es: "Un momento…", en: "One moment…" })}
        </p>
      )}

      {phase.kind === "preview" && (
        <section className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5" aria-live="polite">
          <div className="flex flex-col gap-1 text-center">
            <p className="text-display font-bold text-text">{phase.scanned.firstName}</p>
            <p className="text-body text-text-muted">
              {phase.scanned.card.rewardReady
                ? pick(locale, { es: `Premio listo: ${phase.scanned.card.rewardName}`, en: `Reward ready: ${phase.scanned.card.rewardName}` })
                : pick(locale, { es: `${phase.scanned.card.stamps} de ${phase.scanned.card.required} visitas`, en: `${phase.scanned.card.stamps} of ${phase.scanned.card.required} visits` })}
            </p>
            {!phase.scanned.card.canStamp && !phase.scanned.card.rewardReady && phase.scanned.card.retryAfterSeconds > 0 && (
              <p className="text-label text-text-muted">
                {pick(locale, {
                  es: `Ya se registró una visita hace poco. Próxima en ${Math.ceil(phase.scanned.card.retryAfterSeconds / 60)} min.`,
                  en: `A visit was already recorded a moment ago. Next one in ${Math.ceil(phase.scanned.card.retryAfterSeconds / 60)} min.`,
                })}
              </p>
            )}
            {!phase.scanned.card.active && (
              <p className="text-label text-text-muted">{pick(locale, { es: "El programa está en pausa.", en: "The program is paused." })}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void act("stamp")}
            disabled={!phase.scanned.card.canStamp}
            className={`${BUTTON} bg-accent-fill text-on-accent hover:bg-accent-fill-strong`}
          >
            {pick(locale, { es: "Registrar visita", en: "Record visit" })}
          </button>
          <button
            type="button"
            onClick={() => void act("redeem")}
            disabled={!phase.scanned.card.canRedeem}
            className={`${BUTTON} border border-border bg-surface text-text hover:bg-stone-100`}
          >
            {pick(locale, { es: "Canjear premio", en: "Redeem reward" })}
          </button>
          <button type="button" onClick={reset} className="min-h-11 text-label text-text-muted underline underline-offset-4">
            {pick(locale, { es: "Cancelar", en: "Cancel" })}
          </button>
        </section>
      )}

      {(phase.kind === "done" || phase.kind === "error") && (
        <section className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 text-center" role={phase.kind === "error" ? "alert" : "status"}>
          <p className="text-body font-medium text-text">{phase.message}</p>
          <button type="button" onClick={reset} className={`${BUTTON} bg-accent-fill text-on-accent hover:bg-accent-fill-strong`}>
            {pick(locale, { es: "Escanear a otro cliente", en: "Scan another customer" })}
          </button>
        </section>
      )}

      <details className="text-label text-text-muted">
        <summary className="cursor-pointer text-center underline underline-offset-4">
          {pick(locale, { es: "¿No funciona la cámara? Ingresar código a mano", en: "Camera not working? Enter the code by hand" })}
        </summary>
        <form onSubmit={submitManual} className="mt-3 flex flex-col gap-2">
          <label htmlFor="manual-code" className="font-medium text-text">
            {pick(locale, { es: "Código del cliente", en: "Customer code" })}
          </label>
          <input
            id="manual-code"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-3 text-body text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent"
          />
          <button type="submit" className={`${BUTTON} border border-border bg-surface text-text hover:bg-stone-100`}>
            {pick(locale, { es: "Revisar código", en: "Check code" })}
          </button>
        </form>
      </details>
    </div>
  );
}
