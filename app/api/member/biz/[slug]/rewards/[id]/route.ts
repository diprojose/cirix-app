import { z } from "zod";
import { checkBusinessApiAccess } from "@/lib/auth/business-access";
import { readJsonBody, receiptError, rewardsUnavailable } from "@/lib/receipts/http";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeDeleteReward, makeSaveReward } from "@/modules/receipts/infrastructure/di/receipts-container";

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

type Context = { params: Promise<{ slug: string; id: string }> };

/** The checks every change to the catalog shares: same site, owner of this business, a supermarket. */
async function gateFor(request: Request, slug: string) {
  if (!isSameOrigin(request)) return { ok: false as const, response: json({ ok: false, error: { code: "iam/invalid-origin" } }, 403) };
  const gate = await checkBusinessApiAccess(slug, "program:manage");
  if (!gate.ok) return { ok: false as const, response: gate.response };
  const unavailable = rewardsUnavailable(gate.access.business);
  if (unavailable) return { ok: false as const, response: unavailable };
  return { ok: true as const, businessId: gate.access.business.id };
}

/** PUT /api/member/biz/<slug>/rewards/<id> — changes a prize. Open codes keep their name and price. */
export async function PUT(request: Request, context: Context) {
  const { slug, id } = await context.params;
  const gate = await gateFor(request, slug);
  if (!gate.ok) return gate.response;

  const read = await readJsonBody(request, MAX_BODY_BYTES);
  if (!read.ok) return read.response;
  const parsed = schema.safeParse(read.body);
  if (!parsed.success) return json({ ok: false, error: { code: "rewards/invalid" } }, 400);

  const result = await makeSaveReward().execute({ businessId: gate.businessId, rewardId: id, ...parsed.data });
  return result.ok ? json({ ok: true, reward: result.value }) : receiptError(result.error);
}

/** DELETE /api/member/biz/<slug>/rewards/<id> — removes a prize. Open codes keep working. */
export async function DELETE(request: Request, context: Context) {
  const { slug, id } = await context.params;
  const gate = await gateFor(request, slug);
  if (!gate.ok) return gate.response;
  const result = await makeDeleteReward().execute({ businessId: gate.businessId, rewardId: id });
  return result.ok ? json({ ok: true }) : receiptError(result.error);
}
