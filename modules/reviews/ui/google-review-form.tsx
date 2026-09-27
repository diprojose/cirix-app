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
  return <section className={s.reviewLayout} aria-labelledby="review-title">
    <header className={s.heading}>
      <p className={s.eyebrow}>{t("TU EXPERIENCIA CUENTA", "YOUR EXPERIENCE MATTERS")}</p>
      <h1 id="review-title">{t("Tu experiencia.", "Your experience.")}<br /><span>{t("Tu voz.", "Your voice.")}</span></h1>
      <p>{t("Comparte tu opinión en Google. Tu experiencia ayuda a otros a conocernos.", "Share your thoughts on Google. Your experience helps others get to know us.")}</p>
      <div className={s.heroNote}><span aria-hidden="true" />{t("Cada opinión nos ayuda a seguir construyendo mejores experiencias.", "Every opinion helps us keep building better experiences.")}</div>
    </header>
    <div className={s.reviewCard}>
      <div className={s.cardTop}><span>GOOGLE REVIEWS</span><span aria-hidden="true">↗</span></div>
      <div className={s.quoteMark} aria-hidden="true">“</div>
      <h2>{t("¿Cómo fue tu experiencia con Cirix?", "How was your experience with Cirix?")}</h2>
      <p className={s.cardDescription}>{t("Nos gustaría conocerla. Comparte lo que más valoraste y lo que podemos mejorar.", "We would love to hear about it. Share what you valued most and what we can improve.")}</p>
      <a className={s.continue} href={GOOGLE_REVIEW_URL} rel="noreferrer" onClick={() => {
        if (!clicked.current) { clicked.current = true; trackReviewEvent("review_google_clicked", { source, token }); }
      }}>
        {t("Escribir mi reseña en Google", "Write my review on Google")} <span aria-hidden="true">↗</span>
      </a>
      <p className={s.hint}>{t("Escribes y publicas directamente en Google, con tu cuenta.", "Write and publish directly on Google, using your account.")}</p>
      <p className={s.publication}>{t("Vinculamos tu nombre y correo con tu visita y tu clic a Google para que el equipo de CIRIX conozca el estado de tu solicitud. La reseña se publica directamente en Google.", "We link your name and email to your visit and Google click so the CIRIX team can follow the status of your request. Your review is published directly on Google.")}</p>
    </div>
  </section>;
}
