import type { Recipe, RecipeDifficulty } from "../../domain/entities/recipe";

/**
 * RecipeTeaserDto is the public-safe preview of a recipe: enough to sell the
 * subscription (title, photo, difficulty, how many steps) without leaking the
 * actual content. The public listing uses this shape exclusively — the split
 * happens here, on the server, never by hiding fields in the client.
 */
export type RecipeTeaserDto = {
  id: string;
  title: string;
  description: string;
  difficulty: RecipeDifficulty;
  durationMinutes: number | null;
  imageUrl: string;
  stepCount: number;
  hasVideo: boolean;
};

/**
 * RecipeDto is the full, serializable view of a {@link Recipe} for premium
 * subscribers (and the operator's forms): ingredients, ordered steps and the
 * video URL included. Only premium-guarded adapters may send it to a client.
 */
export type RecipeDto = RecipeTeaserDto & {
  ingredients: string[];
  steps: string[];
  videoUrl: string;
  published: boolean;
};

/** Maps a Recipe aggregate to its public teaser DTO. */
export const toRecipeTeaserDto = (recipe: Recipe): RecipeTeaserDto => ({
  id: recipe.id.value,
  title: recipe.title,
  description: recipe.description,
  difficulty: recipe.difficulty,
  durationMinutes: recipe.durationMinutes,
  imageUrl: recipe.imageUrl,
  stepCount: recipe.steps.length,
  hasVideo: recipe.videoUrl.length > 0,
});

/** Maps a Recipe aggregate to its full subscriber DTO. */
export const toRecipeDto = (recipe: Recipe): RecipeDto => ({
  ...toRecipeTeaserDto(recipe),
  ingredients: [...recipe.ingredients],
  steps: [...recipe.steps],
  videoUrl: recipe.videoUrl,
  published: recipe.isPublished,
});
