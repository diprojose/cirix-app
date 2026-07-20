import type { UserAccount } from "../../domain/entities/user-account";
import type { AccessTierName } from "../../domain/value-objects/access-tier";

/**
 * ViewerDto is the plain, serializable view of whoever is looking at the app —
 * an authenticated {@link UserAccount} or an anonymous guest. Being a plain
 * object (no class instances), it can safely cross the RSC server→client
 * boundary. It carries the resolved permissions so the UI never re-derives the
 * authorization rules that live in the domain.
 */
export type ViewerDto = {
  authenticated: boolean;
  uid: string | null;
  email: string | null;
  tier: AccessTierName;
  /** ISO timestamp of when premium expires; `null` for non-premium or legacy grants. */
  premiumUntil: string | null;
  permissions: {
    canPlaceOrders: boolean;
    canViewRecipes: boolean;
    canOperateStore: boolean;
  };
};

/** The DTO for an anonymous visitor with no account. */
export const guestViewer: ViewerDto = {
  authenticated: false,
  uid: null,
  email: null,
  tier: "guest",
  premiumUntil: null,
  permissions: {
    canPlaceOrders: false,
    canViewRecipes: false,
    canOperateStore: false,
  },
};

/** Maps an authenticated UserAccount (or `null` for a guest) to a ViewerDto. */
export const toViewerDto = (account: UserAccount | null): ViewerDto => {
  if (account === null) {
    return guestViewer;
  }
  return {
    authenticated: true,
    uid: account.id.value,
    email: account.email.value,
    tier: account.tier.name,
    premiumUntil: account.premiumUntil,
    permissions: {
      canPlaceOrders: account.canPlaceOrders(),
      canViewRecipes: account.canViewRecipes(),
      canOperateStore: account.canOperateStore(),
    },
  };
};
