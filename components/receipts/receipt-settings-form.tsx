"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import type { ReceiptSettingsDto } from "@/modules/receipts/application/dtos/receipt-dtos";
import { RECEIPT_LIMITS } from "@/modules/receipts/domain/value-objects/receipt-settings";

const INPUT =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-3 text-body text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent disabled:opacity-60";
const LABEL = "text-label font-medium text-text";
const HELP = "text-caption text-text-muted";

const toLines = (text: string): string[] => text.split("\n").map((line) => line.trim()).filter(Boolean);

/** The owner's rules for receipts. */
export function ReceiptSettingsForm({
  slug,
  businessName,
  earnsPoints,
  initial,
}: {
  slug: string;
  businessName: string;
  /** Supermarkets earn points from receipts; everyone else, a stamp. */
  earnsPoints: boolean;
  initial: ReceiptSettingsDto;
}) {
  const locale = useLocale();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [storeNames, setStoreNames] = useState(initial.storeNames.join("\n"));
  const [merchantIds, setMerchantIds] = useState(initial.merchantIds.join("\n"));
  const [maxAgeDays, setMaxAgeDays] = useState(String(initial.maxAgeDays));
  const [maxAmountDollars, setMaxAmountDollars] = useState(String(initial.maxAmountDollars));
  const [pointsPerDollar, setPointsPerDollar] = useState(String(initial.pointsPerDollar));
  const [dailyLimit, setDailyLimit] = useState(String(initial.dailyLimit));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const limits = RECEIPT_LIMITS;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/member/biz/${encodeURIComponent(slug)}/receipts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          storeNames: toLines(storeNames),
          merchantIds: toLines(merchantIds),
          maxAgeDays: Number(maxAgeDays),
          maxAmountDollars: Number(maxAmountDollars),
          pointsPerDollar: Number(pointsPerDollar),
          dailyLimit: Number(dailyLimit),
        }),
      });
      setMessage(
        response.ok
          ? { kind: "ok", text: pick(locale, { es: "Guardado.", en: "Saved." }) }
          : {
              kind: "error",
              text: pick(locale, {
                es: `Revisa los valores: hasta ${limits.maxStoreNames} nombres de ${limits.minStoreName} a ${limits.maxStoreName} letras, hasta ${limits.maxMerchantIds} Merchant ID de al menos 4 dígitos, y números enteros dentro de cada rango.`,
                en: `Check the values: up to ${limits.maxStoreNames} names of ${limits.minStoreName} to ${limits.maxStoreName} characters, up to ${limits.maxMerchantIds} Merchant IDs of at least 4 digits, and whole numbers within each range.`,
              }),
            }
      );
    } catch {
      setMessage({ kind: "error", text: pick(locale, { es: "Sin conexión. Intenta de nuevo.", en: "No connection. Please try again." }) });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-busy={saving}>
      <label className="flex min-h-11 items-center gap-3 text-label text-text">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={saving} className="size-5" />
        {earnsPoints
          ? pick(locale, { es: "El cliente gana puntos escaneando su recibo", en: "Customers earn points by scanning their receipt" })
          : pick(locale, { es: "Cada recibo escaneado cuenta como una visita", en: "Each scanned receipt counts as a visit" })}
      </label>

      <label htmlFor="receipt-names" className={LABEL}>
        {pick(locale, { es: "Cómo aparece tu negocio en el recibo", en: "How your business appears on the receipt" })}
      </label>
      <textarea id="receipt-names" rows={3} value={storeNames} onChange={(event) => setStoreNames(event.target.value)} disabled={saving}
        placeholder={businessName} aria-describedby="receipt-names-help" className={INPUT} />
      <p id="receipt-names-help" className={HELP}>
        {pick(locale, {
          es: `Uno por línea: el nombre tal como se imprime o la dirección. Si tu nombre es un logo, usa la dirección. Vacío, buscamos "${businessName}".`,
          en: `One per line: the name as it prints, or the address. If your name is a logo, use the address. If empty, we look for "${businessName}".`,
        })}
      </p>

      <label htmlFor="receipt-merchants" className={LABEL}>{pick(locale, { es: "Merchant ID (opcional)", en: "Merchant ID (optional)" })}</label>
      <textarea id="receipt-merchants" rows={2} inputMode="numeric" value={merchantIds} onChange={(event) => setMerchantIds(event.target.value)} disabled={saving}
        aria-describedby="receipt-merchants-help" className={INPUT} />
      <p id="receipt-merchants-help" className={HELP}>
        {pick(locale, {
          es: "Uno por línea, tal como sale en el comprobante de tarjeta. Es la prueba más fiable: si el recibo trae otro número, se rechaza.",
          en: "One per line, as printed on the card slip. It's the most reliable proof: a receipt with another number is refused.",
        })}
      </p>

      <label htmlFor="receipt-age" className={LABEL}>{pick(locale, { es: "Antigüedad máxima del recibo (días)", en: "Oldest receipt accepted (days)" })}</label>
      <input id="receipt-age" type="number" inputMode="numeric" required min={limits.minMaxAgeDays} max={limits.maxMaxAgeDays}
        value={maxAgeDays} onChange={(event) => setMaxAgeDays(event.target.value)} disabled={saving} className={INPUT} />

      <label htmlFor="receipt-amount" className={LABEL}>{pick(locale, { es: "Monto máximo aceptado (dólares)", en: "Highest total accepted (dollars)" })}</label>
      <input id="receipt-amount" type="number" inputMode="numeric" required min={limits.minMaxAmountDollars} max={limits.maxMaxAmountDollars}
        value={maxAmountDollars} onChange={(event) => setMaxAmountDollars(event.target.value)} disabled={saving} aria-describedby="receipt-amount-help" className={INPUT} />
      <p id="receipt-amount-help" className={HELP}>
        {pick(locale, {
          es: "Un recibo por encima de este monto se rechaza: la lectura automática a veces se equivoca, y así un error no regala de más.",
          en: "A receipt above this total is refused: automatic reading sometimes gets it wrong, and this keeps a mistake from giving away too much.",
        })}
      </p>

      {earnsPoints && (
        <>
          <label htmlFor="receipt-points" className={LABEL}>{pick(locale, { es: "Puntos por cada dólar", en: "Points per dollar" })}</label>
          <input id="receipt-points" type="number" inputMode="numeric" required min={limits.minPointsPerDollar} max={limits.maxPointsPerDollar}
            value={pointsPerDollar} onChange={(event) => setPointsPerDollar(event.target.value)} disabled={saving} className={INPUT} />

          <label htmlFor="receipt-limit" className={LABEL}>{pick(locale, { es: "Recibos por cliente al día", en: "Receipts per customer per day" })}</label>
          <input id="receipt-limit" type="number" inputMode="numeric" required min={limits.minDailyLimit} max={limits.maxDailyLimit}
            value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} disabled={saving} className={INPUT} />
        </>
      )}

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className="text-label text-text">
          {message.text}
        </p>
      )}

      <button type="submit" disabled={saving}
        className="min-h-11 w-full rounded-pill bg-accent-fill px-5 py-3 text-label font-medium text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60">
        {saving ? pick(locale, { es: "Guardando...", en: "Saving..." }) : pick(locale, { es: "Guardar", en: "Save" })}
      </button>
    </form>
  );
}
