import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { RecipeRepository } from "../../domain/repositories/recipe-repository";
import { toRecipeTeaserDto, type RecipeTeaserDto } from "../dtos/recipe-dto";

/**
 * Lists the published recipes as public-safe teasers for the /recipes listing.
 * Teasers carry no steps or video, so this use case is safe for any viewer —
 * the full content stays behind the premium guard in `GetRecipeById`'s
 * adapter.
 */
export class ListPublishedRecipes implements UseCase<void, RecipeTeaserDto[]> {
  constructor(private readonly recipes: RecipeRepository) {}

  async execute(): Promise<Result<RecipeTeaserDto[], DomainError>> {
    const recipes = await this.recipes.findAllPublished();
    return ok(recipes.map(toRecipeTeaserDto));
  }
}
