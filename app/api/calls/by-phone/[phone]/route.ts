import { CallTrackingError } from "@/modules/calls/application/call-tracking-service";
import { makeCallTrackingService } from "@/modules/calls/infrastructure/di/calls-container";
import { authorizeCallsApi } from "@/modules/calls/server/api-auth";
import { presentCall } from "@/modules/calls/server/api-presenters";

export async function GET(_request: Request, context: RouteContext<"/api/calls/by-phone/[phone]">) {
  const denied = await authorizeCallsApi();
  if (denied) return denied;
  const { phone } = await context.params;
  try {
    const history = await makeCallTrackingService().service.historyByPhone(decodeURIComponent(phone));
    return Response.json({ ...history, calls: history.calls.map(presentCall) });
  } catch (error) {
    return Response.json(
      { error: error instanceof CallTrackingError ? error.code : "calls/unavailable" },
      { status: error instanceof CallTrackingError ? 400 : 500 }
    );
  }
}
