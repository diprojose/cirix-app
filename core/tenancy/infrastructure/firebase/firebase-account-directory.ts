import "server-only";
import { adminAuth } from "@/shared/infrastructure/firebase-admin";
import type { AccountDirectory, DirectoryAccount } from "../../domain/repositories/account-directory";

/** Firebase Auth's code for an email that already has an account. */
const EMAIL_EXISTS = "auth/email-already-exists";

/**
 * Firebase adapter for {@link AccountDirectory}. It does what
 * scripts/manage-business.mjs does: reuse the account, or reserve one with no
 * password that the person claims by signing in with that address.
 */
export class FirebaseAccountDirectory implements AccountDirectory {
  async findOrCreate(email: string): Promise<DirectoryAccount> {
    const existing = await this.find(email);
    if (existing) return existing;
    try {
      const created = await adminAuth().createUser({ email });
      return { userId: created.uid, email, disabled: created.disabled };
    } catch (error) {
      // Two owners adding the same person at once: the other request created it.
      if ((error as { code?: unknown }).code !== EMAIL_EXISTS) throw error;
      const raced = await this.find(email);
      if (!raced) throw error;
      return raced;
    }
  }

  private async find(email: string): Promise<DirectoryAccount | null> {
    try {
      const user = await adminAuth().getUserByEmail(email);
      return { userId: user.uid, email: user.email ?? email, disabled: user.disabled };
    } catch (error) {
      if ((error as { code?: unknown }).code === "auth/user-not-found") return null;
      throw error;
    }
  }
}
