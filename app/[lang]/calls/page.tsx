import type { Metadata } from "next";
import { getCurrentLocale } from "@/lib/i18n";
import { getCallsDashboard } from "@/modules/calls/server/calls-dashboard";
import { CallsDashboard } from "@/modules/calls/ui/calls-dashboard";

export const metadata: Metadata = { title: "Call Tracking", description: "Inbound call tracking dashboard." };

export default async function CallsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [locale, params] = await Promise.all([getCurrentLocale(), searchParams]);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (typeof value === "string") query.set(key, value);
  const dashboard = await getCallsDashboard(query);
  return <CallsDashboard locale={locale} timeZone={dashboard.config.timeZone} trialMode={dashboard.config.trialMode} configured={dashboard.config.configured} filters={dashboard.filters} calls={dashboard.list.data} total={dashboard.list.pagination.total} stats={dashboard.stats} />;
}

