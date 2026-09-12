/** Admission is independent of roles and can only be granted by Firebase Admin. */
export function hasPlatformAccess(user: {
  email?: string;
  emailVerified: boolean;
  disabled: boolean;
  customClaims?: Record<string, unknown>;
}): boolean {
  if (user.disabled || !user.email || !user.emailVerified) return false;
  const claims = user.customClaims ?? {};
  // Explicit revocation takes precedence, including for existing operators.
  if (claims.platformAccess === false) return false;
  return claims.platformAccess === true || claims.operator === true;
}
