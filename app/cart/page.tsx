import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/dal";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { BackButton } from "@/components/store/back-button";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = {
  title: "Carrito",
  description: "Revisa los productos de tu pedido antes de finalizar la compra.",
};

/**
 * Cart page: the storefront's cart adapter. The page shell (nav, header, footer)
 * is server-rendered like the rest of the store, while the cart contents come
 * entirely from the client `useCart()` context inside {@link CartView} — a guest
 * cart lives in the browser (localStorage), not on the server.
 */
export default async function CartPage() {
  const viewer = await getViewer();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Desktop / web horizon: top navigation bar (hidden below md). */}
      <TopNav viewer={viewer} />

      {/* Mobile / PWA horizon: top bar — back · Carrito. */}
      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
        <BackButton />
        <p className="flex-1 text-center text-base font-semibold text-text">Carrito</p>
        <span className="h-10 w-10" aria-hidden="true" />
      </div>

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-[26rem] px-5 pt-4 md:max-w-2xl md:pt-8">
          <h1 className="mb-4 hidden text-2xl font-bold text-text md:block">Tu carrito</h1>
          <CartView />
        </div>
      </main>

      {/* Desktop / web horizon: footer. */}
      <SiteFooter />

      {/* Mobile / PWA horizon: floating tab bar. */}
      <BottomNav />
    </div>
  );
}
