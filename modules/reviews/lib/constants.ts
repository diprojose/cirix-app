export const GOOGLE_REVIEW_URL =
  process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ||
  "https://g.page/r/CQhaSTMynPzJEBM/review";

export const REVIEW_SOURCES = ["qr", "whatsapp", "email", "sms", "direct"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

export function reviewSource(value: string | string[] | undefined): ReviewSource {
  const source = Array.isArray(value) ? value[0] : value;
  return REVIEW_SOURCES.includes(source as ReviewSource) ? source as ReviewSource : "direct";
}
