import { checkApiAccess } from "@/lib/auth/api-access";
import { campaignInput } from "@/modules/reviews/domain/reviews";
import { createCampaign } from "@/modules/reviews/server/repository";
import { PayloadError, privateHeaders, readPayload, sameOrigin } from "@/modules/pixels/server/http";

export async function POST(request: Request) {
  const denied = await checkApiAccess(true); if (denied) return denied;
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers: privateHeaders });
  try {
    const input = campaignInput.safeParse(await readPayload(request));
    if (!input.success) return Response.json({ error: "invalid_campaign" }, { status: 400, headers: privateHeaders });
    return Response.json({ campaign: await createCampaign(input.data.name) }, { status: 201, headers: privateHeaders });
  } catch (error) { return Response.json({ error: "save_failed" }, { status: error instanceof PayloadError ? error.status : 503, headers: privateHeaders }); }
}
