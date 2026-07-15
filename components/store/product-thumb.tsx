import Image from "next/image";
import type { DepartmentName } from "@/modules/catalog/domain/value-objects/department";
import { departmentEmoji } from "./departments";

/*
 * On-brand, pink-tinted gradient pairs. A product with no photo gets one of
 * these deterministically by id, so the same product always looks the same
 * while the grid stays visually varied. Full literal class strings (no
 * interpolation) so Tailwind can statically detect them.
 */
const GRADIENTS = [
  "from-brand-50 to-brand-200",
  "from-brand-100 to-brand-200",
  "from-brand-100 to-brand-300",
  "from-brand-200 to-brand-300",
  "from-sugar-100 to-brand-100",
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
 * deterministic brand gradient with the department emoji — so the storefront
 * looks complete before any photos exist, and swaps to real images the moment
 * `imageUrl` is populated, with no other change.
 */
export function ProductThumb({
  id,
  name,
  department,
  imageUrl,
  className,
  sizes = "(max-width: 768px) 50vw, 200px",
}: {
  id: string;
  name: string;
  department: DepartmentName;
  imageUrl: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      {imageUrl ? (
        <Image src={imageUrl} alt={name} fill sizes={sizes} className="object-contain p-2" />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(id)}`}
        >
          <span className="text-4xl drop-shadow-sm" aria-hidden="true">
            {departmentEmoji(department)}
          </span>
        </div>
      )}
    </div>
  );
}
