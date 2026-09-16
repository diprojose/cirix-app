import type { ReviewSource } from "./constants";

export const REVIEW_EVENTS = [
  "review_page_view", "review_rating_selected", "review_text_started", "review_google_clicked",
] as const;
export type ReviewEvent = (typeof REVIEW_EVENTS)[number];
export type ReviewProperties = { source: ReviewSource; rating?: number | null; hasComment?: boolean };

/** Only these three fields cross the boundary; never send text, URLs or visitor IDs. */
export function trackReviewEvent(event: ReviewEvent, properties: ReviewProperties): void {
  try {
    if (navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const { source, rating, hasComment } = properties;
    const body = JSON.stringify({ event, source, rating, hasComment });
    void fetch("/api/reviews/events", {
      method: "POST", headers: { "Content-Type": "application/json" }, body,
      keepalive: true, credentials: "omit", referrerPolicy: "no-referrer",
    }).catch(() => {});
  } catch {
    // Analytics is best effort and must never interrupt the form.
  }
}
