import "server-only";
import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { RecipeRepository } from "../../domain/repositories/recipe-repository";
import { FirestoreRecipeRepository } from "../persistence/firestore-recipe-repository";
import { buildRecipeSeed } from "../persistence/recipe-seed";
import { ListPublishedRecipes } from "../../application/use-cases/list-published-recipes";
import { GetRecipeById } from "../../application/use-cases/get-recipe-by-id";
import { ListAllRecipes } from "../../application/use-cases/list-all-recipes";
import { CreateRecipe } from "../../application/use-cases/create-recipe";
import { UpdateRecipe } from "../../application/use-cases/update-recipe";
import { DeleteRecipe } from "../../application/use-cases/delete-recipe";

/*
 * Composition root for the recipes module. Server-only on purpose: recipe
 * content is subscriber material and must never be bundled toward the client.
 * Swapping persistence means changing only this file.
 */

let recipeRepository: RecipeRepository | null = null;

/** The Firestore-backed recipe book, created lazily so importing the container
 * does not require Firebase credentials at build time. Seeds sample recipes on
 * an empty collection. */
function repository(): RecipeRepository {
  recipeRepository ??= new FirestoreRecipeRepository(adminFirestore(), buildRecipeSeed());
  return recipeRepository;
}

/** Builds the "list published recipes" use case (public teasers). */
export const makeListPublishedRecipes = (): ListPublishedRecipes =>
  new ListPublishedRecipes(repository());

/** Builds the "get recipe by id" use case (call behind the premium guard). */
export const makeGetRecipeById = (): GetRecipeById => new GetRecipeById(repository());

/** Builds the "list all recipes" use case (operator view). */
export const makeListAllRecipes = (): ListAllRecipes => new ListAllRecipes(repository());

/** Builds the "create recipe" use case (operator action). */
export const makeCreateRecipe = (): CreateRecipe => new CreateRecipe(repository());

/** Builds the "update recipe" use case (operator action). */
export const makeUpdateRecipe = (): UpdateRecipe => new UpdateRecipe(repository());

/** Builds the "delete recipe" use case (operator action). */
export const makeDeleteRecipe = (): DeleteRecipe => new DeleteRecipe(repository());
