import type { Metadata, Viewport } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { PwaInstaller } from "@/components/pwa-installer";

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
    default: "mixmag - MVP demos",
    template: "%s - mixmag",
  },
  description:
    "A module-based demo workspace for loyalty commerce and CRM MVP experiences.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
        <PwaInstaller />
      </body>
    </html>
  );
}
