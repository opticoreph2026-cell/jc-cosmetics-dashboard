import { computeAnalysis, type AnalysisData } from "@/lib/analysis";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package,
  AlertTriangle, Lightbulb, ShoppingCart, Target,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PricingAnalysisPage() {
  let data: AnalysisData | null = null;
  let error = "";
  try {
    data = await computeAnalysis();
  } catch (e) {
    error = String(e);
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <h1 className="font-display text-xl mb-2">Analysis Error</h1>
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  if (!data) return <div className="p-6 text-jc-anchor">No data available.</div>;

  const { summary, salesTrend, profitScenarios, productAnalysis, priceChangeImpact, categorySummary, velocitySummary, recommendations } = data;

  const allMonths = [...salesTrend.history, ...salesTrend.prediction];
  const maxUnits = Math.max(...allMonths.map((m) => m.units), 1);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl text-jc-anchor flex items-center gap-2">
          <BarChart3 className="text-jc-rose-gold" size={28} />
          Pricing & Sales Analysis
        </h1>
        <p className="text-sm text-jc-rose-gold">
          See if your prices are right, how many units to sell to profit, and AI-predicted sales trends.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card icon={<DollarSign size={20} />} label="This Month's Profit" value={`P${summary.netProfit.toFixed(0)}`} sub={`Expenses: P${summary.monthlyFixedCosts.toFixed(0)}/mo`} good={summary.isProfitable} />
        <Card icon={<ShoppingCart size={20} />} label="Units Sold" value={summary.currentMonthlyUnits.toLocaleString()} sub={`Need ${summary.breakEvenUnits.toLocaleString()} to break even`} good={summary.isBreakEvenUnit} />
        <Card icon={<TrendingUp size={20} />} label="Avg Selling Price" value={`P${summary.avgSellingPrice.toFixed(0)}`} sub={`Cost: P${summary.avgUnitCost.toFixed(0)}`} good={summary.avgMargin > 30} />
        <Card icon={<BarChart3 size={20} />} label="Average Margin" value={`${summary.avgMargin.toFixed(1)}%`} sub={`Healthy: 30-60%`} good={summary.avgMargin > 30} />
      </div>

      {/* Trend Chart (Simple CSS bar chart) */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2">
              <BarChart3 size={20} className="text-jc-rose-gold" />
              Sales Trend (Last {salesTrend.history.length} Months + AI Prediction)
            </h2>
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
        <div className="flex items-end gap-1 h-40 mb-2">
          {allMonths.map((m, i) => {
            const isPrediction = i >= salesTrend.history.length;
            const pct = Math.max(3, (m.units / maxUnits) * 100);
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-jc-rose-gold">{m.units}</span>
                <div
                  className={`w-full rounded-sm ${isPrediction ? "bg-amber-300 opacity-70" : "bg-jc-rose-gold"}`}
                  style={{ height: `${pct}%` }}
                  title={`${m.month}: ${m.units} units${isPrediction ? " (predicted)" : ""}`}
                />
                <span className={`text-[9px] ${isPrediction ? "text-amber-500" : "text-jc-rose-gold"}`}>
                  {m.label}{isPrediction ? "?" : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-jc-rose-gold flex gap-4">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-jc-rose-gold" /> Actual</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-amber-300 opacity-70" /> AI Prediction</span>
          <span>{salesTrend.growthRate > 0 ? "+" : ""}{salesTrend.growthRate}% growth</span>
          <span>Confidence: {salesTrend.confidence === "high" ? "High" : salesTrend.confidence === "medium" ? "Medium" : "Low"}</span>
        </div>
      </section>

      {/* Profit Targets */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-1">
          <Target size={20} className="text-jc-rose-gold" />
          How Many Units Must You Sell?
        </h2>
        <p className="text-xs text-jc-rose-gold mb-4">Set a profit target and see exactly how many units you need to sell this month:</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {profitScenarios.map((sc) => (
            <div key={sc.label} className={`rounded-sm border p-4 ${sc.targetProfit === 0 ? "border-jc-rose-gold/30 bg-jc-cream" : sc.isAchievable ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50 opacity-60"}`}>
              <div className="text-xs text-jc-rose-gold mb-1">{sc.label}</div>
              <div className="text-xl font-display text-jc-anchor">
                {sc.unitsNeeded >= 99999 ? "—" : sc.unitsNeeded.toLocaleString()}
                <span className="text-xs font-normal text-jc-rose-gold ml-1">units</span>
              </div>
              <div className="text-xs text-jc-rose-gold mt-1">
                {sc.isAchievable ? `P${sc.neededSales.toLocaleString()} in sales` : "Hard to reach right now"}
              </div>
              {sc.isAchievable && sc.targetProfit > 0 && (
                <div className="mt-2 text-[10px] text-green-700">
                  {sc.unitsNeeded > summary.currentMonthlyUnits ? `${sc.unitsNeeded - summary.currentMonthlyUnits} more units than now` : "Already achievable!"}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Price Change Simulator */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-1">
          <TrendingUp size={20} className="text-jc-rose-gold" />
          What If You Change Prices?
        </h2>
        <p className="text-xs text-jc-rose-gold mb-4">Simulates how raising or lowering the average price affects profit and break-even targets:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-jc-blush text-left text-jc-rose-gold">
                <th className="pb-2 pr-3 font-medium">Change</th>
                <th className="pb-2 pr-3 font-medium">New Price</th>
                <th className="pb-2 pr-3 font-medium">Profit / Unit</th>
                <th className="pb-2 pr-3 font-medium">Units to BE</th>
                <th className="pb-2 pr-3 font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {priceChangeImpact.map((p) => (
                <tr key={p.change} className="border-b border-jc-blush/30 text-jc-anchor">
                  <td className={`py-2 pr-3 font-medium font-mono ${p.change.startsWith("+") ? "text-green-700" : "text-red-700"}`}>{p.change}</td>
                  <td className="py-2 pr-3 font-mono">P{p.newAvgPrice.toFixed(2)}</td>
                  <td className={`py-2 pr-3 font-mono ${p.newMarginPerUnit > 0 ? "text-green-600" : "text-red-600"}`}>P{p.newMarginPerUnit.toFixed(2)}</td>
                  <td className="py-2 pr-3 font-mono">{p.newUnitsToBE}</td>
                  <td className="py-2 pr-3 font-mono">{typeof p.unitsSaved === "number" ? (p.unitsSaved > 0 ? `${p.unitsSaved} fewer` : `${Math.abs(p.unitsSaved)} more`) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-jc-rose-gold">Example: A 10% price increase means fewer units needed to break even — but ensure customers can still afford the new price.</p>
      </section>

      {/* Product Velocity — Fast Movers */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-1">
          <Package size={20} className="text-jc-rose-gold" />
          Fast-Moving vs Slow-Moving Products
        </h2>
        <p className="text-xs text-jc-rose-gold mb-4">
          Products sorted by most sold (last 30 days). Stock up on fast-movers, promote or phase out slow-movers.
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 rounded-sm bg-green-100 px-3 py-2 text-xs">
            <span className="font-bold text-green-800">{velocitySummary.fast}</span>
            <span className="text-green-700">Fast-moving (20+/mo)</span>
          </div>
          <div className="flex items-center gap-2 rounded-sm bg-blue-100 px-3 py-2 text-xs">
            <span className="font-bold text-blue-800">{velocitySummary.medium}</span>
            <span className="text-blue-700">Medium (5-19/mo)</span>
          </div>
          <div className="flex items-center gap-2 rounded-sm bg-yellow-100 px-3 py-2 text-xs">
            <span className="font-bold text-yellow-800">{velocitySummary.slow}</span>
            <span className="text-yellow-700">Slow (1-4/mo)</span>
          </div>
          <div className="flex items-center gap-2 rounded-sm bg-gray-100 px-3 py-2 text-xs">
            <span className="font-bold text-gray-800">{velocitySummary.none}</span>
            <span className="text-gray-700">No sales</span>
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-jc-blush text-left text-jc-rose-gold whitespace-nowrap">
                <th className="pb-2 pr-2 font-medium">Velocity</th>
                <th className="pb-2 pr-2 font-medium">Product</th>
                <th className="pb-2 pr-2 font-medium">Cost</th>
                <th className="pb-2 pr-2 font-medium">Price</th>
                <th className="pb-2 pr-2 font-medium">Margin</th>
                <th className="pb-2 pr-2 font-medium">Sold/Mo</th>
                <th className="pb-2 pr-2 font-medium">Stock</th>
                <th className="pb-2 pr-2 font-medium">Days Left</th>
                <th className="pb-2 pr-2 font-medium">Suggested</th>
                <th className="pb-2 pr-2 font-medium">Market</th>
              </tr>
            </thead>
            <tbody>
              {productAnalysis.slice(0, 50).map((p) => (
                <tr key={p.id} className={`border-b border-jc-blush/30 text-jc-anchor ${p.isBelowBreakEven ? "bg-red-50" : p.isMarginLow ? "bg-yellow-50" : p.currentMargin > 45 ? "bg-green-50" : ""}`}>
                  <td className="py-2 pr-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      p.velocity === "fast" ? "bg-green-100 text-green-700" :
                      p.velocity === "medium" ? "bg-blue-100 text-blue-700" :
                      p.velocity === "slow" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {p.velocity === "fast" ? "Fast" : p.velocity === "medium" ? "Med" : p.velocity === "slow" ? "Slow" : "None"}
                    </span>
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap">
                    <div className="font-medium">{p.productName}</div>
                    <div className="text-[10px] text-jc-rose-gold">{p.category}</div>
                  </td>
                  <td className="py-2 pr-2 font-mono">P{p.unitCost.toFixed(0)}</td>
                  <td className="py-2 pr-2 font-mono">P{p.sellingPrice.toFixed(0)}</td>
                  <td className={`py-2 pr-2 font-mono ${p.currentMargin < 20 ? "text-red-600" : p.currentMargin < 30 ? "text-yellow-600" : "text-green-600"}`}>{p.currentMargin.toFixed(0)}%</td>
                  <td className="py-2 pr-2 font-mono">{p.sales30}</td>
                  <td className="py-2 pr-2 font-mono">{p.currentStock}</td>
                  <td className={`py-2 pr-2 font-mono ${p.daysOfStock < 15 ? "text-red-600 font-medium" : ""}`}>{p.daysOfStock > 90 ? "90+" : p.daysOfStock}d</td>
                  <td className="py-2 pr-2 font-mono">{p.isMarginLow ? <span className="text-amber-600 text-[10px] bg-amber-50 px-1 py-0.5 rounded">P{p.suggestedPrice.toFixed(0)}</span> : "\u2713"}</td>
                  <td className="py-2 pr-2"><span className={`px-1.5 py-0.5 rounded text-[10px] ${p.priceLevel === "competitive" ? "bg-green-100 text-green-700" : p.priceLevel === "high" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{p.priceLevel === "competitive" ? "Good" : p.priceLevel === "high" ? "High" : "Low"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {productAnalysis.length > 50 && <p className="mt-2 text-[10px] text-jc-rose-gold">+ {productAnalysis.length - 50} more products</p>}
      </section>

      {/* Category Breakdown */}
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
                  <div className="h-full bg-jc-rose-gold rounded-sm transition-all" style={{ width: `${Math.min(c.share, 100)}%` }} />
                </div>
                <span className="w-20 text-right font-mono text-jc-anchor">P{c.revenue.toFixed(0)}</span>
                <span className={`w-12 text-right font-mono ${c.margin > 30 ? "text-green-600" : c.margin > 15 ? "text-yellow-600" : "text-red-600"}`}>{c.margin.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-3">
          <Lightbulb size={20} className="text-jc-rose-gold" />
          What You Should Do
        </h2>
        <div className="space-y-3">
          {recommendations.map((r, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-sm p-3 text-sm ${r.type === "danger" ? "bg-red-50" : r.type === "warning" ? "bg-yellow-50" : r.type === "info" ? "bg-green-50" : "bg-jc-cream"}`}>
              <span className="text-jc-anchor leading-relaxed">{r.text}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-jc-cream rounded-sm text-xs text-jc-rose-gold leading-relaxed">
          <strong>Competitive Pricing Guide (Lapu-Lapu & Cebu):</strong><br />
          In the local cosmetics market, a good selling price is <strong>2x-3x your cost</strong>.
          For example: if a product costs P20, sell it for P40-P60. This is competitive with stores
          in the market, mall, and online.
        </div>
      </section>

      {/* Low-margin products */}
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
                <span className="text-jc-anchor">Cost P{p.unitCost.toFixed(0)} &rarr; Now P{p.sellingPrice.toFixed(0)} (margin: {p.currentMargin.toFixed(0)}%)</span>
                <span className="text-amber-700">&rarr; At P{p.suggestedPrice.toFixed(0)} = 45% margin</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Card({ icon, label, value, sub, good }: {
  icon: React.ReactNode; label: string; value: string; sub: string; good: boolean;
}) {
  return (
    <div className={`rounded-sm border p-4 ${good ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-jc-rose-gold">{label}</span>
        <span className={good ? "text-green-600" : "text-red-600"}>{icon}</span>
      </div>
      <div className={`text-xl font-display ${good ? "text-green-700" : "text-red-700"}`}>{value}</div>
      <div className="text-[10px] text-jc-rose-gold mt-0.5">{sub}</div>
    </div>
  );
}
