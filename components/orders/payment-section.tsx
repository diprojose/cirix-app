"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reportPaymentAction } from "@/app/checkout/actions";
import type { PaymentReportDto } from "@/modules/loyalty/ordering/application/dtos/order-dto";
import type { PaymentMethod } from "@/modules/loyalty/ordering/domain/value-objects/payment-method";
import type { BusinessProfile } from "@/modules/loyalty/ordering/infrastructure/config/business-profile";
import { PAYMENT_METHOD_LABELS } from "./order-status";

/** Shared input styling for the report fields. */
const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-action-fill";

const METHODS: PaymentMethod[] = ["pago_movil", "transferencia", "zelle", "efectivo"];

/**
 * PaymentSection is the client part of the order page: it shows the business's
 * collection accounts for the chosen method and lets the customer report the
 * payment reference their bank produced. Submitting delegates to the
 * report-payment server action and refreshes the page so the new status
 * (`payment_reported`) is server-rendered.
 */
export function PaymentSection({
  orderId,
  profile,
  canReport,
  payments,
}: {
  orderId: string;
  profile: BusinessProfile;
  canReport: boolean;
  payments: PaymentReportDto[];
}) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("pago_movil");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const result = await reportPaymentAction({ orderId, method, reference, note });
    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    setReference("");
    setNote("");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {payments.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
          <h2 className="text-sm font-bold text-text">Pagos reportados</h2>
          <ul className="space-y-2">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-stone-100 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">
                    {PAYMENT_METHOD_LABELS[payment.method]}
                  </p>
                  {payment.reference && (
                    <p className="truncate text-xs tabular-nums text-text-muted">
                      Ref. {payment.reference}
                    </p>
                  )}
                </div>
                <ReportStatusBadge status={payment.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {canReport && (
        <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
          <h2 className="text-sm font-bold text-text">Reportar pago</h2>

          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Método de pago">
            {METHODS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={method === option}
                onClick={() => setMethod(option)}
                className={`flex min-h-[2.75rem] items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors ${
                  method === option
                    ? "border-action-fill bg-action-fill/10 text-text"
                    : "border-border bg-surface text-text-muted hover:border-stone-300"
                }`}
              >
                {PAYMENT_METHOD_LABELS[option]}
              </button>
            ))}
          </div>

          <MethodInstructions method={method} profile={profile} />

          <form onSubmit={handleSubmit} className="space-y-3">
            {method !== "efectivo" && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-text">Número de referencia</span>
                <input
                  type="text"
                  required
                  minLength={4}
                  maxLength={40}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Ej. 001234567890"
                  className={FIELD_CLASS}
                />
              </label>
            )}
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text">Nota (opcional)</span>
              <input
                type="text"
                maxLength={280}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Banco emisor, titular, monto…"
                className={FIELD_CLASS}
              />
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center rounded-pill bg-ink text-sm font-semibold text-on-accent transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Enviando…" : "Reportar pago"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

/** The account data for the selected method, ready to copy. */
function MethodInstructions({
  method,
  profile,
}: {
  method: PaymentMethod;
  profile: BusinessProfile;
}) {
  if (method === "pago_movil") {
    return (
      <InstructionCard
        rows={[
          ["Banco", profile.pagoMovil.bank],
          ["Teléfono", profile.pagoMovil.phone],
          ["Cédula/RIF", profile.pagoMovil.documentId],
        ]}
        hint="Paga en bolívares a la tasa BCV del día y reporta la referencia."
      />
    );
  }
  if (method === "transferencia") {
    return (
      <InstructionCard
        rows={[
          ["Banco", profile.transfer.bank],
          ["Cuenta", profile.transfer.accountNumber],
          ["Titular", profile.transfer.holder],
          ["RIF", profile.transfer.documentId],
        ]}
        hint="Transfiere en bolívares y reporta la referencia."
      />
    );
  }
  if (method === "zelle") {
    return (
      <InstructionCard
        rows={[
          ["Correo", profile.zelle.email],
          ["Titular", profile.zelle.holder],
        ]}
        hint="Envía el monto en dólares y reporta la confirmación."
      />
    );
  }
  return (
    <InstructionCard
      rows={[]}
      hint="Pagarás en efectivo (divisas) al momento de la entrega o retiro."
    />
  );
}

/** Key/value card listing where to pay. */
function InstructionCard({ rows, hint }: { rows: [string, string][]; hint: string }) {
  return (
    <div className="space-y-1.5 rounded-xl bg-stone-100 px-4 py-3">
      {rows.map(([label, value]) => (
        <p key={label} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-text-muted">{label}</span>
          <span className="font-semibold tabular-nums text-text">{value}</span>
        </p>
      ))}
      <p className="text-xs text-text-muted">{hint}</p>
    </div>
  );
}

/** Verification state of one reported payment. */
function ReportStatusBadge({ status }: { status: PaymentReportDto["status"] }) {
  if (status === "verified") {
    return (
      <span className="shrink-0 rounded-pill bg-action-fill/15 px-2.5 py-1 text-xs font-semibold text-action-strong">
        Verificado
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="shrink-0 rounded-pill bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger">
        Rechazado
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-pill bg-stone-200 px-2.5 py-1 text-xs font-semibold text-text-muted">
      Por verificar
    </span>
  );
}
