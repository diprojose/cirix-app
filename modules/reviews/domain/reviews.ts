import { z } from "zod";
import { REVIEW_SOURCES, type ReviewSource } from "../lib/constants";

export const campaignInput = z.object({ name: z.string().trim().min(2).max(100) }).strict();
export const invitationInput = z.object({
  campaignId: z.string().uuid(), clientName: z.string().trim().min(2).max(100),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).default(""),
  phone: z.string().trim().max(24).regex(/^[+\d ()-]*$/).default(""),
  source: z.enum(["email", "whatsapp", "sms", "direct"]),
  crmContactId: z.string().max(200).default(""),
}).strict().refine((data) => data.source !== "email" || !!data.email, { message: "Email required" })
  .refine((data) => !["whatsapp", "sms"].includes(data.source) || data.phone.replace(/\D/g, "").length >= 7, { message: "Phone required" });
export const trackingInput = z.object({
  event: z.enum(["review_page_view", "review_google_clicked"]), source: z.enum(REVIEW_SOURCES),
  visitId: z.string().uuid(), token: z.string().regex(/^[a-f0-9]{48}$/).optional(),
}).strict();
export type TrackingInput = z.infer<typeof trackingInput>;
export type Campaign = { id: string; name: string; token: string; createdAt: string };
export type Invitation = z.infer<typeof invitationInput> & {
  id: string; token: string; createdAt: string; sentAt: string | null; openedAt: string | null; clickedAt: string | null;
};
export type ReviewVisit = { id: string; campaignId: string | null; source: ReviewSource; openedAt: string; clickedAt: string | null };
export type GoogleReview = { id: string; author: string; rating: number; comment: string; createdAt: string; updatedAt: string; reply: string | null };
export type GoogleSnapshot = { reviews: GoogleReview[]; averageRating: number | null; totalReviewCount: number; fetchedAt: string };
export type DashboardData = { campaigns: Campaign[]; invitations: Invitation[]; visits: ReviewVisit[]; googleConfigured: boolean; windowStart: string };
