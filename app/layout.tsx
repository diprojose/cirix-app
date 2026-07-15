import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaInstaller } from "@/components/pwa-installer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "mixmag",
  title: {
    default: "mixmag — postres por pedido",
    template: "%s — mixmag",
  },
  description:
    "Tienda de postres artesanales hechos por pedido, con recetas exclusivas para suscriptores.",
  // iOS/iPadOS: enable standalone launch and set the home-screen app title.
  appleWebApp: {
    capable: true,
    title: "mixmag",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#e0669a",
  // Mobile-first: let content flow behind the notch/home indicator when needed.
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaInstaller />
      </body>
    </html>
  );
}
