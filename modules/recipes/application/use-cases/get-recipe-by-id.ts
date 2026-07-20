import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { RecipeRepository } from "../../domain/repositories/recipe-repository";
import { RecipeId } from "../../domain/value-objects/recipe-id";
import { RecipeNotFoundError } from "../../domain/errors/recipes-errors";
import { toRecipeDto, type RecipeDto } from "../dtos/recipe-dto";

/** Input for {@link GetRecipeById}: the recipe's id. */
export type GetRecipeByIdInput = {
  recipeId: string;
  /** Include unpublished drafts (operator views only). */
  includeDrafts?: boolean;
};

/**
 * Fetches one full recipe. IMPORTANT: the returned DTO contains the premium
 * content (steps, video) — every primary adapter calling this for a customer
 * MUST run the server-side premium guard first. Drafts are only visible when
 * the operator flag is set.
 */
export class GetRecipeById implements UseCase<GetRecipeByIdInput, RecipeDto> {
  constructor(private readonly recipes: RecipeRepository) {}

  async execute(input: GetRecipeByIdInput): Promise<Result<RecipeDto, DomainError>> {
    const recipe = await this.recipes.findById(RecipeId.from(input.recipeId));
    if (recipe === null || (!recipe.isPublished && !input.includeDrafts)) {
      return err(new RecipeNotFoundError(input.recipeId));
    }
    return ok(toRecipeDto(recipe));
  }
}
