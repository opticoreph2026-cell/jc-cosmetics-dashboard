"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Edit3, Target } from "lucide-react";

const CHANNELS = ["WEB", "FACEBOOK_POST", "FACEBOOK_MARKETPLACE", "PHYSICAL"] as const;
const channelLabels: Record<string, string> = { WEB: "Web", FACEBOOK_POST: "Facebook Post", FACEBOOK_MARKETPLACE: "FB Marketplace", PHYSICAL: "Physical" };
const channelColors: Record<string, string> = { WEB: "bg-blue-100 text-blue-800", FACEBOOK_POST: "bg-purple-100 text-purple-800", FACEBOOK_MARKETPLACE: "bg-indigo-100 text-indigo-800", PHYSICAL: "bg-green-100 text-green-800" };

interface ChannelRow {
  channel: string;
  target: number;
  actual: number;
  orders: number;
  achievement: number | null;
}

export default function SalesTargetsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<{ channels: ChannelRow[]; totals: { target: number; actual: number; orders: number }; year: number; month: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sales/targets?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => { if (d && Array.isArray(d.channels)) setData(d); })
      .finally(() => setLoading(false));
  }, [year, month]);

  async function saveTarget(channel: string) {
    const target = parseFloat(editValue);
    if (isNaN(target) || target < 0) return;
    try {
      const res = await fetch("/api/sales/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, channel, target }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Target saved");
      setEditing(null);
      const r = await fetch(`/api/sales/targets?year=${year}&month=${month}`).then((r) => r.json());
      if (r && Array.isArray(r.channels)) setData(r);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i).toLocaleString("en", { month: "long" }) }));
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  if (loading) return <div className="h-40 animate-pulse rounded-sm bg-jc-cream/50" />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/sales" className="text-sm text-jc-rose-gold hover:underline">&larr; Sales</Link>
        <h1 className="font-display text-2xl text-jc-anchor mt-1">Sales Targets</h1>
      </div>

      <div className="flex items-center gap-3">
        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
          className="rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor">
          {months.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
        </select>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
          className="rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor">
          {years.map((y) => (<option key={y} value={y}>{y}</option>))}
        </select>
      </div>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-sm border border-jc-blush bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Target</p>
              <p className="mt-1 font-display text-2xl text-jc-anchor">₱{data.totals.target.toLocaleString()}</p>
            </div>
            <div className="rounded-sm border border-jc-blush bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Actual</p>
              <p className="mt-1 font-display text-2xl text-jc-anchor">₱{data.totals.actual.toLocaleString()}</p>
            </div>
            <div className="rounded-sm border border-jc-blush bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Achievement</p>
              <p className="mt-1 font-display text-2xl text-jc-anchor">
                {data.totals.target > 0 ? `${Math.round((data.totals.actual / data.totals.target) * 100)}%` : "—"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-sm border border-jc-blush">
            <table className="w-full text-sm">
              <thead className="bg-jc-cream/50 text-left text-xs uppercase tracking-wider text-jc-anchor/70">
                <tr>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3 text-right">Target</th>
                  <th className="px-4 py-3 text-right">Actual</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Achievement</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jc-blush">
                {data.channels.map((ch) => (
                  <tr key={ch.channel} className="hover:bg-jc-cream/20">
                    <td className="px-4 py-3">
                      <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${channelColors[ch.channel] || "bg-gray-100"}`}>
                        {channelLabels[ch.channel] || ch.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editing === ch.channel ? (
                        <div className="flex items-center justify-end gap-1">
                          <input type="number" min="0" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                            className="w-28 rounded-sm border border-jc-blush px-2 py-1 text-xs text-right" autoFocus />
                          <button onClick={() => saveTarget(ch.channel)} className="text-xs text-green-600 hover:underline">Save</button>
                          <button onClick={() => setEditing(null)} className="text-xs text-jc-anchor/40 hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <span className="text-jc-anchor">{ch.target > 0 ? `₱${ch.target.toLocaleString()}` : <span className="text-jc-anchor/30">—</span>}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-jc-anchor font-medium">₱{ch.actual.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-jc-anchor/70">{ch.orders}</td>
                    <td className="px-4 py-3 text-right">
                      {ch.achievement !== null ? (
                        <span className={`font-medium ${ch.achievement >= 100 ? "text-green-600" : ch.achievement >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {ch.achievement}%
                        </span>
                      ) : (
                        <span className="text-jc-anchor/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditing(ch.channel); setEditValue(String(ch.target || "")); }}
                        className="text-jc-anchor/40 hover:text-jc-rose-gold">
                        <Edit3 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
