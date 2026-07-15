"use client";

import type { DepartmentName } from "@/modules/catalog/domain/value-objects/department";
import { departmentLabel, type DepartmentFilter } from "./departments";

/**
 * DepartmentChips is the horizontal, scrollable filter row. The active chip uses
 * the near-black `ink` fill; the rest are quiet surface pills. It is controlled —
 * selection state lives in the parent {@link CatalogBrowser} so the grid filters
 * instantly on the client.
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
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
      {options.map((option) => {
        const isActive = option.key === selected;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelect(option.key)}
            aria-pressed={isActive}
            className={`shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-ink text-on-accent"
                : "border border-border bg-surface text-text hover:bg-sugar-100"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
