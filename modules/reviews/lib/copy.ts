import type { Locale } from "@/lib/locale";

type ReviewCopy = {
  title: string; description: string; textareaLabel: string;
  textareaPlaceholder: string; optional: string; continue: string;
  continuing: string; clipboardHint: string; publicationHint: string;
  ratingLabel: string; starLabel: string; metadataTitle: string; metadataDescription: string;
};

export const reviewCopy: Record<Locale, ReviewCopy> = {
  es: {
    title: "¿Cómo fue tu experiencia?",
    description: "Comparte tu experiencia con nosotros.",
    textareaLabel: "Cuéntanos qué te pareció",
    textareaPlaceholder: "Cuéntanos sobre tu experiencia...",
    optional: "Opcional",
    continue: "Continuar en Google",
    continuing: "Continuando...",
    clipboardHint: "Tu comentario se copiará para que puedas pegarlo en Google.",
    publicationHint: "Tú eliges la puntuación y publicas la reseña en Google.",
    ratingLabel: "Calificación (opcional)",
    starLabel: "{value} de 5 estrellas",
    metadataTitle: "Reseña de Cirix Advertising",
    metadataDescription: "Comparte tu experiencia con Cirix Advertising.",
  },
  en: {
    title: "How was your experience?",
    description: "Share your experience with us.",
    textareaLabel: "Tell us what you think",
    textareaPlaceholder: "Tell us about your experience...",
    optional: "Optional",
    continue: "Continue to Google",
    continuing: "Continuing...",
    clipboardHint: "Your comment will be copied so you can paste it into Google.",
    publicationHint: "You choose the rating and publish your review on Google.",
    ratingLabel: "Rating (optional)",
    starLabel: "{value} out of 5 stars",
    metadataTitle: "Review Cirix Advertising",
    metadataDescription: "Share your experience with Cirix Advertising.",
  },
};
