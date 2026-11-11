"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import { readScannedTableQr } from "@/lib/stamps/table-qr";
import type { StampCardDto } from "@/modules/stamp-card/application/dtos/stamp-card-dto";
import { ReceiptScanner } from "@/components/receipts/receipt-scanner";
import { QrScanner } from "./qr-scanner";
import { RotatingQr } from "./rotating-qr";
import s from "./stamp-card.module.css";

/** How often an open card checks for a new stamp, so the animation plays at the counter. */
const POLL_MS = 5_000;

/** Errors that another tap cannot fix, so the button is not offered again. */
const FINAL_CLAIM_ERRORS = new Set(["stamps/too-soon", "stamps/reward-pending", "stamps/invalid-table-code", "stamps/table-disabled", "stamps/inactive"]);

type ClaimState = { kind: "idle" | "loading" | "done" } | { kind: "error"; text: string; retry: boolean };

/**
 * The customer's card: stamps, progress, the reward, and the personal QR. While
 * the page is open it checks for changes every few seconds, so when staff stamp
 * the card the new stamp lands on screen with an animation, and a completed
 * card celebrates. Opened from the table QR (`tableCode`), it also offers a
 * button to stamp this visit. Where the business gives stamps at the table, the
 * customer scans the table QR from here, and where it accepts receipts they
 * photograph theirs. In both cases their own code only shows to redeem a reward.
 */
