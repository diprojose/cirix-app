import { checkApiAccess } from "@/lib/auth/api-access";
import { CallTrackingError, defaultCallRange, parseCallListFilters } from "@/modules/calls/application/call-tracking-service";
import { makeCallTrackingService } from "@/modules/calls/infrastructure/di/calls-container";
import { presentCall } from "@/modules/calls/server/api-presenters";

export async function GET(request: Request) {
  const accessDenied = await checkApiAccess();
  if (accessDenied) return accessDenied;

  try {
    const url = new URL(request.url);
    const range = defaultCallRange();
    if (!url.searchParams.has("from")) url.searchParams.set("from", range.from);
    if (!url.searchParams.has("to")) url.searchParams.set("to", range.to);
    const result = await makeCallTrackingService().service.list(parseCallListFilters(url));
    return Response.json({ ...result, data: result.data.map(presentCall) });
  } catch (error) {
    const status = error instanceof CallTrackingError ? 400 : 500;
    return Response.json({ error: error instanceof CallTrackingError ? error.code : "calls/unavailable" }, { status });
  }
}
