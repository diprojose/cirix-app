import { z } from "zod";
import { getMemberViewer } from "@/lib/auth/dal";
import { statusForTenancyError } from "@/lib/auth/business-access-status";
import { readJsonBody, receiptError, rewardsUnavailable } from "@/lib/receipts/http";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeGetBusinessBySlug } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeRedeemPoints } from "@/modules/receipts/infrastructure/di/receipts-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 512;
const schema = z.object({ rewardId: z.string().min(1).max(100) });

/**
 * POST /api/member/businesses/<slug>/redemptions { rewardId }
 *
 * The signed-in customer spends points on a prize and gets a code to show at the
 * counter. The person comes from the session and the price from the catalog: the
 * browser only says which prize.
 */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const viewer = await getMemberViewer();
  if (!viewer.authenticated || viewer.uid === null) {
    return json({ ok: false, error: { code: "iam/access-denied" } }, 401);
  }
  const { slug } = await context.params;
  const business = await makeGetBusinessBySlug().execute(slug);
  if (!business.ok) return json({ ok: false, error: { code: business.error.code } }, statusForTenancyError(business.error.code));
  const unavailable = rewardsUnavailable(business.value);
  if (unavailable) return unavailable;

  const read = await readJsonBody(request, MAX_BODY_BYTES);
  if (!read.ok) return read.response;
  const parsed = schema.safeParse(read.body);
  if (!parsed.success) return json({ ok: false, error: { code: "rewards/not-found" } }, 404);

  const result = await makeRedeemPoints().execute({ businessId: business.value.id, userId: viewer.uid, rewardId: parsed.data.rewardId });
  return result.ok ? json({ ok: true, redemption: result.value }, 201) : receiptError(result.error);
}
