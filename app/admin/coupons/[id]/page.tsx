import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth/dal";
import { makeGetCouponById } from "@/modules/loyalty/coupons/infrastructure/di/coupons-container";
import { CouponForm } from "@/components/admin/coupon-form";
import { FeedbackBanner } from "@/components/admin/feedback-banner";

export const metadata: Metadata = { title: "Editar cupón" };

/** Operator form to edit an existing coupon. */
export default async function AdminEditCouponPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOperator();
  const { id } = await params;
  const { error } = await searchParams;

  const result = await makeGetCouponById().execute(id);
  if (!result.ok) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-text">Editar cupón</h1>
      <FeedbackBanner error={error} />
      <CouponForm coupon={result.value} />
    </div>
  );
}
