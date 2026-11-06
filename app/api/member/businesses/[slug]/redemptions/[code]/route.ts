import { getMemberViewer } from "@/lib/auth/dal";
import { statusForTenancyError } from "@/lib/auth/business-access-status";
import { receiptError, rewardsUnavailable } from "@/lib/receipts/http";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeGetBusinessBySlug } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeCancelRedemption } from "@/modules/receipts/infrastructure/di/receipts-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE /api/member/businesses/<slug>/redemptions/<code> — the customer gives up their own open code. */
export async function DELETE(request: Request, context: { params: Promise<{ slug: string; code: string }> }) {
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const viewer = await getMemberViewer();
  if (!viewer.authenticated || viewer.uid === null) {
    return json({ ok: false, error: { code: "iam/access-denied" } }, 401);
  }
  const { slug, code } = await context.params;
  const business = await makeGetBusinessBySlug().execute(slug);
  if (!business.ok) return json({ ok: false, error: { code: business.error.code } }, statusForTenancyError(business.error.code));
  const unavailable = rewardsUnavailable(business.value);
  if (unavailable) return unavailable;

  const result = await makeCancelRedemption().execute({ businessId: business.value.id, userId: viewer.uid, code });
  return result.ok ? json({ ok: true, redemption: result.value }) : receiptError(result.error);
}
