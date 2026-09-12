import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { PwaInstaller } from "@/components/pwa-installer";
import { RouteTheme } from "@/components/route-theme";
import { getCurrentLocale } from "@/lib/i18n";
import { headers } from "next/headers";
import { requirePlatformUser } from "@/lib/auth/dal";

const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mixmag.vercel.app"
);

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  applicationName: "Cirix",
  title: {
    default: "Cirix",
    template: "%s - Cirix",
  },
  description: "Cirix digital experiences for CRM, loyalty and customer activation.",
  appleWebApp: {
    capable: true,
    title: "Cirix",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: { url: "/brand/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  themeColor: "#051934",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const pathname = (await headers()).get("x-mixmag-pathname") ?? "/";
  if (pathname !== "/" && pathname !== "/login") await requirePlatformUser();

  return (
    <html
      lang={locale}
      className={`h-full antialiased ${inter.variable} ${outfit.variable}`}
      style={{
        ["--font-geist-mono" as string]:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={locale}>
          <CartProvider>
            <RouteTheme>
              {children}
              <PwaInstaller />
            </RouteTheme>
          </CartProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
