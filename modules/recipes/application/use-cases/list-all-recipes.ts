import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { RecipeRepository } from "../../domain/repositories/recipe-repository";
import { toRecipeDto, type RecipeDto } from "../dtos/recipe-dto";

/**
 * Lists every recipe — drafts included — for the operator's management view.
 * Returns full DTOs; the calling adapter must sit behind the operator guard.
 */
export class ListAllRecipes implements UseCase<void, RecipeDto[]> {
  constructor(private readonly recipes: RecipeRepository) {}

  async execute(): Promise<Result<RecipeDto[], DomainError>> {
    const recipes = await this.recipes.findAll();
    return ok(recipes.map(toRecipeDto));
  }
}
