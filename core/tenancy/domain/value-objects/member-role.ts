/**
 * Roles a person can hold inside one business. A person can hold a different
 * role in each business, and can also be a plain customer of businesses where
 * they hold no role. `owner` runs the business; `staff` only validates visits.
 */
export const MEMBER_ROLES = ["owner", "staff"] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Cirix's own administrators reach every business for support. */
export type BusinessRole = MemberRole | "platform_admin";

/** Things a role may do inside a business. Each phase adds the ones it needs. */
export type BusinessPermission =
  | "customers:read"
  | "members:manage"
  | "visits:record";

const ALL_PERMISSIONS: readonly BusinessPermission[] = [
  "customers:read",
  "members:manage",
  "visits:record",
];

/**
 * Staff deliberately cannot browse the customer list: they only validate
 * visits, so customer personal data stays with the owner.
 */
const GRANTS: Record<BusinessRole, readonly BusinessPermission[]> = {
  owner: ALL_PERMISSIONS,
  staff: ["visits:record"],
  platform_admin: ALL_PERMISSIONS,
};

/** Whether a role is allowed to perform a permission. */
export const roleCan = (role: BusinessRole, permission: BusinessPermission): boolean =>
  GRANTS[role].includes(permission);

/** Type guard narrowing arbitrary text to a stored {@link MemberRole}. */
export const isMemberRole = (value: string): value is MemberRole =>
  (MEMBER_ROLES as readonly string[]).includes(value);
