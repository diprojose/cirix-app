import { getViewer } from "@/lib/auth/dal";
import { getSite, listEvents, listEventPage, updateSite } from "@/modules/pixels/server/repository";
import { reportQuerySchema } from "@/modules/pixels/domain/report";
import { idSchema, siteInputSchema } from "@/modules/pixels/domain/pixel";
import { PayloadError, privateHeaders, readPayload, sameOrigin } from "@/modules/pixels/server/http";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  const viewer = await getViewer();
  if (!viewer.authenticated || !viewer.uid) return Response.json({ error: "unauthorized" }, { status: 401, headers: privateHeaders });
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return Response.json({ error: "invalid_id" }, { status: 400, headers: privateHeaders });
  try {
    const site = await getSite(id);
    if (!site || site.ownerId !== viewer.uid) return Response.json({ error: "not_found" }, { status: 404, headers: privateHeaders });
    const params = new URL(request.url).searchParams;
    if (["from", "to", "cursorTime", "cursorId"].some((key) => params.has(key))) {
      const parsed = reportQuerySchema.safeParse(Object.fromEntries(params));
      if (!parsed.success || Date.parse(parsed.data.to) > Date.now() + 60_000) return Response.json({ error: "invalid_period" }, { status: 400, headers: privateHeaders });
      return Response.json({ site, ...await listEventPage(id, parsed.data) }, { headers: privateHeaders });
    }
    return Response.json({ site, events: await listEvents(id) }, { headers: privateHeaders });
  } catch { return Response.json({ error: "storage_unavailable" }, { status: 503, headers: privateHeaders }); }
}
export async function PATCH(request: Request, context: Context) {
  const viewer = await getViewer();
  if (!viewer.authenticated || !viewer.uid) return Response.json({ error: "unauthorized" }, { status: 401, headers: privateHeaders });
  if (!sameOrigin(request)) return Response.json({ error: "origin_denied" }, { status: 403, headers: privateHeaders });
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return Response.json({ error: "invalid_id" }, { status: 400, headers: privateHeaders });
  try {
    const parsed = siteInputSchema.safeParse(await readPayload(request));
    if (!parsed.success) return Response.json({ error: "invalid_site" }, { status: 400, headers: privateHeaders });
    const updated = await updateSite(id, viewer.uid, parsed.data);
    return Response.json({ ok: updated }, { status: updated ? 200 : 404, headers: privateHeaders });
  } catch (error) { return Response.json({ error: "request_failed" }, { status: error instanceof PayloadError ? error.status : 503, headers: privateHeaders }); }
}
