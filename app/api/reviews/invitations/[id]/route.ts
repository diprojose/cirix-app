import { z } from "zod";
import { checkApiAccess } from "@/lib/auth/api-access";
import { markInvitationSent } from "@/modules/reviews/server/repository";
import { PayloadError, privateHeaders, readPayload, sameOrigin } from "@/modules/pixels/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkApiAccess(true); if (denied) return denied;
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers: privateHeaders });
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success || !z.object({ action: z.literal("mark_sent") }).strict().safeParse(await readPayload(request)).success) {
      return new Response(null, { status: 400, headers: privateHeaders });
    }
    return new Response(null, { status: await markInvitationSent(id) ? 204 : 404, headers: privateHeaders });
  } catch (error) { return Response.json({ error: "save_failed" }, { status: error instanceof PayloadError ? error.status : 503, headers: privateHeaders }); }
}
