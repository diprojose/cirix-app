import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { StampCardView } from "@/components/stamps/stamp-card-view";
import { BrandTheme } from "@/components/card-design/brand-style";
import { COLUMN } from "@/components/store/layout";
import { getMemberViewer } from "@/lib/auth/dal";
import { getCurrentLocale, localizeForCurrentRequest, pick } from "@/lib/i18n";
import { cardPath, readTableCodeParam, tableQrPath } from "@/lib/stamps/table-qr";
import { makeGetBusinessBySlug } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeGetStampCard } from "@/modules/stamp-card/infrastructure/di/stamp-card-container";
import { makeGetReceiptSettings } from "@/modules/receipts/infrastructure/di/receipts-container";
import { makeGetCardDesign } from "@/modules/card-design/infrastructure/card-design-container";
import { toCardLook } from "@/modules/card-design/application/card-design-use-cases";
import { DEFAULT_CARD_DESIGN, firstName } from "@/modules/card-design/domain/card-design";
import { makeGetCustomer } from "@/modules/crm/infrastructure/di/crm-core-container";

export const metadata: Metadata = {
  title: "My card",
  robots: { index: false, follow: false },
};

/**
 * One customer's stamp card in one business, with their personal QR. Opened from
 * the table QR it carries the table code (`t`), and offers to stamp the visit.
 */
export default async function StampCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const [{ slug }, { t }, viewer, locale] = await Promise.all([params, searchParams, getMemberViewer(), getCurrentLocale()]);
  const tableCode = readTableCodeParam(t);
  if (!viewer.authenticated || viewer.uid === null) {
    redirect(await localizeForCurrentRequest(`/login?from=${encodeURIComponent(cardPath(slug, tableCode))}`));
  }

  const business = await makeGetBusinessBySlug().execute(slug);
  // Supermarkets earn points, not stamps; for them there is no stamp card.
  if (!business.ok || business.value.kind === "supermarket") notFound();

  const [card, receipts, design, customer] = await Promise.all([
    makeGetStampCard().execute({ businessId: business.value.id, userId: viewer.uid }),
    makeGetReceiptSettings().execute(business.value.id),
    makeGetCardDesign().execute(business.value.id),
    makeGetCustomer().execute({ businessId: business.value.id, userId: viewer.uid }),
  ]);
  if (!card.ok) {
    // Not registered yet: send the person to the signup for this business, keeping the table code.
    if (card.error.code === "stamps/not-a-customer") {
      redirect(await localizeForCurrentRequest(tableCode === null ? `/b/${business.value.slug}` : tableQrPath(business.value.slug, tableCode)));
    }
    notFound();
  }

  const look = design.ok ? design.value.look : toCardLook(business.value.id, DEFAULT_CARD_DESIGN);

  return (
    // The whole page wears the business's colour, not just the card.
    <main className={`${COLUMN} flex min-h-dvh flex-1 flex-col gap-6 py-8 md:max-w-md`}>
      <BrandTheme color={look.color} />
      <LocalizedLink href="/me" className="text-label text-accent underline underline-offset-4">
        {pick(locale, { es: "← Mi cuenta", en: "← My account" })}
      </LocalizedLink>
      <StampCardView
        slug={business.value.slug}
        businessName={business.value.name}
        initial={card.value}
        tableCode={card.value.tableStamps ? tableCode : null}
        receipts={receipts.ok && receipts.value.enabled}
        look={look}
        customerName={customer.ok ? firstName(customer.value.name) : null}
      />
    </main>
  );
}
