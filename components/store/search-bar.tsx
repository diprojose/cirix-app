import { SearchIcon, SlidersIcon } from "./icons";

/**
 * SearchBar is the mobile search pill with a trailing filter button. It is
 * presentational for now (no search logic yet) — an uncontrolled input plus a
 * filter affordance — so it needs no client runtime.
 */
export function SearchBar({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <div className="flex h-12 flex-1 items-center gap-2 rounded-pill bg-surface px-4 shadow-xs transition-shadow focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-bg">
        <SearchIcon className="h-5 w-5 shrink-0 text-sugar-400" />
        <input
          type="search"
          placeholder="Busca en la tienda"
          aria-label="Buscar productos"
          className="w-full bg-transparent text-sm text-text placeholder:text-sugar-400 focus:outline-none"
        />
      </div>
      <button
        type="button"
        aria-label="Filtros"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-pill bg-ink text-on-accent transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <SlidersIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
