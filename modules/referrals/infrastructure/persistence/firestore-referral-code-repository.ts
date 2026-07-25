import type { Firestore } from "firebase-admin/firestore";
import type { ReferralCodeRepository } from "../../domain/repositories/referral-code-repository";

/** code → referrer (the checkout/signup lookup). */
const BY_CODE = "referral_codes";
/** referrer → code (so a referrer's stable code is a direct read). */
const BY_REFERRER = "referrer_codes";

type CodeDocument = { referrerUid: string; createdAt: string };
type ReferrerCodeDocument = { code: string; createdAt: string };

/** Generates a short, upper-case alphanumeric code (hex, 8 chars). */
function generateCode(): string {
  return crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 8);
}

/**
 * FirestoreReferralCodeRepository is the production adapter for the
 * {@link ReferralCodeRepository} port. It keeps two small documents per referrer
 * — one keyed by code and one keyed by referrer — so both "who owns this code?"
 * and "what is my code?" are single-document reads. A fresh code is minted in a
 * transaction that rejects collisions, retrying until one is free.
 */
export class FirestoreReferralCodeRepository implements ReferralCodeRepository {
  constructor(private readonly firestore: Firestore) {}

  async getOrCreateForReferrer(referrerUid: string): Promise<string> {
    const reverseRef = this.firestore.collection(BY_REFERRER).doc(referrerUid);
    const reverseSnap = await reverseRef.get();
    if (reverseSnap.exists) {
      return (reverseSnap.data() as ReferrerCodeDocument).code;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateCode();
      const codeRef = this.firestore.collection(BY_CODE).doc(code);
      const created = await this.firestore.runTransaction(async (tx) => {
        const snap = await tx.get(codeRef);
        if (snap.exists) {
          return false;
        }
        const document: CodeDocument = { referrerUid, createdAt: new Date().toISOString() };
        tx.set(codeRef, document);
        return true;
      });
      if (created) {
        const reverse: ReferrerCodeDocument = { code, createdAt: new Date().toISOString() };
        await reverseRef.set(reverse);
        return code;
      }
    }
    throw new Error("Could not generate a unique referral code after several attempts.");
  }

  async resolveToReferrer(code: string): Promise<string | null> {
    const normalized = code.trim().toUpperCase();
    if (normalized === "") {
      return null;
    }
    const snapshot = await this.firestore.collection(BY_CODE).doc(normalized).get();
    return snapshot.exists ? (snapshot.data() as CodeDocument).referrerUid : null;
  }
}
