import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ getViewer: vi.fn(), requirePlatformUser: vi.fn(), requireOperator: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: async () => "es" }));
vi.mock("@/modules/reviews/ui/reviews-dashboard", () => ({ ReviewsDashboard: () => null }));
vi.mock("@/modules/reviews/server/repository", () => ({ listReviewData: vi.fn(), createCampaign: vi.fn(), createInvitation: vi.fn(), markInvitationSent: vi.fn() }));
vi.mock("@/modules/reviews/server/google", () => ({ googleReviewsConfigured: vi.fn(), fetchGoogleReviews: vi.fn() }));
import { getViewer, requirePlatformUser, requireOperator } from "@/lib/auth/dal";
import { guestViewer, type ViewerDto } from "@/core/iam/application/dtos/viewer-dto";
import DashboardPage from "@/modules/reviews/server/dashboard-page";
import { listReviewData, createCampaign, createInvitation, markInvitationSent } from "@/modules/reviews/server/repository";
import { googleReviewsConfigured, fetchGoogleReviews } from "@/modules/reviews/server/google";
import { GET } from "@/app/api/reviews/dashboard/route";
import { POST as campaign } from "@/app/api/reviews/campaigns/route";
import { POST as invitation } from "@/app/api/reviews/invitations/route";
import { POST as google } from "@/app/api/reviews/google/route";
import { PATCH } from "@/app/api/reviews/invitations/[id]/route";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const request = (body: unknown, origin = "https://cirix.example") => new Request("https://cirix.example/api/reviews/campaigns", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const admitted: ViewerDto = { ...guestViewer, authenticated: true, uid: "approved-user", tier: "customer", email: "approved@example.com" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getViewer).mockResolvedValue(admitted);
  vi.mocked(requirePlatformUser).mockResolvedValue(admitted);
  vi.mocked(requireOperator).mockRejectedValue(new Error("redirect:/es/loyalty"));
});
describe("private platform review access", () => {
  it("opens the dashboard for an admitted user without the Loyalty operator role", async () => {
    await expect(DashboardPage()).resolves.toBeTruthy();
    expect(requirePlatformUser).toHaveBeenCalledOnce();
    expect(requireOperator).not.toHaveBeenCalled();
  });
  it("gates every endpoint by administrative admission before reading or changing data", async () => {
    vi.mocked(getViewer).mockResolvedValue(guestViewer);
    for (const response of [await GET(), await campaign(request({})), await invitation(request({})), await google(request({})), await PATCH(request({}), { params: Promise.resolve({ id }) })]) expect(response.status).toBe(401);
    for (const operation of [listReviewData, createCampaign, createInvitation, markInvitationSent, fetchGoogleReviews]) expect(operation).not.toHaveBeenCalled();
  });
  it("allows all Reviews operations for admitted platform users without store permissions", async () => {
    vi.mocked(listReviewData).mockResolvedValue({ campaigns: [], invitations: [], visits: [], windowStart: "2026-09-01T00:00:00.000Z" });
    vi.mocked(createCampaign).mockResolvedValue({ id, name: "Campaign", token: "a".repeat(48), createdAt: "2026-09-16T00:00:00.000Z" });
    vi.mocked(markInvitationSent).mockResolvedValue(true);
    vi.mocked(googleReviewsConfigured).mockReturnValue(true);
    vi.mocked(fetchGoogleReviews).mockResolvedValue({ reviews: [], averageRating: null, totalReviewCount: 0, fetchedAt: "2026-09-16T00:00:00.000Z" });
    expect((await GET()).status).toBe(200);
    expect((await campaign(request({ name: "Campaign" }))).status).toBe(201);
    expect((await invitation(request({ campaignId: id, clientName: "Customer", source: "email", email: "customer@example.com" }))).status).toBe(201);
    expect(createInvitation).toHaveBeenCalledOnce();
    expect((await PATCH(request({ action: "mark_sent" }), { params: Promise.resolve({ id }) })).status).toBe(204);
    expect((await google(request({}))).status).toBe(200);
  });
  it("rejects foreign-origin mutations and invalid customer data", async () => {
    expect((await campaign(request({ name: "Valid name" }, "https://other.example"))).status).toBe(403);
    expect((await invitation(request({ campaignId: id, clientName: "Customer", source: "email" }))).status).toBe(400);
    expect(createCampaign).not.toHaveBeenCalled(); expect(createInvitation).not.toHaveBeenCalled();
  });
  it("returns explicit capacity errors rather than fabricated metrics", async () => {
    vi.mocked(listReviewData).mockRejectedValueOnce(Error("review/report-capacity"));
    const response = await GET(); expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "report_capacity" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("returns public sessions even without invitations, with a server report time", async () => {
    const openedAt = "2026-09-26T13:16:45.649Z";
    const visit = { id, campaignId: id, source: "qr" as const, openedAt, clickedAt: null };
    vi.mocked(listReviewData).mockResolvedValue({ campaigns: [], invitations: [], visits: [visit], windowStart: "2026-09-01T00:00:00.000Z" });
    const before = Date.now();
    const response = await GET();
    const data = await response.json();
    expect(data.invitations).toEqual([]);
    expect(data.visits).toEqual([visit]);
    expect(Date.parse(data.fetchedAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(data.fetchedAt)).toBeLessThanOrEqual(Date.now());
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("does not query Google until it is configured", async () => {
    vi.mocked(googleReviewsConfigured).mockReturnValue(false);
    expect((await google(request({}))).status).toBe(409); expect(fetchGoogleReviews).not.toHaveBeenCalled();
  });
});
