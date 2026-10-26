import type { Firestore } from "firebase-admin/firestore";
import { Membership } from "../../domain/entities/membership";
import type { MembershipRepository } from "../../domain/repositories/membership-repository";
import { CorruptBusinessSnapshotError } from "../../domain/errors/tenancy-errors";

/** One document per (business, person), keyed `<businessId>_<userId>`. */
const COLLECTION = "business_members";

type MembershipDocument = {
  businessId: string;
  userId: string;
  email: string;
  role: string;
  createdAt: string;
};

const docId = (businessId: string, userId: string): string => `${businessId}_${userId}`;

/**
 * FirestoreMembershipRepository is the production adapter for the
 * {@link MembershipRepository} port. Lookups are by document id or by a single
 * equality field, so no composite index is needed.
 */
export class FirestoreMembershipRepository implements MembershipRepository {
  constructor(private readonly firestore: Firestore) {}

  async find(businessId: string, userId: string): Promise<Membership | null> {
    const snapshot = await this.firestore.collection(COLLECTION).doc(docId(businessId, userId)).get();
    return snapshot.exists ? restore(snapshot.id, snapshot.data() as MembershipDocument) : null;
  }

  async listByUser(userId: string): Promise<Membership[]> {
    const snapshot = await this.firestore.collection(COLLECTION).where("userId", "==", userId).limit(100).get();
    return snapshot.docs.map((doc) => restore(doc.id, doc.data() as MembershipDocument));
  }

  async listByBusiness(businessId: string): Promise<Membership[]> {
    const snapshot = await this.firestore.collection(COLLECTION).where("businessId", "==", businessId).limit(200).get();
    return snapshot.docs.map((doc) => restore(doc.id, doc.data() as MembershipDocument));
  }

  async save(membership: Membership): Promise<void> {
    await this.firestore
      .collection(COLLECTION)
      .doc(docId(membership.businessId, membership.userId))
      .set({
        businessId: membership.businessId,
        userId: membership.userId,
        email: membership.email,
        role: membership.role,
        createdAt: membership.createdAt,
      } satisfies MembershipDocument);
  }

  async remove(businessId: string, userId: string): Promise<void> {
    await this.firestore.collection(COLLECTION).doc(docId(businessId, userId)).delete();
  }
}

function restore(id: string, data: MembershipDocument): Membership {
  const result = Membership.restore(data);
  if (!result.ok) throw new CorruptBusinessSnapshotError(`Membership ${id}: ${result.error.message}`);
  return result.value;
}
