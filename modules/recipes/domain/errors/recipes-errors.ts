import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a recipe is requested by an id that has no match. */
export class RecipeNotFoundError extends DomainError {
  readonly code = "recipes/recipe-not-found";

  constructor(id: string) {
    super(`Recipe with id "${id}" was not found.`);
  }
}

/** Raised when a recipe is built with invalid attributes. */
export class InvalidRecipeError extends DomainError {
  readonly code = "recipes/invalid-recipe";
}
