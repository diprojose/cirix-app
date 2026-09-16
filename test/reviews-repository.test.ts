import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const store = vi.hoisted(() => new Map<string, Record<string, unknown>>());
vi.mock("@/shared/infrastructure/firebase-admin", () => ({ adminFirestore: () => ({
  collection: (name: string) => ({ doc: (id: string) => `${name}/${id}` }),
  runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
    let wrote = false;
    return fn({
      get: async (ref: string) => { if (wrote) throw Error("read after write"); return { data: () => store.get(ref) }; },
      set: (ref: string, value: Record<string, unknown>) => { wrote = true; store.set(ref, value); },
      update: (ref: string, value: Record<string, unknown>) => { wrote = true; if (!store.has(ref)) throw Error("missing"); store.set(ref, { ...store.get(ref), ...value }); },
    });
  },
}) }));
import { markInvitationSent, recordReviewEvent } from "@/modules/reviews/server/repository";
const token = "a".repeat(48), visitId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const input = { event: "review_google_clicked" as const, source: "email" as const, visitId, token };
beforeEach(() => {
  store.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
  store.set(`review_links/${token}`, { invitationId: "invitation", campaignId: "campaign" });
  store.set("review_invitations/invitation", { token, createdAt: "2026-09-15T00:00:00.000Z", sentAt: "2026-09-16T11:00:00.000Z", openedAt: null, clickedAt: null });
});
afterEach(() => vi.useRealTimers());
describe("persisted review progression", () => {
  it("deduplicates clicks and preserves them when page-view arrives out of order", async () => {
    await recordReviewEvent(input); const first = { ...store.get("review_invitations/invitation") };
    vi.advanceTimersByTime(1000); await recordReviewEvent({ ...input, event: "review_page_view" });
    vi.advanceTimersByTime(1000); await recordReviewEvent(input);
    expect(store.get("review_invitations/invitation")).toEqual(first);
    expect(first.openedAt).toBe(first.clickedAt); expect(first.clickedAt).toBe("2026-09-16T12:00:00.000Z");
    expect([...store.keys()].filter((key) => key.startsWith("review_visits/"))).toHaveLength(0);
  });
  it("ignores drafts, missing and expired tokens", async () => {
    store.get("review_invitations/invitation")!.sentAt = null;
    expect(await recordReviewEvent(input)).toBe("ignored");
    expect(await recordReviewEvent({ ...input, token: "b".repeat(48) })).toBe("ignored");
    store.get(`review_links/${token}`)!.expiresAt = { toMillis: () => Date.now() - 1 };
    expect(await recordReviewEvent(input)).toBe("ignored");
    expect(store.get("review_invitations/invitation")!.openedAt).toBeNull();
  });
  it("records a send once and extends token retention from that send", async () => {
    store.get("review_invitations/invitation")!.sentAt = null;
    expect(await markInvitationSent("invitation")).toBe(true);
    const first = { ...store.get("review_invitations/invitation") };
    vi.advanceTimersByTime(1000); expect(await markInvitationSent("invitation")).toBe(true);
    expect(store.get("review_invitations/invitation")).toEqual(first);
    expect(first.reportAt).toBe(first.sentAt);
    expect(store.get(`review_links/${token}`)!.expiresAt).toEqual(first.expiresAt);
    expect(await markInvitationSent("missing")).toBe(false);
  });
  it("stores general sessions separately and deduplicates their first milestones", async () => {
    store.get(`review_links/${token}`)!.invitationId = null;
    await recordReviewEvent(input); vi.advanceTimersByTime(1000);
    await recordReviewEvent({ ...input, event: "review_page_view" });
    const visits = [...store.entries()].filter(([key]) => key.startsWith("review_visits/"));
    expect(visits).toHaveLength(1); expect(visits[0][1]).toMatchObject({ campaignId: "campaign", openedAt: "2026-09-16T12:00:00.000Z", clickedAt: "2026-09-16T12:00:00.000Z" });
    await recordReviewEvent({ ...input, visitId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" });
    expect([...store.keys()].filter((key) => key.startsWith("review_visits/"))).toHaveLength(2);
  });
  it("stops writes at the intake limit", async () => {
    store.set(`review_rate_limits/${Math.floor(Date.now() / 60000)}`, { count: 300 });
    expect(await recordReviewEvent(input)).toBe("limited"); expect(store.get("review_invitations/invitation")!.clickedAt).toBeNull();
  });
});
