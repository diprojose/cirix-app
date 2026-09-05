"use client";

import { useSearch } from "./search-provider";
import { CloseIcon, SearchIcon } from "./icons";

/**
 * SearchBar is the catalog's live filter. It writes to the shared search
 * context, so typing narrows the grid instantly with no server round-trip (the
 * whole produce catalog is already on the client). `variant` picks the chrome:
 * the mobile pill sits under the app header, the desktop one sits inline in the
 * TopNav.
 */
export function SearchBar({
  className,
  variant = "mobile",
}: {
  className?: string;
  variant?: "mobile" | "desktop";
}) {
  const { query, setQuery } = useSearch();

  const shell =
    variant === "mobile"
      ? "h-12 rounded-2xl border border-border bg-surface px-4 shadow-xs"
      : "h-11 rounded-xl border border-border bg-bg px-4";

  return (
    <div
      className={`flex items-center gap-2 ${shell} transition-shadow focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-bg ${className ?? ""}`}
    >
      <SearchIcon className="h-5 w-5 shrink-0 text-text-muted" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="¿Qué estás buscando?"
        aria-label="Buscar productos"
        className="w-full bg-transparent text-body text-text placeholder:text-text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {query.length > 0 && (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Borrar búsqueda"
          className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-pill text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
