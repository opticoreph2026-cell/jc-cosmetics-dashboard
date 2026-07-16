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
            <TH>Phone</TH>
            <TH>Email</TH>
            <TH align="right">Lifetime Spend</TH>
            <TH>Since</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.map((c) => (
            <TR key={c.id}>
              <TD className="text-jc-rose-gold truncate max-w-[180px]">
                <Link href={`/customers/${c.id}`} className="hover:underline">{c.name}</Link>
              </TD>
              <TD className="font-mono text-xs">{c.phone || "\u2014"}</TD>
              <TD>{c.email || "\u2014"}</TD>
              <TD align="right">₱{c.totalLifetimeSpend.toFixed(2)}</TD>
              <TD>
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
