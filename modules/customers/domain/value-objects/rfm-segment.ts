/**
 * The RFM segment a customer falls into (BR-21), from their Recency, Frequency
 * and Monetary value:
 * - `nuevo`     — no orders yet, or only their first.
 * - `activo`    — ordering regularly.
 * - `vip`       — frequent and high-spending.
 * - `en_riesgo` — hasn't ordered in a while; a win-back candidate.
 * - `inactivo`  — long lapsed.
 */
export type RfmSegment = "nuevo" | "activo" | "vip" | "en_riesgo" | "inactivo";

const RFM_SEGMENTS: readonly RfmSegment[] = [
  "nuevo",
  "activo",
  "vip",
  "en_riesgo",
  "inactivo",
];

/** Type guard narrowing a stored string to a known {@link RfmSegment}. */
export const isRfmSegment = (value: string): value is RfmSegment =>
  (RFM_SEGMENTS as readonly string[]).includes(value);

/** The thresholds that turn raw RFM figures into a segment. */
export type RfmThresholds = {
  /** Days without ordering after which a customer is `en_riesgo`. */
  riskDays: number;
  /** Days without ordering after which a customer is `inactivo`. */
  inactiveDays: number;
  /** Minimum orders to qualify as `vip`. */
  vipMinOrders: number;
  /** Minimum lifetime spend (minor units) to qualify as `vip`. */
  vipMinSpentCents: number;
};

/**
 * Classifies a customer into an {@link RfmSegment} from their recency, frequency
 * and monetary figures. Recency dominates — a lapsed VIP is `en_riesgo` or
 * `inactivo`, which is exactly who win-back should target — then value, then
 * tenure. A pure function so the rule is testable and lives in one place.
 */
export function classifySegment(
  input: { orderCount: number; totalSpentCents: number; recencyDays: number },
  thresholds: RfmThresholds
): RfmSegment {
  if (input.orderCount === 0) {
    return "nuevo";
  }
  if (input.recencyDays > thresholds.inactiveDays) {
    return "inactivo";
  }
  if (input.recencyDays > thresholds.riskDays) {
    return "en_riesgo";
  }
  if (
    input.orderCount >= thresholds.vipMinOrders &&
    input.totalSpentCents >= thresholds.vipMinSpentCents
  ) {
    return "vip";
  }
  if (input.orderCount <= 1) {
    return "nuevo";
  }
  return "activo";
}
