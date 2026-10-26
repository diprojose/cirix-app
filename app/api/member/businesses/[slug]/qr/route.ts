import { getMemberViewer } from "@/lib/auth/dal";
import { guardStampErrors, json, resolveStampBusiness, stampError } from "@/lib/stamps/http";
import { makeIssueScanToken } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/member/businesses/<slug>/qr — a fresh, short-lived code for the
 * customer's QR. It is signed for this person in this business and expires in
 * about a minute and a half, so a screenshot is useless. Only the customer can
 * ask, and only for themselves.
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
    const result = await makeIssueScanToken().execute({ businessId: business.business.id, userId: viewer.uid! });
    return result.ok
      ? json({ ok: true, token: result.value.token, expiresAt: result.value.expiresAt })
      : stampError(result.error);
  });
}
