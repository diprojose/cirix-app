import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { PwaInstaller } from "@/components/pwa-installer";
import { getCurrentLocale } from "@/lib/i18n";

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
    icon: "/brand/cirix-logo.png",
    apple: "/brand/cirix-logo.png",
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
          <CartProvider>{children}</CartProvider>
        </LocaleProvider>
        <PwaInstaller />
      </body>
    </html>
  );
}
