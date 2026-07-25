import type { Referral } from "../../domain/entities/referral";
import type { ReferralState } from "../../domain/value-objects/referral-state";

/**
 * ReferralDto is the plain, serializable view of a referral for the referrer's
 * panel (US-D5). It carries the stage and the reward earned, but not the
 * referred person's uid — the referrer sees their funnel's progress, not their
 * invitees' identities.
 */
export type ReferralDto = {
  state: ReferralState;
  rewardCents: number | null;
  createdAt: string;
};

/** Maps a Referral aggregate to its serializable DTO. */
export const toReferralDto = (referral: Referral): ReferralDto => ({
  state: referral.state,
  rewardCents: referral.rewardCents,
  createdAt: referral.createdAt,
});

/** The referrer's shareable code (the UI builds the full link from it). */
export type ReferralLinkDto = {
  code: string;
};
