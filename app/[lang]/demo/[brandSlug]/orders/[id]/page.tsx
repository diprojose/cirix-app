import type { Metadata } from "next";
import OrderPage from "@/app/orders/[id]/page";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BrandedOrderPage({
  params,
}: {
  params: Promise<{ brandSlug: string; id: string }>;
}) {
  const resolved = await params;
  return (
    <OrderPage
      params={Promise.resolve({ id: resolved.id })}
      expectedBrandSlug={resolved.brandSlug}
    />
  );
}
