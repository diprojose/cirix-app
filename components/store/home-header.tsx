import Link from "next/link";
import type { ViewerDto } from "@/modules/iam/application/dtos/viewer-dto";
import { BellIcon } from "./icons";

/**
 * HomeHeader is the mobile app header: an avatar, a tier-aware greeting and a
 * notifications bell. Guests get a prompt to sign in; signed-in viewers are
 * greeted by the local part of their email. It is presentational and receives
 * the resolved {@link ViewerDto} from the server.
 */
export function HomeHeader({ viewer }: { viewer: ViewerDto }) {
  const displayName = viewer.email ? viewer.email.split("@")[0] : null;

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-pill bg-accent-soft text-xl"
          aria-hidden="true"
        >
          🧁
        </div>
        <div className="flex flex-col leading-tight">
          {viewer.authenticated ? (
            <>
              <span className="text-xs text-text-muted">Hola de nuevo</span>
              <span className="text-sm font-semibold capitalize text-text">{displayName}</span>
            </>
          ) : (
            <>
              <span className="text-xs text-text-muted">Bienvenido a mixmag</span>
              <Link href="/login" className="text-sm font-semibold text-accent">
                Inicia sesión
              </Link>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label="Notificaciones"
        className="relative grid h-11 w-11 place-items-center rounded-pill bg-surface text-ink shadow-xs"
      >
        <BellIcon className="h-5 w-5" />
        <span
          className="absolute right-2.5 top-2.5 h-2 w-2 rounded-pill bg-accent"
          aria-hidden="true"
        />
      </button>
    </header>
  );
}
