import Link from "next/link";
import type { ViewerDto } from "@/modules/iam/application/dtos/viewer-dto";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SearchIcon } from "./icons";

/**
 * TopNav is the desktop/web navigation bar (hidden below `md`, where the mobile
 * app chrome takes over). It follows the conventional web pattern: brand,
 * search, primary links and an account area — the sign-in CTA for guests, or the
 * email plus sign-out for authenticated viewers.
 */
export function TopNav({ viewer }: { viewer: ViewerDto }) {
  return (
    <header className="hidden border-b border-border bg-surface md:block">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-8 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight text-text">
          mixmag
        </Link>

        <div className="flex h-11 max-w-md flex-1 items-center gap-2 rounded-pill bg-bg px-4">
          <SearchIcon className="h-5 w-5 shrink-0 text-sugar-400" />
          <input
            type="search"
            placeholder="Busca en la tienda"
            aria-label="Buscar productos"
            className="w-full bg-transparent text-sm text-text placeholder:text-sugar-400 focus:outline-none"
          />
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium text-text">
          <Link href="/" className="hover:text-accent">
            Inicio
          </Link>
          <Link href="/menu" className="hover:text-accent">
            Menú
          </Link>
          <Link href="/premium" className="hover:text-accent">
            Premium
          </Link>
        </nav>

        {viewer.authenticated ? (
          <div className="flex items-center gap-3">
            <span className="max-w-[12rem] truncate text-sm text-text-muted">{viewer.email}</span>
            <SignOutButton className="min-h-[40px] rounded-pill border border-border px-4 text-sm font-medium text-text hover:bg-sugar-100" />
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-pill bg-accent-fill px-5 py-2 text-sm font-medium text-on-accent shadow-accent hover:bg-brand-800"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  );
}
