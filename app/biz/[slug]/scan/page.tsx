import type { Metadata } from "next";
import { RedemptionScanClient } from "@/components/receipts/redemption-scan-client";
import { ScanClient } from "@/components/stamps/scan-client";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Scan customer",
  robots: { index: false, follow: false },
};

/**
 * The counter screen. In a restaurant, staff scan a customer's QR to stamp their
 * visit or hand over a reward; in a supermarket, a prize code to hand over the
 * prize. Needs the `visits:record` permission: owners and staff.
 */
export default async function ScanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const { access } = await requireBusinessAccess(slug, "visits:record");
  const supermarket = access.business.kind === "supermarket";

  return (
    <main className="flex flex-col gap-5 md:max-w-md">
      <header className="flex flex-col gap-1">
        <h1 className="text-display font-bold tracking-tight text-text">
          {supermarket
            ? pick(locale, { es: "Entregar premio", en: "Hand over a reward" })
            : pick(locale, { es: "Escanear cliente", en: "Scan customer" })}
        </h1>
      </header>
      {supermarket ? <RedemptionScanClient slug={access.business.slug} /> : <ScanClient slug={access.business.slug} />}
    </main>
  );
}
