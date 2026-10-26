import type { Firestore } from "firebase-admin/firestore";
import { Customer } from "../../domain/entities/customer";
import { CustomerEvent, type CustomerEventData } from "../../domain/entities/customer-event";
import type { CustomerRepository, ListCustomersOptions } from "../../domain/repositories/customer-repository";
import type { CustomerEventRepository } from "../../domain/repositories/customer-event-repository";
import { CorruptCustomerSnapshotError } from "../../domain/errors/customer-errors";

/*
 * Layout, chosen so a query can only ever see one business and so no composite
 * index is required (the project runs without a paid Firebase plan):
 *
 *   businesses/{businessId}/customers/{userId}                 the CRM record
 *   businesses/{businessId}/customers/{userId}/events/{id}     its timeline
 *   customer_links/{userId}_{businessId}                       "my cards" lookup
 */
const BUSINESSES = "businesses";
const CUSTOMERS = "customers";
const EVENTS = "events";
const LINKS = "customer_links";

type CustomerDocument = {
  businessId: string;
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  source: string;
  tags: string[];
  createdAt: string;
  lastSeenAt: string;
};

type EventDocument = {
  type: string;
  occurredAt: string;
  data: CustomerEventData;
};

/** Firestore adapter for the {@link CustomerRepository} port (Admin SDK, server-only). */
export class FirestoreCustomerRepository implements CustomerRepository {
  constructor(private readonly firestore: Firestore) {}

  private customersOf(businessId: string) {
    return this.firestore.collection(BUSINESSES).doc(businessId).collection(CUSTOMERS);
  }

  async find(businessId: string, userId: string): Promise<Customer | null> {
    const snapshot = await this.customersOf(businessId).doc(userId).get();
    return snapshot.exists ? restore(snapshot.data() as CustomerDocument) : null;
  }

  async createIfAbsent(customer: Customer): Promise<boolean> {
    const ref = this.customersOf(customer.businessId).doc(customer.userId);
    const link = this.firestore.collection(LINKS).doc(`${customer.userId}_${customer.businessId}`);
    return this.firestore.runTransaction(async (transaction) => {
      if ((await transaction.get(ref)).exists) return false;
      transaction.set(ref, {
        businessId: customer.businessId,
        userId: customer.userId,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        source: customer.source,
        tags: [...customer.tags],
        createdAt: customer.createdAt,
        lastSeenAt: customer.lastSeenAt,
      } satisfies CustomerDocument);
      transaction.set(link, {
        userId: customer.userId,
        businessId: customer.businessId,
        joinedAt: customer.createdAt,
      });
      return true;
    });
  }

  async list(businessId: string, options: ListCustomersOptions): Promise<Customer[]> {
    let query = this.customersOf(businessId).orderBy("createdAt", "desc");
    if (options.before) query = query.startAfter(options.before);
    const snapshot = await query.limit(options.limit).get();
    return snapshot.docs.map((doc) => restore(doc.data() as CustomerDocument));
  }

  async listBusinessIdsByUser(userId: string): Promise<string[]> {
    const snapshot = await this.firestore.collection(LINKS).where("userId", "==", userId).limit(100).get();
    return snapshot.docs.map((doc) => doc.get("businessId") as string);
  }
}

/** Firestore adapter for the {@link CustomerEventRepository} port. */
export class FirestoreCustomerEventRepository implements CustomerEventRepository {
  constructor(private readonly firestore: Firestore) {}

  private eventsOf(businessId: string, userId: string) {
    return this.firestore
      .collection(BUSINESSES)
      .doc(businessId)
      .collection(CUSTOMERS)
      .doc(userId)
      .collection(EVENTS);
  }

  async append(event: CustomerEvent): Promise<void> {
    // `create` fails if the id exists, which is exactly the idempotency we want:
    // a retried event with a stable id is silently kept as the first one.
    try {
      await this.eventsOf(event.businessId, event.userId).doc(event.id).create({
        type: event.type,
        occurredAt: event.occurredAt,
        data: event.data,
      } satisfies EventDocument);
    } catch (error) {
      if ((error as { code?: number }).code === 6 /* ALREADY_EXISTS */) return;
      throw error;
    }
  }

  async listByCustomer(businessId: string, userId: string, limit: number): Promise<CustomerEvent[]> {
    const snapshot = await this.eventsOf(businessId, userId).orderBy("occurredAt", "desc").limit(limit).get();
    return snapshot.docs.map((doc) => {
      const data = doc.data() as EventDocument;
      const result = CustomerEvent.restore({ id: doc.id, businessId, userId, type: data.type, occurredAt: data.occurredAt, data: data.data });
      if (!result.ok) throw new CorruptCustomerSnapshotError(`Event ${doc.id}: ${result.error.message}`);
      return result.value;
    });
  }
}

function restore(data: CustomerDocument): Customer {
  const result = Customer.restore(data);
  if (!result.ok) {
    throw new CorruptCustomerSnapshotError(`Customer ${data.businessId}/${data.userId}: ${result.error.message}`);
  }
  return result.value;
}