export function StampCardView({
  slug,
  businessName,
  initial,
  tableCode = null,
  receipts = false,
}: {
  slug: string;
  businessName: string;
  initial: StampCardDto;
  tableCode?: string | null;
  /** The business earns stamps from receipts. */
  receipts?: boolean;
}) {
  const locale = useLocale();
  const [card, setCard] = useState(initial);
  const [popIndex, setPopIndex] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [claim, setClaim] = useState<ClaimState>({ kind: "idle" });
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const previous = useRef(initial);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Shows a newer card, animating whatever changed since the last one. */
  const show = useCallback((next: StampCardDto) => {
    const before = previous.current;
    previous.current = next;
    setCard(next);
    if (next.totalStamps > before.totalStamps) {
      setPopIndex(Math.max(0, next.stamps - 1));
      timers.current.push(setTimeout(() => setPopIndex(null), 1500));
      if (next.rewardReady && !before.rewardReady) {
        setCelebrating(true);
        timers.current.push(setTimeout(() => setCelebrating(false), 3600));
      }
    }
    if (next.redeemedCount > before.redeemedCount) {
      setRedeemed(true);
      timers.current.push(setTimeout(() => setRedeemed(false), 6000));
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/member/businesses/${encodeURIComponent(slug)}/card`, { cache: "no-store" });
      if (response.ok) show(((await response.json()) as { card: StampCardDto }).card);
    } catch {
      // A missed check is harmless: the next one catches up.
    }
  }, [slug, show]);

  useEffect(() => {
    const pending = timers.current;

    async function poll() {
      if (document.visibilityState === "visible") await refresh();
    }

    const interval = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(interval);
      pending.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [refresh]);

  async function claimTableStamp(code: string | null = tableCode) {
    if (code === null || claim.kind === "loading") return;
    setClaim({ kind: "loading" });
    try {
      const response = await fetch(`/api/member/businesses/${encodeURIComponent(slug)}/table-stamp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        card?: StampCardDto;
        error?: { code?: string; retryAfterSeconds?: number };
      };
      if (response.ok && body.card) {
        show(body.card);
        setClaim({ kind: "done" });
        // The code stays out of the address bar, so a reload does not offer the button again.
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }
      const known = body.error?.code !== undefined && FINAL_CLAIM_ERRORS.has(body.error.code);
      setClaim({ kind: "error", text: claimErrorText(body.error?.code, body.error?.retryAfterSeconds), retry: !known });
    } catch {
      setClaim({ kind: "error", text: pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }), retry: true });
    }
  }

  function onScan(text: string) {
    setScanning(false);
    const code = readScannedTableQr(text, slug, window.location.origin);
    if (code === null) {
      setScanError(pick(locale, { es: "Ese no es el QR de la mesa de este local. Intenta de nuevo.", en: "That isn't this place's table QR. Try again." }));
      return;
    }
    setScanError(null);
    void claimTableStamp(code);
  }

  function claimErrorText(code: string | undefined, retryAfterSeconds: number | undefined): string {
    switch (code) {
      case "stamps/too-soon":
        return pick(locale, {
          es: `Ya registraste una visita hace poco. La próxima estará disponible en ${Math.ceil((retryAfterSeconds ?? 60) / 60)} min.`,
          en: `You recorded a visit recently. The next one will be available in ${Math.ceil((retryAfterSeconds ?? 60) / 60)} min.`,
        });
      case "stamps/reward-pending":
        return pick(locale, { es: "Tu premio ya está listo: canjéalo antes de sumar más visitas.", en: "Your reward is ready: redeem it before collecting more visits." });
      case "stamps/invalid-table-code":
        return pick(locale, { es: "Este QR ya no es válido. Pide al personal que registre tu visita.", en: "This QR is no longer valid. Ask the staff to record your visit." });
      case "stamps/table-disabled":
        return pick(locale, { es: "Aquí las visitas se registran en caja: muestra tu código al personal.", en: "Visits are recorded at the counter here: show your code to the staff." });
      case "stamps/inactive":
        return pick(locale, { es: "El programa está en pausa por ahora.", en: "The program is paused for now." });
      default:
        return pick(locale, { es: "No pudimos registrar la visita. Intenta de nuevo.", en: "We couldn't record the visit. Please try again." });
    }
  }

  const waitMinutes = Math.ceil(card.retryAfterSeconds / 60);
  const offerTableStamp = tableCode !== null && claim.kind !== "done" && (card.canStamp || claim.kind === "error");
  // At a table-stamp business the customer scans; their own code is only for redeeming.
  const selfService = (card.tableStamps || receipts) && card.active && !card.rewardReady;
  const offerScan = card.tableStamps && selfService && tableCode === null && claim.kind !== "done";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-display font-bold tracking-tight text-text">{businessName}</h1>
        <p className="text-body text-text-muted">
          {pick(locale, { es: "Premio: ", en: "Reward: " })}
          <strong className="font-medium text-text">{card.rewardName}</strong>
        </p>
      </header>

      {offerTableStamp && (
        <section aria-label={pick(locale, { es: "Registrar esta visita", en: "Record this visit" })} className="flex flex-col gap-2">
          {(claim.kind !== "error" || claim.retry) && (
            <button
              type="button"
              onClick={() => void claimTableStamp()}
              disabled={claim.kind === "loading"}
              className="min-h-11 w-full rounded-pill bg-accent-fill px-5 py-3 text-label font-medium text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60"
            >
              {claim.kind === "loading"
                ? pick(locale, { es: "Sumando...", en: "Adding..." })
                : pick(locale, { es: "Registrar esta visita", en: "Record this visit" })}
            </button>
          )}
          {claim.kind === "error" && (
            <p role="alert" className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-label text-text">
              {claim.text}
            </p>
          )}
        </section>
      )}
      {receipts && card.active && !card.rewardReady && (
        <ReceiptScanner slug={slug} onScanned={refresh} />
      )}
      {offerScan && (
        <section aria-label={pick(locale, { es: "Escanear el QR de la mesa", en: "Scan the table QR" })} className="flex flex-col gap-3">
          {scanning ? (
            <>
              <QrScanner active={scanning} onDetect={onScan}
                label={pick(locale, { es: "Cámara para escanear el QR de la mesa", en: "Camera to scan the table QR" })} />
              <button type="button" onClick={() => setScanning(false)} className="min-h-11 w-full rounded-pill border border-border bg-surface px-5 py-3 text-label font-medium text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
                {pick(locale, { es: "Cancelar", en: "Cancel" })}
              </button>
            </>
          ) : (
            <button type="button" disabled={claim.kind === "loading"} className="min-h-11 w-full rounded-pill bg-accent-fill px-5 py-3 text-label font-medium text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60"
              onClick={() => { setScanError(null); setClaim({ kind: "idle" }); setScanning(true); }}>
              {claim.kind === "loading"
                ? pick(locale, { es: "Sumando...", en: "Adding..." })
                : pick(locale, { es: "Escanear el QR de la mesa", en: "Scan the table QR" })}
            </button>
          )}
          {scanError && <p role="alert" className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-label text-text">{scanError}</p>}
          {claim.kind === "error" && <p role="alert" className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-label text-text">{claim.text}</p>}
        </section>
      )}
      {claim.kind === "done" && (
        <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-center text-body font-medium text-accent-strong">
          {pick(locale, { es: "¡Visita registrada! Gracias por venir.", en: "Visit recorded! Thanks for coming." })}
        </p>
      )}

      <section
        aria-label={pick(locale, { es: "Tu tarjeta de visitas", en: "Your visit card" })}
        className={`flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 ${celebrating ? s.celebrate : ""}`}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-label font-medium text-text">{pick(locale, { es: "Visitas", en: "Visits" })}</span>
          <span className="text-body font-bold text-text">
            {card.stamps} / {card.required}
          </span>
        </div>

        <ol className="flex flex-wrap justify-center gap-3" aria-hidden="true">
          {Array.from({ length: card.required }, (_, index) => {
            const filled = index < card.stamps;
            return (
              <li
                key={index}
                className={`flex size-11 items-center justify-center rounded-full border-2 text-lg font-bold ${
                  filled
                    ? `border-accent-fill bg-accent-fill text-on-accent ${popIndex === index ? s.pop : ""}`
                    : "border-dashed border-border text-text-muted"
                }`}
              >
                {filled ? "★" : index + 1}
              </li>
            );
          })}
        </ol>

        {/* Screen readers hear changes without having to find them. */}
        <p className="sr-only" role="status" aria-live="polite">
          {pick(locale, {
            es: `${card.stamps} de ${card.required} visitas.${card.rewardReady ? " Premio listo." : ""}`,
            en: `${card.stamps} of ${card.required} visits.${card.rewardReady ? " Reward ready." : ""}`,
          })}
        </p>

        {card.rewardReady && (
          <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-center text-body font-medium text-accent-strong">
            {pick(locale, {
              es: `¡Premio listo! Muestra tu código en caja para canjear: ${card.rewardName}.`,
              en: `Reward ready! Show your code at the counter to redeem: ${card.rewardName}.`,
            })}
          </p>
        )}
        {redeemed && (
          <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-center text-body font-medium text-accent-strong">
            {pick(locale, { es: "¡Premio canjeado! Tu tarjeta volvió a empezar.", en: "Reward redeemed! Your card started over." })}
          </p>
        )}
        {!card.active && (
          <p className="text-center text-label text-text-muted">
            {pick(locale, { es: "El programa está en pausa por ahora.", en: "The program is paused for now." })}
          </p>
        )}
        {card.active && !card.rewardReady && waitMinutes > 0 && (
          <p className="text-center text-caption text-text-muted">
            {pick(locale, {
              es: `Tu próxima visita se podrá registrar en ${waitMinutes} min.`,
              en: `Your next visit can be recorded in ${waitMinutes} min.`,
            })}
          </p>
        )}
      </section>

      {!selfService && (
        <section aria-label={pick(locale, { es: "Tu código", en: "Your code" })} className="flex flex-col items-center gap-3">
          <h2 className="text-body font-medium text-text">
            {card.rewardReady
              ? pick(locale, { es: "Muéstralo para canjear tu premio", en: "Show it to redeem your reward" })
              : pick(locale, { es: "Muéstralo en caja para registrar tu visita", en: "Show it at the counter to record your visit" })}
          </h2>
          <RotatingQr slug={slug} />
        </section>
      )}
    </div>
  );
}
