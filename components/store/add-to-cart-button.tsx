/**
 * AddToCartButton is the primary call to action on the product detail page: a
 * full-width, violet-gradient pill matching the reference design. It is
 * presentational until the cart module exists; when unavailable it renders a
 * disabled, muted state. Rendered twice per page (fixed mobile bar + desktop
 * column), so it stays a small, stateless building block.
 */
export function AddToCartButton({
  available,
  className,
}: {
  available: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={!available}
      className={`flex h-14 w-full items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong text-base font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98] disabled:from-sugar-300 disabled:to-sugar-300 disabled:text-sugar-500 disabled:shadow-none disabled:active:scale-100 ${className ?? ""}`}
    >
      {available ? "Agregar al carrito" : "No disponible"}
    </button>
  );
}
