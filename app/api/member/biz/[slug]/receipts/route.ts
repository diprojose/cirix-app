import { z } from "zod";
import { checkBusinessApiAccess } from "@/lib/auth/business-access";
import { receiptError } from "@/lib/receipts/http";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeGetReceiptSettings, makeSaveReceiptSettings } from "@/modules/receipts/infrastructure/di/receipts-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4 * 1024;

// Ranges are enforced by the domain; this only checks the shape of the request.
const schema = z.object({
  enabled: z.boolean(),
  storeNames: z.array(z.string().max(200)).max(20),
  merchantIds: z.array(z.string().max(100)).max(20),
  maxAgeDays: z.number(),
  maxAmountDollars: z.number(),
  pointsPerDollar: z.number(),
  dailyLimit: z.number(),
});

/** GET /api/member/biz/<slug>/receipts — the business's receipt rules (owner only). */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const gate = await checkBusinessApiAccess(slug, "program:manage");
  if (!gate.ok) return gate.response;
  const result = await makeGetReceiptSettings().execute(gate.access.business.id);
  return result.ok ? json({ ok: true, settings: result.value }) : receiptError(result.error);
}

/** PUT /api/member/biz/<slug>/receipts — changes the rules (owner only). They apply to the next receipt. */
export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const gate = await checkBusinessApiAccess(slug, "program:manage");
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: { code: "receipts/invalid-settings" } }, 400);

  const result = await makeSaveReceiptSettings().execute({ businessId: gate.access.business.id, ...parsed.data });
  return result.ok ? json({ ok: true, settings: result.value }) : receiptError(result.error);
}
