"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/components/locale-provider";
import { GOOGLE_REVIEW_URL, type ReviewSource } from "../lib/constants";
import { trackReviewEvent } from "../lib/analytics";
import s from "./reviews.module.css";

export function GoogleReviewForm({ source, token }: { source: ReviewSource; token?: string }) {
  const locale = useLocale();
  const t = (es: string, en: string) => locale === "es" ? es : en;
  const clicked = useRef(false);
  useEffect(() => {
    let recorded = false;
    const record = () => {
      if (document.visibilityState === "visible" && !recorded) {
        recorded = true; trackReviewEvent("review_page_view", { source, token });
      }
    };
    const restore = () => { clicked.current = false; };
    record(); document.addEventListener("visibilitychange", record); window.addEventListener("pageshow", restore);
    return () => { document.removeEventListener("visibilitychange", record); window.removeEventListener("pageshow", restore); };
  }, [source, token]);
  return <section aria-labelledby="review-title">
    <header className={s.heading}>
      <p className={s.eyebrow}>{t("TU EXPERIENCIA CUENTA", "YOUR EXPERIENCE MATTERS")}</p>
      <h1 id="review-title">{t("¿Cómo fue tu experiencia con Cirix?", "How was your experience with Cirix?")}</h1>
      <p>{t("Comparte tu opinión en Google. Tu experiencia ayuda a otros a conocernos.", "Share your thoughts on Google. Your experience helps others get to know us.")}</p>
    </header>
    <a className={s.continue} href={GOOGLE_REVIEW_URL} rel="noreferrer" onClick={() => {
      if (!clicked.current) { clicked.current = true; trackReviewEvent("review_google_clicked", { source, token }); }
    }}>
      {t("Escribir mi reseña en Google", "Write my review on Google")} <span aria-hidden="true">↗</span>
    </a>
    <p className={s.hint}>{t("Escribes y publicas directamente en Google, con tu cuenta.", "Write and publish directly on Google, using your account.")}</p>
    <p className={s.publication}>{t("Medimos la visita y el clic para mejorar nuestras invitaciones. No recibimos tu correo de Google.", "We measure visits and clicks to improve our invitations. Google does not share your email with us.")}</p>
  </section>;
}
