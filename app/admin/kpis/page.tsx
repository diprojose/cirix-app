import type { Metadata } from "next";
import { requireOperator } from "@/lib/auth/dal";
import { formatPrice } from "@/lib/format/money";
import {
  makeGetLiabilityReport,
  makeGetWallet,
} from "@/modules/rewards/infrastructure/di/rewards-container";
import {
  makeGetSegmentDistribution,
  makeListInactiveCustomers,
} from "@/modules/customers/infrastructure/di/customers-container";
import { makeGetReferralFunnel } from "@/modules/referrals/infrastructure/di/referrals-container";
import { makeListPendingFraudAlerts } from "@/modules/fraud/infrastructure/di/fraud-container";

export const metadata: Metadata = { title: "KPIs" };

/** Inactivity threshold for the unclaimed-balance report. Not legal advice. */
const ESCHEAT_DAYS = 365;

const SEGMENT_LABELS: Record<string, string> = {
  nuevo: "Nuevos",
  activo: "Activos",
  vip: "VIP",
  en_riesgo: "En riesgo",
  inactivo: "Inactivos",
};
const FUNNEL_LABELS: Record<string, string> = {
  registrado: "Registrados",
  primera_compra: "1ª compra",
  recompensa_pendiente: "Recompensados",
  bloqueado: "Bloqueados",
};

/**
 * Operator KPIs dashboard (US-I1): the points liability (US-I2), the customer
 * segment mix, the referral funnel, the pending fraud queue, and the unclaimed
 * balances of long-inactive customers (US-I3, adapted — not legal advice). Each
 * figure comes from its own context's use case, composed here at the edge.
 */
export default async function AdminKpisPage() {
  await requireOperator();

  const [liabilityResult, segmentsResult, funnelResult, fraudResult, inactiveResult] =
    await Promise.all([
      makeGetLiabilityReport().execute(),
      makeGetSegmentDistribution().execute(),
      makeGetReferralFunnel().execute(),
      makeListPendingFraudAlerts().execute(),
      makeListInactiveCustomers().execute({ minDaysInactive: ESCHEAT_DAYS }),
    ]);

  const liability = liabilityResult.ok ? liabilityResult.value : null;
  const segments = segmentsResult.ok ? segmentsResult.value : null;
  const funnel = funnelResult.ok ? funnelResult.value : null;
  const pendingFraud = fraudResult.ok ? fraudResult.value.length : 0;

  // Escheatment: long-inactive customers who still hold available credit.
  const inactive = inactiveResult.ok ? inactiveResult.value : [];
  const escheatment: { uid: string; availableCents: number }[] = [];
  let escheatTotal = 0;
  for (const customer of inactive) {
    const wallet = await makeGetWallet().execute({ customerUid: customer.uid });
    const available = wallet.ok ? wallet.value.availableCents : 0;
    if (available > 0) {
      escheatment.push({ uid: customer.uid, availableCents: available });
      escheatTotal += available;
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-text">KPIs</h1>

      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Pasivo de crédito</h2>
        {liability ? (
          <>
            <p className="text-2xl font-extrabold tabular-nums text-text">
              {formatPrice(liability.totalAvailableCents, "USD")}
            </p>
            <p className="text-xs text-text-muted">
              {liability.availableLineCount} líneas ·{" "}
              {formatPrice(liability.expiringSoonCents, "USD")} vencen en 30 días
            </p>
          </>
        ) : (
          <p className="text-sm text-text-muted">No disponible.</p>
        )}
      </section>

      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">
          Segmentos {segments && `(${segments.total})`}
        </h2>
        {segments ? (
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(segments.counts).map(([segment, count]) => (
              <li key={segment} className="flex justify-between rounded-xl bg-bg px-3 py-2">
                <span className="text-text-muted">{SEGMENT_LABELS[segment] ?? segment}</span>
                <span className="font-bold tabular-nums text-text">{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">No disponible.</p>
        )}
      </section>

      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">
          Referidos {funnel && `(${funnel.total})`}
        </h2>
        {funnel ? (
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(funnel.counts).map(([state, count]) => (
              <li key={state} className="flex justify-between rounded-xl bg-bg px-3 py-2">
                <span className="text-text-muted">{FUNNEL_LABELS[state] ?? state}</span>
                <span className="font-bold tabular-nums text-text">{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">No disponible.</p>
        )}
      </section>

      <section className="space-y-1 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Fraude</h2>
        <p className="text-2xl font-extrabold tabular-nums text-text">{pendingFraud}</p>
        <p className="text-xs text-text-muted">alertas pendientes de revisión</p>
      </section>

      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Saldos no reclamados</h2>
        <p className="text-xs text-text-muted">
          Clientes inactivos &gt; {ESCHEAT_DAYS} días con crédito disponible. No constituye
          asesoría legal.
        </p>
        <p className="text-2xl font-extrabold tabular-nums text-text">
          {formatPrice(escheatTotal, "USD")}
        </p>
        {escheatment.length === 0 ? (
          <p className="text-sm text-text-muted">Sin saldos no reclamados.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {escheatment.map((row) => (
              <li key={row.uid} className="flex justify-between gap-3 rounded-xl bg-bg px-3 py-2">
                <span className="truncate font-mono text-xs text-text-muted">{row.uid}</span>
                <span className="shrink-0 font-bold tabular-nums text-text">
                  {formatPrice(row.availableCents, "USD")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
