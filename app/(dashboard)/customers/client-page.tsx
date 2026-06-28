"use client";

import { useSearch, SearchBar } from "../_components/search-filter";
import Link from "next/link";

type Customer = { id: string; name: string; phone: string; email: string; totalLifetimeSpend: number; createdAt: string };

export function CustomersClient({ customers }: { customers: Customer[] }) {
  const { query, setQuery, filtered } = useSearch(customers, ["name", "phone", "email"]);

  return (
    <div className="space-y-4">
      <SearchBar value={query} onChange={setQuery} placeholder="Search customers..." />
      <div className="overflow-x-auto rounded-sm border border-jc-blush bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-jc-blush bg-jc-cream/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Name</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Email</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Lifetime Spend</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Since</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-jc-blush/50 last:border-0 hover:bg-jc-cream/20">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="text-jc-rose-gold hover:underline">{c.name}</Link>
                </td>
                <td className="px-4 py-3 text-jc-anchor/70 font-mono text-xs">{c.phone || "\u2014"}</td>
                <td className="px-4 py-3 text-jc-anchor/70">{c.email || "\u2014"}</td>
                <td className="px-4 py-3 text-right text-jc-anchor font-medium">₱{c.totalLifetimeSpend.toFixed(2)}</td>
                <td className="px-4 py-3 text-jc-anchor/70">
                  {new Date(c.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-jc-anchor/50">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
