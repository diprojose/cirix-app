import { z } from "zod";
import { checkCirixAdminApi } from "@/lib/auth/cirix-admin";
import { statusForTenancyError } from "@/lib/auth/business-access-status";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeGetBusinessForAdmin, makeSetBusinessStatus } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeSetReceiptDemoMode } from "@/modules/receipts/infrastructure/di/receipts-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 512;

/** One change per request: the business's status, or its receipt demo mode. */
const changeSchema = z.union([
  z.object({ status: z.enum(["active", "suspended"]) }).strict(),
  z.object({ receiptDemo: z.boolean() }).strict(),
]);

/** PATCH /api/admin/businesses/<slug> — a Cirix administrator suspends, reopens or changes demo mode. */
export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const gate = await checkCirixAdminApi();
  if (!gate.ok) return gate.response;
  const { slug } = await context.params;

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
  const parsed = changeSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: { code: "request/invalid-change" } }, 400);

  if ("status" in parsed.data) {
    const result = await makeSetBusinessStatus().execute({ slug, status: parsed.data.status, actorUserId: gate.admin.uid });
    return result.ok
      ? json({ ok: true, business: result.value })
      : json({ ok: false, error: { code: result.error.code } }, statusForTenancyError(result.error.code));
  }

  const business = await makeGetBusinessForAdmin().execute(slug);
  if (!business.ok) return json({ ok: false, error: { code: business.error.code } }, statusForTenancyError(business.error.code));
  const result = await makeSetReceiptDemoMode().execute({
    businessId: business.value.id,
    on: parsed.data.receiptDemo,
    actorUserId: gate.admin.uid,
  });
  return result.ok
    ? json({ ok: true, receipts: { enabled: result.value.enabled, demoMode: result.value.demoMode } })
    : json({ ok: false, error: { code: result.error.code } }, 400);
}
