import "server-only";
import { z } from "zod";
import type { GoogleReview, GoogleSnapshot } from "../domain/reviews";

export function googleReviewsConfigured(): boolean {
  return ["GOOGLE_BUSINESS_CLIENT_ID", "GOOGLE_BUSINESS_CLIENT_SECRET", "GOOGLE_BUSINESS_REFRESH_TOKEN",
    "GOOGLE_BUSINESS_ACCOUNT_ID", "GOOGLE_BUSINESS_LOCATION_ID"].every((name) => !!process.env[name]);
}
const ratings = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as const;
const googlePage = z.object({
  reviews: z.array(z.object({
    reviewId: z.string(), reviewer: z.object({ displayName: z.string().optional() }).optional(),
    starRating: z.enum(["ONE", "TWO", "THREE", "FOUR", "FIVE"]), comment: z.string().optional(),
    createTime: z.string().datetime({ offset: true }), updateTime: z.string().datetime({ offset: true }),
    reviewReply: z.object({ comment: z.string().optional() }).optional(),
  })).default([]),
  averageRating: z.number().min(0).max(5).optional(), totalReviewCount: z.number().int().nonnegative().default(0), nextPageToken: z.string().optional(),
});
/** Google content stays in response memory; no long-term storage or analytics. */
export async function fetchGoogleReviews(): Promise<GoogleSnapshot> {
  if (!googleReviewsConfigured()) throw new Error("google/not-configured");
  const account = process.env.GOOGLE_BUSINESS_ACCOUNT_ID!; const location = process.env.GOOGLE_BUSINESS_LOCATION_ID!;
  if (!/^\d+$/.test(account) || !/^\d+$/.test(location)) throw new Error("google/invalid-location");
  const deadline = Date.now() + 45_000;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: process.env.GOOGLE_BUSINESS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_BUSINESS_CLIENT_SECRET!, refresh_token: process.env.GOOGLE_BUSINESS_REFRESH_TOKEN! }),
  });
  if (!tokenResponse.ok) throw new Error("google/authorization-failed");
  const auth = z.object({ access_token: z.string().min(1) }).parse(await tokenResponse.json());
  const reviews = new Map<string, GoogleReview>(); const pages = new Set<string>();
  let pageToken = ""; let totalReviewCount = 0; let averageRating: number | null = null;
  do {
    if (pages.has(pageToken) || pages.size >= 100 || Date.now() >= deadline) throw new Error("google/incomplete-sync");
    pages.add(pageToken);
    const url = new URL(`https://mybusiness.googleapis.com/v4/accounts/${account}/locations/${location}/reviews`);
    url.searchParams.set("pageSize", "50"); url.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(Math.min(8000, Math.max(1, deadline - Date.now()))), headers: { Authorization: `Bearer ${auth.access_token}` } });
    if (!response.ok) throw new Error("google/sync-failed");
    const page = googlePage.parse(await response.json());
    totalReviewCount = page.totalReviewCount; averageRating = page.totalReviewCount ? page.averageRating ?? null : null;
    for (const item of page.reviews) reviews.set(item.reviewId, {
      id: item.reviewId, author: item.reviewer?.displayName ?? "", rating: ratings[item.starRating], comment: item.comment ?? "",
      createdAt: new Date(item.createTime).toISOString(), updatedAt: new Date(item.updateTime).toISOString(), reply: item.reviewReply?.comment ?? null,
    });
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  if (reviews.size !== totalReviewCount) throw new Error("google/incomplete-sync");
  return { reviews: [...reviews.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), totalReviewCount, averageRating, fetchedAt: new Date().toISOString() };
}
