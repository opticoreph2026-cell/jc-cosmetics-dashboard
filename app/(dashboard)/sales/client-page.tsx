"use client";

import { useSearch, SearchBar } from "../_components/search-filter";
import Link from "next/link";
import { Table, THead, TBody, TR, TH, TD, Empty } from "../_components/table";

type Order = { id: string; orderNumber: string; createdAt: string; channel: string; customerName: string; total: number; paymentMethod: string };

export function SalesClient({ orders }: { orders: Order[] }) {
  const { query, setQuery, filtered } = useSearch(orders, ["orderNumber", "customerName"]);

  return (
    <div className="space-y-4">
      <SearchBar value={query} onChange={setQuery} placeholder="Search order number or customer..." />
      <Table>
        <THead>
          <TR>
            <TH>Order</TH>
            <TH>Date</TH>
            <TH>Channel</TH>
            <TH>Customer</TH>
            <TH align="right">Total</TH>
            <TH>Payment</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.map((order) => (
            <TR key={order.id}>
              <TD className="text-jc-rose-gold">
                <Link href={`/sales/${order.id}`} className="hover:underline font-mono text-xs">{order.orderNumber}</Link>
              </TD>
              <TD className="whitespace-nowrap">
                {new Date(order.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              </TD>
              <TD>
                <span className="rounded-sm bg-jc-cream px-2 py-1 text-xs text-jc-anchor">{order.channel}</span>
              </TD>
              <TD>{order.customerName || "\u2014"}</TD>
              <TD align="right">₱{order.total.toFixed(2)}</TD>
              <TD className="text-xs">{order.paymentMethod}</TD>
            </TR>
          ))}
          {filtered.length === 0 && <Empty colSpan={6}>No sales found.</Empty>}
        </TBody>
      </Table>
    </div>
  );
}
