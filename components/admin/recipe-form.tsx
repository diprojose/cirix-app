import type { RecipeDto } from "@/modules/recipes/application/dtos/recipe-dto";
import { DIFFICULTY_LABELS } from "@/components/recipes/recipe-meta";
import { RECIPE_DIFFICULTIES } from "@/modules/recipes/domain/entities/recipe";
import { saveRecipeAction } from "@/app/admin/actions";

/** Shared input styling for the recipe fields. */
const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-sugar-400 focus:outline-none focus:ring-2 focus:ring-cta";

const AREA_CLASS =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-sugar-400 focus:outline-none focus:ring-2 focus:ring-cta";

/**
 * RecipeForm is the operator's create/edit form, shared by both admin pages.
 * Ingredients and steps are typed one per line; media are URLs (a bundled
 * `/products/...` image or external https image/video).
 */
export function RecipeForm({ recipe }: { recipe?: RecipeDto }) {
  return (
    <form action={saveRecipeAction} className="space-y-4">
      {recipe && <input type="hidden" name="id" value={recipe.id} />}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Título</span>
        <input
          type="text"
          name="title"
          required
          minLength={2}
          maxLength={120}
          defaultValue={recipe?.title ?? ""}
          placeholder="Torta de chocolate húmeda"
          className={FIELD_CLASS}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Descripción</span>
        <textarea
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={recipe?.description ?? ""}
          placeholder="Qué hace especial a esta receta…"
          className={AREA_CLASS}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Dificultad</span>
          <select
            name="difficulty"
            required
            defaultValue={recipe?.difficulty ?? "facil"}
            className={FIELD_CLASS}
          >
            {RECIPE_DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {DIFFICULTY_LABELS[difficulty]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Duración (min)</span>
          <input
            type="number"
            name="durationMinutes"
            min="1"
            step="1"
            defaultValue={recipe?.durationMinutes ?? ""}
            placeholder="90"
            className={FIELD_CLASS}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Ingredientes (uno por línea)</span>
        <textarea
          name="ingredients"
          required
          rows={6}
          defaultValue={recipe?.ingredients.join("\n") ?? ""}
          placeholder={"200 g de harina de trigo\n3 huevos\n…"}
          className={AREA_CLASS}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">Pasos (uno por línea)</span>
        <textarea
          name="steps"
          required
          rows={8}
          defaultValue={recipe?.steps.join("\n") ?? ""}
          placeholder={"Precalienta el horno a 175 °C.\nMezcla los secos…"}
          className={AREA_CLASS}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">URL de imagen (opcional)</span>
        <input
          type="text"
          name="imageUrl"
          defaultValue={recipe?.imageUrl ?? ""}
          placeholder="/products/torta-de-chocolate.png"
          className={FIELD_CLASS}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text">URL de video (opcional)</span>
        <input
          type="text"
          name="videoUrl"
          defaultValue={recipe?.videoUrl ?? ""}
          placeholder="https://…/tutorial.mp4"
          className={FIELD_CLASS}
        />
        <span className="block text-xs text-text-muted">
          MP4 directo (720p recomendado). Solo lo ven suscriptores premium.
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-text">
        <input
          type="checkbox"
          name="published"
          defaultChecked={recipe?.published ?? false}
          className="h-5 w-5 accent-[oklch(0.64_0.17_288)]"
        />
        Publicada (visible para suscriptores)
      </label>

      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98]"
      >
        {recipe ? "Guardar cambios" : "Crear receta"}
      </button>
    </form>
  );
}
