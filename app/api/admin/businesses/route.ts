import { z } from "zod";
import { checkCirixAdminApi } from "@/lib/auth/cirix-admin";
import { statusForTenancyError } from "@/lib/auth/business-access-status";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeRegisterBusiness } from "@/core/tenancy/infrastructure/di/tenancy-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2048;

const createSchema = z.object({
  name: z.string().max(200),
  slug: z.string().max(80),
  kind: z.string().max(20),
  ownerEmail: z.string().trim().max(254),
});

/**
 * POST /api/admin/businesses — a Cirix administrator opens a business and names
 * its owner by email. Answers with the new business, or why it was refused.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const gate = await checkCirixAdminApi();
  if (!gate.ok) return gate.response;

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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: { code: "tenancy/invalid-business" } }, 400);

  const result = await makeRegisterBusiness().execute({ ...parsed.data, actorUserId: gate.admin.uid });
  if (!result.ok) {
    return json({ ok: false, error: { code: result.error.code, message: result.error.message } }, statusForTenancyError(result.error.code));
  }
  return json({ ok: true, business: result.value }, 201);
}
