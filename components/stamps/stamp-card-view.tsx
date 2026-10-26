"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import type { StampCardDto } from "@/modules/stamp-card/application/dtos/stamp-card-dto";
import { RotatingQr } from "./rotating-qr";
import s from "./stamp-card.module.css";

/** How often an open card checks for a new stamp, so the animation plays at the counter. */
const POLL_MS = 5_000;

/**
 * The customer's card: stamps, progress, the reward, and the personal QR. While
 * the page is open it checks for changes every few seconds, so when staff stamp
 * the card the new stamp lands on screen with an animation, and a completed
 * card celebrates.
 */
export function StampCardView({ slug, businessName, initial }: { slug: string; businessName: string; initial: StampCardDto }) {
  const locale = useLocale();
  const [card, setCard] = useState(initial);
  const [popIndex, setPopIndex] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const previous = useRef(initial);

  useEffect(() => {
    let active = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(`/api/member/businesses/${encodeURIComponent(slug)}/card`, { cache: "no-store" });
        if (!response.ok || !active) return;
        const next = ((await response.json()) as { card: StampCardDto }).card;
        const before = previous.current;
        previous.current = next;
        setCard(next);
        if (next.totalStamps > before.totalStamps) {
          setPopIndex(Math.max(0, next.stamps - 1));
          timers.push(setTimeout(() => setPopIndex(null), 1500));
          if (next.rewardReady && !before.rewardReady) {
            setCelebrating(true);
            timers.push(setTimeout(() => setCelebrating(false), 3600));
          }
        }
        if (next.redeemedCount > before.redeemedCount) {
          setRedeemed(true);
          timers.push(setTimeout(() => setRedeemed(false), 6000));
        }
      } catch {
        // A missed check is harmless: the next one catches up.
      }
    }

    const interval = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      active = false;
      clearInterval(interval);
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [slug]);

  const waitMinutes = Math.ceil(card.retryAfterSeconds / 60);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-display font-bold tracking-tight text-text">{businessName}</h1>
        <p className="text-body text-text-muted">
          {pick(locale, { es: "Premio: ", en: "Reward: " })}
          <strong className="font-medium text-text">{card.rewardName}</strong>
        </p>
      </header>

      <section
        aria-label={pick(locale, { es: "Tu tarjeta de sellos", en: "Your stamp card" })}
        className={`flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 ${celebrating ? s.celebrate : ""}`}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-label font-medium text-text">{pick(locale, { es: "Sellos", en: "Stamps" })}</span>
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
            es: `${card.stamps} de ${card.required} sellos.${card.rewardReady ? " Premio listo." : ""}`,
            en: `${card.stamps} of ${card.required} stamps.${card.rewardReady ? " Reward ready." : ""}`,
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
              es: `Tu próximo sello estará disponible en ${waitMinutes} min.`,
              en: `Your next stamp will be available in ${waitMinutes} min.`,
            })}
          </p>
        )}
      </section>

      <section aria-label={pick(locale, { es: "Tu código", en: "Your code" })} className="flex flex-col items-center gap-3">
        <h2 className="text-body font-medium text-text">
          {card.rewardReady
            ? pick(locale, { es: "Muéstralo para canjear tu premio", en: "Show it to redeem your reward" })
            : pick(locale, { es: "Muéstralo en caja para sellar tu visita", en: "Show it at the counter to stamp your visit" })}
        </h2>
        <RotatingQr slug={slug} />
      </section>
    </div>
  );
}
