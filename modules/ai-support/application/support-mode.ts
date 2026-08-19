import type { SupportMode } from "./public-commerce-knowledge";

/** Missing, mixed-case, or unexpected values all fail safe to simulation. */
export function getSupportMode(
  env: { AI_SUPPORT_ENABLED?: string } = {
    AI_SUPPORT_ENABLED: process.env.AI_SUPPORT_ENABLED,
  }
): SupportMode {
  return env.AI_SUPPORT_ENABLED === "true" ? "ai" : "simulated";
}
