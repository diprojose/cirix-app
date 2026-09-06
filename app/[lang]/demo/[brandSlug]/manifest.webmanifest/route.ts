import type { MetadataRoute } from "next";
import { getDemoBrand as getBrandProfile } from "@/modules/loyalty/demo/brand";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ lang: string; brandSlug: string }>;
  }
) {
  const { lang, brandSlug } = await params;
  const brand = await getBrandProfile(brandSlug);
  if (!brand || !brand.active) {
    return new Response("Not found", { status: 404 });
  }

  const root = `/${lang}/demo/${brand.slug}`;
  const home = `${root}/home`;
  const manifest: MetadataRoute.Manifest = {
    name: `${brand.displayName} · compra y gana`,
    short_name: brand.displayName.slice(0, 30),
    description: brand.heroSubtitle,
    lang,
    id: home,
    start_url: home,
    scope: `${root}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: brand.backgroundColor,
    theme_color: brand.primaryColor,
    icons: [
      {
        src: `${root}/app-icon.png?size=192`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${root}/app-icon.png?size=512`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${root}/app-icon.png?size=512&purpose=maskable`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
