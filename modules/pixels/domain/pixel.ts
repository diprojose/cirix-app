import { z } from "zod";

export const EVENT_NAMES = ["page_view", "view_item", "add_to_cart", "begin_checkout", "purchase", "generate_lead", "contact", "engagement", "scroll"] as const;
export const PROVIDERS = ["meta", "google_ads", "ga4", "tiktok", "linkedin", "pinterest", "snapchat", "other"] as const;
export const idSchema = z.string().uuid();
const campaignValue = z.string().max(160).regex(/^[\w .~+-]*$/);
export const siteInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  origin: z.string().url().max(250).refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
  }, "Use an HTTPS origin without path, credentials or query").transform((value) => new URL(value).origin),
  active: z.boolean().default(true),
  destinations: z.array(z.object({
    provider: z.enum(PROVIDERS),
    pixelId: z.string().trim().min(2).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  }).strict()).max(16).default([]),
}).strict();

export const eventInputSchema = z.object({
  siteId: idSchema,
  eventId: idSchema,
  visitorId: idSchema,
  sessionId: idSchema,
  name: z.enum(EVENT_NAMES),
  // Deliberately omit arbitrary payloads, form fields, IP and raw URLs.
  pagePath: z.string().max(500).regex(/^\/(?!\/)[^?#\s\\]*$/),
  consent: z.object({ analytics: z.literal(true), marketing: z.boolean(), version: z.string().min(1).max(40).regex(/^[\w.-]+$/) }).strict(),
  campaign: z.object({ source: campaignValue.optional(), medium: campaignValue.optional(), campaign: campaignValue.optional() }).strict().default({}),
  clickIds: z.object({ gclid: z.string().max(256).regex(/^[\w.-]+$/).optional(), fbclid: z.string().max(256).regex(/^[\w.-]+$/).optional(), ttclid: z.string().max(256).regex(/^[\w.-]+$/).optional() }).strict().default({}),
  value: z.number().finite().min(0).max(1_000_000_000).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  context: z.object({
    device: z.enum(["mobile", "tablet", "desktop", "unknown"]),
    browser: z.enum(["Chrome", "Safari", "Firefox", "Edge", "Opera", "Samsung", "Other"]),
    os: z.enum(["Windows", "macOS", "iOS", "Android", "Linux", "Other"]),
    language: z.string().max(35).regex(/^[a-zA-Z0-9-]+$/).optional(),
  }).strict().optional(),
  attribution: z.object({
    landingPath: z.string().max(500).regex(/^\/(?!\/)[^?#\s\\]*$/),
    referrerHost: z.string().max(253).regex(/^[a-zA-Z0-9.-]+$/).optional(),
  }).strict().optional(),
  contactChannel: z.enum(["whatsapp", "phone", "email", "form", "other"]).optional(),
  engagementMs: z.number().int().min(0).max(60_000).optional(),
  scrollPercent: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]).optional(),
}).strict().refine((event) => event.name !== "purchase" || (event.value !== undefined && event.currency !== undefined), { message: "Purchase requires value and currency" });

export type PixelSiteInput = z.infer<typeof siteInputSchema>;
export type PixelSite = PixelSiteInput & { id: string; ownerId: string; createdAt: string };
export type PixelEventInput = z.infer<typeof eventInputSchema>;
export type PixelEvent = PixelEventInput & { receivedAt: string; geo?: { country: string; region?: string } };

export function sanitizeEvent(event: PixelEventInput): PixelEventInput {
  return { ...event, clickIds: event.consent.marketing ? event.clickIds : {} };
}
