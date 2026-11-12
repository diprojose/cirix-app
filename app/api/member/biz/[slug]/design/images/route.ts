import { checkBusinessApiAccess } from "@/lib/auth/business-access";
import { isSameOrigin, json } from "@/lib/stamps/http";
import { makeUploadCardImage } from "@/modules/card-design/infrastructure/card-design-container";
import type { CardImageKind } from "@/modules/card-design/domain/card-design";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Under the 4.5 MB a Vercel function accepts. The browser shrinks pictures well below this first. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const KINDS = new Set<CardImageKind>(["logo", "cover", "stamp"]);

/**
 * POST /api/member/biz/<slug>/design/images?kind=logo|cover|stamp  (body: the image)
 *
 * The owner uploads a picture for the card. It is resized and stored, and its id
 * comes back to be used in the design; it shows nowhere until the design is saved.
 */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const gate = await checkBusinessApiAccess(slug, "program:manage");
  if (!gate.ok) return gate.response;

  const kind = new URL(request.url).searchParams.get("kind") as CardImageKind | null;
  if (kind === null || !KINDS.has(kind)) return json({ ok: false, error: { code: "card-design/invalid" } }, 400);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES) {
    return json({ ok: false, error: { code: "request/too-large" } }, 413);
  }
  const file = new Uint8Array(await request.arrayBuffer());
  if (file.length === 0 || file.length > MAX_IMAGE_BYTES) return json({ ok: false, error: { code: "card-design/invalid-image" } }, 400);

  const upload = await makeUploadCardImage();
  const result = await upload.execute({ businessId: gate.access.business.id, kind, file });
  if (result.ok) return json({ ok: true, ...result.value });
  return json({ ok: false, error: { code: result.error.code } }, result.error.code === "card-design/too-many-images" ? 409 : 400);
}
