import { checkApiAccess } from "@/lib/auth/api-access";
import { invitationInput } from "@/modules/reviews/domain/reviews";
import { createInvitation } from "@/modules/reviews/server/repository";
import { PayloadError, privateHeaders, readPayload, sameOrigin } from "@/modules/pixels/server/http";

export async function POST(request: Request) {
  const denied = await checkApiAccess(); if (denied) return denied;
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers: privateHeaders });
  try {
    const input = invitationInput.safeParse(await readPayload(request));
    if (!input.success) return Response.json({ error: "invalid_invitation" }, { status: 400, headers: privateHeaders });
    return Response.json({ invitation: await createInvitation(input.data) }, { status: 201, headers: privateHeaders });
  } catch (error) { return Response.json({ error: "save_failed" }, { status: error instanceof PayloadError ? error.status : 503, headers: privateHeaders }); }
}
