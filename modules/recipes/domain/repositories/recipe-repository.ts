import type { Recipe } from "../entities/recipe";
import type { RecipeId } from "../value-objects/recipe-id";

/**
 * RecipeRepository is the persistence port for the recipes aggregate. The
 * domain declares this contract; an infrastructure adapter implements it.
 * Swapping the storage engine must not touch domain or application code.
 */
export interface RecipeRepository {
  /** Returns the recipe with the given id, or `null` when none exists. */
  findById(id: RecipeId): Promise<Recipe | null>;

  /** Returns every published recipe (the subscribers' listing). */
  findAllPublished(): Promise<Recipe[]>;

  /** Returns every recipe, drafts included (the operator's view). */
  findAll(): Promise<Recipe[]>;

  /** Inserts the recipe or replaces the existing one with the same id. */
  save(recipe: Recipe): Promise<void>;

  /** Removes the recipe with the given id (idempotent). */
  delete(id: RecipeId): Promise<void>;
}
