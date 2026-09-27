import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackReviewEvent } from "@/modules/reviews/lib/analytics";
import { invitationInput } from "@/modules/reviews/domain/reviews";
import { invitationMetrics, googleMetrics, visitMetrics } from "@/modules/reviews/domain/metrics";
import type { Invitation, GoogleReview } from "@/modules/reviews/domain/reviews";
import { invitationComposeLink, publicReviewLink } from "@/modules/reviews/lib/invitation-links";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/reviews/server/repository", () => ({ recordReviewEvent: vi.fn() }));
import { recordReviewEvent } from "@/modules/reviews/server/repository";
vi.mock("@/lib/auth/dal", () => ({ getReviewViewer: vi.fn() }));
vi.mock("@/shared/infrastructure/firebase-admin", () => ({ adminAuth: () => ({ getUser: async () => ({ displayName: "Reviewer" }) }) }));
import { getReviewViewer } from "@/lib/auth/dal";
import { guestViewer } from "@/core/iam/application/dtos/viewer-dto";
import { POST } from "@/app/api/reviews/events/route";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const payload = { event: "review_google_clicked", source: "qr", visitId: id };
const fetchEvent = vi.fn();
beforeEach(() => {
  vi.stubGlobal("navigator", {}); vi.stubGlobal("fetch", fetchEvent);
  const storage = new Map<string, string>();
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) });
  vi.mocked(getReviewViewer).mockResolvedValue({ ...guestViewer, authenticated: true, uid: "reviewer-1", email: "reviewer@example.com" });
  fetchEvent.mockReset().mockResolvedValue({ ok: true });
  vi.mocked(recordReviewEvent).mockReset().mockResolvedValue("recorded");
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function request(body: unknown = payload, origin = "https://cirix.example") {
  return new Request("https://cirix.example/api/reviews/events", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
describe("authenticated review tracking", () => {
  it("uses a stable session identifier and excludes unrelated customer properties", () => {
    const properties = { source: "qr" as const, email: "private@example.com", comment: "private" };
    trackReviewEvent("review_page_view", properties); trackReviewEvent("review_google_clicked", properties);
    const first = JSON.parse(fetchEvent.mock.calls[0][1].body); const second = JSON.parse(fetchEvent.mock.calls[1][1].body);
    expect(first.visitId).toBe(second.visitId);
    expect(Object.keys(first).sort()).toEqual(["event", "source", "visitId"]);
    expect(fetchEvent.mock.calls[0][1]).toMatchObject({ keepalive: true, credentials: "same-origin", referrerPolicy: "no-referrer" });
  });
  it.each([{ doNotTrack: "1" }, { globalPrivacyControl: true }])("respects privacy signal %j", (value) => {
    vi.stubGlobal("navigator", value); trackReviewEvent("review_page_view", { source: "direct" }); expect(fetchEvent).not.toHaveBeenCalled();
  });
  it("never blocks navigation on transport failure", async () => {
    fetchEvent.mockImplementationOnce(() => { throw Error("offline"); });
    expect(() => trackReviewEvent("review_page_view", { source: "direct" })).not.toThrow();
    fetchEvent.mockRejectedValueOnce(Error("offline")); trackReviewEvent("review_google_clicked", { source: "direct" }); await Promise.resolve();
  });
  it("accepts supported events without returning any customer information", async () => {
    const response = await POST(request()); expect(response.status).toBe(204); expect(await response.text()).toBe("");
    expect(recordReviewEvent).toHaveBeenCalledWith(payload, { uid: "reviewer-1", email: "reviewer@example.com", name: "Reviewer" });
  });
  it.each([{ ...payload, uid: "forged-user" }, { ...payload, email: "private@example.com" }, { ...payload, rating: 5 }, { ...payload, comment: "hello" }, { ...payload, event: "review_published" }, { ...payload, token: "email@example.com" }])("rejects unsupported data %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400); expect(recordReviewEvent).not.toHaveBeenCalled();
  });
  it("enforces origin, size and privacy boundaries", async () => {
    expect((await POST(request(payload, "https://other.example"))).status).toBe(403);
    expect((await POST(request({ ...payload, comment: "x".repeat(9000) }))).status).toBe(413);
    const input = request(); input.headers.set("sec-gpc", "1"); expect((await POST(input)).status).toBe(204);
    expect(recordReviewEvent).not.toHaveBeenCalled();
  });
  it("rejects an unauthenticated event without recording an identity", async () => {
    vi.mocked(getReviewViewer).mockResolvedValue(guestViewer);
    expect((await POST(request())).status).toBe(401);
    expect(recordReviewEvent).not.toHaveBeenCalled();
  });
  it("reports unavailable storage and throttling without customer data", async () => {
    vi.mocked(recordReviewEvent).mockRejectedValueOnce(Error("private error")); const failed = await POST(request()); expect(failed.status).toBe(503); expect(await failed.text()).toBe("");
    vi.mocked(recordReviewEvent).mockResolvedValueOnce("limited"); expect((await POST(request())).status).toBe(429);
  });
});
const start = "2026-09-01T00:00:00.000Z", end = "2026-10-01T00:00:00.000Z";
const invitation: Invitation = { id, campaignId: id, token: "a".repeat(48), clientName: "Test Customer", email: "test@example.com", phone: "", source: "email", crmContactId: "", createdAt: start, sentAt: start, openedAt: null, clickedAt: null };
describe("effectiveness metrics", () => {
  it("excludes drafts and prior send cohorts, and calculates distinct invitation stages", () => {
    const result = invitationMetrics([invitation, { ...invitation, openedAt: start }, { ...invitation, openedAt: start, clickedAt: start }, { ...invitation, sentAt: null }, { ...invitation, sentAt: "2026-08-31T00:00:00.000Z", openedAt: start }], start, end);
    expect(result).toMatchObject({ sent: 3, opened: 2, clicked: 1, withoutClick: 1, withoutOpen: 1, openRate: 66.7, clickRate: 33.3, continuationRate: 50 });
  });
  it("filters by campaign/channel and never fabricates a rate with no denominator", () => {
    expect(invitationMetrics([invitation], start, end, "other").clickRate).toBeNull();
    expect(invitationMetrics([invitation], start, end, id, "sms").sent).toBe(0);
    expect(visitMetrics([], start, end).rate).toBeNull();
  });
  it("compares Google review creation in equal periods, including negative growth", () => {
    const review: GoogleReview = { id, author: "Customer", rating: 2, comment: "", createdAt: start, updatedAt: start, reply: null };
    const result = googleMetrics([review, { ...review, createdAt: "2026-08-20T00:00:00.000Z" }, { ...review, createdAt: "2026-08-25T00:00:00.000Z" }, { ...review, createdAt: end }], start, end);
    expect(result).toMatchObject({ count: 1, previousCount: 2, growth: -50, unanswered: 1, distribution: [0, 1, 0, 0, 0] });
  });
});
describe("invitation preparation", () => {
  it("requires the appropriate contact details", () => {
    const input = { campaignId: id, clientName: "Test Customer", source: "email" };
    expect(invitationInput.safeParse(input).success).toBe(false);
    expect(invitationInput.safeParse({ ...input, email: "test@example.com" }).success).toBe(true);
    expect(invitationInput.safeParse({ ...input, source: "whatsapp", phone: "+15551234567" }).success).toBe(true);
  });
  it("uses opaque URL tokens and only composes messages", () => {
    const link = publicReviewLink("https://cirix.example", invitation.token, "email", "es");
    expect(link).not.toContain(invitation.email); expect(link).toContain("/es/make-a-review?ref=");
    const compose = invitationComposeLink(invitation, link, "es")!;
    expect(compose).toMatch(/^mailto:/); expect(decodeURIComponent(compose)).toContain(link); expect(fetchEvent).not.toHaveBeenCalled();
  });
});
