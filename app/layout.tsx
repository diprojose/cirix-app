import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { PwaInstaller } from "@/components/pwa-installer";
import { RouteTheme } from "@/components/route-theme";
import { ToastProvider } from "@/components/toast-provider";
import { getCurrentLocale } from "@/lib/i18n";
import { headers } from "next/headers";
import { requirePlatformUser } from "@/lib/auth/dal";
import { isLoyaltyAppScreen, requiresPlatformAccess } from "@/lib/auth/route-access";

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site-metadata";

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
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: "%s - Cirix",
  },
  description: SITE_DESCRIPTION,
  // Public landing pages explicitly opt in to indexing in homeMetadata().
  robots: { index: false, follow: false },
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

/** The phone's status bar matches the page: light on the loyalty app, navy elsewhere. */
export async function generateViewport(): Promise<Viewport> {
  const pathname = (await headers()).get("x-mixmag-pathname") ?? "/";
  return { themeColor: isLoyaltyAppScreen(pathname) ? "#f3f5f7" : "#051934", viewportFit: "cover" };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const pathname = (await headers()).get("x-mixmag-pathname") ?? "/";
  // Review and member pages enforce their own identity check at the page
  // boundary: members are verified accounts, authorized per business.
  if (requiresPlatformAccess(pathname)) await requirePlatformUser();

  return (
    <html
      lang={locale}
      data-theme={isLoyaltyAppScreen(pathname) ? "light" : undefined}
      className={`h-full antialiased ${inter.variable} ${outfit.variable}`}
      style={{
        ["--font-geist-mono" as string]:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      }}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={locale}>
          <ToastProvider>
            <CartProvider>
              <RouteTheme>
                {children}
                <PwaInstaller />
              </RouteTheme>
            </CartProvider>
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
