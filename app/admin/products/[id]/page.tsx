import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth/dal";
import { makeGetProductById } from "@/modules/loyalty/catalog/infrastructure/di/catalog-container";
import { ProductForm } from "@/components/admin/product-form";
import { FeedbackBanner } from "@/components/admin/feedback-banner";

export const metadata: Metadata = { title: "Editar producto" };

/** Operator form to edit an existing catalog product. */
export default async function AdminEditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOperator();
  const { id } = await params;
  const { error } = await searchParams;

  const result = await makeGetProductById().execute(id);
  if (!result.ok) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-text">Editar producto</h1>
      <FeedbackBanner error={error} />
      <ProductForm product={result.value} />
    </div>
  );
}
