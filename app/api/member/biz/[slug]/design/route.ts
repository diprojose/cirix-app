import { checkBusinessApiAccess } from "@/lib/auth/business-access";
import { readJsonBody } from "@/lib/receipts/http";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeGetCardDesign, makeSaveCardDesign } from "@/modules/card-design/infrastructure/card-design-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/member/biz/<slug>/design — the card's look (owner only). */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const gate = await checkBusinessApiAccess(slug, "program:manage");
  if (!gate.ok) return gate.response;
  const result = await makeGetCardDesign().execute(gate.access.business.id);
  return result.ok ? json({ ok: true, ...result.value }) : json({ ok: false, error: { code: result.error.code } }, 400);
}

/** PUT /api/member/biz/<slug>/design — saves the card's look (owner only). Customers see it on their next visit to the card. */
export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const gate = await checkBusinessApiAccess(slug, "program:manage");
  if (!gate.ok) return gate.response;

  const body = await readJsonBody(request, 2 * 1024);
  if (!body.ok) return body.response;
  const result = await makeSaveCardDesign().execute({ businessId: gate.access.business.id, design: body.body });
  return result.ok ? json({ ok: true, ...result.value }) : json({ ok: false, error: { code: result.error.code } }, 400);
}
