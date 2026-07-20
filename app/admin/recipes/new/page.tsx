import type { Metadata } from "next";
import { requireOperator } from "@/lib/auth/dal";
import { RecipeForm } from "@/components/admin/recipe-form";
import { FeedbackBanner } from "@/components/admin/feedback-banner";

export const metadata: Metadata = { title: "Nueva receta" };

/** Operator form to add a recipe to the book. */
export default async function AdminNewRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOperator();
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-text">Nueva receta</h1>
      <FeedbackBanner error={error} />
      <RecipeForm />
    </div>
  );
}
