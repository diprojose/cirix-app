import type { DepartmentName } from "@/modules/catalog/domain/value-objects/department";

/** Presentational metadata per department, used at the storefront edge. */
export const DEPARTMENT_META: Record<DepartmentName, { label: string }> = {
  supermercado: { label: "Supermercado" },
};

/** Canonical display order of departments in the storefront. */
export const DEPARTMENT_ORDER: DepartmentName[] = ["supermercado"];

/** Display label for a department. */
export function departmentLabel(name: DepartmentName): string {
  return DEPARTMENT_META[name].label;
}
