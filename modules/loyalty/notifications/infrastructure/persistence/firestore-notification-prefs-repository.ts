import type { Firestore } from "firebase-admin/firestore";
import { NotificationPrefs } from "../../domain/entities/notification-prefs";
import type { NotificationPrefsRepository } from "../../domain/repositories/notification-prefs-repository";

/** One document per customer's channel preferences, keyed by uid. */
const COLLECTION = "notification_prefs";

/** The Firestore shape of a customer's prefs (everything but the uid, which keys the doc). */
type NotificationPrefsDocument = {
  inApp: boolean;
  push: boolean;
  email: boolean;
  consentedAt: string | null;
};

/**
 * FirestoreNotificationPrefsRepository is the production adapter for the
 * {@link NotificationPrefsRepository} port, backed by the Firebase Admin SDK
 * (server-only). Prefs are a single document per customer, so both reads and
 * writes are direct by uid.
 */
export class FirestoreNotificationPrefsRepository implements NotificationPrefsRepository {
  constructor(private readonly firestore: Firestore) {}

  async findByCustomer(customerUid: string): Promise<NotificationPrefs | null> {
    const snapshot = await this.firestore.collection(COLLECTION).doc(customerUid).get();
    if (!snapshot.exists) {
      return null;
    }
    const data = snapshot.data() as NotificationPrefsDocument;
    return NotificationPrefs.restore({ customerUid, ...data });
  }

  async save(prefs: NotificationPrefs): Promise<void> {
    const document: NotificationPrefsDocument = {
      inApp: prefs.inApp,
      push: prefs.push,
      email: prefs.email,
      consentedAt: prefs.consentedAt,
    };
    await this.firestore.collection(COLLECTION).doc(prefs.customerUid).set(document);
  }
}
