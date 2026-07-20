"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * SearchProvider owns the storefront's catalog query. Search is the primary
 * gesture in a grocery store, and the query is entered in two different places
 * depending on the horizon (the mobile SearchBar or the desktop TopNav) while
 * being consumed by a third (CatalogBrowser). This context is what lets those
 * three live in different branches of the tree without prop drilling through
 * the server components between them.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const value = useMemo(() => ({ query, setQuery }), [query]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

/** Reads the shared catalog query. Throws outside a {@link SearchProvider}. */
export function useSearch(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider.");
  }
  return context;
}

/** Normalizes text so "brocoli" matches "Brócoli" (accent- and case-insensitive). */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
