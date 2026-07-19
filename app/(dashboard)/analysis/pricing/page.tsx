"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, BarChart3 } from "lucide-react";

type AnalysisData = {
  summary: {
    monthlyFixedCosts: number;
    avgUnitCost: number;
    avgSellingPrice: number;
    avgMargin: number;
    currentMonthlyUnits: number;
    currentMonthlyRevenue: number;
    currentMonthlyProfit: number;
    breakEvenUnits: number;
    currentStatus: string;
  };
  breakEvenScenarios: {
    label: string;
    units: number;
    requiredAvgPrice: number;
    requiredRevenue: number;
    requiredMargin: number;
  }[];
  productAnalysis: {
    id: string;
    name: string;
    sku: string;
    productName: string;
    category: string;
    unitCost: number;
    sellingPrice: number;
    currentMargin: number;
    currentStock: number;
    sales30: number;
    annualDemand: number;
    daysOfStock: number;
    eoq: number;
    suggestedPrice: number;
    suggestedPriceForBE: number;
    isBelowSuggested: boolean;
    isBelowBreakEven: boolean;
  }[];
  priceChangeImpact: {
    change: string;
    newAvgPrice: number;
    newMarginPerUnit: number;
    newUnitsToBE: number | "—";
    unitsChange: number | "—";
    extraRevenuePerUnit: number;
  }[];
};

