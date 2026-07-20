import type { Metadata } from "next";
import { requireOperator } from "@/lib/auth/dal";
import { makeListPendingFraudAlerts } from "@/modules/fraud/infrastructure/di/fraud-container";
import { FeedbackBanner } from "@/components/admin/feedback-banner";
import { raiseFraudAlertAction, resolveFraudAlertAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Fraude" };

/** Shared input styling, matching the other admin forms. */
const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-sugar-400 focus:outline-none focus:ring-2 focus:ring-cta";

/**
 * Fraud review panel (US-F4, UC-24): the queue of pending alerts an analyst can
 * approve (clear) or block (which blocks the referral and reverses its reward),
 * plus a form to raise an alert against a customer by email. Automated
 * device/payment/address detection (BR-09) is not built yet — mixmag does not
 * collect that data — so alerts are raised manually for now.
 */
export default async function AdminFraudPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; raised?: string }>;
}) {
  await requireOperator();
  const { error, raised } = await searchParams;

  const result = await makeListPendingFraudAlerts().execute();
  const alerts = result.ok ? result.value : [];

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-text">Fraude</h1>
      <FeedbackBanner error={error} success={raised ? "Alerta registrada." : undefined} />

      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Levantar alerta</h2>
        <p className="text-xs text-text-muted">
          Marca el referido de un cliente (por su email) para revisión. Al bloquear se revierte
          la recompensa del referidor.
        </p>
        <form action={raiseFraudAlertAction} className="space-y-3">
          <input
            type="email"
            name="email"
            required
            placeholder="cliente@correo.com"
            className={FIELD_CLASS}
          />
          <input
            type="text"
            name="evidence"
            maxLength={500}
            placeholder="Motivo / evidencia"
            className={FIELD_CLASS}
          />
          <button
            type="submit"
            className="h-11 rounded-pill bg-ink px-5 text-sm font-semibold text-on-accent transition-transform active:scale-95"
          >
            Registrar alerta
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-text">Alertas pendientes ({alerts.length})</h2>
        {alerts.length === 0 ? (
          <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-text-muted shadow-xs">
            No hay alertas pendientes.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li key={alert.id} className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
                <p className="text-sm font-semibold text-text">
                  {alert.subjectType} · {alert.signal}
                </p>
                <p className="break-all text-xs text-text-muted">{alert.subjectId}</p>
                {alert.evidence && (
                  <p className="text-sm text-text">{alert.evidence}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <form action={resolveFraudAlertAction.bind(null, alert.id, "approve")}>
                    <button
                      type="submit"
                      className="rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-sugar-100"
                    >
                      Aprobar
                    </button>
                  </form>
                  <form action={resolveFraudAlertAction.bind(null, alert.id, "block")}>
                    <button
                      type="submit"
                      className="rounded-pill border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition-transform active:scale-95"
                    >
                      Bloquear
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
