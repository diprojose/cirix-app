import {
  createDemoState,
  restoreDemo,
  storageKey,
  updateDemo,
  type DemoAction,
  type DemoState,
} from "./model";
import type { BrandProfile } from "../branding/application/brand-profile";

type Snapshot = { state: DemoState; ready: boolean; storageError: boolean };
/** One store per mounted brand. No server singleton and no remote persistence. */
export function createDemoStore(brand: BrandProfile) {
  const seed = createDemoState(brand);
  const serverSnapshot: Snapshot = {
    state: seed,
    ready: false,
    storageError: false,
  };
  let snapshot = serverSnapshot;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((fn) => fn());
  const key = storageKey(brand.slug);
  function hydrate() {
    try {
      snapshot = {
        state: restoreDemo(window.localStorage.getItem(key), seed),
        ready: true,
        storageError: false,
      };
    } catch {
      snapshot = { ...snapshot, ready: true, storageError: true };
    }
    emit();
  }
  function persist(state: DemoState) {
    let storageError = false;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      storageError = true;
    }
    snapshot = { state, ready: true, storageError };
    emit();
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!snapshot.ready) hydrate();
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) hydrate();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    dispatch(action: DemoAction): string | null {
      if (!snapshot.ready) return "Espera un momento / Please wait";
      try {
        persist(updateDemo(snapshot.state, action));
        return null;
      } catch (error) {
        return error instanceof Error && error.name !== "ZodError"
          ? error.message
          : "Revisa los datos del formulario. / Check the form values.";
      }
    },
    reset() {
      persist(createDemoState(brand));
    },
  };
}
