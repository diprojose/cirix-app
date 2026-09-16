import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/api-access", () => ({ checkApiAccess: vi.fn() }));
vi.mock("@/modules/reviews/server/repository", () => ({ listReviewData: vi.fn(), createCampaign: vi.fn(), createInvitation: vi.fn(), markInvitationSent: vi.fn() }));
vi.mock("@/modules/reviews/server/google", () => ({ googleReviewsConfigured: vi.fn(), fetchGoogleReviews: vi.fn() }));
import { checkApiAccess } from "@/lib/auth/api-access";
import { listReviewData, createCampaign, createInvitation, markInvitationSent } from "@/modules/reviews/server/repository";
import { googleReviewsConfigured, fetchGoogleReviews } from "@/modules/reviews/server/google";
import { GET } from "@/app/api/reviews/dashboard/route";
import { POST as campaign } from "@/app/api/reviews/campaigns/route";
import { POST as invitation } from "@/app/api/reviews/invitations/route";
import { POST as google } from "@/app/api/reviews/google/route";
import { PATCH } from "@/app/api/reviews/invitations/[id]/route";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const request = (body: unknown, origin = "https://cirix.example") => new Request("https://cirix.example/api/reviews/campaigns", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); vi.mocked(checkApiAccess).mockResolvedValue(null); });
describe("operator review API", () => {
  it("gates every endpoint by operator permission before reading or changing data", async () => {
    vi.mocked(checkApiAccess).mockResolvedValue(new Response(null, { status: 403 }));
    for (const response of [await GET(), await campaign(request({})), await invitation(request({})), await google(request({})), await PATCH(request({}), { params: Promise.resolve({ id }) })]) expect(response.status).toBe(403);
    expect(checkApiAccess).toHaveBeenCalledWith(true);
    for (const operation of [listReviewData, createCampaign, createInvitation, markInvitationSent, fetchGoogleReviews]) expect(operation).not.toHaveBeenCalled();
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
  it("does not query Google until it is configured", async () => {
    vi.mocked(googleReviewsConfigured).mockReturnValue(false);
    expect((await google(request({}))).status).toBe(409); expect(fetchGoogleReviews).not.toHaveBeenCalled();
  });
});
