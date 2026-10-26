import { getMemberViewer } from "@/lib/auth/dal";
import { guardStampErrors, json, resolveStampBusiness, stampError } from "@/lib/stamps/http";
import { makeGetStampCard } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/member/businesses/<slug>/card — the signed-in customer's own card.
 * The person comes from the session; there is no parameter for anyone else's.
 */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const viewer = await getMemberViewer();
  if (!viewer.authenticated || viewer.uid === null) {
    return json({ ok: false, error: { code: "iam/access-denied" } }, 401);
  }
  const { slug } = await context.params;
  const business = await resolveStampBusiness(slug);
  if (!business.ok) return business.response;

  return guardStampErrors(async () => {
    const result = await makeGetStampCard().execute({ businessId: business.business.id, userId: viewer.uid! });
    return result.ok ? json({ ok: true, card: result.value }) : stampError(result.error);
  });
}
