import type { RecipeDifficulty } from "@/modules/recipes/domain/entities/recipe";

/** Customer-facing Spanish label per difficulty. */
export const DIFFICULTY_LABELS: Record<RecipeDifficulty, string> = {
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
};
