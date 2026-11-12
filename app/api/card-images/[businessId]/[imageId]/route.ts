import { makeReadCardImage } from "@/modules/card-design/infrastructure/card-design-container";

export const runtime = "nodejs";

/**
 * GET /api/card-images/<businessId>/<imageId>
 *
 * A business's card logo, cover or stamp picture. Public, like any branding:
 * the signup page shows it before anyone signs in. A picture never changes
 * under its id (a new upload gets a new one), so browsers keep it for a year.
 */
export async function GET(_request: Request, context: { params: Promise<{ businessId: string; imageId: string }> }) {
  const { businessId, imageId } = await context.params;
  const image = await makeReadCardImage().execute(businessId, imageId);
  if (image === null) return new Response(null, { status: 404 });
  return new Response(Buffer.from(image.data), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
