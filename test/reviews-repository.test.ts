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
const identity = { uid: "reviewer-1", email: "reviewer@example.com", name: "Reviewer" };
const input = { event: "review_google_clicked" as const, source: "email" as const, visitId, token };
beforeEach(() => {
  store.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
  store.set(`review_links/${token}`, { invitationId: "invitation", campaignId: "campaign" });
  store.set("review_invitations/invitation", { token, createdAt: "2026-09-15T00:00:00.000Z", sentAt: "2026-09-16T11:00:00.000Z", openedAt: null, clickedAt: null });
});
afterEach(() => vi.useRealTimers());
describe("persisted review progression", () => {
  const participants = () => [...store.entries()].filter(([key]) => key.startsWith("review_participants/")).map(([, value]) => value);
  it("links verified identities and preserves clicked status across sessions and late page views", async () => {
    store.get(`review_links/${token}`)!.invitationId = null;
    await recordReviewEvent(input, identity);
    vi.advanceTimersByTime(1000);
    await recordReviewEvent({ ...input, event: "review_page_view", visitId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }, { ...identity, name: "Updated name" });
    expect(participants()).toHaveLength(1);
    expect(participants()[0]).toMatchObject({ ...identity, name: "Updated name", campaignId: "campaign", source: "email",
      openedAt: "2026-09-16T12:00:00.000Z", clickedAt: "2026-09-16T12:00:00.000Z", lastSeenAt: "2026-09-16T12:00:01.000Z" });
  });
  it("separates two accounts sharing a browser session and does not transfer click status", async () => {
    store.get(`review_links/${token}`)!.invitationId = null;
    await recordReviewEvent(input, identity);
    await recordReviewEvent({ ...input, event: "review_page_view" }, { uid: "reviewer-2", email: "second@example.com", name: null });
    expect(participants()).toHaveLength(2);
    expect(participants().find((item) => item.uid === "reviewer-2")?.clickedAt).toBeNull();
    expect([...store.keys()].filter((key) => key.startsWith("review_visits/"))).toHaveLength(2);
  });
  it("keeps each user's campaign and channel progression separate", async () => {
    await recordReviewEvent(input, identity);
    await recordReviewEvent({ ...input, token: undefined, source: "direct", event: "review_page_view" }, identity);
    expect(participants()).toHaveLength(2);
    expect(participants().find((item) => item.campaignId === null)?.clickedAt).toBeNull();
  });
  it("starts fresh when a retained participant has expired even if TTL deletion is pending", async () => {
    await recordReviewEvent({ ...input, token: undefined }, identity);
    vi.advanceTimersByTime(181 * 86400_000);
    await recordReviewEvent({ ...input, token: undefined, event: "review_page_view" }, identity);
    expect(participants()).toHaveLength(1);
    expect(participants()[0].openedAt).toBe(new Date().toISOString());
    expect(participants()[0].clickedAt).toBeNull();
  });
  it("deduplicates clicks and preserves them when page-view arrives out of order", async () => {
    await recordReviewEvent(input, identity); const first = { ...store.get("review_invitations/invitation") };
    vi.advanceTimersByTime(1000); await recordReviewEvent({ ...input, event: "review_page_view" }, identity);
    vi.advanceTimersByTime(1000); await recordReviewEvent(input, identity);
    expect(store.get("review_invitations/invitation")).toEqual(first);
    expect(first.openedAt).toBe(first.clickedAt); expect(first.clickedAt).toBe("2026-09-16T12:00:00.000Z");
    expect([...store.keys()].filter((key) => key.startsWith("review_visits/"))).toHaveLength(0);
  });
  it("ignores drafts, missing and expired tokens", async () => {
    store.get("review_invitations/invitation")!.sentAt = null;
    expect(await recordReviewEvent(input, identity)).toBe("ignored");
    expect(await recordReviewEvent({ ...input, token: "b".repeat(48) }, identity)).toBe("ignored");
    store.get(`review_links/${token}`)!.expiresAt = { toMillis: () => Date.now() - 1 };
    expect(await recordReviewEvent(input, identity)).toBe("ignored");
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
    await recordReviewEvent(input, identity); vi.advanceTimersByTime(1000);
    await recordReviewEvent({ ...input, event: "review_page_view" }, identity);
    const visits = [...store.entries()].filter(([key]) => key.startsWith("review_visits/"));
    expect(visits).toHaveLength(1); expect(visits[0][1]).toMatchObject({ campaignId: "campaign", openedAt: "2026-09-16T12:00:00.000Z", clickedAt: "2026-09-16T12:00:00.000Z" });
    await recordReviewEvent({ ...input, visitId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }, identity);
    expect([...store.keys()].filter((key) => key.startsWith("review_visits/"))).toHaveLength(2);
  });
  it("stops writes at the intake limit", async () => {
    store.set(`review_rate_limits/${Math.floor(Date.now() / 60000)}`, { count: 300 });
    expect(await recordReviewEvent(input, identity)).toBe("limited"); expect(store.get("review_invitations/invitation")!.clickedAt).toBeNull();
  });
});
