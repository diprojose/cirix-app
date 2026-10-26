import { z } from "zod";
import { checkBusinessApiAccess } from "@/lib/auth/business-access";
import { guardStampErrors, isSameOrigin, json, resolveStampBusiness, stampError } from "@/lib/stamps/http";
import {
  makePreviewScan,
  makeRecordStamp,
  makeRedeemReward,
} from "@/modules/stamp-card/infrastructure/di/stamp-card-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2 * 1024;
const schema = z.object({ token: z.string().min(1).max(600) });

/**
 * POST /api/member/biz/<slug>/scan/<preview|stamp|redeem> { token }
 *
 * What staff do after scanning a customer's QR. `preview` changes nothing and
 * shows who it is; `stamp` and `redeem` act on the card. The caller must be a
 * member of THIS business with permission to record visits, and the code must
 * have been issued for this business, so a code never works anywhere else.
 */
export async function POST(request: Request, context: { params: Promise<{ slug: string; action: string }> }) {
  const { slug, action } = await context.params;
  if (action !== "preview" && action !== "stamp" && action !== "redeem") {
    return json({ ok: false, error: { code: "request/unknown-action" } }, 404);
  }
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);

  const gate = await checkBusinessApiAccess(slug, "visits:record");
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
  if (!parsed.success) return json({ ok: false, error: { code: "stamps/invalid-token" } }, 400);

  const input = { businessId: gate.access.business.id, token: parsed.data.token };
  return guardStampErrors(async () => {
    if (action === "preview") {
      const result = await makePreviewScan().execute(input);
      return result.ok ? json({ ok: true, ...result.value }) : stampError(result.error);
    }
    const staffUserId = gate.viewer.uid!;
    if (action === "stamp") {
      const result = await makeRecordStamp().execute({ ...input, staffUserId });
      return result.ok ? json({ ok: true, ...result.value }) : stampError(result.error);
    }
    const result = await makeRedeemReward().execute({ ...input, staffUserId });
    return result.ok ? json({ ok: true, ...result.value }) : stampError(result.error);
  });
}
