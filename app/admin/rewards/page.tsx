import type { Metadata } from "next";
import { requireOperator } from "@/lib/auth/dal";
import { formatPrice } from "@/lib/format/money";
import {
  makeGetRewardRules,
  makeGetLiabilityReport,
} from "@/modules/loyalty/rewards/infrastructure/di/rewards-container";
import { FeedbackBanner } from "@/components/admin/feedback-banner";
import {
  saveRewardRulesAction,
  runRewardsMaintenanceAction,
  adjustBalanceAction,
} from "@/app/admin/actions";

export const metadata: Metadata = { title: "Recompensas" };

/** Shared input styling, matching the other admin forms. */
const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-action-fill";

type SearchParams = {
  error?: string;
  saved?: string;
  released?: string;
  expired?: string;
  adjusted?: string;
};

/** Builds the green banner copy from whichever success param arrived. */
function successMessage(params: SearchParams): string | undefined {
  if (params.saved) return "Configuración de recompensas guardada.";
  if (params.released !== undefined || params.expired !== undefined) {
    return `Mantenimiento ejecutado: ${params.released ?? 0} liberadas, ${params.expired ?? 0} expiradas.`;
  }
  if (params.adjusted) return `Crédito ajustado para ${params.adjusted}.`;
  return undefined;
}

/**
 * Operator rewards panel: tunes the earn rate, holdback, expiry and redemption
 * cap (US-G1, US-F5); runs the release/expire maintenance jobs on demand (a
 * fallback to the cron); shows the outstanding points liability (US-I2); and
 * applies audited manual credit adjustments by customer email (US-G3). Changes
 * to the rules apply only to future transactions (BR-18).
 */
export default async function AdminRewardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOperator();
  const params = await searchParams;

  const [rulesResult, liabilityResult] = await Promise.all([
    makeGetRewardRules().execute(),
    makeGetLiabilityReport().execute(),
  ]);
  const rules = rulesResult.ok ? rulesResult.value : null;
  const liability = liabilityResult.ok ? liabilityResult.value : null;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-text">Recompensas</h1>
      <FeedbackBanner error={params.error} success={successMessage(params)} />

      {/* Points liability */}
      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Pasivo de crédito</h2>
        {liability ? (
          <>
            <p className="text-2xl font-extrabold tabular-nums text-text">
              {formatPrice(liability.totalAvailableCents, "USD")}
            </p>
            <p className="text-xs text-text-muted">
              {liability.availableLineCount} líneas disponibles ·{" "}
              {formatPrice(liability.expiringSoonCents, "USD")} vencen en 30 días
            </p>
          </>
        ) : (
          <p className="text-sm text-text-muted">No se pudo calcular el pasivo.</p>
        )}
      </section>

      {/* Rules configuration */}
      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Configuración</h2>
        <p className="text-xs text-text-muted">
          El earn se calcula como % del margen de la orden. Los cambios aplican solo a
          transacciones futuras.
        </p>
        <form action={saveRewardRulesAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text">Earn (% del margen)</span>
              <input
                type="number"
                name="earnRatePctOfMargin"
                required
                min="0"
                max="100"
                step="0.1"
                inputMode="decimal"
                defaultValue={rules?.earnRatePctOfMargin ?? 5}
                className={FIELD_CLASS}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text">Tope de canje (% de la orden)</span>
              <input
                type="number"
                name="maxRedeemPctOfOrder"
                required
                min="0"
                max="100"
                step="1"
                inputMode="numeric"
                defaultValue={rules?.maxRedeemPctOfOrder ?? 50}
                className={FIELD_CLASS}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text">Holdback (días)</span>
              <input
                type="number"
                name="holdbackDays"
                required
                min="0"
                step="1"
                inputMode="numeric"
                defaultValue={rules?.holdbackDays ?? 7}
                className={FIELD_CLASS}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text">Expiración (días)</span>
              <input
                type="number"
                name="expiryDays"
                required
                min="1"
                step="1"
                inputMode="numeric"
                defaultValue={rules?.expiryDays ?? 90}
                className={FIELD_CLASS}
              />
            </label>
          </div>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-pill bg-gradient-to-r from-action-fill to-action-strong text-sm font-semibold text-on-action shadow-action transition-transform active:scale-[0.98]"
          >
            Guardar configuración
          </button>
        </form>
      </section>

      {/* Maintenance jobs */}
      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Mantenimiento</h2>
        <p className="text-xs text-text-muted">
          Libera el crédito cuyo holdback venció y expira el crédito vencido. Corre
          automáticamente a diario; este botón lo ejecuta ahora.
        </p>
        <form action={runRewardsMaintenanceAction}>
          <button
            type="submit"
            className="h-11 rounded-pill bg-ink px-5 text-sm font-semibold text-on-accent transition-transform active:scale-95"
          >
            Ejecutar mantenimiento
          </button>
        </form>
      </section>

      {/* Manual adjustment */}
      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Ajuste manual</h2>
        <p className="text-xs text-text-muted">
          Acredita (positivo) o debita (negativo) crédito a un cliente por su email. Queda
          registrado en la auditoría con el motivo.
        </p>
        <form action={adjustBalanceAction} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text">Email del cliente</span>
            <input
              type="email"
              name="email"
              required
              placeholder="cliente@correo.com"
              className={FIELD_CLASS}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text">Monto (US$)</span>
              <input
                type="number"
                name="amount"
                required
                step="0.01"
                inputMode="decimal"
                placeholder="5.00 o -5.00"
                className={FIELD_CLASS}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text">Motivo</span>
              <input
                type="text"
                name="reason"
                required
                maxLength={300}
                placeholder="Cortesía por incidencia"
                className={FIELD_CLASS}
              />
            </label>
          </div>
          <button
            type="submit"
            className="h-11 rounded-pill bg-ink px-5 text-sm font-semibold text-on-accent transition-transform active:scale-95"
          >
            Aplicar ajuste
          </button>
        </form>
      </section>
    </div>
  );
}
