import { getMemberViewer } from "@/lib/auth/dal";
import { statusForTenancyError } from "@/lib/auth/business-access-status";
import { readJsonBody, receiptError } from "@/lib/receipts/http";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeGetBusinessBySlug } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeConfirmReceipt } from "@/modules/receipts/infrastructure/di/receipts-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/member/businesses/<slug>/receipts/confirm  (body: { token })
 *
 * The signed-in customer confirms the total their last scan read. The token is
 * what the scan returned; the server signed it, so it carries exactly what the
 * photo said and nothing the browser chose.
 */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const viewer = await getMemberViewer();
  if (!viewer.authenticated || viewer.uid === null) {
    return json({ ok: false, error: { code: "iam/access-denied" } }, 401);
  }
  const { slug } = await context.params;
  const business = await makeGetBusinessBySlug().execute(slug);
  if (!business.ok) return json({ ok: false, error: { code: business.error.code } }, statusForTenancyError(business.error.code));

  const body = await readJsonBody(request, 8 * 1024);
  if (!body.ok) return body.response;
  const token = (body.body as { token?: unknown } | null)?.token;
  if (typeof token !== "string") return json({ ok: false, error: { code: "receipts/confirmation-invalid" } }, 400);

  const result = await makeConfirmReceipt().execute({
    business: { id: business.value.id, name: business.value.name, kind: business.value.kind },
    userId: viewer.uid,
    token,
  });
  return result.ok ? json({ ok: true, ...result.value }) : receiptError(result.error);
}
