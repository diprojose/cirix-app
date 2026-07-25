import type { Metadata, Viewport } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { PwaInstaller } from "@/components/pwa-installer";

// Poppins is the product typeface (geometric, rounded, friendly). Weights map
// to the type scale in DESIGN.md: 400 body, 500 label, 600 titles, 700 display.
const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Geist Mono stays available for monospace data (e.g. tabular figures).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "mixmag",
  title: {
    default: "mixmag — tu supermercado",
    template: "%s — mixmag",
  },
  description:
    "Supermercado a domicilio: pide tu mercado y acumula saldo con cada compra.",
  // iOS/iPadOS: enable standalone launch and set the home-screen app title.
  appleWebApp: {
    capable: true,
    title: "mixmag",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2d8249",
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
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
        <PwaInstaller />
      </body>
    </html>
  );
}
