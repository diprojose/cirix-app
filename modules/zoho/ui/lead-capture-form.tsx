"use client";

import { useToast } from "@/components/toast-provider";
import { useState } from "react";
import s from "./crm.module.css";


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

export function LeadCaptureForm({
  locale,
}: {
  locale: "es" | "en";
}) {
  const toast = useToast();
  const [state, setState] = useState<LeadCaptureSuccess | null>(null);
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

    try {
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
        toast.error(result.message ?? (locale === "es"
          ? "No pudimos enviar tu consulta. Intenta de nuevo."
          : "We could not send your inquiry. Please try again."));
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
    } catch {
      toast.error(locale === "es"
        ? "No pudimos enviar tu consulta. Intenta de nuevo."
        : "We could not send your inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={s.form} aria-busy={submitting}>
      <p className={s.formNote}>{locale === "es" ? "Nombre y teléfono son obligatorios." : "Name and phone are required."}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">
            {locale === "es" ? "Nombre" : "Full name"}
          </span>
          <input
            name="fullName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            className={s.field}
            placeholder={locale === "es" ? "Nombre y apellido" : "Full name"}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">
            {locale === "es" ? "Teléfono" : "Phone"}
          </span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            minLength={7}
            maxLength={30}
            className={s.field}
            placeholder={locale === "es" ? "0412-1234567" : "+1 305 555 0199"}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Email</span>
          <input
            name="email"
            autoComplete="email"
            type="email"
            className={s.field}
            placeholder={locale === "es" ? "correo@empresa.com" : "email@company.com"}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">
            {locale === "es" ? "Categoría" : "Category"}
          </span>
          <input
            name="interestCategory"
            className={s.field}
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
          className={s.field}
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
          className={s.field}
          placeholder={
            locale === "es"
              ? "Cuéntanos qué necesitas y qué tipo de negocio quieres cerrar."
              : "Tell us what you need and what kind of deal you want to close."
          }
        />
      </label>

      {state ? (
        <div className="space-y-3">
          <p
            role="status"
            className={s.success}
          >
            {state.message}
          </p>
          <div className={s.result}>
            <p className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">
              {locale === "es" ? "Resultado del envío" : "Submission result"}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <ResultFact label={locale === "es" ? "Referencia" : "Reference"} value={state.lead.id} />
              <ResultFact label={locale === "es" ? "Sincronización" : "Sync status"} value={{
                pending: locale === "es" ? "Pendiente" : "Pending",
                synced: locale === "es" ? "Sincronizado" : "Synced",
                failed: locale === "es" ? "No se pudo sincronizar" : "Sync failed",
              }[state.lead.syncStatus]} />
              <ResultFact
                label={locale === "es" ? "Referencia Zoho" : "Zoho reference"}
                value={state.lead.zohoLeadId ?? (locale === "es" ? "Pendiente" : "Pending")}
              />
              <ResultFact label={locale === "es" ? "Fecha de envío" : "Submitted at"} value={state.lead.submittedAt} />
            </div>
            <details className={s.resultSummary}>
              <summary>{locale === "es" ? "Ver datos enviados" : "View submitted details"}</summary>
              <pre>{JSON.stringify(state.submitted, null, 2)}</pre>
            </details>
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className={s.primaryButton}
      >
        {submitting
          ? locale === "es"
            ? "Enviando..."
            : "Sending..."
          : locale === "es"
            ? "Enviar al CRM"
            : "Send to CRM"}
        <span aria-hidden="true">{submitting ? "…" : "↗"}</span>
      </button>
    </form>
  );
}

function ResultFact({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.resultFact}>
      <p className="text-caption font-semibold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-body text-text">{value}</p>
    </div>
  );
}
