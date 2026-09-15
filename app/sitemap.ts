import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/locale";
import { SITE_URL } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    alternates: {
      languages: { en: `${SITE_URL}/en`, es: `${SITE_URL}/es` },
    },
  }));
}
