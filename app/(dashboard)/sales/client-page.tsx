"use client";

import { useSearch, SearchBar } from "../_components/search-filter";
import Link from "next/link";

type Order = { id: string; orderNumber: string; createdAt: string; channel: string; customerName: string; total: number; paymentMethod: string };

export function SalesClient({ orders }: { orders: Order[] }) {
  const { query, setQuery, filtered } = useSearch(orders, ["orderNumber", "customerName"]);

  return (
    <div className="space-y-4">
      <SearchBar value={query} onChange={setQuery} placeholder="Search order number or customer..." />
      <div className="overflow-x-auto rounded-sm border border-jc-blush bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-jc-blush bg-jc-cream/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Order</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Date</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Channel</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Customer</th>
              <th className="px-4 py-3 text-right font-medium text-jc-anchor">Total</th>
              <th className="px-4 py-3 text-left font-medium text-jc-anchor">Payment</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id} className="border-b border-jc-blush/50 last:border-0 hover:bg-jc-cream/20">
                <td className="px-4 py-3">
                  <Link href={`/sales/${order.id}`} className="text-jc-rose-gold hover:underline font-mono text-xs">{order.orderNumber}</Link>
                </td>
                <td className="px-4 py-3 text-jc-anchor/70 whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-sm bg-jc-cream px-2 py-1 text-xs text-jc-anchor">{order.channel}</span>
                </td>
                <td className="px-4 py-3 text-jc-anchor/70">{order.customerName || "\u2014"}</td>
                <td className="px-4 py-3 text-right text-jc-anchor font-medium">₱{order.total.toFixed(2)}</td>
                <td className="px-4 py-3 text-jc-anchor/70 text-xs">{order.paymentMethod}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-jc-anchor/50">No sales found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
