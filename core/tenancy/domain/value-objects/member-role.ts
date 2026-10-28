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
  | "visits:record"
  | "program:manage";

const ALL_PERMISSIONS: readonly BusinessPermission[] = [
  "customers:read",
  "members:manage",
  "visits:record",
  "program:manage",
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

/**
 * Roles each manager may grant or take away. An owner hires and lets go of
 * staff, but only Cirix administrators change who owns a business: otherwise a
 * co-owner, or an employee promoted by mistake, could lock the real owner out.
 */
const MANAGEABLE: Record<BusinessRole, readonly MemberRole[]> = {
  owner: ["staff"],
  staff: [],
  platform_admin: ["owner", "staff"],
};

/** Whether `actor` may grant, change or remove the role `target`. */
export const roleCanManage = (actor: BusinessRole, target: MemberRole): boolean =>
  roleCan(actor, "members:manage") && MANAGEABLE[actor].includes(target);

/** The roles `actor` may hand out, for the team form. */
export const manageableRoles = (actor: BusinessRole): readonly MemberRole[] =>
  roleCan(actor, "members:manage") ? MANAGEABLE[actor] : [];

/** Type guard narrowing arbitrary text to a stored {@link MemberRole}. */
export const isMemberRole = (value: string): value is MemberRole =>
  (MEMBER_ROLES as readonly string[]).includes(value);
