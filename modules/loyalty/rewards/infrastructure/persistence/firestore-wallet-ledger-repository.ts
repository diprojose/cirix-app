import type { Firestore } from "firebase-admin/firestore";
import { LedgerEntry } from "../../domain/entities/ledger-entry";
import type { LedgerEntryId } from "../../domain/value-objects/ledger-entry-id";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";

/** Firestore collection holding one document per append-only ledger line. */
const COLLECTION = "wallet_ledger";

/** The Firestore shape of a ledger line (everything but the id, which keys the doc). */
type LedgerEntryDocument = {
  customerUid: string;
  amountCents: number;
  reason: string;
  status: string;
  sourceType: string;
  sourceId: string | null;
  holdbackUntil: string | null;
  expiresAt: string | null;
  note: string;
  createdAt: string;
};

/**
 * FirestoreWalletLedgerRepository is the production adapter for the
 * {@link WalletLedgerRepository} port, backed by the Firebase Admin SDK
 * (server-only). Idempotent appends run inside a transaction so a duplicate
 * source event (e.g. a re-confirmed order) can never create a second line
 * (BR-11). The job queries filter on a single indexed field (`status`) and
 * refine in memory, keeping Firestore free of composite indexes — the ledger of
 * an artisan shop is small.
 */
export class FirestoreWalletLedgerRepository implements WalletLedgerRepository {
  constructor(private readonly firestore: Firestore) {}

  async findById(id: LedgerEntryId): Promise<LedgerEntry | null> {
    const snapshot = await this.firestore.collection(COLLECTION).doc(id.value).get();
    if (!snapshot.exists) {
      return null;
    }
    return restore(snapshot.id, snapshot.data() as LedgerEntryDocument);
  }

  async appendIfAbsent(entry: LedgerEntry): Promise<boolean> {
    const ref = this.firestore.collection(COLLECTION).doc(entry.id.value);
    return this.firestore.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists) {
        return false;
      }
      tx.set(ref, toDocument(entry));
      return true;
    });
  }

  async save(entry: LedgerEntry): Promise<void> {
    await this.firestore
      .collection(COLLECTION)
      .doc(entry.id.value)
      .set(toDocument(entry));
  }

  async findByCustomer(customerUid: string): Promise<LedgerEntry[]> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("customerUid", "==", customerUid)
      .limit(1000)
      .get();
    return snapshot.docs.map((doc) => restore(doc.id, doc.data() as LedgerEntryDocument));
  }

  async findReleasable(nowIso: string, limit: number): Promise<LedgerEntry[]> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("status", "==", "pending")
      .limit(limit)
      .get();
    return snapshot.docs
      .map((doc) => restore(doc.id, doc.data() as LedgerEntryDocument))
      .filter((entry) => entry.isReleasableAt(nowIso));
  }

  async findExpirable(nowIso: string, limit: number): Promise<LedgerEntry[]> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("status", "==", "available")
      .limit(limit)
      .get();
    return snapshot.docs
      .map((doc) => restore(doc.id, doc.data() as LedgerEntryDocument))
      .filter((entry) => entry.isExpirableAt(nowIso));
  }

  async findAllAvailable(limit: number): Promise<LedgerEntry[]> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("status", "==", "available")
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => restore(doc.id, doc.data() as LedgerEntryDocument));
  }
}

/** Serializes a ledger line into its Firestore document. */
function toDocument(entry: LedgerEntry): LedgerEntryDocument {
  return {
    customerUid: entry.customerUid,
    amountCents: entry.amountCents,
    reason: entry.reason,
    status: entry.status,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    holdbackUntil: entry.holdbackUntil,
    expiresAt: entry.expiresAt,
    note: entry.note,
    createdAt: entry.createdAt,
  };
}

/** Rebuilds the aggregate from a stored document, failing loudly on corrupt data. */
function restore(id: string, document: LedgerEntryDocument): LedgerEntry {
  const result = LedgerEntry.restore({ id, ...document });
  if (!result.ok) {
    throw new Error(`Corrupt ledger document "${id}": ${result.error.message}`);
  }
  return result.value;
}
