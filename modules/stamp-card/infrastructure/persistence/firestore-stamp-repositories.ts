import { FieldPath, FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { StampCard } from "../../domain/entities/stamp-card";
import type { CardWrite, StampCardRepository } from "../../domain/ports/stamp-card-repository";
import { activityDay, type DailyStampActivity, type StampActivityReader } from "../../domain/ports/stamp-activity";
import type { StampProgramRepository } from "../../domain/ports/stamp-program-repository";
import type { TableCode, TableCodeRepository } from "../../domain/ports/table-code-repository";
import { StampProgram } from "../../domain/value-objects/stamp-program";
import { CorruptStampCardError } from "../../domain/errors/stamp-card-errors";
import { newTableCode } from "../crypto/table-code";

/*
 * Layout, under the customer's own CRM record so every query is tied to one
 * business and one person, and no composite index is needed:
 *
 *   businesses/{businessId}/customers/{userId}/programs/stamps        the card (current state)
 *   businesses/{businessId}/customers/{userId}/stamps/{stampId}       one immutable record per stamp
 *   businesses/{businessId}/customers/{userId}/redemptions/{id}       one immutable record per reward
 *   businesses/{businessId}/settings/stamp_program                    the business's rules
 *   businesses/{businessId}/settings/table_code                       the code inside the table QR
 *   businesses/{businessId}/stamp_activity/{YYYY-MM-DD}               that UTC day's totals, for owner reports
 */
type CardDocument = {
  businessId: string;
  userId: string;
  stamps: number;
  rewardReady: boolean;
  totalStamps: number;
  redeemedCount: number;
  lastStampAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProgramDocument = {
  requiredStamps: number;
  rewardName: string;
  cooldownMinutes: number;
  active: boolean;
  /** Missing on programs saved before table stamps existed: read as off. */
  tableStamps?: boolean;
};

/** Firestore's gRPC status for a create() that found the document already there. */
const ALREADY_EXISTS = 6;

/** Missing counters were simply never incremented. */
type ActivityDocument = Partial<Omit<DailyStampActivity, "day">>;

const customerRef = (firestore: Firestore, businessId: string, userId: string) =>
  firestore.collection("businesses").doc(businessId).collection("customers").doc(userId);

const activityCollection = (firestore: Firestore, businessId: string) =>
  firestore.collection("businesses").doc(businessId).collection("stamp_activity");

function restoreCard(data: CardDocument): StampCard {
  const result = StampCard.restore(data);
  if (!result.ok) throw new CorruptStampCardError(`Card ${data.businessId}/${data.userId}: ${result.error.message}`);
  return result.value;
}

/** Firestore adapter for {@link StampCardRepository}. Every change runs inside one transaction. */
export class FirestoreStampCardRepository implements StampCardRepository {
  constructor(private readonly firestore: Firestore) {}

  private cardRef(businessId: string, userId: string) {
    return customerRef(this.firestore, businessId, userId).collection("programs").doc("stamps");
  }

  async find(businessId: string, userId: string): Promise<StampCard | null> {
    const snapshot = await this.cardRef(businessId, userId).get();
    return snapshot.exists ? restoreCard(snapshot.data() as CardDocument) : null;
  }

  private activityRef(businessId: string, at: string) {
    return activityCollection(this.firestore, businessId).doc(activityDay(at));
  }

  async findMany(businessId: string, userIds: readonly string[]): Promise<Map<string, StampCard>> {
    const cards = new Map<string, StampCard>();
    if (userIds.length === 0) return cards;
    const snapshots = await this.firestore.getAll(...userIds.map((userId) => this.cardRef(businessId, userId)));
    for (const snapshot of snapshots) {
      if (snapshot.exists) {
        const card = restoreCard(snapshot.data() as CardDocument);
        cards.set(card.userId, card);
      }
    }
    return cards;
  }

  async transact<T extends CardWrite>(
    businessId: string,
    userId: string,
    decide: (current: StampCard | null) => Result<T, DomainError>
  ): Promise<Result<T, DomainError>> {
    const cardRef = this.cardRef(businessId, userId);
    const customer = customerRef(this.firestore, businessId, userId);
    // Firestore may re-run this callback on contention. `decide` is pure, so that is safe.
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(cardRef);
      const current = snapshot.exists ? restoreCard(snapshot.data() as CardDocument) : null;
      const result = decide(current);
      if (!result.ok) return result;

      const { card, stamp, redemption } = result.value;
      transaction.set(cardRef, {
        businessId: card.businessId,
        userId: card.userId,
        stamps: card.stamps,
        rewardReady: card.rewardReady,
        totalStamps: card.totalStamps,
        redeemedCount: card.redeemedCount,
        lastStampAt: card.lastStampAt,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
      } satisfies CardDocument);
      if (stamp) {
        transaction.create(customer.collection("stamps").doc(stamp.id), {
          source: stamp.source,
          staffUserId: stamp.staffUserId,
          at: stamp.at,
          sequence: stamp.sequence,
        });
        const counts =
          stamp.staffUserId !== null
            ? { staffStamps: { [stamp.staffUserId]: FieldValue.increment(1) } }
            : stamp.source === "receipt"
              ? { receiptStamps: FieldValue.increment(1) }
              : { tableStamps: FieldValue.increment(1), tableStampsByCustomer: { [userId]: FieldValue.increment(1) } };
        transaction.set(this.activityRef(businessId, stamp.at), counts, { merge: true });
      }
      if (redemption) {
        transaction.create(customer.collection("redemptions").doc(redemption.id), {
          staffUserId: redemption.staffUserId,
          at: redemption.at,
        });
        transaction.set(
          this.activityRef(businessId, redemption.at),
          { redemptions: { [redemption.staffUserId]: FieldValue.increment(1) } },
          { merge: true }
        );
      }
      return result;
    });
  }
}

