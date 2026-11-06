import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { PointsView } from "@/components/receipts/points-view";
import { COLUMN } from "@/components/store/layout";
import { getMemberViewer } from "@/lib/auth/dal";
import { getCurrentLocale, localizeForCurrentRequest, pick } from "@/lib/i18n";
import { makeGetBusinessBySlug } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeGetCustomer } from "@/modules/crm/infrastructure/di/crm-core-container";
import { makeGetPointsSummary, makeGetReceiptSettings } from "@/modules/receipts/infrastructure/di/receipts-container";

export const metadata: Metadata = {
  title: "My points",
  robots: { index: false, follow: false },
};

/** One customer's points in one supermarket, where they scan their receipts. */
export default async function PointsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, viewer, locale] = await Promise.all([params, getMemberViewer(), getCurrentLocale()]);
  if (!viewer.authenticated || viewer.uid === null) {
    redirect(await localizeForCurrentRequest(`/login?from=${encodeURIComponent(`/me/points/${slug}`)}`));
  }

  const business = await makeGetBusinessBySlug().execute(slug);
  // Restaurants earn stamps; for them there is no points page.
  if (!business.ok || business.value.kind !== "supermarket") notFound();

  const customer = await makeGetCustomer().execute({ businessId: business.value.id, userId: viewer.uid });
  // Not registered yet: send the person to the signup for this business.
  if (!customer.ok) redirect(await localizeForCurrentRequest(`/b/${business.value.slug}`));

  const [summary, settings] = await Promise.all([
    makeGetPointsSummary().execute({ businessId: business.value.id, userId: viewer.uid }),
    makeGetReceiptSettings().execute(business.value.id),
  ]);
  if (!summary.ok || !settings.ok) notFound();

  return (
    <main className={`${COLUMN} flex min-h-dvh flex-1 flex-col gap-6 py-8 md:max-w-md`}>
      <LocalizedLink href="/me" className="text-label text-accent underline underline-offset-4">
        {pick(locale, { es: "← Mi cuenta", en: "← My account" })}
      </LocalizedLink>
      <PointsView
        slug={business.value.slug}
        businessName={business.value.name}
        pointsPerDollar={settings.value.pointsPerDollar}
        receipts={settings.value.enabled}
        summary={summary.value}
      />
    </main>
  );
}
