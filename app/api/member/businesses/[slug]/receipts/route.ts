import { getMemberViewer } from "@/lib/auth/dal";
import { statusForTenancyError } from "@/lib/auth/business-access-status";
import { receiptError } from "@/lib/receipts/http";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeGetBusinessBySlug } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeScanReceipt } from "@/modules/receipts/infrastructure/di/receipts-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The first read on a cold server also has to load the OCR engine.
export const maxDuration = 60;

/** Under the 4.5 MB a Vercel function accepts. The browser shrinks photos well below this before sending. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * POST /api/member/businesses/<slug>/receipts  (body: the image)
 *
 * The signed-in customer sends a photo of their receipt. The person comes from
 * the session and the receipt's data from the photo, read here: the browser
 * sends nothing else, so it cannot claim a total or a store.
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

  if (Number(request.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES) {
    return json({ ok: false, error: { code: "request/too-large" } }, 413);
  }
  const image = new Uint8Array(await request.arrayBuffer());
  if (image.length === 0) return json({ ok: false, error: { code: "receipts/invalid-image" } }, 400);
  if (image.length > MAX_IMAGE_BYTES) return json({ ok: false, error: { code: "request/too-large" } }, 413);

  const scan = await makeScanReceipt();
  const result = await scan.execute({
    business: { id: business.value.id, name: business.value.name, kind: business.value.kind },
    userId: viewer.uid,
    image,
  });
  return result.ok ? json({ ok: true, ...result.value }) : receiptError(result.error);
}
