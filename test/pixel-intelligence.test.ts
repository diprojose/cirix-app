import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { eventInputSchema, type PixelEvent } from "@/modules/pixels/domain/pixel";
import { eventsCsv, reportQuerySchema, summarizeEvents } from "@/modules/pixels/domain/report";
import { coarseLocation } from "@/modules/pixels/server/geo";

const siteId = randomUUID();
const script = readFileSync("public/pixel.js", "utf8");
function browser(options: { values?: Map<string, string>; href?: string; unavailable?: boolean } = {}) {
  let now = Date.parse("2026-09-16T12:00:00.000Z");
  const values = options.values ?? new Map<string, string>();
  const listeners = new Map<string, Array<(event?: unknown) => void>>();
  let interval = () => {};
  const storage = { getItem: vi.fn((key: string) => { if (options.unavailable) throw new Error(); return values.get(key) ?? null; }), setItem: vi.fn((key: string, value: string) => { if (options.unavailable) throw new Error(); values.set(key, value); }), removeItem: vi.fn((key: string) => values.delete(key)) };
  const on = (name: string, listener: (event?: unknown) => void) => listeners.set(name, [...listeners.get(name) ?? [], listener]);
  const document = { currentScript: { src: "https://platform.test/pixel.js", getAttribute: () => siteId }, referrer: "https://search.test/path?secret=value", visibilityState: "visible", hasFocus: () => true, documentElement: { scrollHeight: 2000, scrollTop: 0 }, addEventListener: on };
  const location = { href: options.href ?? "https://site.test/services?utm_source=google&utm_medium=cpc&utm_campaign=launch&gclid=ad-id", pathname: "/services" };
  location.pathname = new URL(location.href).pathname;
  const navigator = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1", language: "es-VE", globalPrivacyControl: false, doNotTrack: "0" };
  const payloads: PixelEvent[] = [];
  const fetch = vi.fn(async (_url: string, init: { body: string }) => { payloads.push(JSON.parse(init.body)); return { ok: true }; });
  const window = { localStorage: storage, sessionStorage: storage, dispatchEvent() {}, addEventListener: on, setInterval: (callback: () => void) => { interval = callback; }, innerHeight: 1000, scrollY: 0, cirixPixel: undefined as unknown as { consent: (value: unknown) => void; track: (name: string, properties?: unknown) => unknown; revoke: () => void } };
  runInNewContext(script, { window, document, navigator, location, Date: { now: () => now }, crypto: { randomUUID }, URL, Event, fetch });
  const emit = (name: string, value?: unknown) => listeners.get(name)?.forEach((fn) => fn(value));
  const advance = (ms: number) => { now += ms; };
  return { window, document, navigator, location, storage, values, payloads, emit, advance, tick: () => interval(), pixel: window.cirixPixel };
}

describe("pixel session intelligence", () => {
  it("persists the landing campaign and sanitized referrer across full page navigation", () => {
    const a = browser(); a.pixel.consent({ analytics: true, marketing: true });
    const b = browser({ values: a.values, href: "https://site.test/contact?utm_source=other" }); b.pixel.consent({ analytics: true, marketing: true });
    expect(b.payloads[0]).toMatchObject({ visitorId: a.payloads[0].visitorId, sessionId: a.payloads[0].sessionId, campaign: { source: "google", medium: "cpc", campaign: "launch" }, clickIds: { gclid: "ad-id" }, attribution: { landingPath: "/services", referrerHost: "search.test" }, context: { device: "mobile", browser: "Safari", os: "iOS", language: "es-VE" } });
    expect(JSON.stringify(b.payloads)).not.toContain("secret");
    expect(eventInputSchema.safeParse(b.payloads[0]).success).toBe(true);
  });
  it("drops advertising attribution on downgrade and all state on revocation", () => {
    const a = browser(); a.pixel.consent({ analytics: true, marketing: true });
    a.pixel.consent({ analytics: true, marketing: false });
    const b = browser({ values: a.values, href: "https://site.test/contact" }); b.pixel.consent({ analytics: true, marketing: false });
    expect(b.payloads[0].clickIds).toEqual({});
    expect([...a.values.values()].join("")).not.toContain("ad-id");
    b.pixel.revoke(); expect(b.values.size).toBe(0);
    b.emit("click", { target: { closest: () => ({ getAttribute: () => "tel:+123" }) } });
    b.advance(1000); b.tick(); b.emit("pagehide"); expect(b.payloads).toHaveLength(1);
  });
  it("renews the session after inactivity even with unavailable storage", () => {
    const b = browser({ unavailable: true }); b.pixel.consent({ analytics: true });
    const first = b.payloads[0];
    b.advance(20 * 60000); b.pixel.track("contact"); expect(b.payloads.at(-1)?.sessionId).toBe(first.sessionId);
    b.advance(31 * 60000); b.location.href = "https://site.test/contact?utm_source=new"; b.location.pathname = "/contact";
    b.pixel.track("page_view");
    expect(b.payloads.at(-1)?.sessionId).not.toBe(first.sessionId);
    expect(b.payloads.at(-1)?.visitorId).toBe(first.visitorId);
    expect(b.payloads.at(-1)?.campaign.source).toBe("new");
  });
  it("measures only active visible time and resets scrolling on navigation", () => {
    const b = browser(); b.pixel.consent({ analytics: true });
    for (let i = 0; i < 30; i++) { b.advance(1000); b.tick(); }
    expect(b.payloads.at(-1)).toMatchObject({ name: "engagement", engagementMs: 30000, pagePath: "/services" });
    b.document.visibilityState = "hidden";
    for (let i = 0; i < 30; i++) { b.advance(1000); b.tick(); }
    expect(b.payloads).toHaveLength(2);
    b.document.visibilityState = "visible"; b.window.scrollY = 800; b.emit("scroll"); b.emit("scroll");
    expect(b.payloads.filter((e) => e.name === "scroll")).toHaveLength(1);
    expect(b.payloads.at(-1)?.scrollPercent).toBe(75);
    b.location.pathname = "/contact"; b.location.href = "https://site.test/contact"; b.pixel.track("page_view"); b.emit("scroll");
    expect(b.payloads.filter((e) => e.name === "scroll")).toHaveLength(2);
    b.payloads.forEach((payload) => expect(eventInputSchema.safeParse(payload).success).toBe(true));
  });
  it("classifies contact links without transmitting destinations or bypassing privacy", () => {
    const b = browser();
    const click = (href: string) => b.emit("click", { target: { closest: () => ({ getAttribute: () => href }) } });
    click("tel:+123456"); expect(b.storage.getItem).not.toHaveBeenCalled(); expect(b.payloads).toHaveLength(0);
    b.pixel.consent({ analytics: true });
    click("https://wa.me/123456?text=private"); click("mailto:private@example.com"); click("tel:+123456"); click("https://wa.me.evil.test/");
    expect(b.payloads.slice(1).map((e) => e.contactChannel)).toEqual(["whatsapp", "email", "phone"]);
    expect(JSON.stringify(b.payloads)).not.toContain("private");
    b.navigator.globalPrivacyControl = true; click("tel:+123456"); expect(b.payloads).toHaveLength(4);
  });
});

