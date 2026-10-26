import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { StampCardView } from "@/components/stamps/stamp-card-view";
import { COLUMN } from "@/components/store/layout";
import { getMemberViewer } from "@/lib/auth/dal";
import { getCurrentLocale, localizeForCurrentRequest, pick } from "@/lib/i18n";
import { makeGetBusinessBySlug } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeGetStampCard } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";

export const metadata: Metadata = {
  title: "My card",
  robots: { index: false, follow: false },
};

/** One customer's stamp card in one business, with their personal QR. */
export default async function StampCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, viewer, locale] = await Promise.all([params, getMemberViewer(), getCurrentLocale()]);
  if (!viewer.authenticated || viewer.uid === null) {
    redirect(await localizeForCurrentRequest(`/login?from=${encodeURIComponent(`/me/cards/${slug}`)}`));
  }

  const business = await makeGetBusinessBySlug().execute(slug);
  // Supermarkets earn points, not stamps; for them there is no stamp card.
  if (!business.ok || business.value.kind === "supermarket") notFound();

  const card = await makeGetStampCard().execute({ businessId: business.value.id, userId: viewer.uid });
  if (!card.ok) {
    // Not registered yet: send the person to the signup for this business.
    if (card.error.code === "stamps/not-a-customer") redirect(await localizeForCurrentRequest(`/b/${business.value.slug}`));
    notFound();
  }

  return (
    <main className={`${COLUMN} flex min-h-dvh flex-1 flex-col gap-6 py-8 md:max-w-md`}>
      <LocalizedLink href="/me" className="text-label text-accent underline underline-offset-4">
        {pick(locale, { es: "← Mi cuenta", en: "← My account" })}
      </LocalizedLink>
      <StampCardView slug={business.value.slug} businessName={business.value.name} initial={card.value} />
    </main>
  );
}
