import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth/dal";
import { makeGetRecipeById } from "@/modules/recipes/infrastructure/di/recipes-container";
import { RecipeForm } from "@/components/admin/recipe-form";
import { FeedbackBanner } from "@/components/admin/feedback-banner";

export const metadata: Metadata = { title: "Editar receta" };

/** Operator form to edit an existing recipe (drafts included). */
export default async function AdminEditRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOperator();
  const { id } = await params;
  const { error } = await searchParams;

  const result = await makeGetRecipeById().execute({ recipeId: id, includeDrafts: true });
  if (!result.ok) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-text">Editar receta</h1>
      <FeedbackBanner error={error} />
      <RecipeForm recipe={result.value} />
    </div>
  );
}
