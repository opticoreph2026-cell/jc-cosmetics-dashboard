"use client";

import { useSearch, SearchBar } from "../_components/search-filter";
import Link from "next/link";

type Supplier = { id: string; name: string; contactPerson: string; productCount: number };

export function SuppliersClient({ suppliers }: { suppliers: Supplier[] }) {
  const { query, setQuery, filtered } = useSearch(suppliers, ["name", "contactPerson"]);

  return (
    <div className="space-y-4">
      <SearchBar value={query} onChange={setQuery} placeholder="Search suppliers..." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <Link key={s.id} href={`/suppliers/${s.id}`}
            className="rounded-sm border border-jc-blush bg-white p-5 hover:border-jc-rose-gold transition-colors">
            <h2 className="font-medium text-jc-anchor">{s.name}</h2>
            {s.contactPerson && <p className="mt-1 text-xs text-jc-anchor/60">{s.contactPerson}</p>}
            <p className="mt-2 text-xs text-jc-anchor/50">{s.productCount} product(s) linked</p>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-sm border border-jc-blush bg-white p-6 text-center text-sm text-jc-anchor/50">
            No suppliers found.
          </div>
        )}
      </div>
    </div>
  );
}
