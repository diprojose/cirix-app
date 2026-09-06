import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getDemoBrand as getBrandProfile } from "@/modules/loyalty/demo/brand";
import { DemoProvider } from "@/modules/loyalty/demo/provider";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ lang: string; brandSlug: string }>;
};

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const { lang, brandSlug } = await params;
  const brand = await getBrandProfile(brandSlug);
  if (!brand || !brand.active) return {};
  const previewImages =
    brand.slug === "mercado-fresco"
      ? [{ url: "/og.png", width: 1200, height: 630, alt: brand.displayName }]
      : brand.logoUrl
        ? [{ url: brand.logoUrl, alt: brand.displayName }]
        : [];
  const iconRoute = `/${lang}/demo/${brand.slug}/app-icon.png`;
  return {
    applicationName: brand.displayName,
    manifest: `/${lang}/demo/${brand.slug}/manifest.webmanifest`,
    title: {
      absolute: brand.displayName,
      template: `%s · ${brand.displayName}`,
    },
    description: brand.heroSubtitle,
    appleWebApp: {
      capable: true,
      title: brand.displayName,
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [
        { url: `${iconRoute}?size=32`, sizes: "32x32", type: "image/png" },
        { url: `${iconRoute}?size=192`, sizes: "192x192", type: "image/png" },
      ],
      apple: [
        { url: `${iconRoute}?size=180`, sizes: "180x180", type: "image/png" },
      ],
    },
    openGraph: {
      type: "website",
      title: brand.displayName,
      description: brand.heroSubtitle,
      images: previewImages,
    },
    twitter: {
      card: previewImages.length > 0 ? "summary_large_image" : "summary",
      title: brand.displayName,
      description: brand.heroSubtitle,
      images: previewImages.map((image) => image.url),
    },
  };
}

export async function generateViewport({
  params,
}: LayoutProps): Promise<Viewport> {
  const { brandSlug } = await params;
  const brand = await getBrandProfile(brandSlug);
  return {
    themeColor: brand?.active ? brand.primaryColor : "#164e3d",
    viewportFit: "cover",
  };
}

export default async function BrandedDemoLayout({
  children,
  params,
}: LayoutProps) {
  const { brandSlug } = await params;
  const brand = await getBrandProfile(brandSlug);
  if (!brand || !brand.active) notFound();

  return (
    <DemoProvider key={brand.slug} brand={brand}>
      {children}
    </DemoProvider>
  );
}
