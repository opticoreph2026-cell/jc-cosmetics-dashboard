"use client";

import { useSearch, SearchBar } from "../_components/search-filter";
import Link from "next/link";
import { Table, THead, TBody, TR, TH, TD, Empty } from "../_components/table";

type Customer = { id: string; name: string; phone: string; email: string; totalLifetimeSpend: number; createdAt: string };

export function CustomersClient({ customers }: { customers: Customer[] }) {
  const { query, setQuery, filtered } = useSearch(customers, ["name", "phone", "email"]);

  return (
    <div className="space-y-4">
      <SearchBar value={query} onChange={setQuery} placeholder="Search customers..." />
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH hiddenOn="sm">Phone</TH>
            <TH hiddenOn="md">Email</TH>
            <TH align="right">Lifetime Spend</TH>
            <TH hiddenOn="md">Since</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.map((c) => (
            <TR key={c.id}>
              <TD className="text-jc-rose-gold truncate max-w-[180px]">
                <Link href={`/customers/${c.id}`} className="hover:underline">{c.name}</Link>
              </TD>
              <TD hiddenOn="sm" className="font-mono text-xs">{c.phone || "\u2014"}</TD>
              <TD hiddenOn="md">{c.email || "\u2014"}</TD>
              <TD align="right">₱{c.totalLifetimeSpend.toFixed(2)}</TD>
              <TD hiddenOn="md">
                {new Date(c.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              </TD>
            </TR>
          ))}
          {filtered.length === 0 && <Empty colSpan={5}>No customers found.</Empty>}
        </TBody>
      </Table>
    </div>
  );
}
