"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function DashboardClient() {
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="text-sm text-jc-anchor/50">Loading...</div>;

  const periodKey = period as keyof typeof data;
  const periodRevenue = Number(data[periodKey].revenue);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-sm border border-jc-blush bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Revenue</p>
            <div className="flex gap-1">
              {(["today", "week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-sm px-2 py-0.5 text-xs transition-colors ${
                    period === p
                      ? "bg-jc-rose-gold text-white"
                      : "text-jc-anchor/60 hover:text-jc-anchor"
                  }`}
                >
                  {p === "today" ? "Today" : p === "week" ? "Week" : "Month"}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 font-display text-3xl text-jc-anchor">₱{periodRevenue.toLocaleString()}</p>
          {period === "today" && (
            <p className="text-xs text-jc-anchor/50">{data.today.orders} order{data.today.orders !== 1 ? "s" : ""}</p>
          )}
        </div>

        <StatCard label="Low Stock" value={String(data.lowStock.length)} href="/inventory/restock" />
        <StatCard label="Orders Today" value={String(data.today.orders)} />
      </div>

      {data.byChannel.length > 0 && (
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <p className="mb-3 text-xs uppercase tracking-wider text-jc-anchor/60">Today by Channel</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data.byChannel}>
              <XAxis dataKey="channel" tick={{ fontSize: 10, fill: "#5C4033" }} />
              <YAxis tick={{ fontSize: 10, fill: "#5C4033" }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#B78B74" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {data.lowStock.length > 0 && (
          <div className="rounded-sm border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-medium text-amber-800">Reorder Needed</p>
            <div className="space-y-1.5">
              {data.lowStock.slice(0, 5).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between text-xs text-amber-700">
                  <span>{v.product} — {v.variant}</span>
                  <span className="font-medium">{v.stock} / {v.reorderAt}</span>
                </div>
              ))}
            </div>
            {data.lowStock.length > 5 && (
              <Link href="/inventory/restock" className="mt-2 block text-xs text-amber-700 underline">
                +{data.lowStock.length - 5} more
              </Link>
            )}
            <Link
              href="/inventory/restock"
              className="mt-3 inline-block rounded-sm bg-amber-600 px-3 py-1.5 text-xs text-white hover:bg-amber-700"
            >
              Restock now
            </Link>
          </div>
        )}

        <div className="rounded-sm border border-jc-blush bg-white p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-jc-anchor/60">Recent Orders</p>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-jc-anchor/50">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {data.recentOrders.map((o: any) => (
                <Link
                  key={o.id}
                  href={`/sales/${o.id}`}
                  className="flex items-center justify-between rounded-sm px-2 py-1.5 hover:bg-jc-cream/30 transition-colors"
                >
                  <div>
                    <span className="text-xs font-mono text-jc-rose-gold">{o.orderNumber}</span>
                    <span className="ml-2 text-xs text-jc-anchor/50">{o.customer?.name || "Walk-in"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-sm bg-jc-cream px-1.5 py-0.5 text-xs text-jc-anchor/70">{o.channel}</span>
                    <span className="text-xs font-medium text-jc-anchor">₱{Number(o.total).toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickAction href="/quick-log" label="Quick Log" />
        <QuickAction href="/inventory/new" label="Add Product" />
        <QuickAction href="/inventory/restock" label="Restock" />
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div className="rounded-sm border border-jc-blush bg-white p-5">
      <p className="text-xs uppercase tracking-wider text-jc-anchor/60">{label}</p>
      <p className="mt-1 font-display text-2xl text-jc-anchor">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-[56px] items-center justify-center rounded-sm border border-jc-blush bg-white px-4 text-sm font-medium text-jc-rose-gold hover:bg-jc-cream/50 transition-colors"
    >
      {label}
    </Link>
  );
}
