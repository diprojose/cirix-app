"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick, type Locale } from "@/lib/locale";
import type { RedemptionDto, RewardDto } from "@/modules/receipts/application/dtos/reward-dtos";
import { formatRedemptionCode } from "@/modules/receipts/domain/entities/redemption";

/** How often an open code checks whether staff handed the prize over. */
const POLL_MS = 5_000;
const HISTORY = 5;

const PRIMARY =
  "min-h-11 w-full rounded-pill bg-accent-fill px-5 py-2 text-label font-medium text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";
const SECONDARY =
  "min-h-11 w-full rounded-pill border border-border bg-surface px-5 py-2 text-label font-medium text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";

const connectionError = (locale: Locale) => pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." });

/** A code to show at the counter, as a QR and as text to read out if the camera fails. */
function OpenCode({ slug, redemption }: { slug: string; redemption: RedemptionDto }) {
  const locale = useLocale();
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const number = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  useEffect(() => {
    let active = true;
    void import("qrcode")
      .then(({ toDataURL }) => toDataURL(redemption.code, { errorCorrectionLevel: "M", margin: 2, width: 320 }))
      .then((url) => {
        if (active) setImage(url);
      })
      .catch(() => undefined); // The code stays readable as text below.
    return () => {
      active = false;
    };
  }, [redemption.code]);

  async function cancel() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/member/businesses/${encodeURIComponent(slug)}/redemptions/${encodeURIComponent(redemption.code)}`, { method: "DELETE" });
      if (response.ok || response.status === 409) {
        // On 409 staff closed it a moment ago: the refreshed page shows what happened.
        router.refresh();
      } else {
        setError(pick(locale, { es: "No pudimos cancelarlo. Intenta de nuevo.", en: "We couldn't cancel it. Please try again." }));
      }
    } catch {
      setError(connectionError(locale));
    }
    setBusy(false);
    setConfirming(false);
  }

  return (
    <li className="flex flex-col items-center gap-3 rounded-3xl border border-accent bg-surface p-5 text-center">
      <span className="text-body font-medium text-text">{redemption.rewardName}</span>
      <div className="flex size-56 items-center justify-center rounded-2xl bg-white p-2">
        {image && <Image src={image} unoptimized width={208} height={208} alt={pick(locale, { es: "Código QR de tu premio", en: "Your reward's QR code" })} className="size-full" />}
      </div>
      <span className="text-title font-bold tracking-widest text-text">{formatRedemptionCode(redemption.code)}</span>
      <p className="text-caption text-text-muted">
        {pick(locale, {
          es: `Muéstralo en caja para recibir tu premio. Vence el ${date.format(new Date(redemption.expiresAt))}; si no lo usas, tus ${number.format(redemption.points)} puntos vuelven a tu saldo.`,
          en: `Show it at the counter to get your reward. It expires on ${date.format(new Date(redemption.expiresAt))}; if you don't use it, your ${number.format(redemption.points)} points go back to your balance.`,
        })}
      </p>
      {error && <p role="alert" className="text-label text-text">{error}</p>}
      {confirming ? (
        <div className="flex w-full flex-col gap-2">
          <button type="button" onClick={() => void cancel()} disabled={busy} className={SECONDARY}>
            {busy ? pick(locale, { es: "Cancelando...", en: "Cancelling..." }) : pick(locale, { es: "Sí, cancelar y devolver mis puntos", en: "Yes, cancel and return my points" })}
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="min-h-11 text-label text-text-muted underline underline-offset-4">
            {pick(locale, { es: "No, conservar mi código", en: "No, keep my code" })}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="min-h-11 text-label text-text-muted underline underline-offset-4">
          {pick(locale, { es: "Cancelar este canje", en: "Cancel this redemption" })}
        </button>
      )}
    </li>
  );
}

