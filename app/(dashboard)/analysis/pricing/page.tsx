"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package,
  AlertTriangle, Lightbulb, ShoppingCart, Target, LineChart,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type ProductRow = {
  id: string; name: string; sku: string; productName: string; category: string;
  unitCost: number; sellingPrice: number; currentMargin: number;
  currentStock: number; sales30: number; daysOfStock: number;
  eoq: number; suggestedPrice: number; breakEvenPrice: number;
  isBelowBreakEven: boolean; isMarginLow: boolean;
  competitiveMin: number; competitiveMax: number;
  isCompetitivelyPriced: boolean; priceLevel: string;
};

type ApiData = {
  summary: {
    monthlyFixedCosts: number; avgUnitCost: number; avgSellingPrice: number;
    avgMargin: number; marginPerUnit: number;
    currentMonthlyUnits: number; currentMonthlyRevenue: number;
    grossProfit: number; netProfit: number;
    breakEvenUnits: number; isProfitable: boolean; isBreakEvenUnit: boolean;
  };
  salesTrend: {
    history: { month: string; units: number; revenue: number; label: string }[];
    prediction: { month: string; label: string; units: number; revenue: number }[];
    trendDirection: string; growthRate: number; confidence: string; r2: number;
  };
  profitScenarios: { label: string; targetProfit: number; unitsNeeded: number; neededSales: number; isAchievable: boolean }[];
  productAnalysis: ProductRow[];
  lowMarginCount: number;
  belowBreakEvenCount: number;
  priceChangeImpact: { change: string; changeLabel: string; newAvgPrice: number; newMarginPerUnit: number; newUnitsToBE: number | string; unitsSaved: number | string }[];
  categorySummary: { name: string; products: number; units: number; revenue: number; cost: number; margin: number; share: number }[];
  recommendations: { icon: string; text: string; type: string }[];
};