/** Firestore adapter for {@link StampActivityReader}. A range on the document id needs no index. */
export class FirestoreStampActivityReader implements StampActivityReader {
  constructor(private readonly firestore: Firestore) {}

  async days(businessId: string, fromDay: string, toDay: string): Promise<DailyStampActivity[]> {
    const snapshot = await activityCollection(this.firestore, businessId)
      .where(FieldPath.documentId(), ">=", fromDay)
      .where(FieldPath.documentId(), "<=", toDay)
      .get();
    return snapshot.docs.map((doc) => {
      const data = doc.data() as ActivityDocument;
      return {
        day: doc.id,
        staffStamps: data.staffStamps ?? {},
        tableStamps: data.tableStamps ?? 0,
        receiptStamps: data.receiptStamps ?? 0,
        redemptions: data.redemptions ?? {},
        tableStampsByCustomer: data.tableStampsByCustomer ?? {},
      };
    });
  }
}

/** Firestore adapter for {@link StampProgramRepository}. */
export class FirestoreStampProgramRepository implements StampProgramRepository {
  constructor(private readonly firestore: Firestore) {}

  private ref(businessId: string) {
    return this.firestore.collection("businesses").doc(businessId).collection("settings").doc("stamp_program");
  }

  async get(businessId: string): Promise<StampProgram> {
    const snapshot = await this.ref(businessId).get();
    if (!snapshot.exists) return StampProgram.defaults();
    const program = StampProgram.create(snapshot.data() as ProgramDocument);
    if (!program.ok) throw new CorruptStampCardError(`Stamp program of ${businessId}: ${program.error.message}`);
    return program.value;
  }

  async save(businessId: string, program: StampProgram): Promise<void> {
    await this.ref(businessId).set({
      requiredStamps: program.requiredStamps,
      rewardName: program.rewardName,
      cooldownMinutes: program.cooldownMinutes,
      active: program.active,
      tableStamps: program.tableStamps,
    } satisfies ProgramDocument);
  }
}

/** Firestore adapter for {@link TableCodeRepository}. */
export class FirestoreTableCodeRepository implements TableCodeRepository {
  constructor(private readonly firestore: Firestore) {}

  private ref(businessId: string) {
    return this.firestore.collection("businesses").doc(businessId).collection("settings").doc("table_code");
  }

  async current(businessId: string): Promise<TableCode> {
    const ref = this.ref(businessId);
    const snapshot = await ref.get();
    if (snapshot.exists) return snapshot.data() as TableCode;

    const fresh: TableCode = { code: newTableCode(), createdAt: new Date().toISOString() };
    try {
      // create() fails if someone else made the first code meanwhile; theirs wins.
      await ref.create(fresh);
      return fresh;
    } catch (error) {
      if ((error as { code?: unknown }).code !== ALREADY_EXISTS) throw error;
      return (await ref.get()).data() as TableCode;
    }
  }

  async rotate(businessId: string): Promise<TableCode> {
    const fresh: TableCode = { code: newTableCode(), createdAt: new Date().toISOString() };
    await this.ref(businessId).set(fresh);
    return fresh;
  }
}
