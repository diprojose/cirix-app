import { Cart } from "@/modules/loyalty/demo/checkout";
export default async function DemoCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ coupon?: string; redeem?: string }>;
}) {
  const query = await searchParams;
  return (
    <Cart
      checkout
      initialCoupon={query.coupon}
      initialRedeem={query.redeem === "1"}
    />
  );
}
