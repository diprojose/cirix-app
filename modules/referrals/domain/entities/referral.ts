import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { ReferralId } from "../value-objects/referral-id";
import { isReferralState, type ReferralState } from "../value-objects/referral-state";
import {
  CorruptReferralSnapshotError,
  InvalidReferralError,
  SelfReferralError,
} from "../errors/referral-errors";

/** Props backing a {@link Referral} aggregate (the id is the referred uid). */
type ReferralProps = {
  referrerUid: string;
  state: ReferralState;
  firstPurchaseOrderId: string | null;
  secondPurchaseOrderId: string | null;
  firstPurchaseAt: string | null;
  secondPurchaseAt: string | null;
  rewardCents: number | null;
  createdAt: string;
};

/** Input accepted by {@link Referral.restore} when rehydrating persistence. */
export type RestoreReferralInput = {
  referredUid: string;
  referrerUid: string;
  state: string;
  firstPurchaseOrderId: string | null;
  secondPurchaseOrderId: string | null;
  firstPurchaseAt: string | null;
  secondPurchaseAt: string | null;
  rewardCents: number | null;
  createdAt: string;
};

/**
 * Referral is the aggregate root of the referrals context: the link between a
 * referrer and the person they invited, and the state machine that governs when
 * the referrer earns their reward. The reward unlocks only after the referred
 * user's **second** completed purchase (BR-08) — never at signup or the first
 * order — so a referral is worth paying for only when the invitee sticks around.
 * Purchases advance the machine one confirmed order at a time, each recorded by
 * id so a re-confirmed order never double-counts.
 */
export class Referral extends AggregateRoot<ReferralProps, ReferralId> {
  private constructor(id: ReferralId, props: ReferralProps) {
    super(id, props);
  }

  /** Creates a referral in `registrado`, rejecting a self-referral (BR-24). */
  static create(input: {
    referrerUid: string;
    referredUid: string;
  }): Result<Referral, DomainError> {
    const referrerUid = input.referrerUid.trim();
    const referredUid = input.referredUid.trim();
    if (referrerUid.length === 0 || referredUid.length === 0) {
      return err(new InvalidReferralError("A referral needs both a referrer and a referred user."));
    }
    if (referrerUid === referredUid) {
      return err(new SelfReferralError());
    }
    return ok(
      new Referral(ReferralId.from(referredUid), {
        referrerUid,
        state: "registrado",
        firstPurchaseOrderId: null,
        secondPurchaseOrderId: null,
        firstPurchaseAt: null,
        secondPurchaseAt: null,
        rewardCents: null,
        createdAt: new Date().toISOString(),
      })
    );
  }

  /** Rebuilds a referral from a persisted snapshot, revalidating its state. */
  static restore(input: RestoreReferralInput): Result<Referral, DomainError> {
    if (!isReferralState(input.state)) {
      return err(new CorruptReferralSnapshotError(`Unknown referral state "${input.state}".`));
    }
    return ok(
      new Referral(ReferralId.from(input.referredUid), {
        referrerUid: input.referrerUid,
        state: input.state,
        firstPurchaseOrderId: input.firstPurchaseOrderId,
        secondPurchaseOrderId: input.secondPurchaseOrderId,
        firstPurchaseAt: input.firstPurchaseAt,
        secondPurchaseAt: input.secondPurchaseAt,
        rewardCents: input.rewardCents,
        createdAt: input.createdAt,
      })
    );
  }

  /** Records the referred user's first completed purchase. No-op unless awaiting it. */
  recordFirstPurchase(orderId: string): Referral {
    if (this.props.state !== "registrado") {
      return this;
    }
    return new Referral(this._id, {
      ...this.props,
      state: "primera_compra",
      firstPurchaseOrderId: orderId,
      firstPurchaseAt: new Date().toISOString(),
    });
  }

  /**
   * Records the referred user's second completed purchase, unlocking the
   * referrer's reward of `rewardCents` (which the caller may set to 0 when a
   * period cap is hit, BR-16). No-op unless awaiting the second purchase, and it
   * must be a different order than the first.
   */
  recordSecondPurchase(orderId: string, rewardCents: number): Referral {
    if (this.props.state !== "primera_compra" || orderId === this.props.firstPurchaseOrderId) {
      return this;
    }
    return new Referral(this._id, {
      ...this.props,
      state: "recompensa_pendiente",
      secondPurchaseOrderId: orderId,
      secondPurchaseAt: new Date().toISOString(),
      rewardCents,
    });
  }

  /** Rolls back the unlock when the second purchase is cancelled (UC-14 E3). */
  rollbackSecondPurchase(): Referral {
    if (this.props.state !== "recompensa_pendiente") {
      return this;
    }
    return new Referral(this._id, {
      ...this.props,
      state: "primera_compra",
      secondPurchaseOrderId: null,
      secondPurchaseAt: null,
      rewardCents: null,
    });
  }

  /** Flags the referral as fraudulent; it never pays out (BR-09). */
  block(): Referral {
    return new Referral(this._id, { ...this.props, state: "bloqueado" });
  }

  get referrerUid(): string {
    return this.props.referrerUid;
  }

  get referredUid(): string {
    return this._id.value;
  }

  get state(): ReferralState {
    return this.props.state;
  }

  get firstPurchaseOrderId(): string | null {
    return this.props.firstPurchaseOrderId;
  }

  get secondPurchaseOrderId(): string | null {
    return this.props.secondPurchaseOrderId;
  }

  get firstPurchaseAt(): string | null {
    return this.props.firstPurchaseAt;
  }

  get secondPurchaseAt(): string | null {
    return this.props.secondPurchaseAt;
  }

  /** Reward unlocked for the referrer, in minor units, or `null` if none yet. */
  get rewardCents(): number | null {
    return this.props.rewardCents;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }
}
