import { predictReorder, analyzeAllProducts, generatePromo } from "@/lib/product-intelligence";
import { Brain, Package, TrendingUp, DollarSign, AlertTriangle, Lightbulb, ShoppingCart, Target, RefreshCw, Sparkles, ArrowUp, ArrowDown, Minus, Link2, FileWarning } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  const [reorderData, insights, promos] = await Promise.all([
    predictReorder().catch(() => []),
    analyzeAllProducts().catch(() => []),
    generatePromo().catch(() => []),
  ]);

  const urgentReorder = reorderData.filter((r) => r.urgency === "immediate" || r.urgency === "this_week");
  const criticalPricing = insights.filter((i) => i.priceRecommendation.action === "critical");
  const priceIncrease = insights.filter((i) => i.priceRecommendation.action === "increase");
  const phaseOut = insights.filter((i) => i.phaseOutRisk.isAtRisk);
  const bundleOpps = insights.filter((i) => i.bundleRecommendation?.hasOpportunity);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl text-jc-anchor flex items-center gap-2">
          <Brain className="text-jc-rose-gold" size={28} />
          Business Intelligence Hub
        </h1>
        <p className="text-sm text-jc-rose-gold">
          AI-powered insights for ordering, pricing, promotions, and product decisions.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InsightCard
          icon={<RefreshCw size={20} />}
          label="Urgent Reorders"
          value={String(urgentReorder.length)}
          sub={urgentReorder.length > 0 ? `${urgentReorder[0]?.productName} needs ordering now` : "All stocked up"}
          good={urgentReorder.length === 0}
        />
        <InsightCard
          icon={<DollarSign size={20} />}
          label="Fix Pricing"
          value={String(criticalPricing.length + priceIncrease.length)}
          sub={`${criticalPricing.length} critical, ${priceIncrease.length} need increase`}
          good={criticalPricing.length === 0 && priceIncrease.length === 0}
        />
        <InsightCard
          icon={<FileWarning size={20} />}
          label="Phase-Out Risk"
          value={String(phaseOut.length)}
          sub={phaseOut.length > 0 ? `${phaseOut.filter(p => p.phaseOutRisk.riskLevel === "high").length} high risk` : "No risk detected"}
          good={phaseOut.length === 0}
        />
        <InsightCard
          icon={<Sparkles size={20} />}
          label="Promo Needed"
          value={String(promos.length)}
          sub={promos.length > 0 ? "Generate ads to boost sales" : "Sales on track"}
          good={promos.length === 0}
        />
      </div>

      {/* AI Promo Section */}
      {promos.length > 0 && (
        <section className="rounded-sm border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-amber-800 flex items-center gap-2">
              <Sparkles size={20} />
              AI Advertising Suggestions ({promos.length})
            </h2>
            <Link
              href="/analysis/intelligence/promo"
              className="text-xs font-medium text-amber-700 underline hover:text-amber-900"
            >
              View All & Generate
            </Link>
          </div>
          <div className="grid gap-2">
            {promos.slice(0, 3).map((p, i) => (
              <div key={i} className="rounded-sm bg-white p-3 border border-amber-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-jc-anchor">{p.productName} — {p.variantName}</span>
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{p.suggestedDiscount}% off</span>
                </div>
                <p className="text-sm text-jc-anchor leading-relaxed">{p.headline}</p>
                <p className="text-xs text-jc-anchor/60 mt-1">{p.body.substring(0, 100)}...</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Urgent Reorders */}
      {urgentReorder.length > 0 && (
        <section className="rounded-sm border border-red-200 bg-white p-5">
          <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-3">
            <RefreshCw size={20} className="text-red-500" />
            Urgent Reorder Suggestions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-jc-blush text-left text-jc-rose-gold">
                  <th className="pb-2 pr-2 font-medium">Product</th>
                  <th className="pb-2 pr-2 font-medium">Stock</th>
                  <th className="pb-2 pr-2 font-medium">Daily Rate</th>
                  <th className="pb-2 pr-2 font-medium">Trend</th>
                  <th className="pb-2 pr-2 font-medium">Predicted</th>
                  <th className="pb-2 pr-2 font-medium">Order Qty</th>
                  <th className="pb-2 pr-2 font-medium">Order By</th>
                  <th className="pb-2 pr-2 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {urgentReorder.map((r) => (
                  <tr key={r.variantId} className="border-b border-jc-blush/30 text-jc-anchor">
                    <td className="py-2 pr-2 whitespace-nowrap">
                      <div className="font-medium">{r.productName}</div>
                      <div className="text-[10px] text-jc-rose-gold">{r.variantName}</div>
                    </td>
                    <td className={`py-2 pr-2 font-mono ${r.currentStock === 0 ? "text-red-600 font-bold" : ""}`}>{r.currentStock}</td>
                    <td className="py-2 pr-2 font-mono">{r.dailySalesRate}</td>
                    <td className="py-2 pr-2">
                      <span className={`flex items-center gap-0.5 ${r.dailySalesTrend > 0 ? "text-green-600" : r.dailySalesTrend < 0 ? "text-red-600" : "text-jc-anchor/60"}`}>
                        {r.dailySalesTrend > 0 ? <ArrowUp size={12} /> : r.dailySalesTrend < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                        {Math.abs(r.dailySalesTrend)}%
                      </span>
                    </td>
                    <td className="py-2 pr-2 font-mono">{r.predictedDailyNext30}/day</td>
                    <td className="py-2 pr-2 font-mono font-medium">{r.suggestedOrderQty}</td>
                    <td className={`py-2 pr-2 font-mono ${r.urgency === "immediate" ? "text-red-600 font-medium" : ""}`}>{r.suggestedOrderDate}</td>
                    <td className="py-2 pr-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.confidence === "high" ? "bg-green-100 text-green-700" : r.confidence === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-jc-rose-gold bg-jc-cream rounded-sm p-3">
            <strong>AI Note:</strong> Seasonality factor applied. {reorderData.filter(r => r.seasonalFactor > 1.1).length} products show increasing seasonal demand.
            <Link href="/inventory/reorder" className="ml-2 underline">Go to Reorder &rarr;</Link>
          </div>
        </section>
      )}

      {/* Full Reorder List */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-3">
          <Package size={20} className="text-jc-rose-gold" />
          Complete Reorder Forecast ({reorderData.length} products)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-jc-blush text-left text-jc-rose-gold">
                <th className="pb-2 pr-2 font-medium">Urgency</th>
                <th className="pb-2 pr-2 font-medium">Product</th>
                <th className="pb-2 pr-2 font-medium">Stock</th>
                <th className="pb-2 pr-2 font-medium">Daily Rate</th>
                <th className="pb-2 pr-2 font-medium">Order Qty</th>
                <th className="pb-2 pr-2 font-medium">Order By</th>
                <th className="pb-2 pr-2 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {reorderData.map((r) => (
                <tr key={r.variantId} className={`border-b border-jc-blush/30 text-jc-anchor ${r.urgency === "immediate" ? "bg-red-50" : r.urgency === "this_week" ? "bg-amber-50" : ""}`}>
                  <td className="py-2 pr-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.urgency === "immediate" ? "bg-red-100 text-red-700" : r.urgency === "this_week" ? "bg-amber-100 text-amber-700" : r.urgency === "next_week" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                      {r.urgency === "immediate" ? "Now" : r.urgency === "this_week" ? "This Week" : r.urgency === "next_week" ? "Next Week" : "OK"}
                    </span>
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap">
                    <div className="font-medium">{r.productName}</div>
                    <div className="text-[10px] text-jc-rose-gold">{r.variantName} ({r.sku})</div>
                  </td>
                  <td className="py-2 pr-2 font-mono">{r.currentStock}</td>
                  <td className="py-2 pr-2 font-mono">{r.dailySalesRate}</td>
                  <td className="py-2 pr-2 font-mono font-medium">{r.suggestedOrderQty}</td>
                  <td className="py-2 pr-2 font-mono">{r.suggestedOrderDate}</td>
                  <td className="py-2 pr-2">
                    <span className={`px-1 py-0.5 rounded text-[10px] ${r.confidence === "high" ? "bg-green-100 text-green-700" : r.confidence === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>{r.confidence}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Price Recommendations */}
      <section className="rounded-sm border border-jc-blush bg-white p-5">
        <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-3">
          <TrendingUp size={20} className="text-jc-rose-gold" />
          Product Pricing Intelligence ({insights.length} products)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-jc-blush text-left text-jc-rose-gold">
                <th className="pb-2 pr-2 font-medium">Action</th>
                <th className="pb-2 pr-2 font-medium">Product</th>
                <th className="pb-2 pr-2 font-medium">Cost</th>
                <th className="pb-2 pr-2 font-medium">Current</th>
                <th className="pb-2 pr-2 font-medium">Suggested</th>
                <th className="pb-2 pr-2 font-medium">Margin</th>
                <th className="pb-2 pr-2 font-medium">Velocity</th>
                <th className="pb-2 pr-2 font-medium">ABC</th>
                <th className="pb-2 pr-2 font-medium">BE Progress</th>
                <th className="pb-2 pr-2 font-medium">Phase-Out</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((i) => (
                <tr key={i.variantId} className={`border-b border-jc-blush/30 text-jc-anchor ${i.priceRecommendation.action === "critical" ? "bg-red-50" : i.priceRecommendation.action === "increase" ? "bg-yellow-50/50" : i.phaseOutRisk.isAtRisk ? "bg-orange-50/30" : ""}`}>
                  <td className="py-2 pr-2">
                    <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${i.priceRecommendation.action === "critical" ? "bg-red-100 text-red-700" : i.priceRecommendation.action === "increase" ? "bg-amber-100 text-amber-700" : i.priceRecommendation.action === "decrease" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                      {i.priceRecommendation.action === "critical" ? <AlertTriangle size={10} /> : i.priceRecommendation.action === "increase" ? <ArrowUp size={10} /> : i.priceRecommendation.action === "decrease" ? <ArrowDown size={10} /> : <Minus size={10} />}
                      {i.priceRecommendation.action === "critical" ? "Critical" : i.priceRecommendation.action === "increase" ? "Increase" : i.priceRecommendation.action === "decrease" ? "Decrease" : "Maintain"}
                    </span>
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap">
                    <div className="font-medium">{i.productName}</div>
                    <div className="text-[10px] text-jc-rose-gold">{i.variantName} ({i.sku})</div>
                  </td>
                  <td className="py-2 pr-2 font-mono">₱{i.unitCost.toFixed(0)}</td>
                  <td className="py-2 pr-2 font-mono">₱{i.sellingPrice.toFixed(0)}</td>
                  <td className={`py-2 pr-2 font-mono font-medium ${i.priceRecommendation.action !== "maintain" ? "text-amber-700" : ""}`}>
                    {i.priceRecommendation.action !== "maintain" ? `₱${i.priceRecommendation.suggestedPrice.toFixed(0)}` : "—"}
                  </td>
                  <td className={`py-2 pr-2 font-mono ${i.marginPct < 20 ? "text-red-600" : i.marginPct < 30 ? "text-amber-600" : "text-green-600"}`}>
                    {i.marginPct.toFixed(0)}%
                  </td>
                  <td className="py-2 pr-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${i.velocity === "fast" ? "bg-green-100 text-green-700" : i.velocity === "medium" ? "bg-blue-100 text-blue-700" : i.velocity === "slow" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                      {i.velocity}
                    </span>
                  </td>
                  <td className="py-2 pr-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${i.abcClass === "A" ? "bg-green-100 text-green-700" : i.abcClass === "B" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{i.abcClass}</span>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-1.5 bg-jc-cream rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${i.breakEvenProgress.onTrack ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${Math.min(i.breakEvenProgress.progressPct, 100)}%` }} />
                      </div>
                      <span className="text-[10px]">{i.breakEvenProgress.progressPct}%</span>
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    {i.phaseOutRisk.isAtRisk ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${i.phaseOutRisk.riskLevel === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {i.phaseOutRisk.daysToDecision}d
                      </span>
                    ) : (
                      <span className="text-jc-anchor/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-jc-rose-gold bg-jc-cream rounded-sm p-2">
          <strong>AI Guide:</strong> Products with <strong>ABC class A</strong> contribute 80% of revenue — prioritize their pricing. &quot;C&quot; items may need bundling or phase-out.
        </p>
      </section>

      {/* Bundle Opportunities */}
      {bundleOpps.length > 0 && (
        <section className="rounded-sm border border-blue-200 bg-blue-50/30 p-5">
          <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-3">
            <Link2 size={20} className="text-blue-600" />
            Bundle Opportunities ({bundleOpps.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bundleOpps.slice(0, 6).map((b) => (
              <div key={b.variantId} className="rounded-sm border border-blue-200 bg-white p-3">
                <div className="text-sm font-medium text-jc-anchor">{b.productName}</div>
                <div className="text-xs text-jc-anchor/60 mb-2">{b.variantName} | {b.sales30}/mo sold</div>
                <div className="text-xs text-jc-anchor bg-blue-50 rounded-sm p-2">
                  <span className="font-medium">Bundle with:</span> {b.bundleRecommendation?.suggestedWith.join(", ")}
                </div>
                <div className="text-xs text-green-700 mt-1">
                  Estimated boost: +{b.bundleRecommendation?.estimatedBoost} units/mo
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Phase-Out Alerts */}
      {phaseOut.length > 0 && (
        <section className="rounded-sm border border-red-200 bg-white p-5">
          <h2 className="font-display text-lg text-jc-anchor flex items-center gap-2 mb-3">
            <FileWarning size={20} className="text-red-500" />
            Phase-Out Risk Assessment
          </h2>
          <div className="space-y-2">
            {phaseOut.map((p) => (
              <div key={p.variantId} className={`rounded-sm border p-3 text-xs ${p.phaseOutRisk.riskLevel === "high" ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-jc-anchor">{p.productName}</span>
                    <span className="text-jc-rose-gold ml-2">({p.variantName})</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.phaseOutRisk.riskLevel === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {p.phaseOutRisk.riskLevel === "high" ? "High Risk" : "Medium Risk"}
                  </span>
                </div>
                <p className="mt-1 text-jc-anchor/70">{p.phaseOutRisk.reason}</p>
                <div className="mt-1 flex gap-2">
                  {p.bundleRecommendation?.hasOpportunity && (
                    <span className="text-blue-600">Bundle: {p.bundleRecommendation.suggestedWith.join(", ")}</span>
                  )}
                  <span className="text-amber-700">
                    Suggested price: ₱{p.priceRecommendation.suggestedPrice.toFixed(0)} (now ₱{p.sellingPrice.toFixed(0)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Access to Tools */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickTool href="/analysis/intelligence/feasibility" icon={<DollarSign size={18} />} label="New Product Feasibility" />
        <QuickTool href="/analysis/intelligence/promo" icon={<Sparkles size={18} />} label="AI Ad Generator" />
        <QuickTool href="/analysis/pricing" icon={<BarChart3 icon={BarChart3} size={18} />} label="Pricing Analysis" />
        <QuickTool href="/inventory/reorder" icon={<RefreshCw size={18} />} label="Reorder" />
      </div>
    </div>
  );
}

function InsightCard({ icon, label, value, sub, good }: { icon: React.ReactNode; label: string; value: string; sub: string; good: boolean }) {
  return (
    <div className={`rounded-sm border p-4 ${good ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-jc-rose-gold">{label}</span>
        <span className={good ? "text-green-600" : "text-red-600"}>{icon}</span>
      </div>
      <div className={`text-xl font-display ${good ? "text-green-700" : "text-red-700"}`}>{value}</div>
      <div className="text-[10px] mt-0.5 text-jc-anchor/60">{sub}</div>
    </div>
  );
}

function QuickTool({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex min-h-[56px] items-center justify-center gap-2 rounded-sm border border-jc-blush bg-white px-4 text-sm font-medium text-jc-rose-gold hover:bg-jc-cream/50 transition-colors">
      {icon} {label}
    </Link>
  );
}

function BarChart3({ size }: { icon?: any; size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="4" height="9" /><rect x="10" y="5" width="4" height="16" /><rect x="17" y="8" width="4" height="13" /></svg>;
}
