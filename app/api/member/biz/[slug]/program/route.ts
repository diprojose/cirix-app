import { z } from "zod";
import { checkBusinessApiAccess } from "@/lib/auth/business-access";
import { isSameOrigin, json, resolveStampBusiness, stampError } from "@/lib/stamps/http";
import { makeGetStampProgram, makeSaveStampProgram } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2 * 1024;

// Ranges are enforced by the domain; this only checks the shape of the request.
const schema = z.object({
  requiredStamps: z.number(),
  rewardName: z.string().max(200),
  cooldownMinutes: z.number(),
  active: z.boolean().default(true),
  tableStamps: z.boolean().default(false),
});

/** GET /api/member/biz/<slug>/program — the business's stamp rules (owner only). */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const gate = await checkBusinessApiAccess(slug, "program:manage");
  if (!gate.ok) return gate.response;
  const business = await resolveStampBusiness(slug);
  if (!business.ok) return business.response;

  const result = await makeGetStampProgram().execute(gate.access.business.id);
  return result.ok ? json({ ok: true, program: result.value }) : stampError(result.error);
}

/**
 * PUT /api/member/biz/<slug>/program — changes the stamp rules (owner only).
 * Changes apply to future stamps; cards in progress keep what they collected.
 */
export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const gate = await checkBusinessApiAccess(slug, "program:manage");
  if (!gate.ok) return gate.response;
  const business = await resolveStampBusiness(slug);
  if (!business.ok) return business.response;

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return json({ ok: false, error: { code: "request/too-large" } }, 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: { code: "request/invalid-json" } }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: { code: "stamps/invalid-program", message: "Review the program values." } }, 400);

  const result = await makeSaveStampProgram().execute({ businessId: gate.access.business.id, ...parsed.data });
  return result.ok ? json({ ok: true, program: result.value }) : stampError(result.error);
}
