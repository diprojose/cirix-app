import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { RecipeRepository } from "../../domain/repositories/recipe-repository";
import { RecipeId } from "../../domain/value-objects/recipe-id";
import { RecipeNotFoundError } from "../../domain/errors/recipes-errors";

/** Input for {@link DeleteRecipe}: the id of the recipe to remove. */
export type DeleteRecipeInput = {
  id: string;
};

/**
 * Removes a recipe (operator action). Prefer unpublishing for seasonal
 * content — deletion is for genuine mistakes.
 */
export class DeleteRecipe implements UseCase<DeleteRecipeInput, void> {
  constructor(private readonly recipes: RecipeRepository) {}

  async execute(input: DeleteRecipeInput): Promise<Result<void, DomainError>> {
    const id = RecipeId.from(input.id);
    const existing = await this.recipes.findById(id);
    if (existing === null) {
      return err(new RecipeNotFoundError(input.id));
    }

    await this.recipes.delete(id);
    return ok(undefined);
  }
}
