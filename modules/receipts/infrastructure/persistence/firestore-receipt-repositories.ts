import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import type { Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { PointsAccount, type PointsAccountSnapshot, type PointsChange, type PointsEntry } from "../../domain/entities/points-account";
import { CorruptPointsAccountError } from "../../domain/errors/receipt-errors";
import { ok } from "@/shared/domain/result";
import { Redemption, type RedemptionSnapshot } from "../../domain/entities/redemption";
import type { Reward } from "../../domain/entities/reward";
import type {
  PointsRepository,
  ReceiptLedger,
  ReceiptRecord,
  ReceiptSettingsRepository,
  RedemptionChange,
  RedemptionRepository,
  RewardCatalog,
} from "../../domain/ports/receipt-ports";
import { ReceiptSettings, type ReceiptSettingsInput } from "../../domain/value-objects/receipt-settings";

/*
 * Layout, under the business so every query is tied to one of them:
 *
 *   businesses/{businessId}/settings/receipts                        the owner's rules
 *   businesses/{businessId}/receipts/{receiptId}                     one record per used receipt
 *   businesses/{businessId}/receipt_keys/{sha256 of key}             taken identifiers, shared by all customers
 *   businesses/{businessId}/customers/{userId}/programs/points       the balance
 *   businesses/{businessId}/customers/{userId}/programs/receipt_use  reading attempts of that day
 *   businesses/{businessId}/customers/{userId}/points_ledger/{id}    one immutable record per change
 *   businesses/{businessId}/rewards/{rewardId}                       the prize catalog
 *   businesses/{businessId}/redemptions/{code}                       one prize code per redemption
 */

/** Firestore's gRPC status for a create() that found the document already there. */
const ALREADY_EXISTS = 6;

const businessRef = (firestore: Firestore, businessId: string) => firestore.collection("businesses").doc(businessId);
const customerRef = (firestore: Firestore, businessId: string, userId: string) =>
  businessRef(firestore, businessId).collection("customers").doc(userId);

export class FirestoreReceiptSettingsRepository implements ReceiptSettingsRepository {
  constructor(private readonly firestore: Firestore) {}

  private ref(businessId: string) {
    return businessRef(this.firestore, businessId).collection("settings").doc("receipts");
  }

  async get(businessId: string): Promise<ReceiptSettings> {
    const snapshot = await this.ref(businessId).get();
    if (!snapshot.exists) return ReceiptSettings.defaults();
    const settings = ReceiptSettings.create(snapshot.data() as ReceiptSettingsInput);
    if (!settings.ok) throw settings.error;
    return settings.value;
  }

  async save(businessId: string, settings: ReceiptSettings): Promise<void> {
    await this.ref(businessId).set({
      enabled: settings.enabled,
      storeNames: [...settings.storeNames],
      merchantIds: [...settings.merchantIds],
      maxAgeDays: settings.maxAgeDays,
      maxAmountDollars: settings.maxAmountDollars,
      pointsPerDollar: settings.pointsPerDollar,
      dailyLimit: settings.dailyLimit,
    } satisfies ReceiptSettingsInput);
  }
}

export class FirestoreReceiptLedger implements ReceiptLedger {
  constructor(private readonly firestore: Firestore) {}

  private keyRef(businessId: string, key: string) {
    const id = createHash("sha256").update(key).digest("hex");
    return businessRef(this.firestore, businessId).collection("receipt_keys").doc(id);
  }

  private recordRef(record: ReceiptRecord) {
    return businessRef(this.firestore, record.businessId).collection("receipts").doc(record.id);
  }

  async claim(record: ReceiptRecord, keys: readonly string[]): Promise<boolean> {
    const batch = this.firestore.batch();
    batch.create(this.recordRef(record), record);
    for (const key of keys) batch.create(this.keyRef(record.businessId, key), { receiptId: record.id, at: record.at });
    try {
      await batch.commit();
      return true;
    } catch (error) {
      if ((error as { code?: number }).code === ALREADY_EXISTS) return false;
      throw error;
    }
  }

  async release(record: ReceiptRecord, keys: readonly string[]): Promise<void> {
    const batch = this.firestore.batch();
    batch.delete(this.recordRef(record));
    for (const key of keys) batch.delete(this.keyRef(record.businessId, key));
    await batch.commit();
  }

  async countAttempt(businessId: string, userId: string, day: string): Promise<number> {
    const ref = customerRef(this.firestore, businessId, userId).collection("programs").doc("receipt_use");
    return this.firestore.runTransaction(async (transaction) => {
      const data = (await transaction.get(ref)).data() as { day?: string; attempts?: number } | undefined;
      const attempts = (data?.day === day ? (data.attempts ?? 0) : 0) + 1;
      transaction.set(ref, { day, attempts });
      return attempts;
    });
  }

  async recent(businessId: string, limit: number): Promise<ReceiptRecord[]> {
    const snapshot = await businessRef(this.firestore, businessId).collection("receipts").orderBy("at", "desc").limit(limit).get();
    return snapshot.docs.map((doc) => doc.data() as ReceiptRecord);
  }
}

function restoreAccount(data: PointsAccountSnapshot): PointsAccount {
  const account = PointsAccount.restore(data);
  if (!account.ok) throw new CorruptPointsAccountError(`Points ${data.businessId}/${data.userId}: ${account.error.message}`);
  return account.value;
}

export class FirestoreRewardCatalog implements RewardCatalog {
  constructor(private readonly firestore: Firestore) {}

  private collection(businessId: string) {
    return businessRef(this.firestore, businessId).collection("rewards");
  }

  async list(businessId: string): Promise<Reward[]> {
    const snapshot = await this.collection(businessId).orderBy("points").get();
    return snapshot.docs.map((doc) => doc.data() as Reward);
  }

  async find(businessId: string, rewardId: string): Promise<Reward | null> {
    const snapshot = await this.collection(businessId).doc(rewardId).get();
    return snapshot.exists ? (snapshot.data() as Reward) : null;
  }

  async save(reward: Reward): Promise<void> {
    await this.collection(reward.businessId).doc(reward.id).set(reward);
  }

  async delete(businessId: string, rewardId: string): Promise<void> {
    await this.collection(businessId).doc(rewardId).delete();
  }
}

export class FirestoreRedemptionRepository implements RedemptionRepository {
  constructor(private readonly firestore: Firestore) {}

  private collection(businessId: string) {
    return businessRef(this.firestore, businessId).collection("redemptions");
  }

  private account(businessId: string, userId: string) {
    return customerRef(this.firestore, businessId, userId).collection("programs").doc("points");
  }

  private ledger(businessId: string, userId: string, entryId: string) {
    return customerRef(this.firestore, businessId, userId).collection("points_ledger").doc(entryId);
  }

  async find(businessId: string, code: string): Promise<Redemption | null> {
    const snapshot = await this.collection(businessId).doc(code).get();
    return snapshot.exists ? Redemption.restore(snapshot.data() as RedemptionSnapshot) : null;
  }

  async listForCustomer(businessId: string, userId: string): Promise<Redemption[]> {
    // Sorted here: filtering and sorting in the query would need a composite index, which needs billing.
    const snapshot = await this.collection(businessId).where("userId", "==", userId).get();
    return snapshot.docs
      .map((doc) => doc.data() as RedemptionSnapshot)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((data) => Redemption.restore(data));
  }

  async recent(businessId: string, limit: number): Promise<Redemption[]> {
    const snapshot = await this.collection(businessId).orderBy("createdAt", "desc").limit(limit).get();
    return snapshot.docs.map((doc) => Redemption.restore(doc.data() as RedemptionSnapshot));
  }

  async open(
    businessId: string,
    userId: string,
    decide: (account: PointsAccount | null) => Result<{ redemption: Redemption; points: PointsChange }, DomainError>
  ): Promise<Result<Redemption, DomainError>> {
    const accountRef = this.account(businessId, userId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(accountRef);
      const result = decide(snapshot.exists ? restoreAccount(snapshot.data() as PointsAccountSnapshot) : null);
      if (!result.ok) return result;
      const { redemption, points } = result.value;
      transaction.set(accountRef, points.account.toSnapshot());
      transaction.create(this.ledger(businessId, userId, points.entry.id), points.entry);
      transaction.create(this.collection(businessId).doc(redemption.code), redemption.toSnapshot());
      return ok(redemption);
    });
  }

  async settle(
    businessId: string,
    code: string,
    decide: (redemption: Redemption | null, account: PointsAccount | null) => Result<RedemptionChange, DomainError>
  ): Promise<Result<Redemption, DomainError>> {
    const ref = this.collection(businessId).doc(code);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const current = snapshot.exists ? Redemption.restore(snapshot.data() as RedemptionSnapshot) : null;
      const accountRef = current ? this.account(businessId, current.userId) : null;
      const accountSnapshot = accountRef ? await transaction.get(accountRef) : null;
      const result = decide(current, accountSnapshot?.exists ? restoreAccount(accountSnapshot.data() as PointsAccountSnapshot) : null);
      if (!result.ok) return result;
      const { redemption, points } = result.value;
      transaction.set(ref, redemption.toSnapshot());
      if (points && accountRef) {
        transaction.set(accountRef, points.account.toSnapshot());
        transaction.create(this.ledger(businessId, redemption.userId, points.entry.id), points.entry);
      }
      return ok(redemption);
    });
  }
}

