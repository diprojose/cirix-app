import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { fetchGoogleReviews, googleReviewsConfigured } from "@/modules/reviews/server/google";
const transport = vi.fn();
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const review = { reviewId: "r1", reviewer: { displayName: "Customer", email: "not-a-supported-field@example.com" }, starRating: "FIVE", comment: "Great", createTime: "2026-09-15T00:00:00Z", updateTime: "2026-09-15T00:00:00Z" };
beforeEach(() => {
  for (const key of ["CLIENT_ID", "CLIENT_SECRET", "REFRESH_TOKEN", "ACCOUNT_ID", "LOCATION_ID"]) vi.stubEnv(`GOOGLE_BUSINESS_${key}`, key.endsWith("ID") ? "123" : "test-secret");
  transport.mockReset(); vi.stubGlobal("fetch", transport);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Google Business Profile retrieval", () => {
  it("retrieves all pages and projects only supported review fields", async () => {
    transport.mockResolvedValueOnce(json({ access_token: "access" })).mockResolvedValueOnce(json({ reviews: [review], averageRating: 4, totalReviewCount: 2, nextPageToken: "next" })).mockResolvedValueOnce(json({ reviews: [{ ...review, reviewId: "r2", starRating: "THREE", reviewReply: { comment: "Thanks" } }], averageRating: 4, totalReviewCount: 2 }));
    const result = await fetchGoogleReviews();
    expect(result.reviews).toHaveLength(2); expect(result.averageRating).toBe(4); expect(result.reviews[1].rating).toBe(3);
    expect(JSON.stringify(result)).not.toContain("email"); expect(result.reviews[1].reply).toBe("Thanks");
    expect(transport.mock.calls[2][0].searchParams.get("pageToken")).toBe("next");
    expect(transport.mock.calls[1][1]).toMatchObject({ cache: "no-store", headers: { Authorization: "Bearer access" } });
  });
  it("handles a business without reviews", async () => {
    transport.mockResolvedValueOnce(json({ access_token: "access" })).mockResolvedValueOnce(json({}));
    expect(await fetchGoogleReviews()).toMatchObject({ reviews: [], averageRating: null, totalReviewCount: 0 });
  });
  it("rejects repeated pagination tokens instead of returning incomplete metrics", async () => {
    transport.mockResolvedValueOnce(json({ access_token: "access" })).mockImplementation(async () => json({ reviews: [review], totalReviewCount: 100, nextPageToken: "loop" }));
    await expect(fetchGoogleReviews()).rejects.toThrow("incomplete-sync"); expect(transport).toHaveBeenCalledTimes(3);
  });
  it("does not present failed authorization or partial data as empty reviews", async () => {
    transport.mockResolvedValueOnce(json({}, 403)); await expect(fetchGoogleReviews()).rejects.toThrow("authorization-failed");
    transport.mockResolvedValueOnce(json({ access_token: "access" })).mockResolvedValueOnce(json({ reviews: [review], totalReviewCount: 100, nextPageToken: "next" })).mockResolvedValueOnce(json({}, 503));
    await expect(fetchGoogleReviews()).rejects.toThrow("sync-failed");
  });
  it("requires server credentials before making any requests", async () => {
    vi.stubEnv("GOOGLE_BUSINESS_REFRESH_TOKEN", ""); expect(googleReviewsConfigured()).toBe(false);
    await expect(fetchGoogleReviews()).rejects.toThrow("not-configured"); expect(transport).not.toHaveBeenCalled();
  });
  it("rejects a truncated list whose count disagrees with Google", async () => {
    transport.mockResolvedValueOnce(json({ access_token: "access" })).mockResolvedValueOnce(json({ reviews: [review], totalReviewCount: 2 }));
    await expect(fetchGoogleReviews()).rejects.toThrow("incomplete-sync");
  });
});