function event(overrides: Partial<PixelEvent> = {}): PixelEvent {
  return { siteId, eventId: randomUUID(), visitorId: "browser-1", sessionId: "session-1", name: "page_view", pagePath: "/", consent: { analytics: true, marketing: false, version: "1" }, campaign: {}, clickIds: {}, receivedAt: "2026-09-16T12:00:00.000Z", ...overrides };
}
describe("period reports", () => {
  it("counts converting sessions once, separates currencies and fills zero days", () => {
    const summary = summarizeEvents([event(), event({ name: "contact" }), event({ name: "generate_lead" }), event({ name: "purchase", value: 50, currency: "USD" }), event({ name: "purchase", value: 20, currency: "EUR" }), event({ sessionId: "session-2" })], "2026-09-15T00:00:00.000Z", "2026-09-17T00:00:00.000Z");
    expect(summary).toMatchObject({ sessions: 2, browsers: 1, leads: 1, contacts: 1, purchases: 2, conversionRate: 50, revenue: [["EUR", 20], ["USD", 50]] });
    expect(summary.days).toEqual([{ date: "2026-09-15", views: 0, conversions: 0 }, { date: "2026-09-16", views: 2, conversions: 3 }]);
    expect(summary.sources).toEqual([{ label: "(unattributed)", count: 2 }]);
  });
  it("keeps missing context distinct from inferred direct traffic and exports legacy events", () => {
    const csv = eventsCsv([event({ campaign: { source: "=DANGEROUS()", campaign: 'a,"b"\nc' } })]);
    expect(csv).toContain('"\'=DANGEROUS()"'); expect(csv).toContain('"a,""b""\nc"');
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(summarizeEvents([], "2026-09-16T00:00:00.000Z", "2026-09-17T00:00:00.000Z").conversionRate).toBe(0);
  });
  it("validates date boundaries and complete stable cursors", () => {
    const period = { from: "2026-09-15T00:00:00Z", to: "2026-09-17T00:00:00Z" };
    expect(reportQuerySchema.parse(period).from).toBe("2026-09-15T00:00:00.000Z");
    expect(reportQuerySchema.safeParse({ ...period, cursorId: randomUUID() }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ ...period, cursorId: randomUUID(), cursorTime: "2026-09-18T00:00:00Z" }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ ...period, from: "2026-01-01T00:00:00Z" }).success).toBe(false);
  });
});

afterEach(() => vi.unstubAllEnvs());
describe("coarse hosting location", () => {
  it("accepts only bounded hosting metadata and never uses a raw IP", () => {
    const headers = new Headers({ "x-vercel-ip-country": "VE", "x-vercel-ip-country-region": "A", "x-forwarded-for": "1.2.3.4" });
    vi.stubEnv("VERCEL", ""); expect(coarseLocation(headers)).toBeUndefined();
    vi.stubEnv("VERCEL", "1"); expect(coarseLocation(headers)).toEqual({ country: "VE", region: "A" });
    headers.set("x-vercel-ip-country", "arbitrary"); expect(coarseLocation(headers)).toBeUndefined();
  });
});
