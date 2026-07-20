import type { Firestore } from "firebase-admin/firestore";
import { Recipe } from "../../domain/entities/recipe";
import type { RecipeId } from "../../domain/value-objects/recipe-id";
import type { RecipeRepository } from "../../domain/repositories/recipe-repository";

/** Firestore collection holding one document per recipe, keyed by recipe id. */
const COLLECTION = "recipes";

/** The Firestore shape of a recipe (everything but the id, which keys the doc). */
type RecipeDocument = {
  title: string;
  description: string;
  difficulty: string;
  durationMinutes: number | null;
  ingredients: string[];
  steps: string[];
  imageUrl: string;
  videoUrl: string;
  published: boolean;
};

/**
 * FirestoreRecipeRepository is the production adapter for the
 * {@link RecipeRepository} port, backed by the Firebase Admin SDK (server-only —
 * premium content never reaches Firestore from the client). On first use it
 * seeds the collection with the sample recipes when it is empty; the check is
 * memoised per server runtime. Filtering happens in memory after one bounded
 * read — the recipe book is editorial content, small by nature.
 */
export class FirestoreRecipeRepository implements RecipeRepository {
  private seeded: Promise<void> | null = null;

  constructor(
    private readonly firestore: Firestore,
    private readonly seed: Recipe[] = []
  ) {}

  async findById(id: RecipeId): Promise<Recipe | null> {
    await this.ensureSeeded();
    const snapshot = await this.firestore.collection(COLLECTION).doc(id.value).get();
    if (!snapshot.exists) {
      return null;
    }
    return this.restore(snapshot.id, snapshot.data() as RecipeDocument);
  }

  async findAllPublished(): Promise<Recipe[]> {
    return (await this.findAll()).filter((recipe) => recipe.isPublished);
  }

  async findAll(): Promise<Recipe[]> {
    await this.ensureSeeded();
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .orderBy("title")
      .limit(500)
      .get();
    return snapshot.docs.map((doc) => this.restore(doc.id, doc.data() as RecipeDocument));
  }

  async save(recipe: Recipe): Promise<void> {
    await this.ensureSeeded();
    await this.firestore
      .collection(COLLECTION)
      .doc(recipe.id.value)
      .set(toDocument(recipe));
  }

  async delete(id: RecipeId): Promise<void> {
    await this.ensureSeeded();
    await this.firestore.collection(COLLECTION).doc(id.value).delete();
  }

  /** Seeds the collection with the sample recipes when it is empty (once per runtime). */
  private ensureSeeded(): Promise<void> {
    this.seeded ??= (async () => {
      if (this.seed.length === 0) {
        return;
      }
      const existing = await this.firestore.collection(COLLECTION).limit(1).get();
      if (!existing.empty) {
        return;
      }
      const batch = this.firestore.batch();
      for (const recipe of this.seed) {
        batch.set(
          this.firestore.collection(COLLECTION).doc(recipe.id.value),
          toDocument(recipe)
        );
      }
      await batch.commit();
    })();
    return this.seeded;
  }

  /** Rebuilds the aggregate from a stored document, failing loudly on corrupt data. */
  private restore(id: string, document: RecipeDocument): Recipe {
    const result = Recipe.create({ id, ...document });
    if (!result.ok) {
      throw new Error(`Corrupt recipe document "${id}": ${result.error.message}`);
    }
    return result.value;
  }
}

/** Serializes a Recipe aggregate into its Firestore document. */
function toDocument(recipe: Recipe): RecipeDocument {
  return {
    title: recipe.title,
    description: recipe.description,
    difficulty: recipe.difficulty,
    durationMinutes: recipe.durationMinutes,
    ingredients: [...recipe.ingredients],
    steps: [...recipe.steps],
    imageUrl: recipe.imageUrl,
    videoUrl: recipe.videoUrl,
    published: recipe.isPublished,
  };
}
