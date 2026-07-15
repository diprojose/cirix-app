import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidDepartmentError } from "../errors/catalog-errors";

/** The closed set of departments a {@link Product} can belong to. */
export type DepartmentName = "postres" | "supermercado";

/** Human-readable label per department, used at the UI edge. */
const DEPARTMENT_LABELS: Record<DepartmentName, string> = {
  postres: "Postres",
  supermercado: "Supermercado",
};

/** Props backing a {@link Department} value object. */
type DepartmentProps = {
  readonly name: DepartmentName;
};

/**
 * Department is the immutable value object classifying a {@link Product} into a
 * top-level section of the catalog (e.g. "Postres" or "Supermercado"). It is the
 * axis the storefront organizes and filters by. Its factory rejects unknown
 * names, so an invalid department can never reach the domain.
 */
export class Department extends ValueObject<DepartmentProps> {
  private constructor(props: DepartmentProps) {
    super(props);
  }

  /** Builds a Department from a raw name, failing with a Result on an unknown value. */
  static create(name: string): Result<Department, DomainError> {
    const normalized = name.trim().toLowerCase();
    if (!Department.isDepartmentName(normalized)) {
      return err(new InvalidDepartmentError(`Unknown department "${name}".`));
    }
    return ok(new Department({ name: normalized }));
  }

  /** The machine-readable department name (used as the DTO/filter key). */
  get value(): DepartmentName {
    return this.props.name;
  }

  /** The display label shown to users. */
  get label(): string {
    return DEPARTMENT_LABELS[this.props.name];
  }

  /** Type guard narrowing an arbitrary string to a known department name. */
  private static isDepartmentName(value: string): value is DepartmentName {
    return value === "postres" || value === "supermercado";
  }
}
