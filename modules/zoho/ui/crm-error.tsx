"use client";

import { ErrorToast } from "@/components/toast-provider";
import { useEffect } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import s from "./crm.module.css";

export function CrmError({ error, unstable_retry }: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const locale = useLocale();
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className={`${s.theme} ${s.errorPage}`}>
      <ErrorToast key={error.digest ?? error.message} message={pick(locale, { es: "No se pudo cargar el CRM.", en: "The CRM could not be loaded." })} />
      <p className={s.eyebrow}>CIRIX · CRM</p>
      <h1 className={s.pageTitle}>{pick(locale, { es: "Retoma tu actividad", en: "Get back to your work" })}</h1>
      <p className={s.description}>{pick(locale, { es: "Intenta de nuevo para retomar tu actividad.", en: "Try again to get back to your work." })}</p>
      <button type="button" onClick={() => unstable_retry()} className={s.primaryButton}>
        {pick(locale, { es: "Reintentar", en: "Try again" })}<span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}
