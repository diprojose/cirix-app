import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/dal";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { SubHeader } from "@/components/store/sub-header";
import { CONTAINER_READ } from "@/components/store/layout";
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
      <TopNav viewer={viewer} />
      <SubHeader title="Carrito" />

      <main className="flex-1 pb-28 md:pb-12">
        <div className={`${CONTAINER_READ} pt-4 md:pt-8`}>
          <h2 className="mb-4 hidden text-display font-bold text-text md:block">Tu carrito</h2>
          <CartView />
        </div>
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}
