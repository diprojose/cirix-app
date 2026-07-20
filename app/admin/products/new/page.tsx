import type { Metadata } from "next";
import { requireOperator } from "@/lib/auth/dal";
import { ProductForm } from "@/components/admin/product-form";
import { FeedbackBanner } from "@/components/admin/feedback-banner";

export const metadata: Metadata = { title: "Nuevo producto" };

/** Operator form to add a product to the catalog. */
export default async function AdminNewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOperator();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-text">Nuevo producto</h1>
      <FeedbackBanner error={error} />
      <ProductForm />
    </div>
  );
}
