import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventInputSchema, type PixelSite } from "@/modules/pixels/domain/pixel";

const memory = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>() }));
vi.mock("server-only", () => ({}));
vi.mock("@/shared/infrastructure/firebase-admin", () => {
  const ref = (path: string): { path: string; collection: (name: string) => ReturnType<typeof collection> } => ({ path, collection: (name: string) => collection(`${path}/${name}`) });
  const collection = (path: string) => ({ doc: (id: string) => ref(`${path}/${id}`) });
  return { adminFirestore: () => ({ collection, runTransaction: async (callback: (transaction: unknown) => Promise<unknown>) => {
    const writes: Array<() => void> = [];
    const result = await callback({
      get: async (doc: { path: string }) => ({ exists: memory.records.has(doc.path), data: () => memory.records.get(doc.path) }),
      set: (doc: { path: string }, data: Record<string, unknown>) => { writes.push(() => memory.records.set(doc.path, data)); },
      create: (doc: { path: string }, data: Record<string, unknown>) => { writes.push(() => { if (memory.records.has(doc.path)) throw new Error("duplicate"); memory.records.set(doc.path, data); }); },
      update: (doc: { path: string }, data: Record<string, unknown>) => { writes.push(() => memory.records.set(doc.path, { ...memory.records.get(doc.path), ...data })); },
    });
    writes.forEach((write) => write()); return result;
  } }) };
});
import { recordEvent, updateSite } from "@/modules/pixels/server/repository";
const site: PixelSite = { id: randomUUID(), ownerId: "owner", name: "Cirix", origin: "https://cirixad.com", active: true, destinations: [], createdAt: new Date().toISOString() };
const sitePath = `pixel_sites/${site.id}`;
const input = () => eventInputSchema.parse({ siteId: site.id, eventId: randomUUID(), visitorId: randomUUID(), sessionId: randomUUID(), name: "page_view", pagePath: "/", consent: { analytics: true, marketing: false, version: "1" }, clickIds: { fbclid: "abc" } });
beforeEach(() => { memory.records.clear(); memory.records.set(sitePath, site); });
describe("persistent pixel collection", () => {
  it("deduplicates repeated event IDs without overwriting or consuming quota twice", async () => {
    const event = input();
    expect(await recordEvent(event, site.origin)).toBe("created");
    expect(await recordEvent({ ...event, name: "contact" }, site.origin)).toBe("duplicate");
    expect(memory.records.get(`${sitePath}/pixel_events/${event.eventId}`)?.name).toBe("page_view");
    const rate = [...memory.records.entries()].find(([path]) => path.includes("pixel_rate_limits"));
    expect(rate?.[1].count).toBe(1);
  });
  it("rechecks paused sites and changed origins inside the transaction", async () => {
    memory.records.set(sitePath, { ...site, active: false });
    expect(await recordEvent(input(), site.origin)).toBe("forbidden");
    memory.records.set(sitePath, { ...site, origin: "https://another.example" });
    expect(await recordEvent(input(), site.origin)).toBe("forbidden");
    expect(memory.records.size).toBe(1);
  });
  it("enforces the shared site ceiling without creating an event", async () => {
    const minute = Math.floor(Date.now() / 60000);
    memory.records.set(`${sitePath}/pixel_rate_limits/${minute}`, { count: 300 });
    expect(await recordEvent(input(), site.origin)).toBe("limited");
    expect(memory.records.size).toBe(2);
  });
  it("persists server time, a Firestore timestamp expiry and sanitized attribution", async () => {
    const event = input(); const before = Date.now();
    await recordEvent(event, site.origin);
    const stored = memory.records.get(`${sitePath}/pixel_events/${event.eventId}`)!;
    expect(stored.clickIds).toEqual({});
    expect(Date.parse(stored.receivedAt as string)).toBeGreaterThanOrEqual(before);
    expect((stored.expiresAt as { toMillis: () => number }).toMillis()).toBeGreaterThanOrEqual(before + 90 * 86400_000);
  });
  it("prevents ownership changes and unauthorized configuration updates", async () => {
    const config = { name: "Changed", origin: site.origin, active: false, destinations: [] };
    expect(await updateSite(site.id, "another-owner", config)).toBe(false);
    expect(memory.records.get(sitePath)?.active).toBe(true);
    expect(await updateSite(site.id, site.ownerId, config)).toBe(true);
    expect(memory.records.get(sitePath)).toMatchObject({ ownerId: "owner", active: false });
  });
});
