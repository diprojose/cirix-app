import { z } from "zod";
import type { PixelEvent } from "./pixel";

const isoDate = z.string().datetime().transform((value) => new Date(value).toISOString());
export const reportQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  cursorTime: isoDate.optional(),
  cursorId: z.string().uuid().optional(),
}).refine((q) => Date.parse(q.to) > Date.parse(q.from) && Date.parse(q.to) - Date.parse(q.from) <= 90 * 86400_000, "Invalid period")
  .refine((q) => Boolean(q.cursorTime) === Boolean(q.cursorId), "Incomplete cursor")
  .refine((q) => !q.cursorTime || (q.cursorTime >= q.from && q.cursorTime < q.to), "Cursor outside period");
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type EventPage = { events: PixelEvent[]; nextCursor: { time: string; id: string } | null };
export const isConversion = (event: PixelEvent) => event.name === "generate_lead" || event.name === "purchase";
export const sessionKey = (event: PixelEvent) => `${event.visitorId}:${event.sessionId}`;
export const sourceKey = (event: PixelEvent) => event.campaign.source || event.attribution?.referrerHost || "(unattributed)";

export function summarizeEvents(events: PixelEvent[], from: string, to: string) {
  const sessions = new Set<string>(), browsers = new Set<string>(), converted = new Set<string>();
  const sources = new Map<string, Set<string>>(), pages = new Map<string, number>(), revenue = new Map<string, number>();
  const days = new Map<string, { views: number; conversions: number }>();
  for (let day = Date.parse(from.slice(0, 10)); day < Date.parse(to); day += 86400_000) {
    days.set(new Date(day).toISOString().slice(0, 10), { views: 0, conversions: 0 });
  }
  let contacts = 0, leads = 0, purchases = 0, engagementMs = 0;
  for (const event of events) {
    const session = sessionKey(event);
    sessions.add(session); browsers.add(event.visitorId);
    if (isConversion(event)) converted.add(session);
    const source = sourceKey(event);
    if (!sources.has(source)) sources.set(source, new Set());
    sources.get(source)!.add(session);
    const day = days.get(event.receivedAt.slice(0, 10));
    if (day && event.name === "page_view") day.views++;
    if (day && isConversion(event)) day.conversions++;
    if (event.name === "contact") { contacts++; pages.set(event.pagePath, (pages.get(event.pagePath) ?? 0) + 1); }
    if (event.name === "generate_lead") leads++;
    if (event.name === "purchase") {
      purchases++;
      if (event.currency && event.value !== undefined) revenue.set(event.currency, (revenue.get(event.currency) ?? 0) + event.value);
    }
    if (event.name === "engagement") engagementMs += event.engagementMs ?? 0;
  }
  return {
    sessions: sessions.size, browsers: browsers.size, contacts, leads, purchases, engagementMs,
    conversionRate: sessions.size ? converted.size / sessions.size * 100 : 0,
    revenue: [...revenue].sort(([a], [b]) => a.localeCompare(b)),
    sources: [...sources].map(([label, values]) => ({ label, count: values.size })).sort((a, b) => b.count - a.count),
    pages: [...pages].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    days: [...days].map(([date, values]) => ({ date, ...values })),
  };
}

// Quote every cell and neutralize spreadsheet formulas, including leading whitespace.
export function eventsCsv(events: PixelEvent[]) {
  const cell = (value: unknown) => {
    let text = value === undefined || value === null ? "" : String(value);
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const header = ["received_at_utc", "event", "page", "visitor_id", "session_id", "source", "medium", "campaign", "landing_page", "referrer_host", "device", "browser", "os", "country", "region", "contact_channel", "value", "currency", "engagement_ms", "scroll_percent", "analytics_consent", "marketing_consent", "consent_version", "event_id"];
  return "\uFEFF" + [header, ...events.map((e) => [e.receivedAt, e.name, e.pagePath, e.visitorId, e.sessionId, e.campaign.source, e.campaign.medium, e.campaign.campaign, e.attribution?.landingPath, e.attribution?.referrerHost, e.context?.device, e.context?.browser, e.context?.os, e.geo?.country, e.geo?.region, e.contactChannel, e.value, e.currency, e.engagementMs, e.scrollPercent, e.consent.analytics, e.consent.marketing, e.consent.version, e.eventId])].map((row) => row.map(cell).join(",")).join("\r\n");
}
