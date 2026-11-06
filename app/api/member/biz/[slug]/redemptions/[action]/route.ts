import { z } from "zod";
import { checkBusinessApiAccess } from "@/lib/auth/business-access";
import { readJsonBody, receiptError, rewardsUnavailable } from "@/lib/receipts/http";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeDeliverRedemption, makePreviewRedemption } from "@/modules/receipts/infrastructure/di/receipts-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;
const schema = z.object({ code: z.string().min(1).max(600) });

/**
 * POST /api/member/biz/<slug>/redemptions/<preview|deliver> { code }
 *
 * What staff do after scanning a prize code. `preview` changes nothing and shows
 * the person and the prize; `deliver` closes the code. The caller must be able to
 * record visits in THIS business, and codes are looked up inside it, so a code
 * from another business does not exist here.
 */
export async function POST(request: Request, context: { params: Promise<{ slug: string; action: string }> }) {
  const { slug, action } = await context.params;
  if (action !== "preview" && action !== "deliver") {
    return json({ ok: false, error: { code: "request/unknown-action" } }, 404);
  }
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const gate = await checkBusinessApiAccess(slug, "visits:record");
  if (!gate.ok) return gate.response;
  const unavailable = rewardsUnavailable(gate.access.business);
  if (unavailable) return unavailable;

  const read = await readJsonBody(request, MAX_BODY_BYTES);
  if (!read.ok) return read.response;
  const parsed = schema.safeParse(read.body);
  if (!parsed.success) return json({ ok: false, error: { code: "rewards/invalid-code" } }, 400);

  const input = { businessId: gate.access.business.id, code: parsed.data.code };
  const result =
    action === "preview"
      ? await makePreviewRedemption().execute(input)
      : await makeDeliverRedemption().execute({ ...input, staffUserId: gate.viewer.uid! });
  return result.ok ? json({ ok: true, redemption: result.value }) : receiptError(result.error);
}
