import { eventInputSchema, idSchema } from "@/modules/pixels/domain/pixel";
import { getSite, recordEvent } from "@/modules/pixels/server/repository";
import { PayloadError, readPayload } from "@/modules/pixels/server/http";
import { coarseLocation } from "@/modules/pixels/server/geo";

export const runtime = "nodejs";
async function access(request: Request) {
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
  const siteId = new URL(request.url).searchParams.get("siteId");
  const origin = request.headers.get("origin");
  if (!origin || !idSchema.safeParse(siteId).success) return { headers, site: null };
  const site = await getSite(siteId!);
  if (!site?.active || site.origin !== origin) return { headers, site: null };
  headers.set("Access-Control-Allow-Origin", origin);
  return { headers, site };
}
export async function OPTIONS(request: Request) {
  try {
    const { headers, site } = await access(request);
    return new Response(null, { status: site ? 204 : 403, headers });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
export async function POST(request: Request) {
  let headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  try {
    const result = await access(request);
    headers = result.headers;
    if (!result.site) return Response.json({ error: "origin_denied" }, { status: 403, headers });
    if (request.headers.get("sec-gpc") === "1") return new Response(null, { status: 204, headers });
    const parsed = eventInputSchema.safeParse(await readPayload(request));
    if (!parsed.success || parsed.data.siteId !== result.site.id) return Response.json({ error: "invalid_event" }, { status: 400, headers });
    const outcome = await recordEvent(parsed.data, result.site.origin, coarseLocation(request.headers));
    if (outcome === "limited") headers.set("Retry-After", "60");
    return Response.json({ status: outcome }, { status: { created: 201, duplicate: 200, limited: 429, forbidden: 403 }[outcome], headers });
  } catch (error) { return Response.json({ error: "collection_failed" }, { status: error instanceof PayloadError ? error.status : 503, headers }); }
}
