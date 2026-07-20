import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { RecipeId } from "../value-objects/recipe-id";
import { InvalidRecipeError } from "../errors/recipes-errors";

/** How demanding a recipe is for a home baker. */
export const RECIPE_DIFFICULTIES = ["facil", "media", "dificil"] as const;

export type RecipeDifficulty = (typeof RECIPE_DIFFICULTIES)[number];

/** Type guard for difficulties loaded from forms or persistence. */
export const isRecipeDifficulty = (value: string): value is RecipeDifficulty =>
  (RECIPE_DIFFICULTIES as readonly string[]).includes(value);

/** Props backing a {@link Recipe} aggregate. */
type RecipeProps = {
  title: string;
  description: string;
  difficulty: RecipeDifficulty;
  durationMinutes: number | null;
  ingredients: string[];
  steps: string[];
  imageUrl: string;
  videoUrl: string;
  published: boolean;
};

/** Input accepted by {@link Recipe.create}. */
export type CreateRecipeInput = {
  id?: string;
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
 * Recipe is the aggregate root of the recipes context: a baker's tutorial —
 * ingredients, ordered steps, and optionally a photo and a video — offered to
 * premium subscribers. It owns its invariants (a real title, a known
 * difficulty, at least one ingredient and one step), so an unusable recipe can
 * never be constructed. Whether a viewer may see the full content is not this
 * aggregate's concern: access control lives at the server boundary (the
 * premium guard), and the teaser/full split lives in the application DTOs.
 */
export class Recipe extends AggregateRoot<RecipeProps, RecipeId> {
  private constructor(id: RecipeId, props: RecipeProps) {
    super(id, props);
  }

  /** Builds a Recipe, validating its invariants. Fails with a Result on invalid input. */
  static create(input: CreateRecipeInput): Result<Recipe, DomainError> {
    const title = input.title.trim();
    if (title.length < 2 || title.length > 120) {
      return err(new InvalidRecipeError("Recipe title must be between 2 and 120 characters."));
    }

    if (!isRecipeDifficulty(input.difficulty)) {
      return err(new InvalidRecipeError(`Unknown difficulty "${input.difficulty}".`));
    }

    const durationMinutes = input.durationMinutes ?? null;
    if (
      durationMinutes !== null &&
      (!Number.isInteger(durationMinutes) || durationMinutes <= 0)
    ) {
      return err(new InvalidRecipeError("Duration must be a positive number of minutes."));
    }

    const ingredients = input.ingredients.map((item) => item.trim()).filter(Boolean);
    if (ingredients.length === 0) {
      return err(new InvalidRecipeError("A recipe requires at least one ingredient."));
    }

    const steps = input.steps.map((step) => step.trim()).filter(Boolean);
    if (steps.length === 0) {
      return err(new InvalidRecipeError("A recipe requires at least one step."));
    }

    const id = input.id ? RecipeId.from(input.id) : RecipeId.generate();
    return ok(
      new Recipe(id, {
        title,
        description: input.description.trim(),
        difficulty: input.difficulty,
        durationMinutes,
        ingredients,
        steps,
        imageUrl: input.imageUrl?.trim() ?? "",
        videoUrl: input.videoUrl?.trim() ?? "",
        published: input.published ?? false,
      })
    );
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get difficulty(): RecipeDifficulty {
    return this.props.difficulty;
  }

  /** Estimated total time in minutes, or `null` when not specified. */
  get durationMinutes(): number | null {
    return this.props.durationMinutes;
  }

  /** The ingredient list (a defensive copy — the aggregate stays immutable). */
  get ingredients(): readonly string[] {
    return [...this.props.ingredients];
  }

  /** The ordered steps (a defensive copy — the aggregate stays immutable). */
  get steps(): readonly string[] {
    return [...this.props.steps];
  }

  /** URL of the cover photo, or an empty string when none is set. */
  get imageUrl(): string {
    return this.props.imageUrl;
  }

  /** URL of the video tutorial, or an empty string when none is set. */
  get videoUrl(): string {
    return this.props.videoUrl;
  }

  /** Whether subscribers can see this recipe (drafts stay operator-only). */
  get isPublished(): boolean {
    return this.props.published;
  }
}
