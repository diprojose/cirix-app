import type { Metadata } from "next";
import { requireOperator } from "@/lib/auth/dal";
import { makeListPendingPremiumRequests } from "@/modules/subscription/infrastructure/di/subscription-container";
import { FeedbackBanner } from "@/components/admin/feedback-banner";
import {
  grantPremiumByEmailAction,
  revokePremiumByEmailAction,
} from "@/app/admin/actions";

export const metadata: Metadata = { title: "Premium" };

/** Shared input styling for the email fields. */
const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-sugar-400 focus:outline-none focus:ring-2 focus:ring-cta";

/**
 * Operator premium management: the queue of pending upgrade requests (grant
 * with one click — it sets the claim and closes the request) plus manual
 * grant/revoke by email for cases arranged outside the app. Users must sign
 * in again for a claim change to reach their session.
 */
export default async function AdminPremiumPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    granted?: string;
    revoked?: string;
    until?: string;
  }>;
}) {
  await requireOperator();
  const { error, granted, revoked, until } = await searchParams;

  const result = await makeListPendingPremiumRequests().execute();
  const pending = result.ok ? result.value : [];

  const success = granted
    ? `Premium activado para ${granted}${until ? ` hasta el ${until}` : ""}. El usuario debe volver a iniciar sesión.`
    : revoked
      ? `Premium retirado a ${revoked}. El cambio aplica en su próximo inicio de sesión.`
      : undefined;

  return (
    <div className="space-y-5">
      <FeedbackBanner error={error} success={success} />

      <section>
        <h1 className="mb-3 text-xl font-bold text-text">
          Solicitudes pendientes ({pending.length})
        </h1>
        {pending.length === 0 ? (
          <p className="rounded-2xl bg-surface p-6 text-center text-sm text-text-muted shadow-xs">
            No hay solicitudes esperando.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((request) => (
              <li
                key={request.id}
                className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">{request.email}</p>
                  <p className="text-xs tabular-nums text-text-muted">
                    Solicitado el {request.requestedAt.slice(0, 10)}
                    {request.payment && (
                      <span className="ml-2 font-semibold text-cta-strong">
                        {request.payment.method === "pago_movil"
                          ? "Pago Móvil"
                          : request.payment.method === "transferencia"
                            ? "Transferencia"
                            : "Zelle"}{" "}
                        · Ref. {request.payment.reference}
                      </span>
                    )}
                  </p>
                </div>
                <form action={grantPremiumByEmailAction}>
                  <input type="hidden" name="email" value={request.email} />
                  <input type="hidden" name="requestId" value={request.id} />
                  <button
                    type="submit"
                    className="rounded-pill bg-gradient-to-r from-cta to-cta-strong px-4 py-2 text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-95"
                  >
                    Conceder
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Conceder / retirar por correo</h2>
        <form action={grantPremiumByEmailAction} className="flex gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder="cliente@correo.com"
            className={FIELD_CLASS}
          />
          <button
            type="submit"
            className="shrink-0 rounded-pill bg-ink px-4 text-sm font-semibold text-on-accent transition-transform active:scale-95"
          >
            Conceder
          </button>
        </form>
        <form action={revokePremiumByEmailAction} className="flex gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder="cliente@correo.com"
            className={FIELD_CLASS}
          />
          <button
            type="submit"
            className="shrink-0 rounded-pill border border-danger/40 px-4 text-sm font-semibold text-danger transition-transform active:scale-95"
          >
            Retirar
          </button>
        </form>
      </section>
    </div>
  );
}
