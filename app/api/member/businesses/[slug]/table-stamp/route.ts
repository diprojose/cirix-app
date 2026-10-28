import { z } from "zod";
import { getMemberViewer } from "@/lib/auth/dal";
import { isSameOrigin, json, resolveStampBusiness, stampError } from "@/lib/stamps/http";
import { makeClaimTableStamp } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;
const schema = z.object({ code: z.string().min(1).max(64) });

/**
 * POST /api/member/businesses/<slug>/table-stamp { code }
 *
 * The signed-in customer stamps their own card with the code from the table QR.
 * The person comes from the session, so nobody can stamp someone else's card.
 */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const viewer = await getMemberViewer();
  if (!viewer.authenticated || viewer.uid === null) {
    return json({ ok: false, error: { code: "iam/access-denied" } }, 401);
  }
  const { slug } = await context.params;
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
  if (!parsed.success) return json({ ok: false, error: { code: "stamps/invalid-table-code" } }, 400);

  const result = await makeClaimTableStamp().execute({
    businessId: business.business.id,
    userId: viewer.uid,
    code: parsed.data.code,
  });
  return result.ok ? json({ ok: true, ...result.value }) : stampError(result.error);
}
