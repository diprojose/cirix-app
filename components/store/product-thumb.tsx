import Image from "next/image";
import { LeafIcon } from "./icons";

/*
 * On-brand gradient pairs built from the semantic accent layer, so a retheme
 * flows through without touching this file. A product with no photo gets one of
 * these deterministically by id, so the same product always looks the same
 * while the grid stays visually varied. Full literal class strings (no
 * interpolation) so Tailwind can statically detect them.
 */
const GRADIENTS = [
  "from-accent-subtle to-accent-soft",
  "from-accent-soft to-accent-subtle",
  "from-surface to-accent-soft",
  "from-accent-subtle to-surface",
] as const;

/** Deterministic index into {@link GRADIENTS} from a product id. */
function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}

/**
 * ProductThumb renders a product's image inside a relative box. When the product
 * has a real `imageUrl` it uses `next/image`; otherwise it falls back to a
 * deterministic accent gradient with the produce glyph — so the storefront looks
 * complete before any photos exist, and swaps to real images the moment
 * `imageUrl` is populated, with no other change. It is the single "no image"
 * treatment in the app: cart lines and order lines render it too, so the same
 * condition never looks different in two places. `imageClassName` overrides how
 * the real image fits its box (default: contained with padding).
 */
export function ProductThumb({
  id,
  name,
  imageUrl,
  className,
  imageClassName = "object-contain p-2",
  sizes = "(max-width: 768px) 33vw, 200px",
  priority = false,
}: {
  id: string;
  name: string;
  imageUrl: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  /** Set on above-the-fold cells so the LCP image is not lazy-loaded. */
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          className={imageClassName}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(id)}`}
        >
          <LeafIcon className="h-1/3 w-1/3 text-accent" />
        </div>
      )}
    </div>
  );
}