export class FirestorePointsRepository implements PointsRepository {
  constructor(private readonly firestore: Firestore) {}

  private ref(businessId: string, userId: string) {
    return customerRef(this.firestore, businessId, userId).collection("programs").doc("points");
  }

  async find(businessId: string, userId: string): Promise<PointsAccount | null> {
    const snapshot = await this.ref(businessId, userId).get();
    return snapshot.exists ? restoreAccount(snapshot.data() as PointsAccountSnapshot) : null;
  }

  async findMany(businessId: string, userIds: readonly string[]): Promise<Map<string, PointsAccount>> {
    const accounts = new Map<string, PointsAccount>();
    if (userIds.length === 0) return accounts;
    const snapshots = await this.firestore.getAll(...userIds.map((userId) => this.ref(businessId, userId)));
    for (const snapshot of snapshots) {
      if (snapshot.exists) {
        const account = restoreAccount(snapshot.data() as PointsAccountSnapshot);
        accounts.set(account.userId, account);
      }
    }
    return accounts;
  }

  async entries(businessId: string, userId: string, limit: number): Promise<PointsEntry[]> {
    const snapshot = await customerRef(this.firestore, businessId, userId).collection("points_ledger").orderBy("at", "desc").limit(limit).get();
    return snapshot.docs.map((doc) => doc.data() as PointsEntry);
  }

  async transact(
    businessId: string,
    userId: string,
    decide: (current: PointsAccount | null) => Result<PointsChange, DomainError>
  ): Promise<Result<PointsChange, DomainError>> {
    const ref = this.ref(businessId, userId);
    // Firestore may re-run this callback on contention. `decide` only produces values, so that is safe.
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const result = decide(snapshot.exists ? restoreAccount(snapshot.data() as PointsAccountSnapshot) : null);
      if (!result.ok) return result;
      const { account, entry } = result.value;
      transaction.set(ref, account.toSnapshot());
      transaction.create(customerRef(this.firestore, businessId, userId).collection("points_ledger").doc(entry.id), entry);
      return result;
    });
  }
}
