import { checkApiAccess } from "@/lib/auth/api-access";
import { listReviewData } from "@/modules/reviews/server/repository";
import { googleReviewsConfigured } from "@/modules/reviews/server/google";
import { privateHeaders } from "@/modules/pixels/server/http";

export async function GET() {
  const denied = await checkApiAccess(); if (denied) return denied;
  try {
    const data = await listReviewData();
    return Response.json({ ...data, fetchedAt: new Date().toISOString(), googleConfigured: googleReviewsConfigured() }, { headers: privateHeaders });
  }
  catch (error) { return Response.json({ error: error instanceof Error && error.message === "review/report-capacity" ? "report_capacity" : "storage_unavailable" }, { status: 503, headers: privateHeaders }); }
}
