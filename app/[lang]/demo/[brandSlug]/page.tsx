import { notFound, redirect } from "next/navigation";
import { getDemoBrand as getBrandProfile } from "@/modules/loyalty/demo/brand";

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
