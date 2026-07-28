import type { Metadata, Viewport } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { PwaInstaller } from "@/components/pwa-installer";
import { getCurrentLocale } from "@/lib/i18n";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "mixmag",
  title: {
    default: "mixmag",
    template: "%s - mixmag",
  },
  appleWebApp: {
    capable: true,
    title: "mixmag",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2d8249",
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
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
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
