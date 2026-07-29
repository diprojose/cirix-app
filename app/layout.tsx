import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { PwaInstaller } from "@/components/pwa-installer";
import { getCurrentLocale } from "@/lib/i18n";

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
      className="h-full antialiased"
      style={{
        ["--font-poppins" as string]: "ui-sans-serif, system-ui, sans-serif",
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
