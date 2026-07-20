import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getViewer } from "@/lib/auth/dal";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { BackButton } from "@/components/store/back-button";
import { DIFFICULTY_LABELS } from "@/components/recipes/recipe-meta";
import { makeListPublishedRecipes } from "@/modules/recipes/infrastructure/di/recipes-container";
import type { RecipeTeaserDto } from "@/modules/recipes/application/dtos/recipe-dto";

export const metadata: Metadata = {
  title: "Recetas",
  description:
    "Las recetas de nuestros pasteleros: tutoriales paso a paso para suscriptores premium.",
};

/**
 * Public recipes listing (primary adapter): teaser cards only — title, photo,
 * difficulty and step count, never the content. Non-premium viewers see a lock
 * hint and a CTA to the plan; the full recipe lives behind the premium guard
 * on the detail page. Safe for any viewer by construction: the use case
 * returns teasers, so there is nothing premium here to hide.
 */
export default async function RecipesPage() {
  const [viewer, result] = await Promise.all([
    getViewer(),
    makeListPublishedRecipes().execute(),
  ]);
  const recipes = result.ok ? result.value : [];
  const isPremium = viewer.permissions.canViewRecipes;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopNav viewer={viewer} />

      {/* Mobile / PWA horizon: top bar — back · Recetas. */}
      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
        <BackButton />
        <p className="flex-1 text-center text-base font-semibold text-text">Recetas</p>
        <span className="h-10 w-10" aria-hidden="true" />
      </div>

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-[26rem] px-5 pt-4 md:max-w-4xl md:pt-8">
          <h1 className="hidden text-2xl font-bold text-text md:block">
            Recetas de nuestros pasteleros
          </h1>

          {!isPremium && (
            <div className="mt-4 rounded-2xl bg-accent-soft p-4 md:mt-6">
              <p className="text-sm font-semibold text-brand-800">
                Las recetas completas (pasos y video) son para suscriptores premium.
              </p>
              <Link
                href="/premium"
                className="mt-3 flex h-11 items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong px-5 text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98] md:w-fit"
              >
                Quiero ser premium
              </Link>
            </div>
          )}

          {recipes.length === 0 ? (
            <p className="mt-8 rounded-2xl bg-surface p-6 text-center text-sm text-text-muted shadow-xs">
              Pronto publicaremos recetas.
            </p>
          ) : (
            <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} locked={!isPremium} />
              ))}
            </ul>
          )}
        </div>
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}

/** One teaser card. Locked cards route to the plan instead of the content. */
function RecipeCard({ recipe, locked }: { recipe: RecipeTeaserDto; locked: boolean }) {
  const href = locked ? "/premium" : `/recipes/${recipe.id}`;

  return (
    <li className="overflow-hidden rounded-2xl bg-surface shadow-xs transition-transform motion-safe:hover:-translate-y-1">
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta">
        <div className="relative aspect-[4/3] bg-sugar-100">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-contain p-4"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-4xl" aria-hidden="true">
              👩‍🍳
            </div>
          )}
          {locked && (
            <span className="absolute right-3 top-3 rounded-pill bg-ink/80 px-2.5 py-1 text-xs font-semibold text-on-accent">
              🔒 Premium
            </span>
          )}
        </div>
        <div className="p-4">
          <h2 className="text-base font-bold leading-snug text-text">{recipe.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-text-muted">{recipe.description}</p>
          <p className="mt-2 text-xs font-medium text-text-muted">
            {DIFFICULTY_LABELS[recipe.difficulty]}
            {recipe.durationMinutes !== null && <> · {recipe.durationMinutes} min</>}
            {" · "}
            {recipe.stepCount} pasos
            {recipe.hasVideo && " · 🎬 video"}
          </p>
        </div>
      </Link>
    </li>
  );
}
