"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/components/locale-provider";
import { QrScanner } from "@/components/stamps/qr-scanner";
import { pick, type Locale } from "@/lib/locale";
import type { RedemptionPreviewDto } from "@/modules/receipts/application/dtos/reward-dtos";

type Phase =
  | { kind: "scanning" }
  | { kind: "loading" }
  | { kind: "preview"; redemption: RedemptionPreviewDto }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

const BUTTON =
  "min-h-12 w-full rounded-pill px-5 py-3 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50";

/** Plain-language reason for each failure, so staff know what to tell the customer. */
function explain(code: string | undefined, locale: Locale): string {
  switch (code) {
    case "rewards/invalid-code":
      return pick(locale, { es: "Eso no es un código de premio. Revísalo e intenta de nuevo.", en: "That isn't a reward code. Check it and try again." });
    case "rewards/code-not-found":
      return pick(locale, { es: "Este código no existe en este negocio. No entregues el premio.", en: "This code doesn't exist at this business. Don't hand over the reward." });
    case "rewards/already-delivered":
      return pick(locale, { es: "Este premio ya se entregó. No lo entregues otra vez.", en: "This reward was already handed over. Don't give it again." });
    case "rewards/cancelled":
      return pick(locale, { es: "El cliente canceló este código y sus puntos volvieron a su saldo.", en: "The customer cancelled this code and their points went back." });
    case "rewards/expired":
      return pick(locale, { es: "Este código venció y los puntos volvieron a su saldo. El cliente puede generar otro.", en: "This code expired and the points went back. The customer can create another." });
    default:
      return pick(locale, { es: "No se pudo completar la acción. Intenta de nuevo.", en: "The action couldn't be completed. Please try again." });
  }
}

/**
 * The counter screen in a supermarket: scan the customer's prize code, see the
 * person and the prize, then confirm. Nothing changes until staff tap deliver,
 * and the points already left when the customer made the code: staff never
 * choose how many to take.
 */
export function RedemptionScanClient({ slug }: { slug: string }) {
  const locale = useLocale();
  const [phase, setPhase] = useState<Phase>({ kind: "scanning" });
  const [manual, setManual] = useState("");
  const code = useRef("");

  const call = useCallback(
    async (action: "preview" | "deliver"): Promise<{ ok: true; redemption: RedemptionPreviewDto } | { ok: false; code?: string }> => {
      try {
        const response = await fetch(`/api/member/biz/${encodeURIComponent(slug)}/redemptions/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.current }),
        });
        const body = (await response.json().catch(() => ({}))) as { redemption?: RedemptionPreviewDto; error?: { code?: string } };
        return response.ok && body.redemption ? { ok: true, redemption: body.redemption } : { ok: false, code: body.error?.code };
      } catch {
        return { ok: false };
      }
    },
    [slug]
  );

  const review = useCallback(
    async (text: string) => {
      code.current = text.trim();
      setPhase({ kind: "loading" });
      const result = await call("preview");
      setPhase(result.ok ? { kind: "preview", redemption: result.redemption } : { kind: "error", message: explain(result.code, locale) });
    },
    [call, locale]
  );

  async function deliver() {
    setPhase({ kind: "loading" });
    const result = await call("deliver");
    setPhase(
      result.ok
        ? {
            kind: "done",
            message: pick(locale, {
              es: `Listo. Entrégale a ${result.redemption.firstName}: ${result.redemption.rewardName}.`,
              en: `Done. Hand ${result.redemption.firstName} their reward: ${result.redemption.rewardName}.`,
            }),
          }
        : { kind: "error", message: explain(result.code, locale) }
    );
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
          <QrScanner active onDetect={review} label={pick(locale, { es: "Cámara para escanear el código del premio", en: "Camera to scan the reward code" })} />
          <p className="text-center text-label text-text-muted">
            {pick(locale, { es: "Apunta la cámara al código de premio del cliente.", en: "Point the camera at the customer's reward code." })}
          </p>
        </>
      )}

      {phase.kind === "loading" && (
        <p role="status" className="py-10 text-center text-body text-text-muted">{pick(locale, { es: "Un momento…", en: "One moment…" })}</p>
      )}

      {phase.kind === "preview" && (
        <section className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5" aria-live="polite">
          <div className="flex flex-col gap-1 text-center">
            <p className="text-display font-bold text-text">{phase.redemption.firstName}</p>
            <p className="text-body font-medium text-text">{phase.redemption.rewardName}</p>
            <p className="text-label text-text-muted">
              {pick(locale, {
                es: `Ya pagó ${new Intl.NumberFormat(locale).format(phase.redemption.points)} puntos.`,
                en: `Already paid ${new Intl.NumberFormat(locale).format(phase.redemption.points)} points.`,
              })}
            </p>
          </div>
          <button type="button" onClick={() => void deliver()} className={`${BUTTON} bg-accent-fill text-on-accent hover:bg-accent-fill-strong`}>
            {pick(locale, { es: "Confirmar entrega", en: "Confirm handover" })}
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
            {pick(locale, { es: "Escanear otro código", en: "Scan another code" })}
          </button>
        </section>
      )}

      <details className="text-label text-text-muted">
        <summary className="cursor-pointer text-center underline underline-offset-4">
          {pick(locale, { es: "¿No funciona la cámara? Ingresar código a mano", en: "Camera not working? Enter the code by hand" })}
        </summary>
        <form onSubmit={submitManual} className="mt-3 flex flex-col gap-2">
          <label htmlFor="manual-reward-code" className="font-medium text-text">{pick(locale, { es: "Código del premio", en: "Reward code" })}</label>
          <input
            id="manual-reward-code"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABCD-EFGH"
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
