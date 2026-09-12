import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentLocale } from "@/lib/i18n";
import { getZohoDashboardState } from "@/modules/zoho/server/dashboard";
import { CrmUnavailableError } from "@/modules/zoho/crm/domain/errors/crm-errors";
import { CrmContactDetail } from "@/modules/zoho/ui/crm-contact-detail";
import { stageFromSegment } from "@/modules/zoho/ui/crm-contact-links";

export const metadata: Metadata = { title: "Zoho CRM · Detalle del contacto" };

export default async function ZohoContactDetailPage({ params }: {
  params: Promise<{ stage: string; id: string }>;
}) {
  const { stage: segment, id } = await params;
  const stage = stageFromSegment(segment);
  if (!stage) notFound();
  let contactId: string;
  try {
    // Next.js can preserve URL encoding in dynamic route parameters.
    contactId = decodeURIComponent(id);
  } catch {
    notFound();
  }

  const [locale, { dashboard, warning }] = await Promise.all([getCurrentLocale(), getZohoDashboardState()]);
  // An unavailable CRM must not turn an existing contact into a false 404.
  if (warning) throw new CrmUnavailableError(warning);
  const contact = dashboard.contacts.find((item) => item.id === contactId && item.lifecycleStage === stage);
  if (!contact) notFound();

  return <CrmContactDetail locale={locale} contact={contact}
    activities={dashboard.activities.filter((item) => item.contactId === contact.id)}
    opportunities={dashboard.opportunities.filter((item) => item.contactId === contact.id)}
  />;
}
