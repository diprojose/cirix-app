import type { Metadata } from "next";
import { requireOperator } from "@/lib/auth/dal";
import { formatVes } from "@/lib/format/money";
import { makeGetExchangeRate } from "@/modules/pricing/infrastructure/di/pricing-container";
import { FeedbackBanner } from "@/components/admin/feedback-banner";
import { setManualRateAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Ajustes" };

/** Human label per rate source. */
const SOURCE_LABELS: Record<string, string> = {
  bcv: "API BCV en vivo",
  manual: "Tasa manual del operador",
  fallback: "Respaldo estático del deploy",
};

/**
 * Operator settings: shows which USD→VES rate the store is using right now
 * (live feed, manual, or static fallback) and lets the operator record a
 * manual rate for when the live feed is down or wrong. New orders freeze
 * whatever rate is current — existing orders never change.
 */
export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireOperator();
  const { error, saved } = await searchParams;

  const rateResult = await makeGetExchangeRate().execute();
  const rate = rateResult.ok ? rateResult.value : null;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-text">Ajustes</h1>
      <FeedbackBanner
        error={error}
        success={saved ? "Tasa manual guardada." : undefined}
      />

      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Tasa USD → Bs en uso</h2>
        {rate ? (
          <>
            <p className="text-2xl font-extrabold tabular-nums text-text">
              {formatVes(100, rate.vesPerUsd)} <span className="text-base font-medium text-text-muted">por $1</span>
            </p>
            <p className="text-xs text-text-muted">
              Fuente: {SOURCE_LABELS[rate.source] ?? rate.source} · fecha {rate.asOf}
            </p>
          </>
        ) : (
          <p className="text-sm font-medium text-danger">
            Ninguna fuente de tasa disponible — los precios en Bs están ocultos.
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Tasa manual</h2>
        <p className="text-xs text-text-muted">
          Se usa cuando la API del BCV no responde. La tienda siempre prefiere la
          tasa en vivo si está disponible.
        </p>
        <form action={setManualRateAction} className="flex gap-2">
          <input
            type="number"
            name="vesPerUsd"
            required
            min="0.01"
            step="0.0001"
            inputMode="decimal"
            placeholder="727.45"
            className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-action-fill"
          />
          <button
            type="submit"
            className="shrink-0 rounded-pill bg-ink px-5 text-sm font-semibold text-on-accent transition-transform active:scale-95"
          >
            Guardar
          </button>
        </form>
      </section>
    </div>
  );
}
