import { Identifier } from "@/shared/domain/identifier";

/**
 * RecipeId is the typed identity of a {@link Recipe} aggregate. It wraps a
 * uuid string and, being a distinct type, cannot be confused with another
 * aggregate's id at compile time.
 */
export class RecipeId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): RecipeId {
    return new RecipeId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): RecipeId {
    return new RecipeId(crypto.randomUUID());
  }
}
