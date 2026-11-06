import { z } from "zod";
import { checkBusinessApiAccess } from "@/lib/auth/business-access";
import { readJsonBody, receiptError, rewardsUnavailable } from "@/lib/receipts/http";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeSaveReward } from "@/modules/receipts/infrastructure/di/receipts-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2 * 1024;

// Ranges are enforced by the domain; this only checks the shape of the request.
const schema = z.object({
  name: z.string().max(400),
  description: z.string().max(1000),
  points: z.number(),
  active: z.boolean(),
});

/** POST /api/member/biz/<slug>/rewards — adds a prize to the catalog (owner only). */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const gate = await checkBusinessApiAccess(slug, "program:manage");
  if (!gate.ok) return gate.response;
  const unavailable = rewardsUnavailable(gate.access.business);
  if (unavailable) return unavailable;

  const read = await readJsonBody(request, MAX_BODY_BYTES);
  if (!read.ok) return read.response;
  const parsed = schema.safeParse(read.body);
  if (!parsed.success) return json({ ok: false, error: { code: "rewards/invalid" } }, 400);

  const result = await makeSaveReward().execute({ businessId: gate.access.business.id, rewardId: null, ...parsed.data });
  return result.ok ? json({ ok: true, reward: result.value }, 201) : receiptError(result.error);
}
