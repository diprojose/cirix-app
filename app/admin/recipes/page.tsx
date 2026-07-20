import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { requireOperator } from "@/lib/auth/dal";
import { makeListAllRecipes } from "@/modules/recipes/infrastructure/di/recipes-container";
import { DIFFICULTY_LABELS } from "@/components/recipes/recipe-meta";
import { FeedbackBanner } from "@/components/admin/feedback-banner";
import { deleteRecipeAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Recetas" };

/**
 * Operator recipe book: every recipe — drafts included — with edit links,
 * publication state at a glance and a delete escape hatch (unpublishing is the
 * recommended path).
 */
export default async function AdminRecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOperator();
  const { error } = await searchParams;

  const result = await makeListAllRecipes().execute();
  const recipes = result.ok ? result.value : [];

  return (
    <div>
      <FeedbackBanner error={error} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text">Recetas ({recipes.length})</h1>
        <Link
          href="/admin/recipes/new"
          className="rounded-pill bg-gradient-to-r from-cta to-cta-strong px-4 py-2 text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-95"
        >
          + Nueva
        </Link>
      </div>

      <ul className="space-y-2">
        {recipes.map((recipe) => (
          <li
            key={recipe.id}
            className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-xs"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sugar-100">
              {recipe.imageUrl ? (
                <Image
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-xl" aria-hidden="true">
                  👩‍🍳
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{recipe.title}</p>
              <p className="text-xs text-text-muted">
                {DIFFICULTY_LABELS[recipe.difficulty]} · {recipe.stepCount} pasos
                {recipe.hasVideo && " · 🎬"}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
                recipe.published
                  ? "bg-cta/15 text-cta-strong"
                  : "bg-sugar-200 text-text-muted"
              }`}
            >
              {recipe.published ? "Publicada" : "Borrador"}
            </span>

            <Link
              href={`/admin/recipes/${recipe.id}`}
              className="shrink-0 rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-sugar-100"
            >
              Editar
            </Link>
            <form action={deleteRecipeAction.bind(null, recipe.id)}>
              <button
                type="submit"
                aria-label={`Eliminar ${recipe.title}`}
                className="shrink-0 rounded-pill border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition-transform active:scale-95"
              >
                Eliminar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
