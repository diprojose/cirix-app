import { defaultCallRange, parseCallListFilters } from "../application/call-tracking-service";
import { makeCallTrackingService } from "../infrastructure/di/calls-container";

export async function getCallsDashboard(searchParams: URLSearchParams) {
  const range = defaultCallRange();
  if (!searchParams.has("from")) searchParams.set("from", range.from);
  if (!searchParams.has("to")) searchParams.set("to", range.to);
  const { config, service } = makeCallTrackingService();
  const filters = parseCallListFilters(new URL(`https://internal.invalid/calls?${searchParams}`));
  const [list, stats] = await Promise.all([
    service.list(filters),
    service.stats(filters.from, filters.to),
  ]);
  return {
    config: {
      trialMode: config.trialMode,
      configured: Boolean(config.accountSid && config.trackingPhone && config.fallbackDestinationPhone),
      timeZone: config.timeZone,
    },
    filters,
    list,
    stats,
  };
}

