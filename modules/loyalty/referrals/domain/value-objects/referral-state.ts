/**
 * The stage a referral has reached (adapted from the spec's state machine):
 * - `registrado`         — the referred user signed up through the link.
 * - `primera_compra`     — they completed their first order.
 * - `recompensa_pendiente` — they completed a second order, unlocking (BR-08)
 *                           the referrer's reward (which then lives its own
 *                           pending → available lifecycle in the wallet).
 * - `bloqueado`          — flagged by fraud review; never pays out (BR-09).
 *
 * Automated fraud blocking arrives with the fraud epic; until then `bloqueado`
 * is a valid but unentered state.
 */
export type ReferralState =
  | "registrado"
  | "primera_compra"
  | "recompensa_pendiente"
  | "bloqueado";

const REFERRAL_STATES: readonly ReferralState[] = [
  "registrado",
  "primera_compra",
  "recompensa_pendiente",
  "bloqueado",
];

/** Type guard narrowing a stored string to a known {@link ReferralState}. */
export const isReferralState = (value: string): value is ReferralState =>
  (REFERRAL_STATES as readonly string[]).includes(value);
