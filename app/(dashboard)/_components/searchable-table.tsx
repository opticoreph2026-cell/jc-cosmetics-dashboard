"use client";

import { useSearch, SearchBar } from "./search-filter";
import { ReactNode } from "react";

export function SearchableTable<T extends { id: string }>({
  items,
  searchKeys,
  placeholder,
  children,
}: {
  items: T[];
  searchKeys: (keyof T)[];
  placeholder?: string;
  children: (item: T) => ReactNode;
}) {
  const { query, setQuery, filtered } = useSearch(items, searchKeys);

  return (
    <div className="space-y-3">
      <SearchBar value={query} onChange={setQuery} placeholder={placeholder} />
      {filtered.length === 0 ? (
        <div className="rounded-sm border border-jc-blush bg-white p-6 text-center text-sm text-jc-anchor/50">
          No results found.
        </div>
      ) : (
        <div className="divide-y divide-jc-blush/50 rounded-sm border border-jc-blush bg-white">
          {filtered.map((item) => children(item))}
        </div>
      )}
    </div>
  );
}
