import type { Firestore } from "firebase-admin/firestore";
import { Notification } from "../../domain/entities/notification";
import type { NotificationRepository } from "../../domain/repositories/notification-repository";

/** Firestore collection holding one document per notification, keyed by id. */
const COLLECTION = "notifications";

/** The Firestore shape of a notification (everything but the id, which keys the doc). */
type NotificationDocument = {
  customerUid: string;
  type: string;
  title: string;
  body: string;
  dedupeKey: string | null;
  read: boolean;
  createdAt: string;
};

/**
 * FirestoreNotificationRepository is the production adapter for the
 * {@link NotificationRepository} port, backed by the Firebase Admin SDK
 * (server-only). Queries filter on a single indexed field and refine/sort in
 * memory, keeping Firestore free of composite indexes; dedupe keys are globally
 * unique (they embed the source id), so the dedupe lookup needs no customer filter.
 */
export class FirestoreNotificationRepository implements NotificationRepository {
  constructor(private readonly firestore: Firestore) {}

  async findByCustomer(customerUid: string): Promise<Notification[]> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("customerUid", "==", customerUid)
      .limit(100)
      .get();
    return snapshot.docs
      .map((doc) => restore(doc.id, doc.data() as NotificationDocument))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async findByDedupeKey(_customerUid: string, dedupeKey: string): Promise<Notification | null> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("dedupeKey", "==", dedupeKey)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    return doc ? restore(doc.id, doc.data() as NotificationDocument) : null;
  }

  async save(notification: Notification): Promise<void> {
    await this.firestore
      .collection(COLLECTION)
      .doc(notification.id.value)
      .set(toDocument(notification));
  }

  async markAllRead(customerUid: string): Promise<void> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("customerUid", "==", customerUid)
      .limit(200)
      .get();
    const unread = snapshot.docs.filter((doc) => (doc.data() as NotificationDocument).read === false);
    if (unread.length === 0) {
      return;
    }
    const batch = this.firestore.batch();
    for (const doc of unread) {
      batch.update(doc.ref, { read: true });
    }
    await batch.commit();
  }
}

/** Serializes a Notification aggregate into its Firestore document. */
function toDocument(notification: Notification): NotificationDocument {
  return {
    customerUid: notification.customerUid,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    dedupeKey: notification.dedupeKey,
    read: notification.isRead,
    createdAt: notification.createdAt,
  };
}

/** Rebuilds the aggregate from a stored document, failing loudly on corrupt data. */
function restore(id: string, document: NotificationDocument): Notification {
  const result = Notification.restore({ id, ...document });
  if (!result.ok) {
    throw new Error(`Corrupt notification "${id}": ${result.error.message}`);
  }
  return result.value;
}
