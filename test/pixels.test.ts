import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventInputSchema, sanitizeEvent, siteInputSchema, type PixelSite } from "@/modules/pixels/domain/pixel";
import { guestViewer } from "@/core/iam/application/dtos/viewer-dto";

const mocks = vi.hoisted(() => ({ getSite: vi.fn(), recordEvent: vi.fn(), listEvents: vi.fn(), listEventPage: vi.fn(), updateSite: vi.fn(), getViewer: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/pixels/server/repository", () => mocks);
vi.mock("@/lib/auth/dal", () => ({ getViewer: mocks.getViewer }));
import { POST, OPTIONS } from "@/app/api/pixels/collect/route";
import { GET, PATCH } from "@/app/api/pixels/sites/[id]/route";

const site: PixelSite = { id: randomUUID(), ownerId: "owner", name: "Cirix", origin: "https://cirixad.com", active: true, destinations: [], createdAt: new Date().toISOString() };
const event = () => ({ siteId: site.id, eventId: randomUUID(), visitorId: randomUUID(), sessionId: randomUUID(), name: "page_view", pagePath: "/", consent: { analytics: true, marketing: false, version: "1" }, campaign: {}, clickIds: { gclid: "abc" } });
const request = (payload: unknown = event(), origin: string = site.origin) => new Request(`https://cirixadv.com/api/pixels/collect?siteId=${site.id}`, { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(payload) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSite.mockResolvedValue(site); mocks.recordEvent.mockResolvedValue("created"); mocks.listEvents.mockResolvedValue([]);
  mocks.getViewer.mockResolvedValue({ ...guestViewer, authenticated: true, uid: "owner" });
});

describe("pixel ingestion boundary", () => {
  it("collects an allowed site's validated events without a platform session", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(response.headers.get("access-control-allow-origin")).toBe(site.origin);
    expect(mocks.getViewer).not.toHaveBeenCalled();
  });
  it.each(["https://evil.test", "https://cirixad.com.evil.test", "https://www.cirixad.com", "null", ""])("rejects a different origin: %s", async (origin) => {
    expect((await POST(request(event(), origin))).status).toBe(403);
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });
  it("rejects inactive sites and prevents CORS access", async () => {
    mocks.getSite.mockResolvedValue({ ...site, active: false });
    const response = await OPTIONS(request());
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
  it("allows preflight only for the registered origin", async () => {
    expect((await OPTIONS(request())).status).toBe(204);
  });
  it("requires explicit analytics consent and a matching site ID", async () => {
    expect((await POST(request({ ...event(), consent: { analytics: false, marketing: true, version: "1" } }))).status).toBe(400);
    expect((await POST(request({ ...event(), siteId: randomUUID() }))).status).toBe(400);
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });
  it("does not persist events when GPC is sent", async () => {
    const req = request(); req.headers.set("sec-gpc", "1");
    expect((await POST(req)).status).toBe(204);
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });
  it("bounds streamed payloads even without Content-Length", async () => {
    expect((await POST(request({ value: "x".repeat(9000) }))).status).toBe(413);
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON and non-JSON requests", async () => {
    const malformed = new Request(request(), { body: "{" });
    expect((await POST(malformed)).status).toBe(400);
    const wrongType = request(); wrongType.headers.set("content-type", "text/plain");
    expect((await POST(wrongType)).status).toBe(415);
  });
  it("reports duplicate delivery, throttling and storage outages accurately", async () => {
    mocks.recordEvent.mockResolvedValue("duplicate");
    expect((await POST(request())).status).toBe(200);
    mocks.recordEvent.mockResolvedValue("limited");
    const limited = await POST(request());
    expect(limited.status).toBe(429); expect(limited.headers.get("retry-after")).toBe("60");
    mocks.recordEvent.mockRejectedValue(new Error("secret provider details"));
    const failed = await POST(request());
    expect(failed.status).toBe(503); expect(await failed.text()).not.toContain("secret");
  });
});

describe("pixel ownership and minimization", () => {
  const context = { params: Promise.resolve({ id: site.id }) };
  it("rejects anonymous direct API invocation", async () => {
    mocks.getViewer.mockResolvedValue(guestViewer);
    expect((await GET(request(), context)).status).toBe(401);
    expect(mocks.getSite).not.toHaveBeenCalled();
  });
  it("does not expose another owner's events", async () => {
    mocks.getSite.mockResolvedValue({ ...site, ownerId: "another-owner" });
    expect((await GET(request(), context)).status).toBe(404);
    expect(mocks.listEvents).not.toHaveBeenCalled();
  });
  it("validates period queries and retains ownership checks for paginated reports", async () => {
    const from = new Date(Date.now() - 86400_000).toISOString(), to = new Date().toISOString();
    const req = new Request(`https://cirixadv.com/api/pixels/sites/${site.id}?${new URLSearchParams({ from, to })}`);
    mocks.listEventPage.mockResolvedValue({ events: [], nextCursor: null });
    expect((await GET(req, context)).status).toBe(200);
    expect(mocks.listEventPage).toHaveBeenCalledWith(site.id, { from, to });
    mocks.listEventPage.mockClear();
    mocks.getSite.mockResolvedValue({ ...site, ownerId: "another-owner" });
    expect((await GET(req, context)).status).toBe(404);
    expect(mocks.listEventPage).not.toHaveBeenCalled();
    mocks.getSite.mockResolvedValue(site);
    expect((await GET(new Request(req.url + "&cursorId=invalid"), context)).status).toBe(400);
    expect((await GET(new Request(`https://cirixadv.com/api/pixels/sites/${site.id}?from=invalid`), context)).status).toBe(400);
    expect(mocks.listEventPage).not.toHaveBeenCalled();
  });
  it("rejects cross-origin edits before reading their body", async () => {
    expect((await PATCH(request(), context)).status).toBe(403);
    expect(mocks.updateSite).not.toHaveBeenCalled();
  });
  it("removes ad click IDs unless marketing consent is granted", () => {
    expect(sanitizeEvent(eventInputSchema.parse(event())).clickIds).toEqual({});
    const input = event(); input.consent.marketing = true;
    expect(sanitizeEvent(eventInputSchema.parse(input)).clickIds).toEqual({ gclid: "abc" });
  });
  it("rejects arbitrary fields, raw URLs, query strings and purchases without money", () => {
    for (const extra of [{ email: "person@example.com" }, { pagePath: "https://test.com" }, { pagePath: "/?email=person@example.com" }, { pagePath: "//evil.test" }, { name: "purchase" }]) {
      expect(eventInputSchema.safeParse({ ...event(), ...extra }).success).toBe(false);
    }
    expect(eventInputSchema.safeParse({ ...event(), name: "purchase", value: 20, currency: "USD" }).success).toBe(true);
  });
  it("registers only an HTTPS origin without credentials or paths", () => {
    for (const origin of ["http://example.com", "https://example.com/path", "https://a:b@example.com", "https://example.com?x=y"]) {
      expect(siteInputSchema.safeParse({ name: "Example", origin }).success).toBe(false);
    }
    expect(siteInputSchema.parse({ name: "Example", origin: "https://EXAMPLE.com/" }).origin).toBe("https://example.com");
  });
});

function browser(blocked = false, unavailableStorage = false) {
  const values = new Map<string, string>();
  const storage = { getItem: vi.fn((key: string) => { if (unavailableStorage) throw new Error(); return values.get(key) ?? null; }), setItem: vi.fn((key: string, value: string) => { values.set(key, value); }), removeItem: vi.fn((key: string) => { values.delete(key); }) };
  const fetch = vi.fn(async () => ({ ok: true }));
  const window = { localStorage: storage, sessionStorage: storage, dispatchEvent: vi.fn(), cirixPixel: undefined as unknown as { consent: (choice: unknown) => void; track: (name: string, properties?: unknown) => Promise<boolean> | false; revoke: () => void } };
  runInNewContext(readFileSync("public/pixel.js", "utf8"), { window, document: { currentScript: { src: "https://cirixadv.com/pixel.js", getAttribute: () => site.id } }, navigator: { globalPrivacyControl: blocked }, location: { href: "https://cirixad.com/?utm_source=google&gclid=abc&email=private@example.com", pathname: "/" }, crypto: { randomUUID }, URL, Event, fetch });
  return { window, storage, fetch, values, payload: () => JSON.parse((fetch.mock.calls.at(-1) as unknown as [string, { body: string }])[1].body) };
}
describe("browser pixel", () => {
  it("does not access browser storage or send events before consent", () => {
    const b = browser(); b.window.cirixPixel.track("page_view");
    expect(b.storage.getItem).not.toHaveBeenCalled(); expect(b.fetch).not.toHaveBeenCalled();
  });
  it("captures the initial visit once and never collects arbitrary URL parameters", () => {
    const b = browser();
    b.window.cirixPixel.consent({ analytics: true, marketing: false });
    b.window.cirixPixel.consent({ analytics: true, marketing: false });
    expect(b.fetch).toHaveBeenCalledTimes(1);
    expect(b.payload().campaign).toEqual({ source: "google" });
    expect(b.payload().clickIds).toEqual({});
    expect(JSON.stringify(b.payload())).not.toContain("private@example.com");
  });
  it("keeps a stable browser ID, separates permissions, and clears IDs on withdrawal", async () => {
    const b = browser(); b.window.cirixPixel.consent({ analytics: true });
    const id = b.payload().visitorId;
    b.window.cirixPixel.consent({ analytics: true, marketing: true });
    const eventId = randomUUID();
    await b.window.cirixPixel.track("purchase", { eventId, value: 12, currency: "USD" });
    expect(b.payload()).toMatchObject({ visitorId: id, eventId, clickIds: { gclid: "abc" } });
    b.window.cirixPixel.revoke();
    expect(b.values.size).toBe(0);
    expect(b.window.cirixPixel.track("contact")).toBe(false);
    b.window.cirixPixel.consent({ analytics: true });
    expect(b.payload().visitorId).not.toBe(id);
  });
  it("honors GPC even if the CMP tries to grant permission", () => {
    const b = browser(true); b.window.cirixPixel.consent({ analytics: true, marketing: true });
    expect(b.fetch).not.toHaveBeenCalled(); expect(b.storage.setItem).not.toHaveBeenCalled();
  });
  it("uses stable in-memory IDs when storage is unavailable", async () => {
    const b = browser(false, true); b.window.cirixPixel.consent({ analytics: true });
    const id = b.payload().visitorId;
    await b.window.cirixPixel.track("contact");
    expect(b.payload().visitorId).toBe(id);
  });
});
