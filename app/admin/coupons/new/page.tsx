import type { Metadata } from "next";
import { requireOperator } from "@/lib/auth/dal";
import { CouponForm } from "@/components/admin/coupon-form";
import { FeedbackBanner } from "@/components/admin/feedback-banner";

export const metadata: Metadata = { title: "Nuevo cupón" };

/** Operator form to create a new coupon. */
export default async function AdminNewCouponPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOperator();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-text">Nuevo cupón</h1>
      <FeedbackBanner error={error} />
      <CouponForm />
    </div>
  );
}
