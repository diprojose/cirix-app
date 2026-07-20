import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { RecipeRepository } from "../../domain/repositories/recipe-repository";
import { Recipe } from "../../domain/entities/recipe";
import { RecipeId } from "../../domain/value-objects/recipe-id";
import { RecipeNotFoundError } from "../../domain/errors/recipes-errors";
import { toRecipeDto, type RecipeDto } from "../dtos/recipe-dto";
import type { CreateRecipeInput } from "./create-recipe";

/** Input for {@link UpdateRecipe}: the target id plus the full new state. */
export type UpdateRecipeInput = CreateRecipeInput & {
  id: string;
};

/**
 * Replaces a recipe's data (operator action). Full replacement rather than a
 * patch: the operator form always submits the complete state, and the
 * aggregate re-validates every invariant.
 */
export class UpdateRecipe implements UseCase<UpdateRecipeInput, RecipeDto> {
  constructor(private readonly recipes: RecipeRepository) {}

  async execute(input: UpdateRecipeInput): Promise<Result<RecipeDto, DomainError>> {
    const existing = await this.recipes.findById(RecipeId.from(input.id));
    if (existing === null) {
      return err(new RecipeNotFoundError(input.id));
    }

    const recipe = Recipe.create(input);
    if (!recipe.ok) {
      return recipe;
    }

    await this.recipes.save(recipe.value);
    return ok(toRecipeDto(recipe.value));
  }
}
