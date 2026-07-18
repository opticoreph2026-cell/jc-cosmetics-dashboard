"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CategoryData {
  name: string;
  cost: number;
  retail: number;
  units: number;
}

interface ValuationData {
  totalCost: number;
  totalRetail: number;
  potentialProfit: number;
  itemCount: number;
  totalUnits: number;
  byCategory: CategoryData[];
}

export default function ValuationPage() {
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory/valuation")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-40 animate-pulse rounded-sm bg-jc-cream/50" />;
  if (!data) return <div className="text-sm text-red-500">Failed to load</div>;

  const margin = data.totalCost > 0 ? ((data.potentialProfit / data.totalCost) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-jc-rose-gold hover:underline">&larr; Inventory</Link>
        <h1 className="font-display text-2xl text-jc-anchor mt-1">Inventory Valuation</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Cost Value</p>
          <p className="mt-1 font-display text-2xl text-jc-anchor">₱{data.totalCost.toLocaleString()}</p>
        </div>
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Retail Value</p>
          <p className="mt-1 font-display text-2xl text-jc-anchor">₱{data.totalRetail.toLocaleString()}</p>
        </div>
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Potential Profit</p>
          <p className="mt-1 font-display text-2xl text-green-700">₱{data.potentialProfit.toLocaleString()}</p>
        </div>
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Margin on Cost</p>
          <p className="mt-1 font-display text-2xl text-jc-anchor">{margin}%</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Total SKUs</p>
          <p className="mt-1 font-display text-2xl text-jc-anchor">{data.itemCount}</p>
        </div>
        <div className="rounded-sm border border-jc-blush bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-jc-anchor/60">Total Units</p>
          <p className="mt-1 font-display text-2xl text-jc-anchor">{data.totalUnits}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-sm border border-jc-blush">
        <table className="w-full text-sm">
          <thead className="bg-jc-cream/50 text-left text-xs uppercase tracking-wider text-jc-anchor/70">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Units</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Retail</th>
              <th className="px-4 py-3 text-right">Profit</th>
              <th className="px-4 py-3 text-right">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-jc-blush">
            {data.byCategory.map((cat) => {
              const profit = cat.retail - cat.cost;
              const catMargin = cat.cost > 0 ? ((profit / cat.cost) * 100).toFixed(1) : "0.0";
              return (
                <tr key={cat.name} className="hover:bg-jc-cream/20">
                  <td className="px-4 py-3 font-medium text-jc-anchor">{cat.name}</td>
                  <td className="px-4 py-3 text-right text-jc-anchor">{cat.units}</td>
                  <td className="px-4 py-3 text-right text-jc-anchor">₱{cat.cost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-jc-anchor">₱{cat.retail.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">₱{profit.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-jc-anchor/70">{catMargin}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
