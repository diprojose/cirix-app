import { getViewer } from "@/lib/auth/dal";
import { createSite, listSites } from "@/modules/pixels/server/repository";
import { siteInputSchema } from "@/modules/pixels/domain/pixel";
import { PayloadError, privateHeaders, readPayload, sameOrigin } from "@/modules/pixels/server/http";

export const runtime = "nodejs";
export async function GET() {
  const viewer = await getViewer();
  if (!viewer.authenticated || !viewer.uid) return Response.json({ error: "unauthorized" }, { status: 401, headers: privateHeaders });
  try { return Response.json({ sites: await listSites(viewer.uid) }, { headers: privateHeaders }); }
  catch { return Response.json({ error: "storage_unavailable" }, { status: 503, headers: privateHeaders }); }
}
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer.authenticated || !viewer.uid) return Response.json({ error: "unauthorized" }, { status: 401, headers: privateHeaders });
  if (!sameOrigin(request)) return Response.json({ error: "origin_denied" }, { status: 403, headers: privateHeaders });
  try {
    const parsed = siteInputSchema.safeParse(await readPayload(request));
    if (!parsed.success) return Response.json({ error: "invalid_site" }, { status: 400, headers: privateHeaders });
    return Response.json({ site: await createSite(viewer.uid, parsed.data) }, { status: 201, headers: privateHeaders });
  } catch (error) { return Response.json({ error: "request_failed" }, { status: error instanceof PayloadError ? error.status : 503, headers: privateHeaders }); }
}
