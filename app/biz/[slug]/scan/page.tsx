import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalizedLink } from "@/components/localized-link";
import { ScanClient } from "@/components/stamps/scan-client";
import { COLUMN } from "@/components/store/layout";
import { requireBusinessAccess } from "@/lib/auth/business-access";
import { getCurrentLocale, pick } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Scan customer",
  robots: { index: false, follow: false },
};

/**
 * The counter screen where staff scan a customer's QR to stamp their visit or
 * hand over a reward. Needs the `visits:record` permission: owners and staff.
 */
export default async function ScanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getCurrentLocale();
  const { access } = await requireBusinessAccess(slug, "visits:record");
  if (access.business.kind === "supermarket") notFound();

  return (
    <main className={`${COLUMN} flex min-h-dvh flex-1 flex-col gap-5 py-8 md:max-w-md`}>
      <header className="flex flex-col gap-1">
        <LocalizedLink href={`/biz/${access.business.slug}`} className="text-label text-accent underline underline-offset-4">
          {pick(locale, { es: "← Volver", en: "← Back" })}
        </LocalizedLink>
        <h1 className="text-display font-bold tracking-tight text-text">
          {pick(locale, { es: "Escanear cliente", en: "Scan customer" })}
        </h1>
        <p className="text-label text-text-muted">{access.business.name}</p>
      </header>
      <ScanClient slug={access.business.slug} />
    </main>
  );
}