export default function PricingAnalysisPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analysis/pricing")
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-jc-anchor">Calculating your pricing analysis...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!data) return null;

  const { summary, salesTrend, profitScenarios, productAnalysis, priceChangeImpact, categorySummary, recommendations } = data;

  const chartData = useMemo(() => {
    const h = salesTrend.history.map((m) => ({ month: m.label, actual: m.units, predicted: null }));
    const p = salesTrend.prediction.map((m) => ({ month: m.label, actual: null, predicted: m.units }));
    return [...h, ...p];
  }, [salesTrend]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl">
      {/* HEADER */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl text-jc-anchor flex items-center gap-2">
          <BarChart3 className="text-jc-rose-gold" size={28} />
          AI Pricing & Sales Analysis
        </h1>
        <p className="text-sm text-jc-rose-gold leading-relaxed">
          See if your prices are right, how many units you need to sell to profit, and what the AI predicts for future sales.
        </p>
      </div>

      {/* HEALTH CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HealthCard
          icon={<DollarSign size={20} />}
          label="This Month's Profit"
          value={`₱${summary.netProfit.toFixed(0)}`}
          sub={`Expenses: ₱${summary.monthlyFixedCosts.toFixed(0)}/mo`}
          good={summary.isProfitable}
        />
        <HealthCard
          icon={<ShoppingCart size={20} />}
          label="Units Sold"
          value={summary.currentMonthlyUnits.toLocaleString()}
          sub={`Need ${summary.breakEvenUnits.toLocaleString()} to break even`}
          good={summary.isBreakEvenUnit}
        />
        <HealthCard
          icon={<TrendingUp size={20} />}
          label="Avg Selling Price"
          value={`₱${summary.avgSellingPrice.toFixed(0)}`}
          sub={`Cost: ₱${summary.avgUnitCost.toFixed(0)} · Profit: ₱${summary.marginPerUnit.toFixed(0)}/unit`}
          good={summary.avgMargin > 30}
        />
        <HealthCard
          icon={<BarChart3 size={20} />}
          label="Average Margin"
          value={`${summary.avgMargin.toFixed(1)}%`}
          sub={`Healthy range: 30-60% for cosmetics`}
          good={summary.avgMargin > 30}
        />
      </div>

      {/* AI PREDICTOR */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2">
              <LineChart size={20} className="text-jc-rose-gold" />
              AI Sales Predictor
            </h2>
            <p className="text-xs text-jc-rose-gold mt-1">
              Based on the last {salesTrend.history.length} months of data, the AI predicts your upcoming sales.
            </p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            salesTrend.trendDirection === "up" ? "bg-green-100 text-green-700" :
            salesTrend.trendDirection === "down" ? "bg-red-100 text-red-700" :
            "bg-yellow-100 text-yellow-700"
          }`}>
            {salesTrend.trendDirection === "up" ? "Trending Up" :
             salesTrend.trendDirection === "down" ? "Trending Down" : "Stable"}
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="actual" name="Actual Sales" fill="#b8957a" radius={[2, 2, 0, 0]} />
              <Bar dataKey="predicted" name="AI Prediction" fill="#d4a574" radius={[2, 2, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 text-xs text-jc-rose-gold flex flex-wrap gap-x-6 gap-y-1">
          <span>{salesTrend.growthRate > 0 ? "+" : ""}{salesTrend.growthRate}% growth from start</span>
          <span>Confidence: {salesTrend.confidence === "high" ? "High" : salesTrend.confidence === "medium" ? "Medium" : "Low"}</span>
          {salesTrend.prediction.length > 0 && (
            <span>Predicted for {salesTrend.prediction[0].label}: {salesTrend.prediction[0].units} units</span>
          )}
        </div>
      </section>

      {/* PROFIT TARGETS */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-1">
          <Target size={20} className="text-jc-rose-gold" />
          How Many Units Must You Sell?
        </h2>
        <p className="text-xs text-jc-rose-gold mb-4">
          Set a profit target and see exactly how many units you need to sell this month to hit it:
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {profitScenarios.map((sc) => (
            <div
              key={sc.label}
              className={`rounded-sm border p-4 ${
                sc.targetProfit === 0
                  ? "border-jc-rose-gold/30 bg-jc-cream"
                  : sc.isAchievable
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              <div className="text-xs text-jc-rose-gold mb-1">{sc.label}</div>
              <div className="text-xl font-display text-jc-anchor">
                {sc.unitsNeeded >= 99999 ? "—" : sc.unitsNeeded.toLocaleString()}
                <span className="text-xs font-normal text-jc-rose-gold ml-1">units</span>
              </div>
              <div className="text-xs text-jc-rose-gold mt-1">
                {sc.isAchievable
                  ? `₱${sc.neededSales.toLocaleString()} in sales`
                  : "Hard to reach right now"}
              </div>
              {sc.isAchievable && sc.targetProfit > 0 && (
                <div className="mt-2 text-[10px] text-green-700">
                  {sc.unitsNeeded > summary.currentMonthlyUnits
                    ? `${sc.unitsNeeded - summary.currentMonthlyUnits} more units than now`
                    : "You can already achieve this!"}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* PRICE CHANGE SIMULATOR */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-1">
          <TrendingUp size={20} className="text-jc-rose-gold" />
          What If You Change Prices?
        </h2>
        <p className="text-xs text-jc-rose-gold mb-4">
          Simulates how raising or lowering your average price affects profit per unit and break-even targets:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-jc-blush text-left text-jc-rose-gold">
                <th className="pb-2 pr-3 font-medium">Change</th>
                <th className="pb-2 pr-3 font-medium">New Price</th>
                <th className="pb-2 pr-3 font-medium">Profit / Unit</th>
                <th className="pb-2 pr-3 font-medium">Units to Break Even</th>
                <th className="pb-2 pr-3 font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {priceChangeImpact.map((p) => (
                <tr key={p.change} className="border-b border-jc-blush/30 text-jc-anchor">
                  <td className={`py-2 pr-3 font-medium font-mono ${p.change.startsWith("+") ? "text-green-700" : "text-red-700"}`}>
                    {p.change}
                  </td>
                  <td className="py-2 pr-3 font-mono">₱{p.newAvgPrice.toFixed(2)}</td>
                  <td className={`py-2 pr-3 font-mono ${p.newMarginPerUnit > 0 ? "text-green-600" : "text-red-600"}`}>
                    ₱{p.newMarginPerUnit.toFixed(2)}
                  </td>
                  <td className="py-2 pr-3 font-mono">{p.newUnitsToBE}</td>
                  <td className="py-2 pr-3 font-mono">
                    {typeof p.unitsSaved === "number"
                      ? p.unitsSaved > 0
                        ? `${p.unitsSaved} fewer needed`
                        : `${Math.abs(p.unitsSaved)} more needed`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-jc-rose-gold">
          Example: A 10% price increase means you need fewer units to break even — but make sure customers can still afford the new price.
        </p>
      </section>

      {/* PRODUCT ANALYSIS */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-1">
          <Package size={20} className="text-jc-rose-gold" />
          Each Product — Price, Margin & Stock
        </h2>
        <p className="text-xs text-jc-rose-gold mb-4">
          <span className="text-red-600">Red</span> = below break-even or very low margin &middot;
          <span className="text-yellow-600">Yellow</span> = low margin &middot;
          Green = healthy margin
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-jc-blush text-left text-jc-rose-gold whitespace-nowrap">
                <th className="pb-2 pr-2 font-medium">Product</th>
                <th className="pb-2 pr-2 font-medium">Cost</th>
                <th className="pb-2 pr-2 font-medium">Price</th>
                <th className="pb-2 pr-2 font-medium">Margin %</th>
                <th className="pb-2 pr-2 font-medium">Sold/Mo</th>
                <th className="pb-2 pr-2 font-medium">Stock</th>
                <th className="pb-2 pr-2 font-medium">Days Left</th>
                <th className="pb-2 pr-2 font-medium">Suggested</th>
                <th className="pb-2 pr-2 font-medium">Market</th>
              </tr>
            </thead>
            <tbody>
              {productAnalysis.slice(0, 30).map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-jc-blush/30 text-jc-anchor ${
                    p.isBelowBreakEven ? "bg-red-50" : p.isMarginLow ? "bg-yellow-50" : p.currentMargin > 45 ? "bg-green-50" : ""
                  }`}
                >
                  <td className="py-2 pr-2 whitespace-nowrap">
                    <div className="font-medium">{p.productName}</div>
                    <div className="text-[10px] text-jc-rose-gold">{p.category}</div>
                  </td>
                  <td className="py-2 pr-2 font-mono">₱{p.unitCost.toFixed(0)}</td>
                  <td className="py-2 pr-2 font-mono">₱{p.sellingPrice.toFixed(0)}</td>
                  <td className={`py-2 pr-2 font-mono ${p.currentMargin < 20 ? "text-red-600" : p.currentMargin < 30 ? "text-yellow-600" : "text-green-600"}`}>
                    {p.currentMargin.toFixed(0)}%
                  </td>
                  <td className="py-2 pr-2 font-mono">{p.sales30}</td>
                  <td className="py-2 pr-2 font-mono">{p.currentStock}</td>
                  <td className={`py-2 pr-2 font-mono ${p.daysOfStock < 15 ? "text-red-600 font-medium" : ""}`}>
                    {p.daysOfStock > 90 ? "90+" : p.daysOfStock}d
                  </td>
                  <td className="py-2 pr-2 font-mono">
                    {p.isMarginLow ? <span className="text-amber-600 text-[10px] bg-amber-50 px-1 py-0.5 rounded">₱{p.suggestedPrice.toFixed(0)}</span> : "✓"}
                  </td>
                  <td className="py-2 pr-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      p.priceLevel === "competitive" ? "bg-green-100 text-green-700" :
                      p.priceLevel === "high" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {p.priceLevel === "competitive" ? "Good" : p.priceLevel === "high" ? "High" : "Low"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {productAnalysis.length > 30 && (
          <p className="mt-2 text-[10px] text-jc-rose-gold">+ {productAnalysis.length - 30} more products</p>
        )}
      </section>

      {/* CATEGORY BREAKDOWN */}
      {categorySummary.length > 0 && (
        <section className="rounded-sm border border-jc-blush bg-white p-5">
          <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-3">
            <BarChart3 size={20} className="text-jc-rose-gold" />
            Which Category Sells Best?
          </h2>
          <div className="space-y-2">
            {categorySummary.map((c) => (
              <div key={c.name} className="flex items-center gap-3 text-xs">
                <span className="w-28 shrink-0 font-medium text-jc-anchor truncate">{c.name}</span>
                <div className="flex-1 h-5 bg-jc-cream rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-jc-rose-gold rounded-sm transition-all"
                    style={{ width: `${Math.min(c.share, 100)}%` }}
                    title={`${c.share}% of revenue`}
                  />
                </div>
                <span className="w-20 text-right font-mono text-jc-anchor">₱{c.revenue.toFixed(0)}</span>
                <span className={`w-12 text-right font-mono ${c.margin > 30 ? "text-green-600" : c.margin > 15 ? "text-yellow-600" : "text-red-600"}`}>
                  {c.margin.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RECOMMENDATIONS */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-3">
          <Lightbulb size={20} className="text-jc-rose-gold" />
          What You Should Do — Recommendations
        </h2>
        <div className="space-y-3">
          {recommendations.map((r, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-sm p-3 text-sm ${
                r.type === "danger" ? "bg-red-50" :
                r.type === "warning" ? "bg-yellow-50" :
                r.type === "info" ? "bg-green-50" :
                "bg-jc-cream"
              }`}
            >
              <span className="text-base shrink-0 mt-0.5">{r.icon}</span>
              <span className="text-jc-anchor leading-relaxed">{r.text}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-jc-cream rounded-sm text-xs text-jc-rose-gold leading-relaxed">
          <strong>Competitive Pricing Guide for Lapu-Lapu & Cebu:</strong><br />
          In the local cosmetics market, a good selling price is <strong>2x-3x your cost</strong>.
          For example: if a product costs ₱20, sell it for ₱40-₱60. This is competitive with stores
          in the market, mall, and online. Going above 3x cost may make it harder to sell since
          customers have many alternatives.
        </div>
      </section>

      {/* PRODUCTS THAT NEED PRICE ADJUSTMENT */}
      {productAnalysis.filter((p) => p.isMarginLow).length > 0 && (
        <section className="rounded-sm border border-jc-blush bg-white p-5">
          <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-3">
            <AlertTriangle size={20} className="text-jc-rose-gold" />
            Products That Could Use a Price Increase
          </h2>
          <div className="space-y-2">
            {productAnalysis.filter((p) => p.isMarginLow).slice(0, 10).map((p) => (
              <div key={p.id} className="flex flex-wrap items-start gap-2 rounded-sm bg-yellow-50 p-3 text-xs">
                <span className="font-medium text-jc-anchor w-36 shrink-0">{p.productName}</span>
                <span className="text-jc-anchor">
                  Cost ₱{p.unitCost.toFixed(0)} &rarr; Now ₱{p.sellingPrice.toFixed(0)} (margin: {p.currentMargin.toFixed(0)}%)
                </span>
                <span className="text-amber-700">
                  &rarr; At ₱{p.suggestedPrice.toFixed(0)} = 45% margin
                </span>
              </div>
            ))}
          </div>
          {productAnalysis.filter((p) => p.isMarginLow).length > 10 && (
            <p className="mt-2 text-[10px] text-jc-rose-gold">+ {productAnalysis.filter((p) => p.isMarginLow).length - 10} more</p>
          )}
        </section>
      )}
    </div>
  );
}

function HealthCard({ icon, label, value, sub, good }: {
  icon: React.ReactNode; label: string; value: string; sub: string; good: boolean;
}) {
  return (
    <div className={`rounded-sm border p-4 ${good ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-jc-rose-gold">{label}</span>
        <span className={good ? "text-green-600" : "text-red-600"}>{icon}</span>
      </div>
      <div className={`text-xl font-display ${good ? "text-green-700" : "text-red-700"}`}>
        {value}
      </div>
      <div className="text-[10px] text-jc-rose-gold mt-0.5">{sub}</div>
    </div>
  );
}
