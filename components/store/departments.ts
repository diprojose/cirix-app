import type { DepartmentName } from "@/modules/catalog/domain/value-objects/department";

/** A chip filter selection: a concrete department or the "all" pseudo-option. */
export type DepartmentFilter = "all" | DepartmentName;

/** Presentational metadata (label + placeholder emoji) per department. */
export const DEPARTMENT_META: Record<DepartmentName, { label: string; emoji: string }> = {
  postres: { label: "Postres", emoji: "🍰" },
  supermercado: { label: "Supermercado", emoji: "🛒" },
};

/** Canonical display order of departments in the storefront. */
export const DEPARTMENT_ORDER: DepartmentName[] = ["postres", "supermercado"];

/** Display label for a department. */
export function departmentLabel(name: DepartmentName): string {
  return DEPARTMENT_META[name].label;
}

/** Placeholder emoji used by {@link ProductThumb} when a product has no photo. */
export function departmentEmoji(name: DepartmentName): string {
  return DEPARTMENT_META[name].emoji;
}
