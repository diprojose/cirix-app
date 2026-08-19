import { notFound } from "next/navigation";
import { getCurrentLocale } from "@/lib/i18n";
import { makeCallTrackingService } from "@/modules/calls/infrastructure/di/calls-container";
import { CallDetail } from "@/modules/calls/ui/calls-dashboard";

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale] = await Promise.all([params, getCurrentLocale()]);
  const { config, service } = makeCallTrackingService();
  const call = await service.findById(decodeURIComponent(id));
  if (!call) notFound();
  const history = await service.historyByPhone(call.callerPhone);
  return <CallDetail locale={locale} timeZone={config.timeZone} call={call} history={history} />;
}

