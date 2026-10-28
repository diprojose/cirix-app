import { checkBusinessApiAccess } from "@/lib/auth/business-access";
import { isSameOrigin, json, stampsUnavailable } from "@/lib/stamps/http";
import { makeRotateTableCode } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/member/biz/<slug>/table-code — issues a new table code (owner only).
 * Printed QR codes with the old one stop giving stamps; they must be reprinted.
 */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const gate = await checkBusinessApiAccess(slug, "program:manage");
  if (!gate.ok) return gate.response;
  const unavailable = stampsUnavailable(gate.access.business);
  if (unavailable) return unavailable;

  const result = await makeRotateTableCode().execute(gate.access.business.id);
  return result.ok ? json({ ok: true, code: result.value.code, createdAt: result.value.createdAt }) : json({ ok: false }, 500);
}
