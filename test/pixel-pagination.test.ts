import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PixelEvent } from "@/modules/pixels/domain/pixel";

const memory = vi.hoisted(() => ({ records: [] as Array<PixelEvent & { expiresAt: string }> }));
vi.mock("server-only", () => ({}));
vi.mock("@/shared/infrastructure/firebase-admin", () => {
  function collection() {
    let data = [...memory.records];
    let size = Infinity;
    const query = {
      doc: () => ({ collection }),
      where: (_field: string, op: string, value: string) => { data = data.filter((e) => op === ">=" ? e.receivedAt >= value : e.receivedAt < value); return query; },
      orderBy: () => { data.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || b.eventId.localeCompare(a.eventId)); return query; },
      startAfter: (time: string, id: string) => { data = data.filter((e) => e.receivedAt < time || e.receivedAt === time && e.eventId < id); return query; },
      limit: (value: number) => { size = value; return query; },
      get: async () => ({ docs: data.slice(0, size).map((e) => ({ id: e.eventId, data: () => e })) }),
    };
    return query;
  }
  return { adminFirestore: () => ({ collection }) };
});
import { listEventPage } from "@/modules/pixels/server/repository";
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-16T12:00:00.000Z")); memory.records = []; });
afterEach(() => vi.useRealTimers());
describe("pixel period pagination", () => {
  it("reads past 100 events without skipping equal timestamps or including other dates", async () => {
    for (let i = 0; i < 503; i++) memory.records.push({ siteId: randomUUID(), eventId: randomUUID(), visitorId: randomUUID(), sessionId: randomUUID(), name: "page_view", pagePath: "/", campaign: {}, clickIds: {}, consent: { analytics: true, marketing: false, version: "1" }, receivedAt: "2026-09-16T10:00:00.000Z", expiresAt: "private-field" });
    memory.records.push({ ...memory.records[0], eventId: randomUUID(), receivedAt: "2026-09-15T10:00:00.000Z" });
    const period = { from: "2026-09-16T00:00:00.000Z", to: "2026-09-16T12:00:00.000Z" };
    const first = await listEventPage("site", period);
    expect(first.events).toHaveLength(500); expect(first.nextCursor).not.toBeNull();
    const last = await listEventPage("site", { ...period, cursorTime: first.nextCursor!.time, cursorId: first.nextCursor!.id });
    expect(last.events).toHaveLength(3); expect(last.nextCursor).toBeNull();
    expect(new Set([...first.events, ...last.events].map((e) => e.eventId)).size).toBe(503);
    expect(first.events[0]).not.toHaveProperty("expiresAt");
  });
  it("excludes expired events and handles empty ranges", async () => {
    expect(await listEventPage("site", { from: "2026-01-01T00:00:00.000Z", to: "2026-01-02T00:00:00.000Z" })).toEqual({ events: [], nextCursor: null });
  });
});
