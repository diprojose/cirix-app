import { checkApiAccess } from "@/lib/auth/api-access";
import { fetchGoogleReviews, googleReviewsConfigured } from "@/modules/reviews/server/google";
import { privateHeaders, sameOrigin } from "@/modules/pixels/server/http";

export const maxDuration = 60;
export async function POST(request: Request) {
  const denied = await checkApiAccess(true); if (denied) return denied;
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers: privateHeaders });
  if (!googleReviewsConfigured()) return Response.json({ error: "google_not_configured" }, { status: 409, headers: privateHeaders });
  try { return Response.json(await fetchGoogleReviews(), { headers: privateHeaders }); }
  catch { return Response.json({ error: "google_sync_failed" }, { status: 503, headers: privateHeaders }); }
}