/** One prize of the catalog, with how close the customer is to it. */
function CatalogItem({ slug, reward, balance }: { slug: string; reward: RewardDto; balance: number }) {
  const locale = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const number = new Intl.NumberFormat(locale);
  const percent = Math.min(100, Math.floor((balance / reward.points) * 100));
  const missing = reward.points - balance;

  async function redeem() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/member/businesses/${encodeURIComponent(slug)}/redemptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: reward.id }),
      });
      if (response.ok) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        router.refresh();
      } else {
        const body = (await response.json().catch(() => ({}))) as { error?: { code?: string } };
        setError(
          body.error?.code === "rewards/not-enough-points"
            ? pick(locale, { es: "Ya no te alcanzan los puntos para este premio.", en: "You no longer have enough points for this reward." })
            : body.error?.code === "rewards/not-found"
              ? pick(locale, { es: "Este premio ya no está disponible.", en: "This reward is no longer available." })
              : pick(locale, { es: "No pudimos canjearlo. Intenta de nuevo.", en: "We couldn't redeem it. Please try again." })
        );
        router.refresh();
      }
    } catch {
      setError(connectionError(locale));
    }
    setBusy(false);
    setConfirming(false);
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body font-medium text-text">{reward.name}</span>
        <span className="shrink-0 text-label font-medium tabular-nums text-text">{number.format(reward.points)} {pick(locale, { es: "pts", en: "pts" })}</span>
      </div>
      {reward.description && <p className="text-caption text-text-muted">{reward.description}</p>}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={pick(locale, { es: `Avance hacia ${reward.name}`, en: `Progress towards ${reward.name}` })}
        className="h-2 w-full overflow-hidden rounded-full bg-border"
      >
        <div className="h-full rounded-full bg-accent-fill" style={{ width: `${percent}%` }} />
      </div>
      {error && <p role="alert" className="text-label text-text">{error}</p>}
      {missing > 0 ? (
        <p className="text-caption text-text-muted">
          {pick(locale, { es: `Te faltan ${number.format(missing)} puntos`, en: `${number.format(missing)} more points to go` })}
        </p>
      ) : confirming ? (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => void redeem()} disabled={busy} className={PRIMARY}>
            {busy
              ? pick(locale, { es: "Canjeando...", en: "Redeeming..." })
              : pick(locale, { es: `Sí, usar ${number.format(reward.points)} puntos`, en: `Yes, use ${number.format(reward.points)} points` })}
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={SECONDARY}>
            {pick(locale, { es: "No, volver", en: "No, go back" })}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={PRIMARY}>
          {pick(locale, { es: "Canjear", en: "Redeem" })}
        </button>
      )}
    </li>
  );
}

function statusLabel(status: RedemptionDto["status"], locale: Locale): string {
  switch (status) {
    case "delivered":
      return pick(locale, { es: "Entregado", en: "Delivered" });
    case "cancelled":
      return pick(locale, { es: "Cancelado, puntos devueltos", en: "Cancelled, points returned" });
    case "expired":
      return pick(locale, { es: "Vencido, puntos devueltos", en: "Expired, points returned" });
    default:
      return pick(locale, { es: "Por recoger", en: "To pick up" });
  }
}

/** What the customer's points can buy: their open codes, the catalog and what they already redeemed. */
export function RewardsSection({
  slug,
  balance,
  rewards,
  redemptions,
}: {
  slug: string;
  balance: number;
  rewards: RewardDto[];
  redemptions: RedemptionDto[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const open = redemptions.filter((redemption) => redemption.status === "pending");
  const past = redemptions.filter((redemption) => redemption.status !== "pending").slice(0, HISTORY);
  const waiting = open.length > 0;

  // Keeps the screen honest at the counter: once staff deliver, the code leaves on its own.
  useEffect(() => {
    if (!waiting) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [waiting, router]);

  return (
    <>
      {open.length > 0 && (
        <section aria-labelledby="open-codes" className="flex flex-col gap-2">
          <h2 id="open-codes" className="text-body font-medium text-text">{pick(locale, { es: "Premios por recoger", en: "Rewards to pick up" })}</h2>
          <ul className="flex flex-col gap-3">
            {open.map((redemption) => <OpenCode key={redemption.code} slug={slug} redemption={redemption} />)}
          </ul>
        </section>
      )}

      {rewards.length > 0 && (
        <section aria-labelledby="catalog" className="flex flex-col gap-2">
          <h2 id="catalog" className="text-body font-medium text-text">{pick(locale, { es: "Premios", en: "Rewards" })}</h2>
          <ul className="flex flex-col gap-2">
            {rewards.map((reward) => <CatalogItem key={reward.id} slug={slug} reward={reward} balance={balance} />)}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-redemptions" className="flex flex-col gap-2">
          <h2 id="past-redemptions" className="text-body font-medium text-text">{pick(locale, { es: "Tus canjes", en: "Your redemptions" })}</h2>
          <ul className="flex flex-col gap-2">
            {past.map((redemption) => (
              <li key={redemption.code} className="flex items-baseline justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-label text-text">
                <span className="min-w-0">
                  {redemption.rewardName}
                  <span className="block text-caption text-text-muted">{statusLabel(redemption.status, locale)}</span>
                </span>
                <span className="shrink-0 text-caption text-text-muted">{date.format(new Date(redemption.resolvedAt ?? redemption.createdAt))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
