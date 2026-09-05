import { notFound, redirect } from "next/navigation";
import { getBrandProfile } from "@/modules/loyalty/branding/infrastructure/branding-container";

export default async function BrandedLoyaltyPage({
  params,
}: {
  params: Promise<{ lang: string; brandSlug: string }>;
}) {
  const { lang, brandSlug } = await params;
  const brand = await getBrandProfile(brandSlug);
  if (!brand || !brand.active) notFound();
  redirect(`/${lang}/demo/${brand.slug}/home`);
}
