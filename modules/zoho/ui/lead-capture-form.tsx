"use client";

import { useState } from "react";

const FIELD_CLASS =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-action-fill";

type LeadCaptureSuccess = {
  ok: true;
  message: string;
  lead: {
    id: string;
    syncStatus: "pending" | "synced" | "failed";
    zohoLeadId: string | null;
    submittedAt: string;
    syncedAt: string | null;
  };
  submitted: {
    fullName: string;
    phone: string;
    email: string;
    interestCategory: string;
    campaign: string;
    message: string;
  };
};

type LeadCaptureFailure = {
  ok: false;
  message: string;
};

type FormState = LeadCaptureSuccess | LeadCaptureFailure | null;

export function LeadCaptureForm({
  locale,
}: {
  locale: "es" | "en";
}) {
  const [state, setState] = useState<FormState>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
      source: "Cirix Tech Platform web form",
      campaign: String(formData.get("campaign") ?? ""),
      interestCategory: String(formData.get("interestCategory") ?? ""),
      locale,
    };

    setSubmitting(true);
    setState(null);

    const response = await fetch("/api/zoho/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as {
      ok?: boolean;
      message?: string;
      lead?: {
        id: string;
        syncStatus: "pending" | "synced" | "failed";
        zohoLeadId: string | null;
        submittedAt: string;
        syncedAt: string | null;
      };
    };

    if (!response.ok || !result.ok) {
      setState({
        ok: false,
        message:
          result.message ??
          (locale === "es"
            ? "No pudimos enviar tu consulta. Intenta de nuevo."
            : "We could not send your inquiry. Please try again."),
      });
      setSubmitting(false);
      return;
    }

    form.reset();
    setState({
      ok: true,
      message:
        locale === "es"
          ? "Consulta enviada. Ya quedó registrada en el CRM."
          : "Inquiry sent. It has been recorded in the CRM.",
      lead: result.lead ?? {
        id: "unknown",
        syncStatus: "pending",
        zohoLeadId: null,
        submittedAt: new Date().toISOString(),
        syncedAt: null,
      },
      submitted: {
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        interestCategory: payload.interestCategory,
        campaign: payload.campaign,
        message: payload.message,
      },
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">
            {locale === "es" ? "Nombre" : "Full name"}
          </span>
          <input
            name="fullName"
            required
            minLength={2}
            maxLength={80}
            className={FIELD_CLASS}
            placeholder={locale === "es" ? "Nombre y apellido" : "Full name"}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">
            {locale === "es" ? "Teléfono" : "Phone"}
          </span>
          <input
            name="phone"
            required
            minLength={7}
            maxLength={30}
            className={FIELD_CLASS}
            placeholder={locale === "es" ? "0412-1234567" : "+1 305 555 0199"}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Email</span>
          <input
            name="email"
            type="email"
            className={FIELD_CLASS}
            placeholder={locale === "es" ? "correo@empresa.com" : "email@company.com"}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">
            {locale === "es" ? "Categoría" : "Category"}
          </span>
          <input
            name="interestCategory"
            className={FIELD_CLASS}
            placeholder={locale === "es" ? "Retail, distribución..." : "Retail, distribution..."}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">
          {locale === "es" ? "Campaña (opcional)" : "Campaign (optional)"}
        </span>
        <input
          name="campaign"
          className={FIELD_CLASS}
          placeholder={locale === "es" ? "Meta lead ad julio" : "Meta lead ad July"}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">
          {locale === "es" ? "Mensaje" : "Message"}
        </span>
        <textarea
          name="message"
          rows={4}
          maxLength={800}
          className={FIELD_CLASS}
          placeholder={
            locale === "es"
              ? "Cuéntanos qué necesitas y qué tipo de negocio quieres cerrar."
              : "Tell us what you need and what kind of deal you want to close."
          }
        />
      </label>

      {state ? (
        state.ok ? (
          <div className="space-y-3">
            <p
              role="status"
              className="rounded-xl bg-cirix-cyan/15 px-4 py-3 text-sm font-medium text-brand-700"
            >
              {state.message}
            </p>
            <div className="rounded-xl border border-border bg-bg p-4">
              <p className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">
                {locale === "es" ? "Resultado del envío" : "Submission result"}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <ResultFact label="Lead ID" value={state.lead.id} />
                <ResultFact label="Sync status" value={state.lead.syncStatus} />
                <ResultFact
                  label="Zoho lead ID"
                  value={state.lead.zohoLeadId ?? (locale === "es" ? "Pendiente" : "Pending")}
                />
                <ResultFact label="Submitted at" value={state.lead.submittedAt} />
              </div>
              <p className="mt-4 text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">
                {locale === "es" ? "Payload enviado" : "Submitted payload"}
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-surface px-3 py-3 text-xs text-text-muted">
                {JSON.stringify(state.submitted, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p
            role="status"
            className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
          >
            {state.message}
          </p>
        )
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-12 items-center justify-center rounded-pill bg-action-fill px-6 text-title font-semibold text-on-action shadow-action transition-colors hover:bg-action-strong disabled:opacity-60"
      >
        {submitting
          ? locale === "es"
            ? "Enviando..."
            : "Sending..."
          : locale === "es"
            ? "Enviar al CRM"
            : "Send to CRM"}
      </button>
    </form>
  );
}

function ResultFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-3">
      <p className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-body text-text">{value}</p>
    </div>
  );
}
