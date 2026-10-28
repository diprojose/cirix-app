/** The sign-in account behind an email, as far as team management cares. */
export type DirectoryAccount = { userId: string; email: string; disabled: boolean };

/**
 * AccountDirectory finds people by email so an owner can add them to the team
 * before they ever signed in. It is a port so the tenancy core does not depend
 * on the identity provider; the composition root connects it to Firebase Auth.
 */
export interface AccountDirectory {
  /**
   * The account holding this email. When there is none yet, an account with no
   * password is reserved for it: the person proves the address on first sign-in
   * (Google or an emailed link), so nobody else can claim the role.
   */
  findOrCreate(email: string): Promise<DirectoryAccount>;
}
