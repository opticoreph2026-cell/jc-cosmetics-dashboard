"use client";

import { useState, useEffect, lazy, Suspense } from "react";

const PERIODS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "ytd", label: "YTD" },
  { value: "custom", label: "Custom" },
] as const;

const CHANNELS = ["", "WEB", "FACEBOOK_POST", "FACEBOOK_MARKETPLACE", "PHYSICAL"] as const;
const channelLabels: Record<string, string> = { "": "All Channels", WEB: "Web", FACEBOOK_POST: "Facebook Post", FACEBOOK_MARKETPLACE: "Facebook Marketplace", PHYSICAL: "Physical" };

const COLORS = ["#B78B74", "#D2A08C", "#5C4033", "#E5D6CA", "#F0E9E3"];

const DailyChart = lazy(() => import("./daily-chart").then((m) => ({ default: m.DailyChart })));
const ChannelPie = lazy(() => import("./channel-pie").then((m) => ({ default: m.ChannelPie })));
const CategoryChart = lazy(() => import("./category-chart").then((m) => ({ default: m.CategoryChart })));

export function ReportsClient() {
  const [period, setPeriod] = useState("30d");
  const [channel, setChannel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  function buildUrl() {
    const params = new URLSearchParams();
    if (period === "custom" && from && to) {
      params.set("from", from);
      params.set("to", to);
    } else {
      params.set("period", period);
    }
    if (channel) params.set("channel", channel);
    return `/api/sales/reports?${params}`;
  }

  useEffect(() => {
    setLoading(true);
    fetch(buildUrl())
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [period, channel, from, to]);

  function downloadCSV() {
    if (!data?.daily) return;
    const headers = "Date,Revenue,Orders\n";
    const rows = data.daily.map((d: any) => `${d.date},${d.revenue},${d.orders || ""}`).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${period}-${channel || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <ReportsSkeleton />;
  if (!data) return <div className="text-sm text-red-500">Failed to load</div>;

  const s = data.summary;

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
        <select value={channel} onChange={(e) => setChannel(e.target.value)}
          className="ml-2 rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor">
          {CHANNELS.map((c) => (<option key={c} value={c}>{channelLabels[c]}</option>))}
        </select>
        <button onClick={downloadCSV}
          className="ml-auto rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor hover:bg-jc-cream/50">
          Export CSV
        </button>
      </div>

      {period === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor" />
          <span className="text-xs text-jc-anchor/60">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-sm border border-jc-blush px-3 py-1.5 text-sm text-jc-anchor" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Revenue" value={`₱${Number(s.totalRevenue).toLocaleString()}`} />
        <SummaryCard label="Orders" value={String(s.totalOrders)} />
        <SummaryCard label="AOV" value={`₱${Number(s.avgOrderValue).toLocaleString()}`} />
        <SummaryCard label="COGS" value={`₱${Number(s.totalCost).toLocaleString()}`} />
        <SummaryCard label="Gross Profit" value={`₱${Number(s.totalMargin).toLocaleString()}`} />
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
      <div className="flex gap-2">{[1,2,3,4,5,6].map((i) => <div key={i} className="h-9 w-20 rounded-sm bg-jc-cream/50" />)}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[1,2,3,4,5].map((i) => <div key={i} className="h-20 rounded-sm bg-jc-cream/50" />)}</div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[300px] rounded-sm bg-jc-cream/50" /><div className="h-[300px] rounded-sm bg-jc-cream/50" />
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
