import type { CartRepository } from "../../domain/repositories/cart-repository";
import { Cart } from "../../domain/entities/cart";
import {
  CART_SNAPSHOT_VERSION,
  snapshotToRestoreInput,
  toSnapshot,
  type CartSnapshot,
} from "../../application/dtos/cart-snapshot";

/** Versioned storage key; bumping the version segment orphans old carts safely. */
const STORAGE_KEY = "mixmag.cart.v1";

/** A demo customer gets an isolated basket, even in two side-by-side tabs. */
function storageKey(): string {
  if (typeof window === "undefined") return STORAGE_KEY;
  const match = window.location.pathname.match(/\/demo\/([^/]+)/);
  return match?.[1] ? `${STORAGE_KEY}.${decodeURIComponent(match[1])}` : STORAGE_KEY;
}

/**
 * LocalStorageCartRepository persists a guest cart in the browser's
 * `localStorage`. It is the concrete adapter behind the {@link CartRepository}
 * port for anonymous shoppers. All access is guarded: server-side (no `window`)
 * it behaves as an empty, no-op store, and every read/write is wrapped so a
 * private-browsing quota error or a corrupt value degrades to an empty cart
 * instead of throwing (mirroring the app's existing localStorage handling).
 */
export class LocalStorageCartRepository implements CartRepository {
  async load(): Promise<Cart> {
    if (typeof window === "undefined") {
      return Cart.create();
    }

    let raw: string | null;
    try {
      raw = window.localStorage.getItem(storageKey());
    } catch {
      return Cart.create();
    }

    if (raw === null) {
      return Cart.create();
    }

    const snapshot = this.parse(raw);
    if (snapshot === null) {
      this.discard();
      return Cart.create();
    }

    const restored = Cart.restore(snapshotToRestoreInput(snapshot));
    if (!restored.ok) {
      this.discard();
      return Cart.create();
    }
    return restored.value;
  }

  async save(cart: Cart): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify(toSnapshot(cart)));
    } catch {
      // Storage full or unavailable (e.g. private mode): keep the in-memory cart.
    }
  }

  async clear(): Promise<void> {
    this.discard();
  }

  /** Parses and shallow-validates a stored value, returning null when unusable. */
  private parse(raw: string): CartSnapshot | null {
    try {
      const parsed = JSON.parse(raw) as Partial<CartSnapshot>;
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        parsed.version !== CART_SNAPSHOT_VERSION ||
        typeof parsed.id !== "string" ||
        !Array.isArray(parsed.lines)
      ) {
        return null;
      }
      return parsed as CartSnapshot;
    } catch {
      return null;
    }
  }

  /** Best-effort removal of the stored cart. */
  private discard(): void {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(storageKey());
    } catch {
      // Ignore: nothing else we can do if storage is unavailable.
    }
  }
}
