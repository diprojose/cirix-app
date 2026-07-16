"use client";

import type { DepartmentName } from "@/modules/catalog/domain/value-objects/department";
import { departmentLabel, type DepartmentFilter } from "./departments";
import { BLEED } from "./layout";

/**
 * Photo shown behind the *active* chip (with a dark overlay for contrast),
 * echoing the reference's image-backed category pill. Keyed by filter so every
 * option — including the "all" pseudo-option — has a representative image.
 */
const CHIP_IMAGE: Record<DepartmentFilter, string> = {
  all: "/products/torta-de-chocolate.png",
  postres: "/products/cheesecake-de-fresa.png",
  supermercado: "/products/tomates.png",
};

/**
 * DepartmentChips is the horizontal, scrollable filter row. The active chip is
 * image-backed with white text; the rest are quiet surface pills. It is
 * controlled — selection state lives in the parent {@link CatalogBrowser} so the
 * grid filters instantly on the client.
 */
export function DepartmentChips({
  departments,
  selected,
  onSelect,
}: {
  departments: DepartmentName[];
  selected: DepartmentFilter;
  onSelect: (value: DepartmentFilter) => void;
}) {
  const options: { key: DepartmentFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    ...departments.map((d) => ({ key: d, label: departmentLabel(d) })),
  ];

  return (
    <div className={`${BLEED} flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden`}>
      {options.map((option) => {
        const isActive = option.key === selected;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelect(option.key)}
            aria-pressed={isActive}
            className={`relative shrink-0 overflow-hidden rounded-pill px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
              isActive
                ? "text-white shadow-card"
                : "border border-border bg-surface text-text hover:bg-sugar-100"
            }`}
          >
            {isActive && (
              <>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-ink bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${CHIP_IMAGE[option.key]})` }}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/65 to-black/25"
                />
              </>
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