export default function PricingAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analysis/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-jc-anchor">Loading analysis...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!data) return null;

  const { summary, breakEvenScenarios, productAnalysis, priceChangeImpact } = data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="text-jc-rose-gold" size={28} />
        <div>
          <h1 className="font-display text-2xl text-jc-anchor">Pricing Analysis</h1>
          <p className="text-sm text-jc-rose-gold">
            AI-powered pricing suggestions, margin analysis, and stock optimization
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard title="Monthly Expenses" value={`₱${summary.monthlyFixedCosts.toLocaleString()}`} icon={<DollarSign size={20} />} />
        <SummaryCard title="Avg Selling Price" value={`₱${summary.avgSellingPrice.toFixed(2)}`} sub={`Cost: ₱${summary.avgUnitCost.toFixed(2)}`} icon={<TrendingUp size={20} />} />
        <SummaryCard title="Avg Margin" value={`${summary.avgMargin.toFixed(1)}%`} sub={summary.currentStatus === "profitable" ? "Profitable" : "Not profitable"} icon={<BarChart3 size={20} />} status={summary.currentStatus === "profitable" ? "good" : "bad"} />
        <SummaryCard title="Break-even Units" value={`${summary.breakEvenUnits}/mo`} sub={`Current: ${summary.currentMonthlyUnits}/mo`} icon={<Package size={20} />} status={summary.currentMonthlyUnits >= summary.breakEvenUnits ? "good" : "bad"} />
      </div>

      {/* Break-even Scenarios */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="mb-3 font-display text-lg text-jc-anchor">Break-even Scenarios</h2>
        <p className="mb-4 text-xs text-jc-rose-gold">
          At different sales volumes, here is the required average selling price to break even (cover costs + expenses):
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-jc-blush text-left text-jc-rose-gold">
                <th className="pb-2 pr-4 font-medium">Scenario</th>
                <th className="pb-2 pr-4 font-medium">Units / Month</th>
                <th className="pb-2 pr-4 font-medium">Required Avg Price</th>
                <th className="pb-2 pr-4 font-medium">Required Revenue</th>
                <th className="pb-2 pr-4 font-medium">Required Margin</th>
              </tr>
            </thead>
            <tbody>
              {breakEvenScenarios.map((s) => (
                <tr key={s.label} className="border-b border-jc-blush/30 text-jc-anchor">
                  <td className="py-2 pr-4 font-medium">{s.label}</td>
                  <td className="py-2 pr-4">{s.units.toLocaleString()}</td>
                  <td className="py-2 pr-4 font-mono">₱{s.requiredAvgPrice.toFixed(2)}</td>
                  <td className="py-2 pr-4 font-mono">₱{s.requiredRevenue.toLocaleString()}</td>
                  <td className="py-2 pr-4 font-mono">{s.requiredMargin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Product Analysis Table */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="mb-1 font-display text-lg text-jc-anchor">Product-by-Product Analysis</h2>
        <p className="mb-4 text-xs text-jc-rose-gold">
          Products below suggested price or break-even price are highlighted. EOQ = optimal order quantity.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-jc-blush text-left text-jc-rose-gold whitespace-nowrap">
                <th className="pb-2 pr-3 font-medium">Product</th>
                <th className="pb-2 pr-3 font-medium">Cost</th>
                <th className="pb-2 pr-3 font-medium">Price</th>
                <th className="pb-2 pr-3 font-medium">Margin</th>
                <th className="pb-2 pr-3 font-medium">Sales 30d</th>
                <th className="pb-2 pr-3 font-medium">Stock</th>
                <th className="pb-2 pr-3 font-medium">Days Left</th>
                <th className="pb-2 pr-3 font-medium">Sugg. Price</th>
                <th className="pb-2 pr-3 font-medium">BE Price</th>
                <th className="pb-2 pr-3 font-medium">EOQ</th>
              </tr>
            </thead>
            <tbody>
              {productAnalysis.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-jc-blush/30 text-jc-anchor ${
                    p.isBelowBreakEven ? "bg-red-50" : p.isBelowSuggested ? "bg-yellow-50" : ""
                  }`}
                >
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <div className="font-medium">{p.productName}</div>
                    <div className="text-[10px] text-jc-rose-gold">{p.name} · {p.sku}</div>
                  </td>
                  <td className="py-2 pr-3 font-mono">₱{p.unitCost.toFixed(2)}</td>
                  <td className="py-2 pr-3 font-mono">₱{p.sellingPrice.toFixed(2)}</td>
                  <td className={`py-2 pr-3 font-mono ${p.currentMargin < 20 ? "text-red-600" : p.currentMargin < 40 ? "text-yellow-600" : "text-green-600"}`}>
                    {p.currentMargin.toFixed(1)}%
                  </td>
                  <td className="py-2 pr-3 font-mono">{p.sales30}</td>
                  <td className="py-2 pr-3 font-mono">{p.currentStock}</td>
                  <td className={`py-2 pr-3 font-mono ${p.daysOfStock < 15 ? "text-red-600 font-medium" : ""}`}>
                    {p.daysOfStock > 90 ? "90+" : p.daysOfStock}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    <span className={p.isBelowSuggested ? "text-amber-600 font-medium" : ""}>
                      ₱{p.suggestedPrice.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    <span className={p.isBelowBreakEven ? "text-red-600 font-medium" : ""}>
                      {p.suggestedPriceForBE > 0 ? `₱${p.suggestedPriceForBE.toFixed(2)}` : "—"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono">{p.eoq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex gap-4 text-[10px] text-jc-rose-gold">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-50 border border-red-200" /> Below break-even price</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-yellow-50 border border-yellow-200" /> Below suggested 40% margin</span>
        </div>
      </section>

      {/* Price Change Impact */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="mb-1 font-display text-lg text-jc-anchor">Price Change Impact Simulation</h2>
        <p className="mb-4 text-xs text-jc-rose-gold">
          How changing the average selling price by X% affects break-even units needed and per-unit profit:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-jc-blush text-left text-jc-rose-gold">
                <th className="pb-2 pr-4 font-medium">Change</th>
                <th className="pb-2 pr-4 font-medium">New Avg Price</th>
                <th className="pb-2 pr-4 font-medium">Margin / Unit</th>
                <th className="pb-2 pr-4 font-medium">Units to BE</th>
                <th className="pb-2 pr-4 font-medium">vs Current BE</th>
              </tr>
            </thead>
            <tbody>
              {priceChangeImpact.map((p) => (
                <tr key={p.change} className="border-b border-jc-blush/30 text-jc-anchor">
                  <td className="py-2 pr-4 font-mono font-medium">{p.change}</td>
                  <td className="py-2 pr-4 font-mono">₱{p.newAvgPrice.toFixed(2)}</td>
                  <td className={`py-2 pr-4 font-mono ${p.newMarginPerUnit > 0 ? "text-green-600" : "text-red-600"}`}>
                    ₱{p.newMarginPerUnit.toFixed(2)}
                  </td>
                  <td className="py-2 pr-4 font-mono">{p.newUnitsToBE}</td>
                  <td className={`py-2 pr-4 font-mono ${typeof p.unitsChange === "number" && p.unitsChange < 0 ? "text-green-600" : typeof p.unitsChange === "number" ? "text-red-600" : ""}`}>
                    {typeof p.unitsChange === "number" ? (p.unitsChange > 0 ? `+${p.unitsChange}` : p.unitsChange) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Actionable Recommendations */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="mb-3 font-display text-lg text-jc-anchor">Recommendations</h2>
        <div className="space-y-3 text-xs text-jc-anchor">
          {generateRecommendations(summary, productAnalysis)}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, value, sub, icon, status }: { title: string; value: string; sub?: string; icon: React.ReactNode; status?: "good" | "bad" }) {
  return (
    <div className="rounded-sm border border-jc-blush bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-jc-rose-gold">{title}</span>
        <span className={status === "good" ? "text-green-600" : status === "bad" ? "text-red-600" : "text-jc-rose-gold"}>{icon}</span>
      </div>
      <div className={`mt-1 text-xl font-display ${status === "good" ? "text-green-700" : status === "bad" ? "text-red-700" : "text-jc-anchor"}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-jc-rose-gold">{sub}</div>}
    </div>
  );
}

function generateRecommendations(summary: AnalysisData["summary"], products: AnalysisData["productAnalysis"]) {
  const recs: { icon: React.ReactNode; text: string; type: "info" | "warning" | "danger" }[] = [];

  // Overall status
  if (summary.currentStatus !== "profitable") {
    recs.push({
      type: "danger",
      icon: <AlertTriangle size={14} />,
      text: `Not yet profitable this month. You need ${summary.breakEvenUnits} units/month at current avg price of ₱${summary.avgSellingPrice.toFixed(2)} to break even. Consider raising prices on low-margin items or reducing expenses.`,
    });
  } else {
    recs.push({
      type: "info",
      icon: <TrendingUp size={14} />,
      text: `Profitable this month! You are selling ${summary.currentMonthlyUnits} units vs break-even of ${summary.breakEvenUnits}. Keep monitoring margins.`,
    });
  }

  // Products below break-even price
  const belowBE = products.filter((p) => p.isBelowBreakEven);
  if (belowBE.length > 0) {
    recs.push({
      type: "danger",
      icon: <AlertTriangle size={14} />,
      text: `${belowBE.length} product(s) are priced below their break-even price: ${belowBE.map((p) => p.productName).join(", ")}. Increase price or reduce unit cost.`,
    });
  }

  // Low margin products
  const lowMargin = products.filter((p) => p.currentMargin < 20);
  if (lowMargin.length > 0) {
    recs.push({
      type: "warning",
      icon: <TrendingDown size={14} />,
      text: `${lowMargin.length} product(s) have margins below 20%: ${lowMargin.slice(0, 5).map((p) => `${p.productName} (${p.currentMargin.toFixed(0)}%)`).join(", ")}. For every ₱1 price increase on these, nearly all of it goes to profit.`,
    });
  }

  // Stock optimization
  const lowStock = products.filter((p) => p.daysOfStock < 15 && p.sales30 > 0);
  if (lowStock.length > 0) {
    recs.push({
      type: "warning",
      icon: <Package size={14} />,
      text: `${lowStock.length} product(s) have less than 15 days of stock: ${lowStock.map((p) => `${p.productName} (${p.daysOfStock}d left)`).join(", ")}. Use EOQ (${lowStock[0]?.eoq || "—"} units) as a guide for reorder quantity.`,
    });
  }

  // Price change suggestion
  if (summary.avgMargin < 30) {
    recs.push({
      type: "info",
      icon: <DollarSign size={14} />,
      text: `Your current avg margin is ${summary.avgMargin.toFixed(1)}%. A 5% price increase would raise margin to ₱${(summary.avgSellingPrice * 1.05 - summary.avgUnitCost).toFixed(2)}/unit and reduce break-even units to ${Math.ceil(summary.monthlyFixedCosts / (summary.avgSellingPrice * 1.05 - summary.avgUnitCost))}.`,
    });
  }

  return recs.map((r, i) => (
    <div
      key={i}
      className={`flex items-start gap-2 rounded-sm p-3 ${
        r.type === "danger" ? "bg-red-50" : r.type === "warning" ? "bg-yellow-50" : "bg-jc-cream"
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${r.type === "danger" ? "text-red-600" : r.type === "warning" ? "text-yellow-600" : "text-jc-rose-gold"}`}>
        {r.icon}
      </span>
      <span>{r.text}</span>
    </div>
  ));
}
