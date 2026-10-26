import { getMemberViewer } from "@/lib/auth/dal";
import { makeListBusinessesByIds } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeListMyCustomerBusinesses } from "@/modules/crm/infrastructure/di/crm-core-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (body: Record<string, unknown>, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * GET /api/member/me/cards — the businesses where the signed-in person is a
 * customer. Always scoped to the session's own user: there is no parameter that
 * could ask for someone else's cards.
 */
export async function GET() {
  const viewer = await getMemberViewer();
  if (!viewer.authenticated || viewer.uid === null) {
    return reply({ ok: false, error: { code: "iam/access-denied" } }, 401);
  }

  const ids = await makeListMyCustomerBusinesses().execute(viewer.uid);
  if (!ids.ok) return reply({ ok: false, error: { code: ids.error.code } }, 500);

  const businesses = await makeListBusinessesByIds().execute(ids.value);
  if (!businesses.ok) return reply({ ok: false, error: { code: businesses.error.code } }, 500);

  return reply({ ok: true, cards: businesses.value.map(({ slug, name, kind }) => ({ slug, name, kind })) }, 200);
}
