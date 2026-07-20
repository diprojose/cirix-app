import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { RecipeRepository } from "../../domain/repositories/recipe-repository";
import { Recipe } from "../../domain/entities/recipe";
import { toRecipeDto, type RecipeDto } from "../dtos/recipe-dto";

/** Input for {@link CreateRecipe}: everything the operator's form collects. */
export type CreateRecipeInput = {
  title: string;
  description: string;
  difficulty: string;
  durationMinutes?: number | null;
  ingredients: string[];
  steps: string[];
  imageUrl?: string;
  videoUrl?: string;
  published?: boolean;
};

/**
 * Creates a new recipe (operator action). The aggregate validates every
 * invariant; this use case only persists the valid result.
 */
export class CreateRecipe implements UseCase<CreateRecipeInput, RecipeDto> {
  constructor(private readonly recipes: RecipeRepository) {}

  async execute(input: CreateRecipeInput): Promise<Result<RecipeDto, DomainError>> {
    const recipe = Recipe.create(input);
    if (!recipe.ok) {
      return recipe;
    }

    await this.recipes.save(recipe.value);
    return ok(toRecipeDto(recipe.value));
  }
}
