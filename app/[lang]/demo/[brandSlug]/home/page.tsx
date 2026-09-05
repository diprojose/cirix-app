import { notFound } from "next/navigation";
import { getBrandProfile } from "@/modules/loyalty/branding/infrastructure/branding-container";
import { LoyaltyStorefront } from "@/modules/loyalty/server/loyalty-page";

export default async function BrandedDemoHomePage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;
  const brand = await getBrandProfile(brandSlug);
  if (!brand || !brand.active) notFound();
  return <LoyaltyStorefront brand={brand} />;
}
