"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import Link from "next/link";

const MiniBarChart = lazy(() => import("./mini-bar-chart").then((m) => ({ default: m.MiniBarChart })));
const DailyTrendChart = lazy(() => import("./daily-trend-chart").then((m) => ({ default: m.DailyTrendChart })));

export function DashboardClient() {
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  function fetchData() {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") fetchData(); });
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", fetchData); };
  }, []);

  if (!data) return <LoadingSkeleton />;

  const p = (data[period] ?? { revenue: 0, profit: 0, trueProfit: 0, expenseTotal: 0, orders: 0, units: 0 });
  const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : "0.0";
  const trueMargin = p.revenue > 0 ? ((p.trueProfit / p.revenue) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-1">
        {(["today", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-sm px-3 py-1 text-sm transition-colors ${
              period === p
                ? "bg-jc-rose-gold text-white"
                : "border border-jc-blush text-jc-anchor hover:bg-jc-cream/50"
            }`}
          >
            {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-sm border border-jc-blush bg-white p-5 lg:col-span-2">
          <p className="text-xs uppercase tracking-wider text-jc-anchor/60">{period === "today" ? "Today" : period === "week" ? "This Week" : "This Month"}</p>
          <p className="mt-1 font-display text-3xl text-jc-anchor">₱{p.revenue.toLocaleString()}</p>
          <p className="text-xs text-jc-anchor/60">
            ₱{p.profit.toLocaleString()} gross profit · {p.orders} order{p.orders !== 1 ? "s" : ""} · {p.units} unit{p.units !== 1 ? "s" : ""} sold
          </p>
        </div>

        <ProfitBreakdown grossProfit={p.profit} expenses={p.expenseTotal} trueProfit={p.trueProfit} />
        <HealthScoreCard score={data.healthScore ?? 0} breakdown={data.healthBreakdown ?? { profitScore: 0, marginScore: 0, growthScore: 0, coverageScore: 0 }} />
        <StatCard label="Units Sold" value={String(p.units)} />
        <StatCard label="Gross Margin" value={`${margin}%`} />
        <StatCard label="Net Margin" value={`${trueMargin}%`} />
      </div>

      {data.daily && data.daily.length > 0 && (
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <p className="mb-3 text-xs uppercase tracking-wider text-jc-anchor/60">Daily Trend</p>
          <Suspense fallback={<div className="h-[250px] bg-jc-cream/30 animate-pulse rounded-sm" />}>
            <DailyTrendChart data={data.daily} />
          </Suspense>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <p className="mb-3 text-xs uppercase tracking-wider text-jc-anchor/60">Today by Channel</p>
          {data.byChannel.length === 0 ? (
            <p className="text-sm text-jc-anchor/50">No sales today</p>
          ) : (
            <Suspense fallback={<div className="h-[120px] bg-jc-cream/30 animate-pulse rounded-sm" />}>
              <MiniBarChart data={data.byChannel} />
            </Suspense>
          )}
        </div>

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

        <div className="space-y-4">
          <div className="rounded-sm border border-jc-blush bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-jc-anchor/60">A/R Outstanding</p>
            <p className="mt-1 font-display text-xl text-jc-anchor">₱{data.arOutstanding.toLocaleString()}</p>
            <Link href="/ar" className="text-xs text-jc-rose-gold hover:underline">View AR</Link>
          </div>
          <div className="rounded-sm border border-jc-blush bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-jc-anchor/60">A/P Outstanding</p>
            <p className="mt-1 font-display text-xl text-jc-anchor">₱{data.apOutstanding.toLocaleString()}</p>
            <Link href="/ap" className="text-xs text-jc-rose-gold hover:underline">View AP</Link>
          </div>
        </div>
      </div>

      {data.targetProgress && data.targetProgress.length > 0 && (
        <div className="rounded-sm border border-jc-blush bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Monthly Target</p>
            <Link href="/sales/targets" className="text-xs text-jc-rose-gold hover:underline">Details</Link>
          </div>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-xs text-jc-anchor/60">₱{data.totalActual.toLocaleString()} / ₱{data.totalTarget.toLocaleString()}</span>
            <span className={`text-xs font-medium ${data.totalTarget > 0 && (data.totalActual / data.totalTarget) >= 1 ? "text-green-600" : "text-jc-anchor/70"}`}>
              {data.totalTarget > 0 ? `${Math.round((data.totalActual / data.totalTarget) * 100)}%` : "—"}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-jc-cream">
            <div className="h-2 rounded-full bg-jc-rose-gold transition-all" style={{ width: `${Math.min(100, data.totalTarget > 0 ? (data.totalActual / data.totalTarget) * 100 : 0)}%` }} />
          </div>
        </div>
      )}

      {data.breakeven && data.breakeven.monthlyFixedCosts > 0 && (
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Break-Even Analysis</p>
            <Link href="/expenses" className="text-xs text-jc-rose-gold hover:underline">Based on Expenses</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-jc-anchor/50">Monthly Fixed</p>
              <p className="font-display text-lg text-jc-anchor">₱{data.breakeven.monthlyFixedCosts.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-jc-anchor/50">Avg Margin / Unit</p>
              <p className="font-display text-lg text-green-700">₱{data.breakeven.avgMarginPerUnit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-jc-anchor/50">Units to Break Even</p>
              <p className="font-display text-lg text-jc-anchor">{data.breakeven.breakEvenUnitsPerMonth.toLocaleString()} / mo</p>
            </div>
            <div>
              <p className="text-xs text-jc-anchor/50">Daily Target</p>
              <p className="font-display text-lg text-jc-rose-gold">{data.breakeven.breakEvenUnitsPerDay} units (₱{(data.breakeven.breakEvenRevenuePerMonth / 30).toLocaleString()})</p>
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-jc-anchor/60">
            <span>{data.breakeven.breakEvenUnitsPerWeek} units / week</span>
            <span>{data.breakeven.breakEvenUnitsPerMonth} units / month</span>
            <span>₱{data.breakeven.breakEvenRevenuePerMonth.toLocaleString()} / month revenue</span>
          </div>
        </div>
      )}

      {data.lowStock.length > 0 && (
        <div className="rounded-sm border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-amber-800">Low Stock ({data.lowStock.length})</p>
            <Link href="/inventory/reorder" className="text-xs text-amber-700 underline">Reorder suggestions</Link>
          </div>
          <div className="space-y-1.5">
            {data.lowStock.slice(0, 5).map((v: any) => (
              <div key={v.id} className="flex items-center justify-between text-xs text-amber-700">
                <span>{v.product} — {v.variant}</span>
                <span className="font-medium">{v.stock} / {v.reorderAt}</span>
              </div>
            ))}
            {data.lowStock.length > 5 && (
              <Link href="/inventory/reorder" className="block text-xs text-amber-700 underline mt-1">
                +{data.lowStock.length - 5} more
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction href="/quick-log" label="Quick Log" />
        <QuickAction href="/expenses" label="Expenses" />
        <QuickAction href="/stock-audit" label="Stock Audit" />
        <QuickAction href="/inventory/reorder" label="Reorder" />
      </div>
    </div>
  );
}

function ProfitBreakdown({ grossProfit, expenses, trueProfit }: { grossProfit: number; expenses: number; trueProfit: number }) {
  return (
    <div className="rounded-sm border border-jc-blush bg-white p-5">
      <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Net Profit</p>
      <p className="mt-1 font-display text-2xl text-jc-anchor">₱{trueProfit.toLocaleString()}</p>
      <div className="mt-1 space-y-0.5 text-xs text-jc-anchor/60">
        <p>₱{grossProfit.toLocaleString()} gross</p>
        <p className="text-red-500">− ₱{expenses.toLocaleString()} OPEX</p>
        <p className="font-medium text-jc-anchor">= ₱{trueProfit.toLocaleString()} net</p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-jc-blush bg-white p-5">
      <p className="text-xs uppercase tracking-wider text-jc-anchor/60">{label}</p>
      <p className="mt-1 font-display text-2xl text-jc-anchor">{value}</p>
    </div>
  );
}

function HealthScoreCard({ score, breakdown }: { score: number; breakdown: { profitScore: number; marginScore: number; growthScore: number; coverageScore: number } }) {
  const color = score >= 70 ? "text-green-700 border-green-300 bg-green-50" : score >= 40 ? "text-amber-700 border-amber-300 bg-amber-50" : "text-red-700 border-red-300 bg-red-50";
  return (
    <div className={`rounded-sm border p-5 ${color}`}>
      <p className="text-xs uppercase tracking-wider">Business Health</p>
      <p className="mt-1 font-display text-3xl">{score}/100</p>
      <div className="mt-1 flex gap-2 text-[10px]">
        <span>Profit {breakdown.profitScore}</span>
        <span>Margin {breakdown.marginScore}</span>
        <span>Growth {breakdown.growthScore}</span>
        <span>Coverage {breakdown.coverageScore}</span>
      </div>
    </div>
  );
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

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-end gap-1">
        <div className="h-8 w-20 rounded-sm bg-jc-cream/50" />
        <div className="h-8 w-24 rounded-sm bg-jc-cream/50" />
        <div className="h-8 w-24 rounded-sm bg-jc-cream/50" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 rounded-sm bg-jc-cream/50 lg:col-span-2" />
        <div className="h-24 rounded-sm bg-jc-cream/50" />
        <div className="h-24 rounded-sm bg-jc-cream/50" />
      </div>
      <div className="h-[250px] rounded-sm bg-jc-cream/50" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-40 rounded-sm bg-jc-cream/50" />
        <div className="h-40 rounded-sm bg-jc-cream/50" />
        <div className="h-40 rounded-sm bg-jc-cream/50" />
      </div>
    </div>
  );
}
