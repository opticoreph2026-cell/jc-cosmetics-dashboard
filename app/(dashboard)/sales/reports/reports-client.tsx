"use client";

import { useState, useEffect, lazy, Suspense } from "react";

const PERIODS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "ytd", label: "YTD" },
  { value: "all", label: "All time" },
] as const;

const COLORS = ["#B78B74", "#D2A08C", "#5C4033", "#E5D6CA", "#F0E9E3"];

const DailyChart = lazy(() => import("./daily-chart").then((m) => ({ default: m.DailyChart })));
const ChannelPie = lazy(() => import("./channel-pie").then((m) => ({ default: m.ChannelPie })));
const CategoryChart = lazy(() => import("./category-chart").then((m) => ({ default: m.CategoryChart })));

export function ReportsClient() {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sales/reports?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [period]);

  function downloadCSV() {
    if (!data) return;
    const headers = "Date,Revenue\n";
    const rows = data.daily.map((d: any) => `${d.date},${d.revenue}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <ReportsSkeleton />;
  if (!data) return <div className="text-sm text-red-500">Failed to load</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${
              period === p.value
                ? "bg-jc-rose-gold text-white"
                : "border border-jc-blush text-jc-anchor hover:bg-jc-cream/50"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={downloadCSV}
          className="ml-auto rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor hover:bg-jc-cream/50"
        >
          Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Revenue" value={`₱${Number(data.summary.totalRevenue).toLocaleString()}`} />
        <SummaryCard label="Total Orders" value={String(data.summary.totalOrders)} />
        <SummaryCard label="Avg Order Value" value={`₱${Number(data.summary.avgOrderValue).toLocaleString()}`} />
        <SummaryCard label="Margin" value={`₱${Number(data.summary.totalMargin).toLocaleString()}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-jc-anchor">Daily Revenue</h2>
          <Suspense fallback={<div className="h-[250px] bg-jc-cream/30 animate-pulse rounded-sm" />}>
            <DailyChart data={data.daily} />
          </Suspense>
        </div>

        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <h2 className="mb-4 text-sm font-medium text-jc-anchor">By Channel</h2>
          <Suspense fallback={<div className="h-[250px] bg-jc-cream/30 animate-pulse rounded-sm" />}>
            <ChannelPie data={data.byChannel} colors={COLORS} />
          </Suspense>
        </div>

        <div className="rounded-sm border border-jc-blush bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium text-jc-anchor">By Category</h2>
          <Suspense fallback={<div className="h-[250px] bg-jc-cream/30 animate-pulse rounded-sm" />}>
            <CategoryChart data={data.byCategory} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-2">
        {[1,2,3,4,5].map((i) => <div key={i} className="h-9 w-20 rounded-sm bg-jc-cream/50" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-20 rounded-sm bg-jc-cream/50" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[300px] rounded-sm bg-jc-cream/50" />
        <div className="h-[300px] rounded-sm bg-jc-cream/50" />
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-jc-blush bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-jc-anchor/60">{label}</p>
      <p className="mt-1 font-display text-xl text-jc-anchor">{value}</p>
    </div>
  );
}
