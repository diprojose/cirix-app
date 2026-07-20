import type { Firestore } from "firebase-admin/firestore";
import { Order } from "../../domain/entities/order";
import type { OrderId } from "../../domain/value-objects/order-id";
import type { OrderRepository } from "../../domain/repositories/order-repository";
import {
  documentToRestoreInput,
  toOrderDocument,
  type OrderDocument,
} from "./order-document";

/** Firestore collection holding one document per order, keyed by order id. */
const COLLECTION = "orders";

/**
 * FirestoreOrderRepository is the production adapter for the
 * {@link OrderRepository} port, backed by the Firebase Admin SDK (server-only —
 * clients never talk to Firestore directly). Documents are full snapshots
 * written with `set`, so `save` covers both creation and every state change.
 */
export class FirestoreOrderRepository implements OrderRepository {
  constructor(private readonly firestore: Firestore) {}

  async save(order: Order): Promise<void> {
    await this.firestore
      .collection(COLLECTION)
      .doc(order.id.value)
      .set(toOrderDocument(order));
  }

  async findAll(): Promise<Order[]> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    return snapshot.docs.map((doc) => {
      const restored = Order.restore(
        documentToRestoreInput(doc.id, doc.data() as OrderDocument)
      );
      if (!restored.ok) {
        throw new Error(`Corrupt order document "${doc.id}": ${restored.error.message}`);
      }
      return restored.value;
    });
  }

  async findById(id: OrderId): Promise<Order | null> {
    const snapshot = await this.firestore.collection(COLLECTION).doc(id.value).get();
    if (!snapshot.exists) {
      return null;
    }

    const restored = Order.restore(
      documentToRestoreInput(id.value, snapshot.data() as OrderDocument)
    );
    if (!restored.ok) {
      // A document that fails domain validation is corrupt storage, not a
      // business failure — surface it loudly instead of pretending it's absent.
      throw new Error(`Corrupt order document "${id.value}": ${restored.error.message}`);
    }
    return restored.value;
  }
}
