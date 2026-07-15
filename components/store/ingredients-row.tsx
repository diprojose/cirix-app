/*
 * Static, example ingredient thumbnails used to reproduce the reference's
 * "Ingredients" strip. The catalog domain does not model ingredients yet, so
 * this is placeholder content (same set for every product) — swap for real,
 * per-product data once the domain carries it.
 */
const EXAMPLE_INGREDIENTS = [
  { emoji: "🥚", label: "Huevos" },
  { emoji: "🧈", label: "Mantequilla" },
  { emoji: "🍫", label: "Chocolate" },
  { emoji: "🌾", label: "Harina" },
  { emoji: "🥛", label: "Leche" },
  { emoji: "🍒", label: "Cerezas" },
];

/** Horizontal, scrollable row of circular ingredient thumbnails. */
export function IngredientsRow() {
  return (
    <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
      {EXAMPLE_INGREDIENTS.map((ingredient) => (
        <div
          key={ingredient.label}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5"
        >
          <span
            className="grid h-16 w-16 place-items-center rounded-full bg-surface text-3xl shadow-card"
            aria-hidden="true"
          >
            {ingredient.emoji}
          </span>
          <span className="text-[11px] leading-tight text-text-muted">{ingredient.label}</span>
        </div>
      ))}
    </div>
  );
}
