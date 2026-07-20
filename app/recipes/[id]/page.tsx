import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePremium } from "@/lib/auth/dal";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { BackButton } from "@/components/store/back-button";
import { DIFFICULTY_LABELS } from "@/components/recipes/recipe-meta";
import { makeGetRecipeById } from "@/modules/recipes/infrastructure/di/recipes-container";

export const metadata: Metadata = {
  title: "Receta",
  robots: { index: false, follow: false },
};

/**
 * Recipe detail page: subscriber content. The FIRST thing this page does is
 * run the server-side premium guard — guests go to login, non-premium
 * customers to the plan page — so steps and video never leave the server for
 * an unauthorized viewer (the project rule: protect on the server, never by
 * hiding in the client).
 */
export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requirePremium();
  const { id } = await params;

  const result = await makeGetRecipeById().execute({ recipeId: id });
  if (!result.ok) {
    notFound();
  }
  const recipe = result.value;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopNav viewer={viewer} />

      {/* Mobile / PWA horizon: top bar — back · Receta. */}
      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
        <BackButton />
        <p className="flex-1 truncate text-center text-base font-semibold text-text">
          {recipe.title}
        </p>
        <span className="h-10 w-10" aria-hidden="true" />
      </div>

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-[26rem] space-y-5 px-5 pt-4 md:max-w-2xl md:pt-8">
          <header>
            <h1 className="hidden text-2xl font-bold text-text md:block">{recipe.title}</h1>
            <p className="mt-1 text-sm text-text-muted">{recipe.description}</p>
            <p className="mt-2 text-xs font-semibold text-text-muted">
              {DIFFICULTY_LABELS[recipe.difficulty]}
              {recipe.durationMinutes !== null && <> · {recipe.durationMinutes} min</>}
              {" · "}
              {recipe.stepCount} pasos
            </p>
          </header>

          {recipe.imageUrl && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sugar-100">
              <Image
                src={recipe.imageUrl}
                alt={recipe.title}
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-contain p-4"
                priority
              />
            </div>
          )}

          {/* Video tutorial: lazy — nothing downloads until the user hits play
              (mobile data is expensive in Venezuela). */}
          {recipe.videoUrl && (
            <section aria-label="Video tutorial">
              <h2 className="mb-2 text-lg font-bold text-text">Video tutorial</h2>
              <video
                controls
                preload="none"
                poster={recipe.imageUrl || undefined}
                className="w-full rounded-2xl bg-ink"
                src={recipe.videoUrl}
              >
                Tu navegador no puede reproducir este video.
              </video>
            </section>
          )}

          <section aria-label="Ingredientes" className="rounded-2xl bg-surface p-4 shadow-xs">
            <h2 className="mb-2 text-lg font-bold text-text">Ingredientes</h2>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient} className="flex items-start gap-2 text-sm text-text">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-cta" />
                  {ingredient}
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Preparación">
            <h2 className="mb-2 text-lg font-bold text-text">Preparación</h2>
            <ol className="space-y-3">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-3 rounded-2xl bg-surface p-4 shadow-xs">
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-cta text-sm font-bold text-on-cta"
                  >
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-text">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <p className="text-sm">
            <Link
              href="/recipes"
              className="font-medium text-cta-strong underline underline-offset-2"
            >
              ← Todas las recetas
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}
