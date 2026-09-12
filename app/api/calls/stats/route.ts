import { checkApiAccess } from "@/lib/auth/api-access";
import { defaultCallRange } from "@/modules/calls/application/call-tracking-service";
import { makeCallTrackingService } from "@/modules/calls/infrastructure/di/calls-container";

export async function GET(request: Request) {
  const accessDenied = await checkApiAccess();
  if (accessDenied) return accessDenied;

  const url = new URL(request.url);
  const range = defaultCallRange();
  try {
    const stats = await makeCallTrackingService().service.stats(
      url.searchParams.get("from") ?? range.from,
      url.searchParams.get("to") ?? range.to
    );
    return Response.json(stats);
  } catch {
    return Response.json({ error: "calls/unavailable" }, { status: 500 });
  }
}
