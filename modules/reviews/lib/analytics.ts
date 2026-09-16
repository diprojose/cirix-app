import type { TrackingInput } from "../domain/reviews";

let memoryVisit: string | undefined;
function visitId(): string {
  try {
    const key = "cirix-review-visit";
    const stored = sessionStorage.getItem(key);
    if (stored && /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(stored)) return stored;
    const id = crypto.randomUUID(); sessionStorage.setItem(key, id); return id;
  } catch { return memoryVisit ??= crypto.randomUUID(); }
}
export function trackReviewEvent(event: TrackingInput["event"], properties: Pick<TrackingInput, "source" | "token">): void {
  try {
    if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const body = JSON.stringify({ event, source: properties.source, token: properties.token, visitId: visitId() });
    void fetch("/api/reviews/events", { method: "POST", headers: { "Content-Type": "application/json" },
      body, keepalive: true, credentials: "omit", referrerPolicy: "no-referrer" }).catch(() => {});
  } catch { /* Tracking must never prevent access to Google. */ }
}
