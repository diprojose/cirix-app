import { checkBusinessApiAccess } from "@/lib/auth/business-access";
import { makeListCustomers } from "@/modules/crm/infrastructure/di/crm-core-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/**
 * GET /api/member/biz/<slug>/customers?limit=&before= — the business's customers,
 * newest first. Only a member whose role grants `customers:read` (the owner, or
 * a Cirix administrator) may read them; the business is resolved from the slug
 * on the server, never from a client-provided id.
 */
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const gate = await checkBusinessApiAccess(slug, "customers:read");
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "");
  const result = await makeListCustomers().execute({
    businessId: gate.access.business.id,
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    before: url.searchParams.get("before") ?? undefined,
  });
  if (!result.ok) {
    return Response.json({ ok: false, error: { code: result.error.code } }, { status: 500, headers: noStore });
  }
  return Response.json({ ok: true, ...result.value }, { headers: noStore });
}
